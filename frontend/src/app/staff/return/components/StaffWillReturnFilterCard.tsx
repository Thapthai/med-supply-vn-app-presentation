'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { cn } from '@/lib/utils';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';
import type { SubDepartmentOption } from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';

const fieldInputClass = 'bg-white';

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type AppliedWillReturnFilters = {
  departmentId: string;
  cabinetId: string;
  subDepartmentId: string;
  itemCode: string;
  startDate: string;
  endDate: string;
};

export type DepartmentOption = { ID: number; DepName?: string | null; DepName2?: string | null };

function buildRoleScopeDivisionSummary(depts: DepartmentOption[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

interface StaffWillReturnFilterCardProps {
  departmentId: string;
  cabinetId: string;
  subDepartmentId: string;
  itemCode: string;
  startDate: string;
  endDate: string;
  appliedFilters: AppliedWillReturnFilters;
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  subDepartments: SubDepartmentOption[];
  onDepartmentChange: (value: string) => void;
  onCabinetChange: (value: string) => void;
  onSubDepartmentChange: (value: string) => void;
  onItemCodeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefresh?: () => void;
  loading: boolean;
  departmentLocked?: boolean;
}

export default function StaffWillReturnFilterCard({
  departmentId,
  cabinetId,
  subDepartmentId,
  itemCode,
  startDate,
  endDate,
  appliedFilters,
  cabinets,
  subDepartments,
  onDepartmentChange,
  onCabinetChange,
  onSubDepartmentChange,
  onItemCodeChange,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  onReset,
  onRefresh,
  loading,
  departmentLocked = false,
}: StaffWillReturnFilterCardProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

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
        value: String(dept.ID),
        label: dept.DepName || '',
        subLabel: dept.DepName2 || '',
      })),
    ],
    [canPickAllRoleDepartments, departments, roleScopeDivisionSummary],
  );

  const subDepartmentOptions = useMemo(() => {
    const deptId = departmentId?.trim();
    if (!deptId) {
      return [{ value: '', label: 'ทั้งหมด' }];
    }
    const rows = subDepartments.filter(
      (s) => s.status !== false && String(s.department_id) === deptId,
    );
    return [
      { value: '', label: 'ทั้งหมด' },
      ...rows.map((s) => ({
        value: String(s.id),
        label: s.code,
        subLabel: s.name?.trim() || '',
      })),
    ];
  }, [subDepartments, departmentId]);

  const cabinetSelectOptions = useMemo(() => {
    const opts: { value: string; label: string; subLabel?: string }[] = [];
    if (cabinets.length > 0) {
      opts.push({ value: '', label: '-- ทุกตู้ --' });
    }
    for (const c of cabinets) {
      opts.push({
        value: String(c.id),
        label: c.cabinet_code || String(c.id),
        subLabel: c.cabinet_name || '',
      });
    }
    return opts;
  }, [cabinets]);

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
        limit: 200,
        allowedDepartmentIds: allowed,
      });
      setDepartments(list as DepartmentOption[]);
    } catch (e) {
      console.error('Failed to load departments:', e);
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
      if (cancelled || departmentLocked) return;
      const nextDept = clampDepartmentIdString(departmentId, allowed, '');
      if (nextDept !== departmentId) {
        onDepartmentChange(nextDept);
        onCabinetChange('');
        onSubDepartmentChange('');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + clamp
  }, [departmentLocked, loadDepartments]);

  const lockedDeptLabel =
    departments.find((d) => String(d.ID) === departmentId)?.DepName ||
    departments.find((d) => String(d.ID) === departmentId)?.DepName2 ||
    (departmentId ? `แผนก ${departmentId}` : 'ไม่ระบุแผนก');

  const handleSearchClick = () => {
    if (!departmentLocked) {
      const allowed = allowedDepartmentIdsRef.current;
      const roleScopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !departmentId?.trim();
      if (!departmentId?.trim() && !roleScopeAll) {
        toast.error('กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)');
        return;
      }
    }
    onSearch();
  };

  const hasMainDepartment = Boolean(departmentId?.trim()) || departmentLocked;
  const cabinetPlaceholder = !hasMainDepartment
    ? 'เลือก Division (แผนกหลัก) ก่อน'
    : cabinets.length === 0
      ? 'ไม่มีตู้ในแผนกนี้'
      : 'เลือกตู้หรือทุกตู้';

  const today = getTodayDate();
  const appliedDept = departments.find((d) => String(d.ID) === appliedFilters.departmentId);
  const appliedSubDept = subDepartments.find(
    (s) => String(s.id) === appliedFilters.subDepartmentId,
  );
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

  const hasActiveFilters =
    appliedFilters.itemCode.trim() !== '' ||
    appliedFilters.departmentId !== '' ||
    appliedFilters.subDepartmentId !== '' ||
    appliedFilters.cabinetId !== '' ||
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
            <p className="text-xs text-slate-500">รายการอุปกรณ์ที่รอแจ้งคืน</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="staff-will-return-item-code" className="text-xs font-medium text-slate-600">
              รหัส/ชื่อเวชภัณฑ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-will-return-item-code"
                placeholder="ค้นหา..."
                value={itemCode}
                onChange={(e) => onItemCodeChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                className={cn('h-10 w-full pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="staff-will-return-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <DatePickerBE
                id="staff-will-return-start-date"
                value={startDate}
                onChange={onStartDateChange}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="staff-will-return-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <DatePickerBE
                id="staff-will-return-end-date"
                value={endDate}
                onChange={onEndDateChange}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              {departmentLocked ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Division</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground shadow-sm">
                    <span className="truncate">{lockedDeptLabel}</span>
                  </div>
                </div>
              ) : (
                <SearchableSelect
                  label="Division"
                  placeholder={
                    canPickAllRoleDepartments
                      ? 'เลือก Division หรือทั้งหมด (ตาม role)'
                      : 'เลือก Division (บังคับ)'
                  }
                  required={!canPickAllRoleDepartments}
                  value={departmentId}
                  initialDisplay={
                    canPickAllRoleDepartments && !departmentId?.trim()
                      ? {
                          label: 'ทั้งหมด',
                          ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                        }
                      : undefined
                  }
                  onValueChange={(value) => {
                    onDepartmentChange(value);
                    onCabinetChange('');
                    onSubDepartmentChange('');
                  }}
                  options={divisionSelectOptions}
                  loading={loadingDepartments}
                  onSearch={loadDepartments}
                  searchPlaceholder="ค้นหาชื่อ Division..."
                />
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <SearchableSelect
                label="แผนก"
                placeholder={
                  departmentId?.trim()
                    ? 'เลือกแผนก ...'
                    : 'เลือก Division เฉพาะก่อน ถ้าต้องการกรองแผนกย่อย'
                }
                value={subDepartmentId}
                onValueChange={onSubDepartmentChange}
                options={subDepartmentOptions}
                disabled={!hasMainDepartment}
                searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
              />
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            {!hasMainDepartment ? (
              <>
                <Label className="text-xs font-medium text-slate-600">ตู้ Cabinet</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground shadow-sm">
                  เลือก Division (แผนกหลัก) ก่อน
                </div>
              </>
            ) : (
              <SearchableSelect
                label="ตู้ Cabinet"
                placeholder={cabinetPlaceholder}
                value={cabinetId}
                onValueChange={onCabinetChange}
                options={cabinetSelectOptions}
                disabled={cabinets.length === 0}
                searchPlaceholder="ค้นหารหัสหรือชื่อตู้ ..."
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearchClick} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          {onRefresh ? (
            <Button
              type="button"
              onClick={onRefresh}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={loading}
              aria-label="รีเฟรช"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {appliedFilters.itemCode.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {appliedFilters.itemCode.trim()}
              </span>
            ) : null}
            {appliedFilters.startDate !== today || appliedFilters.endDate !== today ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {appliedFilters.startDate || '—'} – {appliedFilters.endDate || '—'}
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
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  'border-indigo-200 bg-indigo-50 text-indigo-900',
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
