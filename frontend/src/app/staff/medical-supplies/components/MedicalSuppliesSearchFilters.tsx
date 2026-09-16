"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, RefreshCw, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { todayYyyyMmDdUtc } from "@/lib/formatThaiDateTime";
import { DatePickerBE } from "@/components/ui/date-picker-be";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";
import { staffMedicalSupplySubDepartmentsApi } from "@/lib/staffApi/medicalSupplySubDepartmentsApi";

export type DepartmentOption = { ID: number; DepName?: string | null; DepName2?: string | null };

export type SubDepartmentOption = {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status?: boolean;
};

/** ฟิลด์ที่ฟอร์มค้นหานี้แก้ไขได้ */
export type MedicalSuppliesSearchFilterFields = {
  startDate: string;
  endDate: string;
  itemName: string;
  departmentCode: string;
  usageType: string;
  patientName: string;
  patientHN: string;
  patientEN: string;
};

interface MedicalSuppliesSearchFiltersProps {
  formFilters: MedicalSuppliesSearchFilterFields;
  activeFilters: MedicalSuppliesSearchFilterFields;
  onPatchFormFilters: (patch: Partial<MedicalSuppliesSearchFilterFields>) => void;
  loading: boolean;
  onSearch: () => void;
  onReset: () => void;
  onReload: () => void;
  departmentDisabled?: boolean;
}

function buildRoleScopeDivisionSummary(depts: DepartmentOption[]): string {
  const names = depts.map((d) => (d.DepName || "").trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 5).join(", ")} … (+${names.length - 5})`;
}

export default function MedicalSuppliesSearchFilters({
  formFilters,
  activeFilters,
  onPatchFormFilters,
  loading,
  onSearch,
  onReset,
  onReload,
  departmentDisabled,
}: MedicalSuppliesSearchFiltersProps) {
  const patch = onPatchFormFilters;

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [subDepartmentSearch, setSubDepartmentSearch] = useState("");
  const [subDepartmentDropdownOpen, setSubDepartmentDropdownOpen] = useState(false);

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ""),
    [canPickAllRoleDepartments, departments],
  );

  const hasMainDepartment = Boolean(formFilters.departmentCode?.trim());

  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.trim().toLowerCase();
    return departments.filter((d) => {
      if (!q) return true;
      const n1 = (d.DepName || "").toLowerCase();
      const n2 = (d.DepName2 || "").toLowerCase();
      return n1.includes(q) || n2.includes(q);
    });
  }, [departments, departmentSearch]);

  const filteredSubDepartments = useMemo(() => {
    const deptId = formFilters.departmentCode?.trim();
    const q = subDepartmentSearch.trim().toLowerCase();
    return subDepartmentsMaster.filter((s) => {
      if (s.status === false) return false;
      if (deptId && String(s.department_id) !== deptId) return false;
      if (!q) return true;
      const code = (s.code || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subDepartmentsMaster, formFilters.departmentCode, subDepartmentSearch]);

  const divisionTriggerLabel = () => {
    if (!formFilters.departmentCode?.trim()) {
      if (canPickAllRoleDepartments) {
        return roleScopeDivisionSummary
          ? `ทั้งหมด · ${roleScopeDivisionSummary}`
          : "ทั้งหมด (ตาม role)";
      }
      return "เลือก Division (บังคับ)";
    }
    const d = departments.find((x) => String(x.ID) === formFilters.departmentCode);
    return d?.DepName || d?.DepName2 || `Division ${formFilters.departmentCode}`;
  };

  const subDepartmentTriggerLabel = () => {
    const code = formFilters.usageType?.trim();
    if (!code) return "เลือกแผนก ...";
    const sub = subDepartmentsMaster.find((s) => s.code === code);
    if (sub) {
      const n = sub.name?.trim();
      return n ? `${sub.code} · ${n}` : sub.code;
    }
    return code;
  };

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      /** ref ยังเป็น undefined ได้ถ้า user เปิดค้นหา Division ก่อน effect แรกเสร็จ — โหลด scope ก่อน */
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 200,
        allowedDepartmentIds: allowed,
      });
      setDepartments(list as DepartmentOption[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      await loadDepartments();
      if (cancelled || departmentDisabled) return;
      const nextDept = clampDepartmentIdString(formFilters.departmentCode, allowed, "");
      if (nextDept !== formFilters.departmentCode) {
        patch({ departmentCode: nextDept, usageType: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลด scope ครั้งแรก + clamp
  }, [departmentDisabled, loadDepartments]);

  useEffect(() => {
    (async () => {
      try {
        const res = await staffMedicalSupplySubDepartmentsApi.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setSubDepartmentsMaster(res.data as SubDepartmentOption[]);
        }
      } catch {
        setSubDepartmentsMaster([]);
      }
    })();
  }, []);

  const handleSearchClick = () => {
    if (!departmentDisabled) {
      const allowed = allowedDepartmentIdsRef.current;
      const roleScopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !formFilters.departmentCode?.trim();
      if (!formFilters.departmentCode?.trim() && !roleScopeAll) {
        toast.error("กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)");
        return;
      }
    }
    onSearch();
  };

  const today = todayYyyyMmDdUtc();
  const appliedDept = departments.find((d) => String(d.ID) === activeFilters.departmentCode);
  const appliedSubDept = subDepartmentsMaster.find((s) => s.code === activeFilters.usageType);

  const hasActiveFilters =
    activeFilters.itemName.trim() !== "" ||
    activeFilters.patientName.trim() !== "" ||
    activeFilters.patientHN.trim() !== "" ||
    activeFilters.patientEN.trim() !== "" ||
    activeFilters.departmentCode !== "" ||
    activeFilters.usageType !== "" ||
    activeFilters.startDate !== today ||
    activeFilters.endDate !== today;

  const dropdownTriggerClass = cn(
    "h-10 w-full justify-between font-normal shadow-sm bg-white",
  );

  return (
    <Card className="mb-6 border-slate-200 shadow-sm rounded-xl w-full min-w-0">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">วันที่เบิกอุปกรณ์ใช้กับคนไข้</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="itemName" className="text-xs font-medium text-slate-600">
              ค้นหาชื่ออุปกรณ์
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="itemName"
                placeholder="กรอกชื่ออุปกรณ์ / รหัส / คำอธิบาย..."
                value={formFilters.itemName}
                onChange={(e) => patch({ itemName: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="h-10 w-full pl-9 shadow-sm bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="startDate" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </Label>
              <DatePickerBE
                id="startDate"
                value={formFilters.startDate}
                onChange={(v) => patch({ startDate: v })}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className="h-10 shadow-sm bg-white"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="endDate" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </Label>
              <DatePickerBE
                id="endDate"
                value={formFilters.endDate}
                onChange={(v) => patch({ endDate: v })}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className="h-10 shadow-sm bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Division</Label>
              <DropdownMenu open={departmentDropdownOpen} onOpenChange={setDepartmentDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={dropdownTriggerClass}
                    type="button"
                    disabled={departmentDisabled || loadingDepartments}
                  >
                    <span className="truncate text-left">{divisionTriggerLabel()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
              >
                <div className="px-2 pb-2">
                  <Input
                    placeholder="ค้นหา Division..."
                    value={departmentSearch}
                    onChange={(e) => {
                      setDepartmentSearch(e.target.value);
                      void loadDepartments(e.target.value);
                    }}
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  {canPickAllRoleDepartments ? (
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        if (departmentDisabled) return;
                        patch({ departmentCode: "", usageType: "" });
                        setDepartmentDropdownOpen(false);
                        setDepartmentSearch("");
                      }}
                    >
                      -- ทุก Division --
                      {roleScopeDivisionSummary ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                          {roleScopeDivisionSummary}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {loadingDepartments ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">กำลังโหลด...</div>
                  ) : filteredDepartments.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <button
                        key={dept.ID}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          if (departmentDisabled) return;
                          patch({ departmentCode: String(dept.ID), usageType: "" });
                          setDepartmentDropdownOpen(false);
                          setDepartmentSearch("");
                        }}
                      >
                        {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">แผนก</Label>
            <DropdownMenu open={subDepartmentDropdownOpen} onOpenChange={setSubDepartmentDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={dropdownTriggerClass}
                  type="button"
                  disabled={!hasMainDepartment || !!departmentDisabled}
                >
                  <span className="truncate text-left">{subDepartmentTriggerLabel()}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
              >
                <div className="px-2 pb-2">
                  <Input
                    placeholder="ค้นหารหัสหรือชื่อแผนก ..."
                    value={subDepartmentSearch}
                    onChange={(e) => setSubDepartmentSearch(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      patch({ usageType: "" });
                      setSubDepartmentDropdownOpen(false);
                      setSubDepartmentSearch("");
                    }}
                  >
                    -- ทุกแผนก --
                  </button>
                  {!hasMainDepartment ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      เลือกแผนก (Division) ก่อน
                    </div>
                  ) : filteredSubDepartments.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                  ) : (
                    filteredSubDepartments.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          patch({ usageType: sub.code });
                          setSubDepartmentDropdownOpen(false);
                          setSubDepartmentSearch("");
                        }}
                      >
                        <span className="font-mono text-xs">{sub.code}</span>
                        {sub.name ? (
                          <span className="text-muted-foreground"> · {sub.name}</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="patientHN" className="text-xs font-medium text-slate-600">
                HN
              </Label>
              <Input
                id="patientHN"
                placeholder="กรอกเลข HN..."
                value={formFilters.patientHN}
                onChange={(e) => patch({ patientHN: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="h-10 shadow-sm bg-white"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="patientEN" className="text-xs font-medium text-slate-600">
                EN
              </Label>
              <Input
                id="patientEN"
                placeholder="กรอกเลข EN..."
                value={formFilters.patientEN}
                onChange={(e) => patch({ patientEN: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="h-10 shadow-sm bg-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearchClick} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            onClick={onReload}
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={loading}
            aria-label="รีเฟรช"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {activeFilters.itemName.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                อุปกรณ์: {activeFilters.itemName.trim()}
              </span>
            ) : null}
            {activeFilters.patientName.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คนไข้: {activeFilters.patientName.trim()}
              </span>
            ) : null}
            {activeFilters.patientHN.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                HN: {activeFilters.patientHN.trim()}
              </span>
            ) : null}
            {activeFilters.patientEN.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                EN: {activeFilters.patientEN.trim()}
              </span>
            ) : null}
            {activeFilters.startDate !== today || activeFilters.endDate !== today ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {activeFilters.startDate || "—"} – {activeFilters.endDate || "—"}
              </span>
            ) : null}
            {activeFilters.departmentCode ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                Division: {appliedDept?.DepName || activeFilters.departmentCode}
              </span>
            ) : null}
            {activeFilters.usageType ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                แผนก: {appliedSubDept?.code || activeFilters.usageType}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={onReset}
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
