'use client';

import { RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import { formatCEToDMY } from '@/lib/datePickerBE';

export type PrintStickerHistoryFilters = {
  keyword: string;
  startDate: string;
  endDate: string;
  source: string;
  status: '' | 'SUCCESS' | 'ERROR';
  departmentId: string;
  cabinetId: string;
};

export const EMPTY_PRINT_HISTORY_FILTERS: PrintStickerHistoryFilters = {
  keyword: '',
  startDate: '',
  endDate: '',
  source: '',
  status: '',
  departmentId: '',
  cabinetId: '',
};

type Props = {
  formFilters: PrintStickerHistoryFilters;
  activeFilters: PrintStickerHistoryFilters;
  onFormChange: (patch: Partial<PrintStickerHistoryFilters>) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading?: boolean;
  departmentOptions: { value: string; label: string; subLabel?: string }[];
  cabinetOptions: { value: string; label: string; subLabel?: string }[];
  loadingDepartments?: boolean;
  loadingCabinets?: boolean;
  onSearchDepartments?: (keyword?: string) => void;
  onSearchCabinets?: (keyword?: string) => void;
};

function hasAnyFilter(f: PrintStickerHistoryFilters): boolean {
  return Boolean(
    f.keyword.trim() ||
      f.startDate ||
      f.endDate ||
      f.source ||
      f.status ||
      f.departmentId ||
      f.cabinetId,
  );
}

function sourceLabel(source: string): string {
  if (source === 'printLabel-items') return 'พิมพ์หลายรายการ';
  if (source === 'printLabel-item') return 'พิมพ์รายการเดียว';
  if (source === 'printLabel') return 'ทดพิมพ์';
  if (source === 'manual') return 'บันทึกเอง';
  return source;
}

export default function PrintStickerHistoryFilterCard({
  formFilters,
  activeFilters,
  onFormChange,
  onSearch,
  onClearFilters,
  onRefresh,
  loading = false,
  departmentOptions,
  cabinetOptions,
  loadingDepartments = false,
  loadingCabinets = false,
  onSearchDepartments,
  onSearchCabinets,
}: Props) {
  const fieldInputClass = 'bg-white';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Search className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">กรองตามแผนก ตู้จาก mapping รายการ ช่วงวันที่ หรือสถานะ</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SearchableSelect
            label="Division"
            placeholder="ทั้งหมด"
            value={formFilters.departmentId}
            allowClear
            clearLabel="ทั้งหมด"
            onValueChange={(v) => onFormChange({ departmentId: v, cabinetId: '' })}
            options={departmentOptions}
            loading={loadingDepartments}
            onSearch={onSearchDepartments}
          />
          <SearchableSelect
            label="ตู้"
            placeholder={formFilters.departmentId ? 'ทั้งหมด' : 'เลือก Division ก่อน'}
            value={formFilters.cabinetId}
            allowClear={!!formFilters.departmentId}
            clearLabel="ทั้งหมด"
            disabled={!formFilters.departmentId}
            onValueChange={(v) => onFormChange({ cabinetId: v })}
            options={cabinetOptions}
            loading={loadingCabinets}
            onSearch={(kw) => (formFilters.departmentId ? onSearchCabinets?.(kw) : undefined)}
          />
          <div className="space-y-1.5">
            <label htmlFor="print-history-keyword" className="text-xs font-medium text-slate-600">
              รายการ
            </label>
            <Input
              id="print-history-keyword"
              placeholder="itemcode หรือชื่อ"
              value={formFilters.keyword}
              onChange={(e) => onFormChange({ keyword: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print-history-start" className="text-xs font-medium text-slate-600">
              วันที่เริ่ม
            </label>
            <DatePickerBE
              id="print-history-start"
              value={formFilters.startDate}
              onChange={(v) => onFormChange({ startDate: v })}
              placeholder="เลือกวันที่"
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print-history-end" className="text-xs font-medium text-slate-600">
              วันที่สิ้นสุด
            </label>
            <DatePickerBE
              id="print-history-end"
              value={formFilters.endDate}
              onChange={(v) => onFormChange({ endDate: v })}
              placeholder="เลือกวันที่"
              className={cn('h-10 shadow-sm', fieldInputClass)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print-history-source" className="text-xs font-medium text-slate-600">
              ประเภท
            </label>
            <Select
              value={formFilters.source || 'all'}
              onValueChange={(v) => onFormChange({ source: v === 'all' ? '' : v })}
            >
              <SelectTrigger
                id="print-history-source"
                className={cn('h-10 w-full shadow-sm', fieldInputClass)}
              >
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="printLabel-items">พิมพ์หลายรายการ</SelectItem>
                <SelectItem value="printLabel-item">พิมพ์รายการเดียว</SelectItem>
                <SelectItem value="printLabel">ทดพิมพ์</SelectItem>
                <SelectItem value="manual">บันทึกเอง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print-history-status" className="text-xs font-medium text-slate-600">
              สถานะ
            </label>
            <Select
              value={formFilters.status || 'all'}
              onValueChange={(v) =>
                onFormChange({ status: v === 'all' ? '' : (v as 'SUCCESS' | 'ERROR') })
              }
            >
              <SelectTrigger
                id="print-history-status"
                className={cn('h-10 w-full shadow-sm', fieldInputClass)}
              >
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="SUCCESS">สำเร็จ</SelectItem>
                <SelectItem value="ERROR">ไม่สำเร็จ</SelectItem>
              </SelectContent>
            </Select>
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

        {hasAnyFilter(activeFilters) ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {activeFilters.keyword.trim() ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                รายการ: {activeFilters.keyword.trim()}
              </span>
            ) : null}
            {activeFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                Division:{' '}
                {departmentOptions.find((o) => o.value === activeFilters.departmentId)?.label ||
                  activeFilters.departmentId}
              </span>
            ) : null}
            {activeFilters.cabinetId ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                ตู้:{' '}
                {cabinetOptions.find((o) => o.value === activeFilters.cabinetId)?.label ||
                  activeFilters.cabinetId}
              </span>
            ) : null}
            {activeFilters.startDate || activeFilters.endDate ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {activeFilters.startDate ? formatCEToDMY(activeFilters.startDate) : '—'} –{' '}
                {activeFilters.endDate ? formatCEToDMY(activeFilters.endDate) : '—'}
              </span>
            ) : null}
            {activeFilters.source ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {sourceLabel(activeFilters.source)}
              </span>
            ) : null}
            {activeFilters.status ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  activeFilters.status === 'SUCCESS'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800',
                )}
              >
                {activeFilters.status === 'SUCCESS' ? 'สำเร็จ' : 'ไม่สำเร็จ'}
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
