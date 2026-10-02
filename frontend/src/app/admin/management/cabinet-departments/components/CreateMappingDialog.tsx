"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type Dispatch, type SetStateAction } from "react";
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

/** จำนวนการผูกแผนก (ACTIVE) ต่อตู้ — ตรงกับ backend */
export const MAX_ACTIVE_DIVISION_LINKS_PER_CABINET = 3;

function countActiveDivisionLinks(
  mappings: Array<{ cabinet_id: number; status: string }>,
  cabinetId: number,
): number {
  return mappings.filter((m) => m.cabinet_id === cabinetId && m.status === "ACTIVE").length;
}

/** แผนกที่มีแถวผูกกับตู้นี้แล้ว (ทุกสถานะ — ตรงกับ backend ห้ามซ้ำคู่) */
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

export interface CreateMappingFormData {
  cabinet_id: string;
  /** แต่ละช่อง = แผนก หนึ่งรายการ (ว่างได้ถ้ามีอย่างน้อยหนึ่งช่องที่เลือก) */
  department_ids: string[];
  status: string;
  description: string;
}

interface CreateMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateMappingFormData;
  setFormData: Dispatch<SetStateAction<CreateMappingFormData>>;
  onSubmit: () => void;
  saving: boolean;
  existingMappings: Array<{
    cabinet_id: number;
    department_id?: number | null;
    status: string;
    department?: { ID?: number; DepName?: string; DepName2?: string };
  }>;
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
  /** รายการ แผนก ต่อช่อง — แยกกันเพื่อค้นหาในช่องหนึ่งไม่ทับช่องอื่น */
  const [departmentOptionsBySlot, setDepartmentOptionsBySlot] = useState<Record<number, Department[]>>({});
  const [loadingDepartmentSlot, setLoadingDepartmentSlot] = useState<Record<number, boolean>>({});
  /** แสดงชื่อแผนก หลังเลือก แม้รายการ options จะเปลี่ยนจากการค้นหา */
  const [slotDisplayByIndex, setSlotDisplayByIndex] = useState<
    Record<number, { label: string; subLabel?: string }>
  >({});
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  /** กันคำขอค้นหาเก่าทับผลล่าสุด (พิมพ์เร็ว / เปิดหลายช่อง) */
  const departmentSlotRequestSeq = useRef<Record<number, number>>({});

  useEffect(() => {
    if (open) {
      void loadCabinets("");
    }
  }, [open]);

  const loadDepartmentsForSlot = useCallback(async (slotIndex: number, keyword?: string) => {
    const seq = (departmentSlotRequestSeq.current[slotIndex] ?? 0) + 1;
    departmentSlotRequestSeq.current[slotIndex] = seq;

    const kw = keyword != null ? String(keyword).trim() : "";
    const params: { limit: number; keyword?: string } = { limit: 50 };
    if (kw !== "") params.keyword = kw;

    setLoadingDepartmentSlot((p) => ({ ...p, [slotIndex]: true }));
    try {
      const response = await departmentApi.getAll(params);
      if (departmentSlotRequestSeq.current[slotIndex] !== seq) return;
      if (response.success && response.data) {
        setDepartmentOptionsBySlot((p) => ({ ...p, [slotIndex]: response.data as Department[] }));
      }
    } catch (error) {
      if (departmentSlotRequestSeq.current[slotIndex] === seq) {
        console.error("Failed to load departments:", error);
      }
    } finally {
      if (departmentSlotRequestSeq.current[slotIndex] === seq) {
        setLoadingDepartmentSlot((p) => ({ ...p, [slotIndex]: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !formData.cabinet_id) return;
    const id = parseInt(formData.cabinet_id, 10);
    if (Number.isNaN(id)) return;
    if (countActiveDivisionLinks(existingMappings, id) >= MAX_ACTIVE_DIVISION_LINKS_PER_CABINET) {
      setFormData((prev) => ({ ...prev, cabinet_id: "", department_ids: [] }));
      setSlotDisplayByIndex({});
    }
  }, [open, existingMappings, formData.cabinet_id, setFormData]);

  /**
   * มีแผนกที่ยังไม่ผูกกับตู้นี้หรือไม่ — ยิง API แบบไม่มี keyword (แบ่งหน้า)
   * ไม่ใช้ความยาวของ `departments` หลังค้นหา เพราะจะทำให้จำนวนช่องลดเมื่อ filter เหลือ 1/0 รายการ
   */
  const [hasUnmappedDepartment, setHasUnmappedDepartment] = useState<boolean | null>(null);

  useEffect(() => {
    const cabStr = formData.cabinet_id?.trim();
    if (!open || !cabStr) {
      setHasUnmappedDepartment(null);
      return;
    }
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) {
      setHasUnmappedDepartment(null);
      return;
    }
    setHasUnmappedDepartment(null);
    let cancelled = false;
    const mapped = departmentIdsMappedForCabinet(existingMappings, cabinetId);
    const limit = 500;
    (async () => {
      try {
        let page = 1;
        let lastPage = 1;
        do {
          const res = (await departmentApi.getAll({ page, limit })) as {
            success?: boolean;
            data?: Department[];
            lastPage?: number;
          };
          if (cancelled) return;
          const data = res.data;
          lastPage = typeof res.lastPage === "number" && res.lastPage >= 1 ? res.lastPage : 1;
          if (!res.success || !Array.isArray(data)) {
            setHasUnmappedDepartment(false);
            return;
          }
          for (const d of data) {
            if (!mapped.has(d.ID)) {
              setHasUnmappedDepartment(true);
              return;
            }
          }
          page += 1;
        } while (page <= lastPage);
        if (!cancelled) setHasUnmappedDepartment(false);
      } catch {
        if (!cancelled) setHasUnmappedDepartment(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, formData.cabinet_id, existingMappings]);

  /** ช่อง ACTIVE ที่เหลือสำหรับตู้ที่เลือก (ใช้ปิดช่องที่เกินโควต้า) */
  const remainingActiveSlots = useMemo(() => {
    const cabStr = formData.cabinet_id?.trim();
    if (!cabStr) return 0;
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) return 0;
    return (
      MAX_ACTIVE_DIVISION_LINKS_PER_CABINET - countActiveDivisionLinks(existingMappings, cabinetId)
    );
  }, [formData.cabinet_id, existingMappings]);

  /** ACTIVE ที่ผูกกับตู้แล้ว (เรียงตาม department_id) — แสดงในแถวที่ปิดตามโควต้า */
  const existingActiveDivisionsOrdered = useMemo(() => {
    const cabStr = formData.cabinet_id?.trim();
    if (!cabStr) return [];
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) return [];
    return existingMappings
      .filter((m) => m.cabinet_id === cabinetId && m.status === "ACTIVE")
      .sort((a, b) => Number(a.department_id ?? 0) - Number(b.department_id ?? 0));
  }, [formData.cabinet_id, existingMappings]);

  /** แสดงครบ 3 ช่องเสมอเมื่อเลือกตู้และยังผูกได้ — ช่องที่เกินโควต้า ACTIVE จะ disabled */
  const divisionSlotCount = useMemo(() => {
    if (!formData.cabinet_id?.trim()) return 0;
    if (remainingActiveSlots <= 0) return 0;
    if (hasUnmappedDepartment === false) return 0;
    return MAX_ACTIVE_DIVISION_LINKS_PER_CABINET;
  }, [formData.cabinet_id, remainingActiveSlots, hasUnmappedDepartment]);

  /** โหลดรายการเริ่มต้น (ไม่มี keyword) แยกทุกช่องเมื่อเลือกตู้ / จำนวนช่องเปลี่ยน */
  useEffect(() => {
    if (!open || divisionSlotCount === 0 || !formData.cabinet_id?.trim()) {
      setDepartmentOptionsBySlot({});
      setLoadingDepartmentSlot({});
      return;
    }
    setDepartmentOptionsBySlot({});
    setLoadingDepartmentSlot({});
    void Promise.all(
      Array.from({ length: divisionSlotCount }, (_, slotIndex) =>
        loadDepartmentsForSlot(slotIndex, undefined),
      ),
    );
  }, [open, divisionSlotCount, formData.cabinet_id, loadDepartmentsForSlot]);

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => {
      const nextLen = divisionSlotCount;
      const cur = prev.department_ids;
      if (cur.length === nextLen) return prev;
      const next = Array.from({ length: nextLen }, (_, i) => (i < cur.length ? (cur[i] ?? "") : ""));
      return { ...prev, department_ids: next };
    });
  }, [open, divisionSlotCount, setFormData]);

  useEffect(() => {
    if (!open || !formData.cabinet_id?.trim()) return;
    const cabId = parseInt(formData.cabinet_id, 10);
    if (Number.isNaN(cabId)) return;
    const mapped = departmentIdsMappedForCabinet(existingMappings, cabId);
    setFormData((prev) => {
      let changed = false;
      const next = prev.department_ids.map((idStr) => {
        if (!idStr?.trim()) return idStr;
        const d = parseInt(idStr.trim(), 10);
        if (Number.isNaN(d)) return idStr;
        if (mapped.has(d)) {
          changed = true;
          return "";
        }
        return idStr;
      });
      return changed ? { ...prev, department_ids: next } : prev;
    });
  }, [open, formData.cabinet_id, existingMappings, setFormData]);

  /** ล้างชื่อที่แสดงเมื่อล้างค่า department_ids ในช่องนั้น */
  useEffect(() => {
    setSlotDisplayByIndex((prev) => {
      const next = { ...prev };
      let changed = false;
      for (let i = 0; i < MAX_ACTIVE_DIVISION_LINKS_PER_CABINET; i++) {
        if (!formData.department_ids[i]?.trim() && next[i] != null) {
          delete next[i];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [formData.department_ids]);

  /** ช่องที่เกินโควต้า ACTIVE — ล้างค่าและปิดการเลือก */
  useEffect(() => {
    if (!open || !formData.cabinet_id?.trim()) return;
    setFormData((prev) => {
      const next = [...prev.department_ids];
      let changed = false;
      for (let i = remainingActiveSlots; i < next.length; i++) {
        if (next[i]?.trim()) {
          next[i] = "";
          changed = true;
        }
      }
      return changed ? { ...prev, department_ids: next } : prev;
    });
    setSlotDisplayByIndex((prev) => {
      const next = { ...prev };
      let c = false;
      for (let i = remainingActiveSlots; i < MAX_ACTIVE_DIVISION_LINKS_PER_CABINET; i++) {
        if (next[i]) {
          delete next[i];
          c = true;
        }
      }
      return c ? next : prev;
    });
  }, [open, formData.cabinet_id, remainingActiveSlots, setFormData]);

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

  const setDepartmentAtSlot = (slotIndex: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.department_ids];
      while (next.length <= slotIndex) next.push("");
      next[slotIndex] = value;
      return { ...prev, department_ids: next };
    });
  };

  /**
   * รวม cache ทุกช่อง — ใช้แค่ตอนหาชื่อแสดงผล / fallback หลังเลือก
   * รายการใน dropdown ใช้เฉพาะ cache ของช่องนั้น ไม่รวมช่องอื่น (กันผลค้นหาปนกัน)
   */
  const mergedDepartmentsFromSlots = useMemo(() => {
    const seen = new Set<number>();
    const list: Department[] = [];
    for (let i = 0; i < MAX_ACTIVE_DIVISION_LINKS_PER_CABINET; i++) {
      for (const d of departmentOptionsBySlot[i] ?? []) {
        if (!seen.has(d.ID)) {
          seen.add(d.ID);
          list.push(d);
        }
      }
    }
    return list;
  }, [departmentOptionsBySlot]);

  const optionsForSlot = (slotIndex: number) => {
    const cabStr = formData.cabinet_id?.trim();
    if (!cabStr) return [];
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) return [];
    const already = departmentIdsMappedForCabinet(existingMappings, cabinetId);
    const source = departmentOptionsBySlot[slotIndex] ?? [];
    const pickedElsewhere = new Set(
      formData.department_ids
        .map((id, idx) => (idx !== slotIndex && id?.trim() ? id.trim() : null))
        .filter((x): x is string => x != null),
    );
    const currentId = formData.department_ids[slotIndex]?.trim() ?? "";

    const rows = source
      .filter((d) => !already.has(d.ID))
      .filter((d) => !pickedElsewhere.has(String(d.ID)))
      .map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || "",
        subLabel: dept.DepName2 || "",
      }));

    let opts = rows;
    if (currentId && !opts.some((o) => o.value === currentId)) {
      const raw =
        source.find((d) => String(d.ID) === currentId) ??
        mergedDepartmentsFromSlots.find((d) => String(d.ID) === currentId);
      const disp = slotDisplayByIndex[slotIndex];
      opts = [
        {
          value: currentId,
          label: raw?.DepName || disp?.label || `แผนก #${currentId}`,
          subLabel: raw?.DepName2 || disp?.subLabel || "",
        },
        ...opts,
      ];
    }

    if (currentId) {
      const ix = opts.findIndex((o) => o.value === currentId);
      if (ix > 0) {
        const copy = [...opts];
        const [picked] = copy.splice(ix, 1);
        opts = [picked, ...copy];
      }
    }

    return opts;
  };

  const handleDepartmentPick = (slotIndex: number, value: string) => {
    if (!value?.trim()) {
      setSlotDisplayByIndex((p) => {
        const n = { ...p };
        delete n[slotIndex];
        return n;
      });
      setDepartmentAtSlot(slotIndex, "");
      return;
    }
    const opts = optionsForSlot(slotIndex);
    let opt = opts.find((o) => o.value === value);
    if (!opt) {
      const raw = mergedDepartmentsFromSlots.find((d) => String(d.ID) === value);
      if (raw) {
        opt = {
          value: String(raw.ID),
          label: raw.DepName || "—",
          subLabel: raw.DepName2 || "",
        };
      }
    }
    if (opt) {
      setSlotDisplayByIndex((p) => ({
        ...p,
        [slotIndex]: { label: opt.label || "—", subLabel: opt.subLabel },
      }));
    }
    setDepartmentAtSlot(slotIndex, value);
  };

  /** ชื่อที่แสดงในกล่องเลือกเมื่อมีค่า แม้รายการ options จะไม่มีรายการนั้นชั่วคราว */
  const slotDepartmentDisplay = (slotIndex: number): { label: string; subLabel?: string } | undefined => {
    const id = formData.department_ids[slotIndex]?.trim();
    if (!id) return undefined;
    const picked = slotDisplayByIndex[slotIndex];
    if (picked) return picked;
    const raw = mergedDepartmentsFromSlots.find((d) => String(d.ID) === id);
    if (raw) {
      return { label: raw.DepName || "—", subLabel: raw.DepName2 || "" };
    }
    return { label: `รหัสแผนก ${id}` };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl min-w-0">
        <DialogHeader>
          <DialogTitle>เพิ่มการเชื่อมโยงใหม่</DialogTitle>
          <DialogDescription className="break-words">
            เลือกตู้แล้วจะแสดง {MAX_ACTIVE_DIVISION_LINKS_PER_CABINET} ช่องแผนก — เลือกได้เฉพาะช่องที่ตู้ยังมีโควต้า
            ACTIVE ว่าง (ช่องที่เต็มจะถูกปิด) บันทึกได้เมื่อเลือกอย่างน้อยหนึ่งแผนก
          </DialogDescription>
        </DialogHeader>
        <div ref={dialogContentRef} className="relative grid min-w-0 gap-4 overflow-x-hidden py-4">
          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="ตู้ Cabinet"
            placeholder="เลือกตู้"
            value={formData.cabinet_id}
            onValueChange={(value) => {
              setFormData((prev) => ({ ...prev, cabinet_id: value, department_ids: [] }));
              setDepartmentOptionsBySlot({});
              setLoadingDepartmentSlot({});
              setSlotDisplayByIndex({});
            }}
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

          {!formData.cabinet_id?.trim() ? (
            <p className="text-sm text-muted-foreground">กรุณาเลือกตู้ก่อน จึงจะเลือกแผนก ได้</p>
          ) : divisionSlotCount === 0 ? (
            <p className="text-sm text-amber-700">
              ตู้นี้ผูกแผนก ครบแล้ว หรือไม่มีแผนก เหลือให้ผูก
            </p>
          ) : (
            Array.from({ length: divisionSlotCount }, (_, slotIndex) => {
              const slotDisabled = slotIndex >= remainingActiveSlots;
              const slotOpts = optionsForSlot(slotIndex);
              const kExisting = slotIndex - remainingActiveSlots;
              const existingRow =
                slotDisabled && kExisting >= 0 ? existingActiveDivisionsOrdered[kExisting] : undefined;
              const disabledDisplay =
                existingRow != null
                  ? {
                      label:
                        existingRow.department?.DepName?.trim() ||
                        `แผนก #${existingRow.department_id ?? "?"}`,
                      subLabel: existingRow.department?.DepName2?.trim() || undefined,
                    }
                  : undefined;
              return (
                <SearchableSelect
                  key={`dept-slot-${slotIndex}`}
                  portalTargetRef={dialogContentRef}
                  disabled={slotDisabled}
                  disabledDisplay={disabledDisplay}
                  allowClear={!slotDisabled}
                  clearLabel="ล้างการเลือก (ว่างช่องนี้)"
                  initialDisplay={slotDepartmentDisplay(slotIndex)}
                  label={`แผนก (${slotIndex + 1}/${MAX_ACTIVE_DIVISION_LINKS_PER_CABINET})`}
                  placeholder={
                    slotDisabled
                      ? "ช่องนี้เต็มตามโควต้า ACTIVE — เลือกได้เฉพาะช่องด้านบน"
                      : slotOpts.length === 0
                        ? "ไม่พบในรายการนี้ — ล้างค้นหาในกล่องด้านบน หรือค้นหาใหม่"
                        : "เลือกแผนก (ว่างได้)"
                  }
                  value={formData.department_ids[slotIndex] ?? ""}
                  onValueChange={(value) => handleDepartmentPick(slotIndex, value)}
                  options={slotOpts}
                  loading={!!loadingDepartmentSlot[slotIndex]}
                  required={false}
                  onSearch={(keyword) => void loadDepartmentsForSlot(slotIndex, keyword)}
                  searchPlaceholder="ค้นหาชื่อแผนก..."
                />
              );
            })
          )}
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

          {divisionSlotCount > 0 ? (
            <p className="text-xs break-words text-muted-foreground">
              เลือกแผนก อย่างน้อย 1 ช่องที่ใช้งานได้ แล้วกดบันทึก — ระบบจะสร้างการเชื่อมโยงตามแต่ละช่องที่เลือก
            </p>
          ) : null}
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
