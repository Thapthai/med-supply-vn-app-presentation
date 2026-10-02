"use client";

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { cabinetApi, departmentApi } from "@/lib/api";
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

interface MappingFormData {
  cabinet_id: string;
  department_id: string;
  status: string;
  description: string;
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
    DepName2?: string;
  };
}

interface EditMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: MappingFormData;
  setFormData: Dispatch<SetStateAction<MappingFormData>>;
  onSubmit: () => void;
  saving: boolean;
  selectedMapping?: CabinetDepartmentMapping | null;
}

export default function EditMappingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving,
  selectedMapping,
}: EditMappingDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Load initial data when dialog opens (only once per open)
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    // Load initial data with enough items to include current selections
    await Promise.all([
      loadCabinets(""),
      loadDepartments(""),
    ]);
  };

  // Load departments with search
  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Load cabinets with search
  const loadCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const response = await cabinetApi.getAll({ page: 1, limit: 50, keyword });
      if (response.success && response.data) {
        setCabinets(response.data as Cabinet[]);
      }
    } catch (error) {
      console.error("Failed to load cabinets:", error);
    } finally {
      setLoadingCabinets(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl min-w-0" key={selectedMapping ? `edit-mapping-${selectedMapping.id}` : "edit-mapping-new"}>
        <DialogHeader>
          <DialogTitle>แก้ไขการเชื่อมโยง</DialogTitle>
          <DialogDescription className="break-words">แก้ไขข้อมูลการเชื่อมโยงตู้ Cabinet กับแผนก</DialogDescription>
        </DialogHeader>
        <div ref={dialogContentRef} className="relative grid min-w-0 gap-4 overflow-x-hidden py-4">
          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="ตู้ Cabinet"
            placeholder="เลือกตู้"
            value={formData.cabinet_id}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, cabinet_id: value }))}
            options={cabinets
              // ไม่ให้เลือกตู้ที่สถานะเป็น USED ยกเว้นตู้ที่กำลังแก้ไขอยู่ (ของตัวเอง)
              .filter((cabinet) => 
                cabinet.cabinet_status !== "USED" || 
                cabinet.id.toString() === selectedMapping?.cabinet_id?.toString()
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
            initialDisplay={selectedMapping?.cabinet ? {
              label: selectedMapping.cabinet.cabinet_name || "",
              subLabel: selectedMapping.cabinet.cabinet_code || "",
            } : undefined}
          />

          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="แผนก"
            placeholder="เลือกแผนก"
            value={formData.department_id}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, department_id: value }))}
            options={departments.map((dept) => ({
              value: dept.ID.toString(),
              label: dept.DepName || "",
              subLabel: dept.DepName2 || "",
            }))}
            loading={loadingDepartments}
            required
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            initialDisplay={selectedMapping?.department ? {
              label: selectedMapping.department.DepName || "",
              subLabel: selectedMapping.department.DepName2 || "",
            } : undefined}
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
