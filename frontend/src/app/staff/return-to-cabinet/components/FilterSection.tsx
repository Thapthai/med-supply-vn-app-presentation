"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerBE } from "@/components/ui/date-picker-be";
import type { FilterState } from "../types";
import SearchableSelect from "@/app/admin/items/components/SearchableSelect";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";
import { staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import { staffMedicalSupplySubDepartmentsApi } from "@/lib/staffApi/medicalSupplySubDepartmentsApi";
import { cn } from "@/lib/utils";

const fieldInputClass = "bg-white";

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
  DepCode?: string;
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

interface SubDepartmentRow {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status: boolean;
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

interface FilterSectionProps {
  filters: FilterState;
  appliedFilters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  itemTypes: Array<{ id: string; name: string }>;
  loading: boolean;
  departmentDisabled?: boolean;
}

export default function FilterSection({
  filters,
  appliedFilters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  itemTypes: _itemTypes,
  loading,
  departmentDisabled,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentRow[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllScopedDepartments, setCanPickAllScopedDepartments] = useState(false);

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

  const subDepartmentOptions = useMemo(() => {
    const deptId = filters.departmentId?.trim();
    if (!deptId) return [{ value: "", label: "ทั้งหมด" }];
    const rows = subDepartmentsMaster.filter(
      (s) => s.status !== false && String(s.department_id) === deptId,
    );
    return [
      { value: "", label: "ทั้งหมด" },
      ...rows.map((s) => ({
        value: String(s.id),
        label: s.code,
        subLabel: s.name?.trim() || "",
      })),
    ];
  }, [subDepartmentsMaster, filters.departmentId]);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
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
        allowedDepartmentIds: allowed,
        withCabinet: true,
      });
      setDepartments(list as Department[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

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
          allowedDepartmentIds: allowed,
          withCabinet: true,
        });
        if (cancelled) return;
        setDepartments(list as Department[]);
      } catch (error) {
        console.error("Failed to load departments:", error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
      if (cancelled || departmentDisabled) return;
      const nextDept = clampDepartmentIdString(filters.departmentId, allowed, "");
      if (nextDept !== filters.departmentId) {
        onFilterChange("departmentId", nextDept);
        onFilterChange("subDepartmentId", "");
        onFilterChange("cabinetId", "");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลด scope ครั้งแรก
  }, [departmentDisabled]);

  useEffect(() => {
    (async () => {
      try {
        const res = await staffMedicalSupplySubDepartmentsApi.getAll();
        if (res.success && Array.isArray(res.data)) {
          setSubDepartmentsMaster(
            res.data.map((s) => ({
              id: s.id,
              department_id: s.department_id,
              code: s.code,
              name: s.name ?? null,
              status: s.status,
            })),
          );
        }
      } catch {
        setSubDepartmentsMaster([]);
      }
    })();
  }, []);

  useEffect(() => {
    void resolveCabinets(filters.departmentId);
  }, [filters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (filters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === filters.cabinetId);
      if (!exists) onFilterChange("cabinetId", "");
    }
  }, [cabinets, filters.cabinetId, onFilterChange]);

  const handleSearchClick = () => {
    if (!departmentDisabled) {
      const allowed = allowedDepartmentIdsRef.current;
      const scopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !filters.departmentId?.trim();
      if (!filters.departmentId?.trim() && !scopeAll) {
        toast.error("กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อมีการจำกัดแผนกให้คุณ)");
        return;
      }
    }
    onSearch();
  };

  const today = getTodayDate();
  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedSubDept = subDepartmentsMaster.find(
    (s) => String(s.id) === appliedFilters.subDepartmentId,
  );
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

  const hasActiveFilters =
    appliedFilters.searchItemCode.trim() !== "" ||
    appliedFilters.departmentId !== "" ||
    appliedFilters.subDepartmentId !== "" ||
    appliedFilters.cabinetId !== "" ||
    appliedFilters.startDate !== today ||
    appliedFilters.endDate !== today;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นหาและกรองรายการเติมอุปกรณ์เข้าตู้</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="staff-return-cabinet-item-keyword" className="text-xs font-medium text-slate-600">
              รหัส/ชื่อเวชภัณฑ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-return-cabinet-item-keyword"
                placeholder="ค้นหา..."
                value={filters.searchItemCode}
                onChange={(e) => onFilterChange("searchItemCode", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className={cn("h-10 pl-9 shadow-sm", fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="staff-return-cabinet-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <DatePickerBE
                id="staff-return-cabinet-start-date"
                value={filters.startDate}
                onChange={(v) => onFilterChange("startDate", v)}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn("h-10 shadow-sm", fieldInputClass)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="staff-return-cabinet-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <DatePickerBE
                id="staff-return-cabinet-end-date"
                value={filters.endDate}
                onChange={(v) => onFilterChange("endDate", v)}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn("h-10 shadow-sm", fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SearchableSelect
              label="Division"
              placeholder={
                canPickAllScopedDepartments
                  ? "เลือก Division หรือทั้งหมด (ตามสิทธิ์ของคุณ)"
                  : "เลือก Division (บังคับ)"
              }
              required={!canPickAllScopedDepartments}
              value={filters.departmentId}
              initialDisplay={
                canPickAllScopedDepartments && !filters.departmentId?.trim()
                  ? {
                      label: "ทั้งหมด",
                      ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
                    }
                  : undefined
              }
              onValueChange={(value) => {
                if (departmentDisabled) return;
                onFilterChange("departmentId", value);
                onFilterChange("subDepartmentId", "");
                onFilterChange("cabinetId", "");
              }}
              options={divisionSelectOptions}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division..."
              disabled={departmentDisabled}
            />
            <SearchableSelect
              label="แผนก"
              placeholder={
                filters.departmentId ? "เลือกแผนก ..." : "กรุณาเลือก Division ก่อน"
              }
              value={filters.subDepartmentId}
              onValueChange={(value) => onFilterChange("subDepartmentId", value)}
              options={subDepartmentOptions}
              disabled={!filters.departmentId || departmentDisabled}
              searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={
                filters.departmentId
                  ? "เลือกตู้ Cabinet (ไม่บังคับ — ว่าง = ทั้งหมด)"
                  : canPickAllScopedDepartments
                    ? "เลือกตู้"
                    : "เลือก Division ก่อน"
              }
              value={filters.cabinetId}
              onValueChange={(value) => onFilterChange("cabinetId", value)}
              options={[
                { value: "", label: "ทั้งหมด" },
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || "",
                  subLabel: cabinet.cabinet_code || "",
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(searchKeyword) => {
                void resolveCabinets(filters.departmentId, searchKeyword);
              }}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
              disabled={!canPickAllScopedDepartments && !filters.departmentId?.trim()}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearchClick} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            onClick={onRefresh}
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
            {appliedFilters.searchItemCode.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {appliedFilters.searchItemCode.trim()}
              </span>
            ) : null}
            {appliedFilters.startDate !== today || appliedFilters.endDate !== today ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {appliedFilters.startDate || "—"} – {appliedFilters.endDate || "—"}
              </span>
            ) : null}
            {appliedFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                Division: {appliedDept?.DepName || appliedFilters.departmentId}
              </span>
            ) : null}
            {appliedFilters.subDepartmentId ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                แผนก: {appliedSubDept?.code || appliedFilters.subDepartmentId}
              </span>
            ) : null}
            {appliedFilters.cabinetId ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  "border-indigo-200 bg-indigo-50 text-indigo-900",
                )}
              >
                ตู้: {appliedCabinet?.cabinet_name || appliedFilters.cabinetId}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={onClear}
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
