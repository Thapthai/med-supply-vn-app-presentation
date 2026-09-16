'use client';

import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Dispatch, SetStateAction } from 'react';
import type { LogFilterState } from '../types';
import { getTodayDate } from '../types';

const fieldInputClass = 'bg-white';

type Props = {
  formFilters: LogFilterState;
  activeFilters: LogFilterState;
  setFormFilters: Dispatch<SetStateAction<LogFilterState>>;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading?: boolean;
};

export function LogsFiltersCard({
  formFilters,
  activeFilters,
  setFormFilters,
  onSearch,
  onClearFilters,
  onRefresh,
  loading = false,
}: Props) {
  const today = getTodayDate();
  const hasActiveFilters =
    activeFilters.patient_hn.trim() !== '' ||
    activeFilters.en.trim() !== '' ||
    activeFilters.log_status.trim() !== '' ||
    activeFilters.startDate !== today ||
    activeFilters.endDate !== today;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">กรองตามเลข HN, EN สถานะ หรือช่วงวันที่</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="staff-logs-filter-hn" className="text-xs font-medium text-slate-600">
              HN
            </label>
            <Input
              id="staff-logs-filter-hn"
              placeholder="เลข HN"
              value={formFilters.patient_hn}
              onChange={(e) => setFormFilters((p) => ({ ...p, patient_hn: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-logs-filter-en" className="text-xs font-medium text-slate-600">
              EN
            </label>
            <Input
              id="staff-logs-filter-en"
              placeholder="เลข EN"
              value={formFilters.en}
              onChange={(e) => setFormFilters((p) => ({ ...p, en: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-logs-filter-status" className="text-xs font-medium text-slate-600">
              สถานะ
            </label>
            <Select
              value={formFilters.log_status || 'all'}
              onValueChange={(v) =>
                setFormFilters((p) => ({ ...p, log_status: v === 'all' ? '' : v }))
              }
            >
              <SelectTrigger
                id="staff-logs-filter-status"
                className={cn('h-10 w-full shadow-sm', fieldInputClass)}
              >
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-logs-filter-start-date" className="text-xs font-medium text-slate-600">
              วันที่เริ่ม
            </label>
            <DatePickerBE
              id="staff-logs-filter-start-date"
              value={formFilters.startDate}
              onChange={(v) => setFormFilters((p) => ({ ...p, startDate: v }))}
              placeholder="วว/ดด/ปปปป (ค.ศ.)"
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-logs-filter-end-date" className="text-xs font-medium text-slate-600">
              วันที่สิ้นสุด
            </label>
            <DatePickerBE
              id="staff-logs-filter-end-date"
              value={formFilters.endDate}
              onChange={(v) => setFormFilters((p) => ({ ...p, endDate: v }))}
              placeholder="วว/ดด/ปปปป (ค.ศ.)"
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onSearch} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={onRefresh}
            disabled={loading}
            aria-label="รีเฟรช"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {activeFilters.patient_hn.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                HN: {activeFilters.patient_hn.trim()}
              </span>
            ) : null}
            {activeFilters.en.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                EN: {activeFilters.en.trim()}
              </span>
            ) : null}
            {activeFilters.log_status.trim() ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  activeFilters.log_status === 'SUCCESS'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-red-200 bg-red-50 text-red-800',
                )}
              >
                {activeFilters.log_status}
              </span>
            ) : null}
            {activeFilters.startDate !== today || activeFilters.endDate !== today ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {activeFilters.startDate || '—'} – {activeFilters.endDate || '—'}
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
