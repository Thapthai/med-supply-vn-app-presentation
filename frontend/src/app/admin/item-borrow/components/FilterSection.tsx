'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { cabinetApi, cabinetDepartmentApi, departmentApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';

type Department = {
  ID: number;
  DepName?: string;
  DepName2?: string;
};

type Cabinet = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
  cabinetDepartments?: Array<{ id: number; department_id: number; status: string }>;
};

type CabinetDepartmentMapping = {
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
};

export type BorrowFilterState = {
  searchItemCode: string;
  startDate: string;
  endDate: string;
  departmentId: string;
  cabinetId: string;
  borrowDepartmentId: string;
};

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

type Props = {
  filters: BorrowFilterState;
  appliedFilters: BorrowFilterState;
  onFilterChange: (key: keyof BorrowFilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
};

export default function FilterSection({
  filters,
  appliedFilters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  loading,
}: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword, withCabinet: true });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  };

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
              return cabinet.cabinetDepartments.some((cd) => cd.status === 'ACTIVE');
            }
            return cabinet.cabinet_status === 'ACTIVE';
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
            .filter((mapping) => mapping.status === 'ACTIVE')
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
      console.error('Failed to load cabinets:', error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    void resolveCabinets(filters.departmentId);
  }, [filters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (filters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === filters.cabinetId);
      if (!exists) onFilterChange('cabinetId', '');
    }
  }, [cabinets, filters.cabinetId, onFilterChange]);

  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);
  const appliedBorrowDept = departments.find((d) => d.ID.toString() === appliedFilters.borrowDepartmentId);

  const hasActiveFilters =
    appliedFilters.searchItemCode.trim() !== '' ||
    appliedFilters.departmentId !== '' ||
    appliedFilters.cabinetId !== '' ||
    appliedFilters.borrowDepartmentId !== '' ||
    appliedFilters.startDate !== '' ||
    appliedFilters.endDate !== '';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นหาและกรองรายการยืมอุปกรณ์</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="borrow-item-keyword" className="text-xs font-medium text-slate-600">
              รหัส/ชื่อเวชภัณฑ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="borrow-item-keyword"
                placeholder="ค้นหา..."
                value={filters.searchItemCode}
                onChange={(e) => onFilterChange('searchItemCode', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="borrow-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <DatePickerBE
                id="borrow-start-date"
                value={filters.startDate}
                onChange={(v) => onFilterChange('startDate', v)}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="borrow-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <DatePickerBE
                id="borrow-end-date"
                value={filters.endDate}
                onChange={(v) => onFilterChange('endDate', v)}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SearchableSelect
              label="Division (ที่ตั้งตู้)"
              placeholder="เลือก Division"
              value={filters.departmentId}
              onValueChange={(value) => {
                onFilterChange('departmentId', value);
                onFilterChange('cabinetId', '');
              }}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...departments.map((dept) => ({
                  value: dept.ID.toString(),
                  label: dept.DepName || '',
                  subLabel: dept.DepName2 || '',
                })),
              ]}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division..."
            />
            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={filters.departmentId ? 'เลือกตู้ Cabinet' : 'เลือกตู้ (ทุก Division ที่มีการเชื่อม)'}
              value={filters.cabinetId}
              onValueChange={(value) => onFilterChange('cabinetId', value)}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || '',
                  subLabel: cabinet.cabinet_code || '',
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(searchKeyword) => {
                void resolveCabinets(filters.departmentId, searchKeyword);
              }}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SearchableSelect
              label="Division ที่ยืม"
              placeholder="เลือก Division ที่ยืม"
              value={filters.borrowDepartmentId}
              onValueChange={(value) => onFilterChange('borrowDepartmentId', value)}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...departments.map((dept) => ({
                  value: dept.ID.toString(),
                  label: dept.DepName || '',
                  subLabel: dept.DepName2 || '',
                })),
              ]}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division ที่ยืม..."
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <Button type="button" onClick={onSearch} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button type="button" onClick={onClear} variant="outline" className="h-10">
            ล้าง
          </Button>
          <Button
            type="button"
            onClick={onRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label="รีเฟรช"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
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
            {appliedFilters.startDate || appliedFilters.endDate ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {appliedFilters.startDate || '—'} – {appliedFilters.endDate || '—'}
              </span>
            ) : null}
            {appliedFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                Division: {appliedDept?.DepName || appliedFilters.departmentId}
              </span>
            ) : null}
            {appliedFilters.cabinetId ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  'border-indigo-200 bg-indigo-50 text-indigo-900',
                )}
              >
                ตู้: {appliedCabinet?.cabinet_name || appliedFilters.cabinetId}
              </span>
            ) : null}
            {appliedFilters.borrowDepartmentId ? (
              <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900">
                ยืม: {appliedBorrowDept?.DepName || appliedFilters.borrowDepartmentId}
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
