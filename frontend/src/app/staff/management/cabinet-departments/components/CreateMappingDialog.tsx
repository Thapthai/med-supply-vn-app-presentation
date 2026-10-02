"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { fetchStaffDepartmentsForFilter, getStaffAllowedDepartmentIds } from "@/lib/staffDepartmentScope";
import { getStaffScopedCabinetList } from "@/lib/staffScopedCabinetList";
import { cn } from "@/lib/utils";

const fieldInputClass = "bg-white";

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
}

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
}

const MAX_ACTIVE_DIVISION_LINKS_PER_CABINET = 3;

function countActiveDivisionLinks(
  mappings: Array<{ cabinet_id: number; status: string }>,
  cabinetId: number,
): number {
  return mappings.filter((m) => m.cabinet_id === cabinetId && m.status === "ACTIVE").length;
}

function departmentIdsMappedForCabinet(
  mappings: Array<{ cabinet_id: number; department_id?: number | null }>,
  cabinetId: number,
): Set<number> {
  const set = new Set<number>();
  for (const m of mappings) {
    if (m.cabinet_id === cabinetId && m.department_id != null) {
      set.add(Number(m.department_id));
    }
  }
  return set;
}

interface FormData {
  cabinet_id: string;
  department_id: string;
  status: string;
  description: string;
}

interface CreateMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;
  onSubmit: () => void;
  saving: boolean;
  existingMappings: Array<{ cabinet_id: number; department_id?: number | null; status: string }>;
}

export default function CreateMappingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving,
  existingMappings,
}: CreateMappingDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 50,
        allowedDepartmentIds: allowedDepartmentIdsRef.current,
      });
      setDepartments(list as Department[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadCabinets = useCallback(async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const list = await getStaffScopedCabinetList(allowedDepartmentIdsRef.current, {
        keyword,
        limit: 50,
      });
      setCabinets(list);
    } catch (error) {
      console.error("Failed to load cabinets:", error);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      await Promise.all([loadCabinets(""), loadDepartments("")]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loadCabinets, loadDepartments]);

  useEffect(() => {
    if (!open || !formData.cabinet_id) return;
    const id = parseInt(formData.cabinet_id, 10);
    if (Number.isNaN(id)) return;
    if (countActiveDivisionLinks(existingMappings, id) >= MAX_ACTIVE_DIVISION_LINKS_PER_CABINET) {
      setFormData((prev) => ({ ...prev, cabinet_id: "" }));
    }
  }, [open, existingMappings, formData.cabinet_id, setFormData]);

  const unmappedDepartments = useMemo(() => {
    const cabStr = formData.cabinet_id?.trim();
    if (!cabStr) return [];
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) return [];
    const already = departmentIdsMappedForCabinet(existingMappings, cabinetId);
    return departments.filter((d) => !already.has(d.ID));
  }, [formData.cabinet_id, departments, existingMappings]);

  useEffect(() => {
    if (!open || !formData.cabinet_id?.trim() || !formData.department_id?.trim()) return;
    const cabId = parseInt(formData.cabinet_id, 10);
    const deptId = parseInt(formData.department_id, 10);
    if (Number.isNaN(cabId) || Number.isNaN(deptId)) return;
    if (departmentIdsMappedForCabinet(existingMappings, cabId).has(deptId)) {
      setFormData((prev) => ({ ...prev, department_id: "" }));
    }
  }, [open, formData.cabinet_id, formData.department_id, existingMappings, setFormData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl min-w-0">
        <DialogHeader>
          <DialogTitle>เพิ่มการเชื่อมโยงใหม่</DialogTitle>
          <DialogDescription className="break-words">
            เลือกตู้ที่ยังผูกแผนก (ACTIVE) ไม่ครบ {MAX_ACTIVE_DIVISION_LINKS_PER_CABINET} แผนก จากนั้นเลือกแผนก
            ที่ยังไม่เคยเชื่อมโยงกับตู้นั้น
          </DialogDescription>
        </DialogHeader>
        <div ref={dialogContentRef} className="relative grid min-w-0 gap-4 overflow-x-hidden py-4">
          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="ตู้ Cabinet"
            placeholder="เลือกตู้"
            value={formData.cabinet_id}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, cabinet_id: value, department_id: "" }))
            }
            options={cabinets
              .filter(
                (cabinet) =>
                  countActiveDivisionLinks(existingMappings, cabinet.id) <
                  MAX_ACTIVE_DIVISION_LINKS_PER_CABINET,
              )
              .map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              }))}
            loading={loadingCabinets}
            required
            onSearch={loadCabinets}
            searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
          />

          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="แผนก"
            placeholder={
              formData.cabinet_id?.trim()
                ? unmappedDepartments.length === 0
                  ? "ทุกแผนก ผูกกับตู้นี้แล้ว"
                  : "เลือกแผนก (ยังไม่เคยผูกกับตู้นี้)"
                : "กรุณาเลือกตู้ก่อน"
            }
            value={formData.department_id}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, department_id: value }))}
            options={unmappedDepartments.map((dept) => ({
              value: dept.ID.toString(),
              label: dept.DepName || "",
              subLabel: dept.DepName2 || "",
            }))}
            loading={loadingDepartments}
            required
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            disabled={!formData.cabinet_id?.trim()}
          />

          <div className="min-w-0">
            <Label>สถานะ</Label>
            <Select
              value={formData.status || "ACTIVE"}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger className={cn("h-9 w-full min-w-0 max-w-full", fieldInputClass)}>
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label>หมายเหตุ</Label>
            <Textarea
              placeholder="หมายเหตุ..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className={cn(
                "min-h-[4.5rem] min-w-0 max-w-full resize-y break-words [overflow-wrap:anywhere]",
                fieldInputClass,
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
