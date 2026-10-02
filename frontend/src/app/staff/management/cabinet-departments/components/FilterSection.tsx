"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";
import { cn } from "@/lib/utils";

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

function buildRoleScopeDivisionSummary(depts: Department[]): string {
  const names = depts.map((d) => (d.DepName || "").trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 5).join(", ")} … (+${names.length - 5})`;
}

interface FilterSectionProps {
  onSearch: (filters: {
    cabinetId: string;
    departmentId: string;
    status: string;
  }) => void;
  /** เรียกเมื่อกดรีเซ็ต — ล้างผลค้นหาบนหน้า ไม่ถือว่าเป็นการค้นหาใหม่ */
  onReset?: () => void;
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
}

export default function FilterSection({
  onSearch,
  onReset,
  initialDepartmentId,
  departmentDisabled,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  /** undefined = ยังไม่รู้ scope, null = ไม่จำกัดแผนก, number[] = เฉพาะแผนกที่ role อนุญาต */
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

  const [formFilters, setFormFilters] = useState({
    cabinetId: "",
    departmentId: initialDepartmentId ?? "",
    status: "ALL",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    cabinetId: "",
    departmentId: initialDepartmentId ?? "",
    status: "ALL",
  });

  useEffect(() => {
    if (initialDepartmentId) {
      setFormFilters((prev) => ({ ...prev, departmentId: initialDepartmentId }));
    }
  }, [initialDepartmentId]);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 50,
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
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);

      setLoadingDepartments(true);
      try {
        if (cancelled) return;
        const list = (await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 50,
          allowedDepartmentIds: allowed,
          withCabinet: true,
        })) as Department[];
        if (cancelled) return;
        setDepartments(list);

        setFormFilters((prev) => {
          const nextDept = departmentDisabled
            ? (initialDepartmentId ?? prev.departmentId)
            : clampDepartmentIdString(prev.departmentId || initialDepartmentId, allowed, "");
          return {
            ...prev,
            departmentId: nextDept,
            cabinetId: "",
          };
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentDisabled, initialDepartmentId]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === formFilters.cabinetId);
      if (!exists) {
        setFormFilters((prev) => ({ ...prev, cabinetId: "" }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  const handleSearch = () => {
    setAppliedFilters(formFilters);
    onSearch(formFilters);
  };

  const handleReset = () => {
    const allowed = allowedDepartmentIdsRef.current;
    const defaultDept = departmentDisabled
      ? (initialDepartmentId ?? "")
      : clampDepartmentIdString("", allowed, "");
    const defaultFilters = {
      cabinetId: "",
      departmentId: defaultDept,
      status: "ALL",
    };
    setFormFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    onReset?.();
  };

  const hasActiveFilters =
    appliedFilters.departmentId !== "" || appliedFilters.cabinetId !== "";

  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ""),
    [canPickAllRoleDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllRoleDepartments
        ? [
            {
              value: "",
              label: "ทั้งหมด",
              ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
            },
          ]
        : []),
      ...departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || "",
        subLabel: dept.DepName2 || "",
      })),
    ],
    [canPickAllRoleDepartments, departments, roleScopeDivisionSummary],
  );

  const cabinetSelectEnabled =
    Boolean(formFilters.departmentId?.trim()) || canPickAllRoleDepartments;

  return (
    <Card className="mb-6 border-slate-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">
              เลือกแผนก และตู้ Cabinet เพื่อกรองรายการเชื่อมโยง (ตามสิทธิ์ role)
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect
            label="แผนก"
            placeholder={
              canPickAllRoleDepartments
                ? "เลือกแผนก หรือทั้งหมด (ตาม role)"
                : "เลือกแผนก (บังคับ)"
            }
            required={!canPickAllRoleDepartments}
            value={formFilters.departmentId}
            initialDisplay={
              canPickAllRoleDepartments && !formFilters.departmentId?.trim()
                ? {
                    label: "ทั้งหมด",
                    ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
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
            searchPlaceholder="ค้นหาแผนก..."
            disabled={departmentDisabled}
          />

          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={
              cabinetSelectEnabled
                ? formFilters.departmentId?.trim()
                  ? "ทั้งหมดหรือเลือกตู้ (ในแผนกนี้)"
                  : "ทั้งหมดหรือเลือกตู้ (ตาม role)"
                : "กรุณาเลือกแผนกก่อน"
            }
            value={formFilters.cabinetId}
            onValueChange={(value) => setFormFilters({ ...formFilters, cabinetId: value })}
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
              void resolveCabinets(formFilters.departmentId, searchKeyword);
            }}
            searchPlaceholder={
              cabinetSelectEnabled ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"
            }
            disabled={!cabinetSelectEnabled}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearch} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {appliedFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                แผนก: {appliedDept?.DepName || appliedFilters.departmentId}
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
