"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, X } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { cabinetApi, departmentApi, cabinetDepartmentApi } from "@/lib/api";
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
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
}

type FilterValues = {
  cabinetId: string;
  departmentId: string;
  status: string;
};

const defaultFilters: FilterValues = {
  cabinetId: "",
  departmentId: "",
  status: "ALL",
};

interface FilterSectionProps {
  onSearch: (filters: FilterValues) => void;
  /** เรียกก่อน onSearch เพื่อให้ตารางรีเซ็ตเป็นหน้า 1 */
  onBeforeSearch?: () => void;
}

export default function FilterSection({ onSearch, onBeforeSearch }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [formFilters, setFormFilters] = useState<FilterValues>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(defaultFilters);

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

  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      loadAllCabinets(keyword);
      return;
    }

    try {
      setLoadingCabinets(true);
      const response = await cabinetDepartmentApi.getAll({
        departmentId: parseInt(departmentId),
        keyword: keyword,
      });

      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();

        mappings.forEach((mapping) => {
          if (mapping.cabinet && !uniqueCabinets.has(mapping.cabinet.id)) {
            uniqueCabinets.set(mapping.cabinet.id, {
              id: mapping.cabinet.id,
              cabinet_name: mapping.cabinet.cabinet_name,
              cabinet_code: mapping.cabinet.cabinet_code,
            });
          }
        });

        setCabinets(Array.from(uniqueCabinets.values()));
      } else {
        setCabinets([]);
      }
    } catch (error) {
      console.error("Failed to load cabinets by department:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

  const loadAllCabinets = async (keyword?: string) => {
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

  useEffect(() => {
    loadCabinetsByDepartment(formFilters.departmentId);
  }, [formFilters.departmentId]);

  const handleSearch = () => {
    onBeforeSearch?.();
    setAppliedFilters(formFilters);
    onSearch(formFilters);
  };

  const handleReset = () => {
    setFormFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    onSearch(defaultFilters);
  };

  const hasActiveFilters =
    appliedFilters.departmentId !== "" || appliedFilters.cabinetId !== "";

  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

  return (
    <Card className="mb-6 border-slate-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Search className="h-4 w-4 text-blue-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">เลือกแผนก และตู้ Cabinet เพื่อกรองรายการเชื่อมโยง</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
              if (formFilters.departmentId) {
                loadCabinetsByDepartment(formFilters.departmentId, searchKeyword);
              } else {
                loadAllCabinets(searchKeyword);
              }
            }}
            searchPlaceholder={
              formFilters.departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"
            }
            disabled={!formFilters.departmentId}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <Button type="button" onClick={handleSearch} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="h-10 gap-2 border-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
            รีเซ็ต
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
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
