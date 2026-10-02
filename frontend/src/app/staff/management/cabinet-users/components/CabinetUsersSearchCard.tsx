'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchableSelect from '@/app/staff/management/cabinet-departments/components/SearchableSelect';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';

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
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
}

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
  };
}

export type CabinetUsersSearchFilters = {
  keyword: string;
  departmentId: string;
  cabinetId: string;
};

export interface CabinetUsersSearchCardProps {
  onSearch: (filters: CabinetUsersSearchFilters) => void;
  onReset?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function CabinetUsersSearchCard({
  onSearch,
  onReset,
  onRefresh,
  loading = false,
}: CabinetUsersSearchCardProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const initialSearchDoneRef = useRef(false);

  const [formFilters, setFormFilters] = useState<CabinetUsersSearchFilters>({
    keyword: '',
    departmentId: '',
    cabinetId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<CabinetUsersSearchFilters>({
    keyword: '',
    departmentId: '',
    cabinetId: '',
  });

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 50,
        allowedDepartmentIds: allowed,
      });
      setDepartments(list as Department[]);
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    const trimmed = departmentIdStr?.trim() ?? '';
    if (!trimmed) {
      setCabinets([]);
      return;
    }
    try {
      setLoadingCabinets(true);
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
          .filter((mapping) => mapping.status === 'ACTIVE')
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !uniqueCabinets.has(mapped.id)) {
              uniqueCabinets.set(mapped.id, mapped);
            }
          });
        setCabinets(Array.from(uniqueCabinets.values()));
      } else {
        setCabinets([]);
      }
    } catch (error) {
      console.error('Failed to load cabinets:', error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;

      setLoadingDepartments(true);
      try {
        const list = (await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 50,
          allowedDepartmentIds: allowed,
        })) as Department[];
        if (cancelled) return;
        setDepartments(list);

        let nextDept = clampDepartmentIdString('', allowed, '');
        if (!nextDept && list.length === 1) {
          nextDept = String(list[0].ID);
        }

        const nextFilters: CabinetUsersSearchFilters = {
          keyword: '',
          departmentId: nextDept,
          cabinetId: '',
        };
        setFormFilters(nextFilters);

        if (nextDept && !initialSearchDoneRef.current) {
          initialSearchDoneRef.current = true;
          setAppliedFilters(nextFilters);
          onSearch(nextFilters);
        }
      } catch (error) {
        console.error('Failed to load departments:', error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onSearch]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === formFilters.cabinetId);
      if (!exists) {
        setFormFilters((prev) => ({ ...prev, cabinetId: '' }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  const divisionSelectOptions = useMemo(
    () =>
      departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || '',
        subLabel: dept.DepName2 || '',
      })),
    [departments],
  );

  const cabinetSelectEnabled = Boolean(formFilters.departmentId?.trim());

  const handleSearch = () => {
    if (!formFilters.departmentId.trim()) {
      toast.error('กรุณาเลือกแผนก');
      return;
    }
    setAppliedFilters(formFilters);
    onSearch(formFilters);
  };

  const handleReset = () => {
    const allowed = allowedDepartmentIdsRef.current;
    let defaultDept = clampDepartmentIdString('', allowed, '');
    if (!defaultDept && departments.length === 1) {
      defaultDept = String(departments[0].ID);
    }
    const defaultFilters: CabinetUsersSearchFilters = {
      keyword: '',
      departmentId: defaultDept,
      cabinetId: '',
    };
    setFormFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    onReset?.();
    if (defaultDept) {
      onSearch(defaultFilters);
    }
  };

  const hasActiveFilters =
    appliedFilters.departmentId !== '' || appliedFilters.cabinetId !== '';

  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

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
              เลือกแผนก และตู้ Cabinet เพื่อกรองรายการผู้ใช้ในตู้ (ตามสิทธิ์ role)
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect
            label="แผนก"
            placeholder="เลือกแผนก (บังคับ)"
            required
            value={formFilters.departmentId}
            onValueChange={(value) => {
              setFormFilters((prev) => ({ ...prev, departmentId: value, cabinetId: '' }));
            }}
            options={divisionSelectOptions}
            loading={loadingDepartments}
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาแผนก..."
          />

          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={
              cabinetSelectEnabled
                ? 'ทั้งหมดหรือเลือกตู้ (ในแผนกนี้)'
                : 'กรุณาเลือกแผนกก่อน'
            }
            value={formFilters.cabinetId}
            onValueChange={(value) => {
              setFormFilters((prev) => ({ ...prev, cabinetId: value }));
            }}
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
              void resolveCabinets(formFilters.departmentId, searchKeyword);
            }}
            searchPlaceholder={
              cabinetSelectEnabled ? 'ค้นหารหัสหรือชื่อตู้...' : 'กรุณาเลือกแผนกก่อน'
            }
            disabled={!cabinetSelectEnabled}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5 md:col-span-2">
            <label htmlFor="staff-cabinet-user-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-cabinet-user-keyword"
                placeholder="เช่น UserName, EmpCode..."
                value={formFilters.keyword}
                onChange={(e) => setFormFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>
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
                แผนก: {appliedDept?.DepName || appliedFilters.departmentId}
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
            {appliedFilters.keyword.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
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
