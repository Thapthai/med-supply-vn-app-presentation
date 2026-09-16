'use client';

import { useMemo, useState } from 'react';
import { Search, RefreshCw, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  DepartmentOption,
  SubDepartmentOption,
} from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';

interface WillReturnFilterCardProps {
  departmentId: string;
  cabinetId: string;
  subDepartmentId: string;
  itemCode: string;
  startDate: string;
  endDate: string;
  appliedFilters: AppliedWillReturnFilters;
  departments: DepartmentOption[];
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  /** Master แผนกย่อย — กรองตามแผนกหลักที่เลือก (เหมือนหน้าเวชภัณฑ์) */
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

export default function WillReturnFilterCard({
  departmentId,
  cabinetId,
  subDepartmentId,
  itemCode,
  startDate,
  endDate,
  appliedFilters,
  departments,
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
}: WillReturnFilterCardProps) {
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [subDepartmentSearch, setSubDepartmentSearch] = useState('');
  const [subDepartmentDropdownOpen, setSubDepartmentDropdownOpen] = useState(false);
  const [cabinetSearch, setCabinetSearch] = useState('');
  const [cabinetDropdownOpen, setCabinetDropdownOpen] = useState(false);

  const hasMainDepartment = Boolean(departmentId?.trim()) || departmentLocked;
  const hasSubDepartmentFilter = Boolean(subDepartmentId?.trim());

  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.trim().toLowerCase();
    return departments.filter((d) => {
      if (!q) return true;
      const n1 = (d.DepName || '').toLowerCase();
      const n2 = (d.DepName2 || '').toLowerCase();
      return n1.includes(q) || n2.includes(q);
    });
  }, [departments, departmentSearch]);

  const filteredSubDepartments = useMemo(() => {
    const deptId = departmentId?.trim();
    const q = subDepartmentSearch.trim().toLowerCase();
    return subDepartments.filter((s) => {
      if (s.status === false) return false;
      if (deptId && String(s.department_id) !== deptId) return false;
      if (!q) return true;
      const code = (s.code || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subDepartments, departmentId, subDepartmentSearch]);

  const filteredCabinets = useMemo(() => {
    const q = cabinetSearch.trim().toLowerCase();
    return cabinets.filter((c) => {
      if (!q) return true;
      const code = (c.cabinet_code || '').toLowerCase();
      const name = (c.cabinet_name || '').toLowerCase();
      const idStr = String(c.id);
      return code.includes(q) || name.includes(q) || idStr.includes(q);
    });
  }, [cabinets, cabinetSearch]);

  const lockedDeptLabel =
    departments.find((d) => String(d.ID) === departmentId)?.DepName ||
    departments.find((d) => String(d.ID) === departmentId)?.DepName2 ||
    (departmentId ? `แผนก ${departmentId}` : 'ไม่ระบุแผนก');

  const divisionTriggerLabel = () => {
    if (!departmentId) return 'เลือก Division...';
    const d = departments.find((x) => String(x.ID) === departmentId);
    return d?.DepName || d?.DepName2 || `Division ${departmentId}`;
  };

  const subDepartmentTriggerLabel = () => {
    const idStr = subDepartmentId?.trim();
    if (!idStr) return 'เลือกแผนก ...';
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return idStr;
    const sub = subDepartments.find((s) => s.id === id);
    if (sub) {
      const n = sub.name?.trim();
      return n ? `${sub.code} · ${n}` : sub.code;
    }
    return idStr;
  };

  const cabinetTriggerLabel = () => {
    if (!cabinetId?.trim()) {
      if (hasSubDepartmentFilter && cabinets.length === 0) return 'แผนกนี้ยังไม่มีตู้ที่ผูก';
      if (departmentId && cabinets.length === 0) return 'ไม่มีตู้ในแผนกนี้';
      return 'เลือกตู้ Cabinet...';
    }
    const id = parseInt(cabinetId, 10);
    const c = cabinets.find((x) => x.id === id);
    if (c) return c.cabinet_code || c.cabinet_name || `ตู้ ${c.id}`;
    return `ตู้ ${cabinetId}`;
  };

  const today = getTodayDate();
  const dropdownTriggerClass = cn(
    'h-10 w-full justify-between font-normal shadow-sm',
    fieldInputClass,
  );
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
            <label htmlFor="will-return-item-code" className="text-xs font-medium text-slate-600">
              รหัส/ชื่อเวชภัณฑ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="will-return-item-code"
                placeholder="ค้นหา..."
                value={itemCode}
                onChange={(e) => onItemCodeChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 w-full pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="will-return-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <DatePickerBE
                id="will-return-start-date"
                value={startDate}
                onChange={onStartDateChange}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="will-return-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <DatePickerBE
                id="will-return-end-date"
                value={endDate}
                onChange={onEndDateChange}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Division</span>
              {departmentLocked ? (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground shadow-sm">
                  <span className="truncate">{lockedDeptLabel}</span>
                </div>
              ) : (
                <DropdownMenu open={departmentDropdownOpen} onOpenChange={setDepartmentDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={dropdownTriggerClass} type="button">
                      <span className="truncate text-left">{divisionTriggerLabel()}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
                  >
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="ค้นหา Division..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-auto">
                      <button
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          onDepartmentChange('');
                          onCabinetChange('');
                          onSubDepartmentChange('');
                          setDepartmentDropdownOpen(false);
                          setDepartmentSearch('');
                        }}
                      >
                        -- ทุก Division --
                      </button>
                      {filteredDepartments.map((dept) => (
                        <button
                          key={dept.ID}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            onDepartmentChange(String(dept.ID));
                            onCabinetChange('');
                            onSubDepartmentChange('');
                            setDepartmentDropdownOpen(false);
                            setDepartmentSearch('');
                          }}
                        >
                          {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-600">แผนก</span>
              <DropdownMenu
                open={subDepartmentDropdownOpen}
                onOpenChange={setSubDepartmentDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={dropdownTriggerClass}
                    type="button"
                    disabled={!hasMainDepartment}
                  >
                    <span className="truncate text-left">{subDepartmentTriggerLabel()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
                >
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="ค้นหารหัสหรือชื่อแผนก ..."
                      value={subDepartmentSearch}
                      onChange={(e) => setSubDepartmentSearch(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-auto">
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onSubDepartmentChange('');
                        setSubDepartmentDropdownOpen(false);
                        setSubDepartmentSearch('');
                      }}
                    >
                      -- ทุกแผนก --
                    </button>
                    {!hasMainDepartment ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                        เลือกแผนก (Division) ก่อน
                      </div>
                    ) : filteredSubDepartments.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                    ) : (
                      filteredSubDepartments.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            onSubDepartmentChange(String(sub.id));
                            setSubDepartmentDropdownOpen(false);
                            setSubDepartmentSearch('');
                          }}
                        >
                          <span className="font-mono text-xs">{sub.code}</span>
                          {sub.name ? (
                            <span className="text-muted-foreground"> · {sub.name}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <span className="text-xs font-medium text-slate-600">ตู้ Cabinet</span>
            {!hasMainDepartment ? (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground shadow-sm">
                เลือก Division (แผนกหลัก) ก่อน
              </div>
            ) : (
              <DropdownMenu open={cabinetDropdownOpen} onOpenChange={setCabinetDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={dropdownTriggerClass} type="button">
                    <span className="truncate text-left">{cabinetTriggerLabel()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
                >
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="ค้นหารหัสหรือชื่อตู้ ..."
                      value={cabinetSearch}
                      onChange={(e) => setCabinetSearch(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-auto">
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onCabinetChange('');
                        setCabinetDropdownOpen(false);
                        setCabinetSearch('');
                      }}
                    >
                      -- ทุกตู้ --
                    </button>
                    {cabinets.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                        {hasSubDepartmentFilter
                          ? 'แผนกนี้ยังไม่มีตู้ที่ผูก'
                          : departmentId
                            ? 'ไม่มีตู้ในแผนกนี้'
                            : 'ไม่พบตู้'}
                      </div>
                    ) : filteredCabinets.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                    ) : (
                      filteredCabinets.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            onCabinetChange(String(c.id));
                            setCabinetDropdownOpen(false);
                            setCabinetSearch('');
                          }}
                        >
                          <span className="font-mono text-xs">{c.cabinet_code || String(c.id)}</span>
                          {c.cabinet_name ? (
                            <span className="text-muted-foreground"> · {c.cabinet_name}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onSearch} disabled={loading} className="h-10 gap-2">
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
