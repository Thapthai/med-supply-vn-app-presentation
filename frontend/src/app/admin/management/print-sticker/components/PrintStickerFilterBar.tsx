'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { cabinetApi, cabinetDepartmentApi, departmentApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Department = { ID: number; DepName?: string; DepName2?: string };

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

function mapCabinetFromMapping(m: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!m || typeof m.id !== 'number') return null;
  return {
    id: m.id,
    cabinet_name: m.cabinet_name,
    cabinet_code: m.cabinet_code,
    cabinet_status: m.cabinet_status,
  };
}

type PrintStickerFilterBarProps = {
  departmentId: string;
  cabinetId: string;
  onDepartmentIdChange: (id: string) => void;
  onCabinetIdChange: (id: string) => void;
};

export function PrintStickerFilterBar({
  departmentId,
  cabinetId,
  onDepartmentIdChange,
  onCabinetIdChange,
}: PrintStickerFilterBarProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch {
      // ignore
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
          const all = response.data as Cabinet[];
          next = all.filter((cabinet) => {
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
          const unique = new Map<number, Cabinet>();
          mappings
            .filter((mapping) => mapping.status === 'ACTIVE')
            .forEach((mapping) => {
              const mapped = mapCabinetFromMapping(mapping.cabinet);
              if (mapped && !unique.has(mapped.id)) {
                unique.set(mapped.id, mapped);
              }
            });
          next = Array.from(unique.values());
        }
      }
      setCabinets(next);
    } catch {
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    void resolveCabinets(departmentId);
  }, [departmentId, resolveCabinets]);

  useEffect(() => {
    if (cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === cabinetId);
      if (!exists) {
        onCabinetIdChange('');
      }
    }
  }, [cabinets, cabinetId, onCabinetIdChange]);

  const handleClear = () => {
    onDepartmentIdChange('');
    onCabinetIdChange('');
  };

  const hasActiveFilters = departmentId !== '' || cabinetId !== '';
  const selectedDept = departments.find((d) => d.ID.toString() === departmentId);
  const selectedCabinet = cabinets.find((c) => c.id.toString() === cabinetId);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Search className="h-4 w-4 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">กรอง แผนก และตู้</p>
              <p className="text-xs text-slate-500">เลือกแผนก และตู้เพื่อโหลดรายการสติกเกอร์</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SearchableSelect
              label="แผนก"
              placeholder="เลือกแผนก"
              value={departmentId}
              onValueChange={(value) => {
                onDepartmentIdChange(value);
                onCabinetIdChange('');
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
              searchPlaceholder="ค้นหาชื่อแผนก..."
            />

            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={departmentId ? 'เลือกตู้ Cabinet' : 'กรุณาเลือกแผนกก่อน'}
              value={cabinetId}
              onValueChange={onCabinetIdChange}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || '',
                  subLabel: cabinet.cabinet_code || '',
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(kw) => {
                void resolveCabinets(departmentId, kw);
              }}
              searchPlaceholder={departmentId ? 'ค้นหารหัสหรือชื่อตู้…' : 'กรุณาเลือกแผนกก่อน'}
              disabled={!departmentId}
            />
          </div>

          {hasActiveFilters ? (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
              <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
              {departmentId ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                  แผนก: {selectedDept?.DepName || departmentId}
                </span>
              ) : null}
              {cabinetId ? (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    'border-violet-200 bg-violet-50 text-violet-900',
                  )}
                >
                  ตู้: {selectedCabinet?.cabinet_name || cabinetId}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-slate-600"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
                ล้างตัวกรอง
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
