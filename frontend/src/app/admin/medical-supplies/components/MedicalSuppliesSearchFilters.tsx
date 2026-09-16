'use client';

import { useMemo, useState } from 'react';
import { Search, RefreshCw, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { todayYyyyMmDdUtc } from '@/lib/formatThaiDateTime';

const fieldInputClass = 'bg-white';

export type DepartmentOption = { ID: number; DepName: string | null; DepName2: string | null };

export type SubDepartmentOption = {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status?: boolean;
};

/** ฟิลด์ที่ฟอร์มค้นหานี้แก้ไขได้ */
export type MedicalSuppliesSearchFilterFields = {
  startDate: string;
  endDate: string;
  itemName: string;
  departmentCode: string;
  usageType: string;
  patientName: string;
  patientHN: string;
  patientEN: string;
};

interface MedicalSuppliesSearchFiltersProps {
  formFilters: MedicalSuppliesSearchFilterFields;
  activeFilters: MedicalSuppliesSearchFilterFields;
  onPatchFormFilters: (patch: Partial<MedicalSuppliesSearchFilterFields>) => void;
  departments: DepartmentOption[];
  subDepartments: SubDepartmentOption[];
  loading: boolean;
  onSearch: () => void;
  onReset: () => void;
  onReload: () => void;
}

export default function MedicalSuppliesSearchFilters({
  formFilters,
  activeFilters,
  onPatchFormFilters,
  departments,
  subDepartments,
  loading,
  onSearch,
  onReset,
  onReload,
}: MedicalSuppliesSearchFiltersProps) {
  const patch = onPatchFormFilters;

  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [subDepartmentSearch, setSubDepartmentSearch] = useState('');
  const [subDepartmentDropdownOpen, setSubDepartmentDropdownOpen] = useState(false);

  const hasMainDepartment = Boolean(formFilters.departmentCode?.trim());
  const today = todayYyyyMmDdUtc();

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
    const deptId = formFilters.departmentCode?.trim();
    const q = subDepartmentSearch.trim().toLowerCase();
    return subDepartments.filter((s) => {
      if (s.status === false) return false;
      if (deptId && String(s.department_id) !== deptId) return false;
      if (!q) return true;
      const code = (s.code || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subDepartments, formFilters.departmentCode, subDepartmentSearch]);

  const appliedDept = departments.find((d) => String(d.ID) === activeFilters.departmentCode);
  const appliedSubDept = subDepartments.find((s) => s.code === activeFilters.usageType);

  const hasActiveFilters =
    activeFilters.itemName.trim() !== '' ||
    activeFilters.patientName.trim() !== '' ||
    activeFilters.patientHN.trim() !== '' ||
    activeFilters.patientEN.trim() !== '' ||
    activeFilters.departmentCode !== '' ||
    activeFilters.usageType !== '' ||
    activeFilters.startDate !== today ||
    activeFilters.endDate !== today;

  const divisionTriggerLabel = () => {
    if (!formFilters.departmentCode) return 'เลือก Division...';
    const d = departments.find((x) => String(x.ID) === formFilters.departmentCode);
    return d?.DepName || d?.DepName2 || `Division ${formFilters.departmentCode}`;
  };

  const subDepartmentTriggerLabel = () => {
    const code = formFilters.usageType?.trim();
    if (!code) return 'เลือกแผนก ...';
    const sub = subDepartments.find((s) => s.code === code);
    if (sub) {
      const n = sub.name?.trim();
      return n ? `${sub.code} · ${n}` : sub.code;
    }
    return code;
  };

  const dropdownTriggerClass = cn(
    'h-10 w-full justify-between font-normal shadow-sm',
    fieldInputClass,
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">วันที่เบิกอุปกรณ์ใช้กับคนไข้</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="ms-item-name" className="text-xs font-medium text-slate-600">
              ค้นหาชื่ออุปกรณ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="ms-item-name"
                placeholder="กรอกชื่ออุปกรณ์ / รหัส / คำอธิบาย..."
                value={formFilters.itemName}
                onChange={(e) => patch({ itemName: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 w-full pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="ms-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <DatePickerBE
                id="ms-start-date"
                value={formFilters.startDate}
                onChange={(v) => patch({ startDate: v })}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="ms-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <DatePickerBE
                id="ms-end-date"
                value={formFilters.endDate}
                onChange={(v) => patch({ endDate: v })}
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>



          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Division</span>
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
                        patch({ departmentCode: '', usageType: '' });
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
                          patch({ departmentCode: String(dept.ID), usageType: '' });
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
            </div>

            <div className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-600">แผนก</span>
              <DropdownMenu open={subDepartmentDropdownOpen} onOpenChange={setSubDepartmentDropdownOpen}>
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
                        patch({ usageType: '' });
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
                            patch({ usageType: sub.code });
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="ms-patient-hn" className="text-xs font-medium text-slate-600">
                HN
              </label>
              <Input
                id="ms-patient-hn"
                placeholder="กรอกเลข HN..."
                value={formFilters.patientHN}
                onChange={(e) => patch({ patientHN: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="ms-patient-en" className="text-xs font-medium text-slate-600">
                EN
              </label>
              <Input
                id="ms-patient-en"
                placeholder="กรอกเลข EN..."
                value={formFilters.patientEN}
                onChange={(e) => patch({ patientEN: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onSearch} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            onClick={onReload}
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={loading}
            aria-label="รีเฟรช"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {activeFilters.itemName.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                อุปกรณ์: {activeFilters.itemName.trim()}
              </span>
            ) : null}
            {activeFilters.patientName.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คนไข้: {activeFilters.patientName.trim()}
              </span>
            ) : null}
            {activeFilters.patientHN.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                HN: {activeFilters.patientHN.trim()}
              </span>
            ) : null}
            {activeFilters.patientEN.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                EN: {activeFilters.patientEN.trim()}
              </span>
            ) : null}
            {activeFilters.startDate !== today || activeFilters.endDate !== today ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {activeFilters.startDate || '—'} – {activeFilters.endDate || '—'}
              </span>
            ) : null}
            {activeFilters.departmentCode ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                Division: {appliedDept?.DepName || activeFilters.departmentCode}
              </span>
            ) : null}
            {activeFilters.usageType ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                แผนก: {appliedSubDept?.code || activeFilters.usageType}
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
