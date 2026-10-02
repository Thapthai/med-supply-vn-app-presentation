"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SearchableSelect from "./SearchableSelect";
import { staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";

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
  cabinetDepartments?: Array<{
    id: number;
    department_id: number;
    status: string;
  }>;
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
}

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping["cabinet"]): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== "number") return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

function buildScopedDivisionSummary(depts: Department[]): string {
  const names = depts.map((d) => (d.DepName || "").trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 5).join(", ")} … (+${names.length - 5})`;
}

export type StaffItemsSearchFilters = {
  searchTerm: string;
  departmentId: string;
  cabinetId: string;
  statusFilter: string;
  keyword: string;
};

interface FilterSectionProps {
  onSearch: (filters: StaffItemsSearchFilters) => void;
  onBeforeSearch?: () => void;
  onReset?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  activeFilters?: StaffItemsSearchFilters;
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
  initialAutoSearch?: boolean;
}

export default function FilterSection({
  onSearch,
  onBeforeSearch,
  onReset,
  onRefresh,
  loading = false,
  activeFilters,
  initialDepartmentId,
  departmentDisabled,
  initialAutoSearch = true,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  /** มีแถวใน app_staff_permission_departments สำหรับ user → ค่าเป็น number[]; ไม่มีแถว = unrestricted → null */
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllScopedDepartments, setCanPickAllScopedDepartments] = useState(false);
  const initialSearchDoneRef = useRef(false);

  const [formFilters, setFormFilters] = useState({
    searchTerm: "",
    departmentId: departmentDisabled ? (initialDepartmentId?.trim() || "") : "",
    cabinetId: "",
    statusFilter: "all",
  });

  useEffect(() => {
    if (!departmentDisabled) return;
    const d = initialDepartmentId?.trim() || "";
    setFormFilters((prev) => ({ ...prev, departmentId: d }));
  }, [initialDepartmentId, departmentDisabled]);

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      /** ref ยังเป็น undefined ได้ถ้า user เปิดค้นหาแผนก ก่อน effect แรกเสร็จ — โหลด scope ก่อน */
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllScopedDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 200,
        withCabinet: true,
      });
      setDepartments(list as Department[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      let next: Cabinet[] = [];
      const trimmed = departmentIdStr?.trim() ?? "";
      if (!trimmed) {
        const allowed = allowedDepartmentIdsRef.current;
        if (Array.isArray(allowed) && allowed.length > 0) {
          const results = await Promise.all(
            allowed.map((deptId) =>
              staffCabinetDepartmentApi.getAll({
                departmentId: deptId,
                keyword: keyword || undefined,
              }),
            ),
          );
          const uniqueCabinets = new Map<number, Cabinet>();
          for (const response of results) {
            if (response.success && response.data) {
              const mappings = response.data as CabinetDepartmentMapping[];
              mappings
                .filter((mapping) => mapping.status === "ACTIVE")
                .forEach((mapping) => {
                  const mapped = mapCabinetFromMapping(mapping.cabinet);
                  if (mapped && !uniqueCabinets.has(mapped.id)) {
                    uniqueCabinets.set(mapped.id, mapped);
                  }
                });
            }
          }
          next = Array.from(uniqueCabinets.values());
        }
        setCabinets(next);
        return;
      }
      const deptId = parseInt(trimmed, 10);
      if (Number.isNaN(deptId)) {
        setCabinets([]);
        return;
      }
      const response = await staffCabinetDepartmentApi.getAll({
        departmentId: deptId,
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();
        mappings
          .filter((mapping) => mapping.status === "ACTIVE")
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !uniqueCabinets.has(mapped.id)) {
              uniqueCabinets.set(mapped.id, mapped);
            }
          });
        next = Array.from(uniqueCabinets.values());
      }
      setCabinets(next);
    } catch (error) {
      console.error("Failed to load cabinets:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllScopedDepartments(Array.isArray(allowed) && allowed.length > 0);
      try {
        setLoadingDepartments(true);
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 200,
          withCabinet: true,
        });
        if (cancelled) return;
        setDepartments(list as Department[]);
      } catch (error) {
        console.error("Failed to load departments:", error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
      if (cancelled) return;
      setFormFilters((prev) => {
        if (departmentDisabled) return prev;
        const nextDept = clampDepartmentIdString(prev.departmentId, allowed, "");
        if (nextDept === prev.departmentId) return prev;
        return {
          ...prev,
          departmentId: nextDept,
          cabinetId: "",
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentDisabled]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const cabinetExists = cabinets.some((cabinet) => cabinet.id.toString() === formFilters.cabinetId);
      if (!cabinetExists) {
        setFormFilters((prev) => ({
          ...prev,
          cabinetId: "",
        }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  useEffect(() => {
    if (!initialAutoSearch) return;
    if (initialSearchDoneRef.current) return;
    if (loadingDepartments) return;

    let departmentId = "";
    const cabinetId = "";

    if (departmentDisabled) {
      departmentId = (initialDepartmentId ?? "").trim();
    } else {
      const allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        return;
      }
      const userScope = Array.isArray(allowed) && allowed.length > 0;
      if (userScope) {
        /** ค่าเริ่มต้น = ทั้งหมด (WHERE department_id IN แผนกที่ผู้ใช้ได้รับสิทธิ์) */
        departmentId = "";
      } else if (departments.length === 1) {
        departmentId = String(departments[0].ID);
      } else if (departments.length === 0) {
        initialSearchDoneRef.current = true;
        return;
      } else {
        /** unrestricted + หลายแผนกใน dropdown — ให้ user เลือกแผนกก่อน */
        initialSearchDoneRef.current = true;
        return;
      }
    }

    initialSearchDoneRef.current = true;
    setFormFilters((prev) => ({
      ...prev,
      departmentId,
      cabinetId,
    }));
    onBeforeSearch?.();
    onSearch({
      searchTerm: "",
      departmentId,
      cabinetId,
      statusFilter: "all",
      keyword: "",
    });
  }, [
    initialAutoSearch,
    departmentDisabled,
    initialDepartmentId,
    loadingDepartments,
    departments,
    onSearch,
    onBeforeSearch,
  ]);

  const handleSearch = () => {
    const allowed = allowedDepartmentIdsRef.current;
    const scopeAll =
      Array.isArray(allowed) && allowed.length > 0 && formFilters.departmentId.trim() === "";
    const deptOk =
      departmentDisabled ||
      formFilters.departmentId.trim() !== "" ||
      scopeAll;
    if (!deptOk) {
      toast.error("กรุณาเลือกแผนกก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อมีการจำกัดแผนกให้คุณ)");
      return;
    }
    onBeforeSearch?.();
    const kw = formFilters.searchTerm.trim();
    onSearch({
      ...formFilters,
      searchTerm: kw,
      keyword: kw,
    });
  };

  const handleReset = () => {
    const lockedDeptId = departmentDisabled ? (initialDepartmentId?.trim() || "") : "";
    setFormFilters({
      searchTerm: "",
      departmentId: lockedDeptId,
      cabinetId: "",
      statusFilter: "all",
    });
    if (onReset) {
      onReset();
      return;
    }
    const defaultFilters: StaffItemsSearchFilters = {
      searchTerm: "",
      departmentId: lockedDeptId,
      cabinetId: "",
      statusFilter: "all",
      keyword: "",
    };
    onSearch(defaultFilters);
  };

  const scopedDivisionSummary = useMemo(
    () => (canPickAllScopedDepartments ? buildScopedDivisionSummary(departments) : ""),
    [canPickAllScopedDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllScopedDepartments
        ? [
          {
            value: "",
            label: "ทั้งหมด",
            ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
          },
        ]
        : []),
      ...departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || "",
        subLabel: dept.DepName2 || "",
      })),
    ],
    [canPickAllScopedDepartments, departments, scopedDivisionSummary],
  );

  const applied = activeFilters ?? {
    searchTerm: "",
    departmentId: "",
    cabinetId: "",
    statusFilter: "all",
    keyword: "",
  };

  const appliedDept = departments.find((d) => d.ID.toString() === applied.departmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === applied.cabinetId);

  const hasActiveFilters =
    applied.keyword.trim() !== "" ||
    applied.departmentId !== "" ||
    applied.cabinetId !== "" ||
    applied.statusFilter !== "all";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">
              ค้นจากรหัส/ชื่อเวชภัณฑ์ · เลือกแผนก และตู้ Cabinet (ตามสิทธิ์ของคุณ)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="item-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="item-keyword"
                placeholder="เช่น รหัส Item, ชื่อเวชภัณฑ์..."
                value={formFilters.searchTerm}
                onChange={(e) => setFormFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className={cn("h-10 pl-9 shadow-sm", fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SearchableSelect
              label="แผนก"
              placeholder={
                canPickAllScopedDepartments
                  ? "เลือกแผนก หรือทั้งหมด (ตามสิทธิ์ของคุณ)"
                  : "เลือกแผนก (บังคับ)"
              }
              required={!canPickAllScopedDepartments}
              value={formFilters.departmentId}
              initialDisplay={
                canPickAllScopedDepartments && formFilters.departmentId.trim() === ""
                  ? {
                    label: "ทั้งหมด",
                    ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
                  }
                  : undefined
              }
              onValueChange={(value) => {
                if (departmentDisabled) return;
                setFormFilters({
                  ...formFilters,
                  departmentId: value,
                  cabinetId: "",
                });
              }}
              options={divisionSelectOptions}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อแผนก..."
              disabled={departmentDisabled}
            />

            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={
                formFilters.departmentId
                  ? "เลือกตู้"
                  : canPickAllScopedDepartments
                    ? "เลือกตู้"
                    : "เลือกแผนกก่อน"
              }
              value={formFilters.cabinetId}
              onValueChange={(value) => setFormFilters({ ...formFilters, cabinetId: value })}
              options={[
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || "",
                  subLabel: cabinet.cabinet_code || "",
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(searchKeyword) => {
                void resolveCabinets(formFilters.departmentId, searchKeyword);
              }}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
              disabled={false}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearch} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={onRefresh}
              disabled={loading}
              aria-label="รีเฟรช"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {applied.keyword.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {applied.keyword.trim()}
              </span>
            ) : null}
            {applied.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                แผนก: {appliedDept?.DepName || applied.departmentId}
              </span>
            ) : canPickAllScopedDepartments && applied.departmentId === "" ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                แผนก: ทั้งหมด (ตามสิทธิ์ของคุณ)
              </span>
            ) : null}
            {applied.cabinetId ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                ตู้: {appliedCabinet?.cabinet_name || applied.cabinetId}
              </span>
            ) : null}
            {applied.statusFilter !== "all" ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  applied.statusFilter === "active"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                {applied.statusFilter === "active" ? "ใช้งาน" : "ไม่ใช้งาน"}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={handleReset}
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
