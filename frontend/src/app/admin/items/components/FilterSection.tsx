"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, X } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { cabinetApi, departmentApi, cabinetDepartmentApi } from "@/lib/api";
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

type ItemStatusFilter = "all" | "active" | "inactive";

type FormFilters = {
  searchTerm: string;
  departmentId: string;
  cabinetId: string;
  statusFilter: ItemStatusFilter;
};

const defaultFilters: FormFilters = {
  searchTerm: "",
  departmentId: "",
  cabinetId: "",
  statusFilter: "all",
};

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping["cabinet"]): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== "number") return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

interface FilterSectionProps {
  onSearch: (filters: {
    searchTerm: string;
    departmentId: string;
    cabinetId: string;
    statusFilter: string;
    keyword: string;
  }) => void;
  onBeforeSearch?: () => void;
  onReset?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function FilterSection({
  onSearch,
  onBeforeSearch,
  onReset,
  onRefresh,
  loading = false,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [formFilters, setFormFilters] = useState<FormFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FormFilters>(defaultFilters);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword, withCabinet: true });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
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
      if (!departmentIdStr) {
        const response = await cabinetApi.getAll({ page: 1, limit: 50, keyword });
        if (response.success && response.data) {
          const allCabinets = response.data as Cabinet[];
          next = allCabinets.filter((cabinet) => {
            if (cabinet.cabinetDepartments && cabinet.cabinetDepartments.length > 0) {
              return cabinet.cabinetDepartments.some((cd) => cd.status === "ACTIVE");
            }
            return cabinet.cabinet_status === "ACTIVE";
          });
        }
      } else {
        const deptId = parseInt(departmentIdStr, 10);
        if (Number.isNaN(deptId)) {
          setCabinets([]);
          return;
        }
        const response = await cabinetDepartmentApi.getAll({
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
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const cabinetExists = cabinets.some((cabinet) => cabinet.id.toString() === formFilters.cabinetId);
      if (!cabinetExists) {
        setFormFilters((prev) => ({ ...prev, cabinetId: "" }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  const handleSearch = () => {
    onBeforeSearch?.();
    const kw = formFilters.searchTerm.trim();
    const next = { ...formFilters, searchTerm: kw };
    setAppliedFilters(next);
    onSearch({
      ...next,
      searchTerm: kw,
      keyword: kw,
      statusFilter: next.statusFilter,
    });
  };

  const handleClearFilters = () => {
    setFormFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    onReset?.();
  };

  const hasActiveFilters =
    appliedFilters.searchTerm.trim() !== "" ||
    appliedFilters.departmentId !== "" ||
    appliedFilters.cabinetId !== "" ||
    appliedFilters.statusFilter !== "all";

  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

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
              ค้นจากรหัส/ชื่อเวชภัณฑ์ · เลือกแผนก และตู้ Cabinet
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
                placeholder="เช่น รหัส Item, ชื่อเวชภัณฑ์, บาร์โค้ด..."
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
              placeholder="— เลือกแผนก —"
              value={formFilters.departmentId}
              onValueChange={(value) => {
                setFormFilters({
                  ...formFilters,
                  departmentId: value,
                  cabinetId: "",
                });
              }}
              options={[
                { value: "", label: "ทั้งหมด" },
                ...departments.map((dept) => ({
                  value: dept.ID.toString(),
                  label: dept.DepName || "",
                  subLabel: dept.DepName2 || "",
                })),
              ]}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาแผนก..."
            />

            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={formFilters.departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือกแผนกก่อน"}
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
                formFilters.departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"
              }
              disabled={!formFilters.departmentId}
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" onClick={handleSearch} className="h-10 gap-2">
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
                aria-label="รีเฟรช"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            ) : null}
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 justify-end">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {appliedFilters.searchTerm.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {appliedFilters.searchTerm.trim()}
              </span>
            ) : null}
            {appliedFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
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
            {appliedFilters.statusFilter !== "all" ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  appliedFilters.statusFilter === "active"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                {appliedFilters.statusFilter === "active" ? "ใช้งาน" : "ไม่ใช้งาน"}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={handleClearFilters}
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
