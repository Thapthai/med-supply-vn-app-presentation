'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import SearchableSelect from '@/app/staff/management/cabinet-departments/components/SearchableSelect';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';

const fieldInputClass = 'bg-white';

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
}

function buildRoleScopeDivisionSummary(depts: Department[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

export type CabinetsSearchFilters = {
  keyword: string;
  departmentId: string;
};

export interface CabinetsSearchCardProps {
  onSearch: (filters: CabinetsSearchFilters) => void;
  onReset?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CabinetsSearchCard({
  onSearch,
  onReset,
  onRefresh,
  loading = false,
}: CabinetsSearchCardProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

  const [formFilters, setFormFilters] = useState<CabinetsSearchFilters>({
    keyword: '',
    departmentId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<CabinetsSearchFilters>({
    keyword: '',
    departmentId: '',
  });

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
      console.error('Failed to load departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);

      setLoadingDepartments(true);
      try {
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 50,
          allowedDepartmentIds: allowed,
          withCabinet: true,
        });
        if (cancelled) return;
        setDepartments(list as Department[]);

        setFormFilters((prev) => ({
          ...prev,
          departmentId: clampDepartmentIdString(prev.departmentId, allowed, ''),
        }));
      } catch (error) {
        console.error('Failed to load departments:', error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ''),
    [canPickAllRoleDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllRoleDepartments
        ? [
            {
              value: '',
              label: 'ทั้งหมด',
              ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
            },
          ]
        : []),
      ...departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || '',
        subLabel: dept.DepName2 || '',
      })),
    ],
    [canPickAllRoleDepartments, departments, roleScopeDivisionSummary],
  );

  const handleSearch = () => {
    setAppliedFilters(formFilters);
    onSearch(formFilters);
  };

  const handleReset = () => {
    const allowed = allowedDepartmentIdsRef.current;
    const defaultFilters: CabinetsSearchFilters = {
      keyword: '',
      departmentId: clampDepartmentIdString('', allowed, ''),
    };
    setFormFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    onReset?.();
    onSearch(defaultFilters);
  };

  const hasActiveFilters =
    appliedFilters.keyword.trim() !== '' || appliedFilters.departmentId !== '';
  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);

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
              เลือก Division ตามสิทธิ์ role และค้นหาตู้ Cabinet
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="staff-cabinet-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-cabinet-keyword"
                placeholder="เช่น ตู้ A1, CAB-001..."
                value={formFilters.keyword}
                onChange={(e) => setFormFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <SearchableSelect
            label="Division"
            placeholder={
              canPickAllRoleDepartments
                ? 'เลือก Division หรือทั้งหมด (ตาม role)'
                : 'เลือก Division (บังคับ)'
            }
            required={!canPickAllRoleDepartments}
            value={formFilters.departmentId}
            initialDisplay={
              canPickAllRoleDepartments && !formFilters.departmentId?.trim()
                ? {
                    label: 'ทั้งหมด',
                    ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                  }
                : undefined
            }
            onValueChange={(value) => {
              setFormFilters((prev) => ({ ...prev, departmentId: value }));
            }}
            options={divisionSelectOptions}
            loading={loadingDepartments}
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหา Division..."
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearch} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={onRefresh}
            aria-label="รีเฟรช"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {appliedFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                Division: {appliedDept?.DepName || appliedFilters.departmentId}
              </span>
            ) : canPickAllRoleDepartments ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                Division: ทั้งหมด (ตาม role)
              </span>
            ) : null}
            {appliedFilters.keyword.trim() ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  'border-indigo-200 bg-indigo-50 text-indigo-900',
                )}
              >
                คำค้น: {appliedFilters.keyword.trim()}
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
