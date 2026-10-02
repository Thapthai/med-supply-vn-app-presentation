'use client';

import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StatusFilter } from '../types';

const fieldInputClass = 'bg-white';

export interface SubDepartmentsFiltersProps {
  deptKeywordInput: string;
  activeDeptKeyword: string;
  subKeywordInput: string;
  activeSubKeyword: string;
  statusFilter: StatusFilter;
  onDeptKeywordInputChange: (value: string) => void;
  onSubKeywordInputChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function SubDepartmentsFilters({
  deptKeywordInput,
  activeDeptKeyword,
  subKeywordInput,
  activeSubKeyword,
  statusFilter,
  onDeptKeywordInputChange,
  onSubKeywordInputChange,
  onStatusFilterChange,
  onSearch,
  onClearFilters,
  onRefresh,
  loading = false,
}: SubDepartmentsFiltersProps) {
  const hasActiveFilters =
    activeDeptKeyword.trim() !== '' ||
    activeSubKeyword.trim() !== '' ||
    statusFilter !== 'all';

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
              ค้นหาแผนก หรือรหัสแผนกย่อย (code, ชื่อ, รายละเอียด)
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px] lg:items-end">
          <div className="space-y-1.5">
            <label htmlFor="dept-keyword" className="text-xs font-medium text-slate-600">
              ค้นหาแผนก
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="dept-keyword"
                placeholder="ชื่อ, ชื่อย่อ, ID, RefDepID..."
                value={deptKeywordInput}
                onChange={(e) => onDeptKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-dept-keyword" className="text-xs font-medium text-slate-600">
              ค้นหารหัสแผนก
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="sub-dept-keyword"
                placeholder="code, ชื่อ, รายละเอียด..."
                value={subKeywordInput}
                onChange={(e) => onSubKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-dept-status-filter" className="text-xs font-medium text-slate-600">
              สถานะ
            </label>
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
              <SelectTrigger id="sub-dept-status-filter" className={cn('h-10 w-full shadow-sm', fieldInputClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-full flex justify-end gap-2">
            <Button type="button" onClick={onSearch} className="h-10 gap-2">
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
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {activeDeptKeyword.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                แผนก: {activeDeptKeyword.trim()}
              </span>
            ) : null}
            {activeSubKeyword.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                รหัสแผนก: {activeSubKeyword.trim()}
              </span>
            ) : null}
            {statusFilter !== 'all' ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  statusFilter === 'active'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700',
                )}
              >
                {statusFilter === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={onClearFilters}
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
