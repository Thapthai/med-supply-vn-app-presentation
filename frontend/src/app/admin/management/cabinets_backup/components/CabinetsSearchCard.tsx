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
import { CABINET_TYPE_OPTIONS, type CabinetTypeCode } from './cabinetTypes';

const fieldInputClass = 'bg-white';

export interface CabinetsSearchCardProps {
  keywordInput: string;
  activeKeyword: string;
  typeFilter: CabinetTypeCode | 'all';
  onKeywordInputChange: (value: string) => void;
  onTypeFilterChange: (value: CabinetTypeCode | 'all') => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function CabinetsSearchCard({
  keywordInput,
  activeKeyword,
  typeFilter,
  onKeywordInputChange,
  onTypeFilterChange,
  onSearch,
  onClearFilters,
  onRefresh,
  loading = false,
}: CabinetsSearchCardProps) {
  const hasActiveFilters = activeKeyword.trim() !== '' || typeFilter !== 'all';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Search className="h-4 w-4 text-blue-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นจากชื่อตู้ หรือรหัสตู้ และกรองตามประเภท RFID / WEIGHING</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="cabinet-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="cabinet-keyword"
                placeholder="เช่น ตู้ A1, CAB-001..."
                value={keywordInput}
                onChange={(e) => onKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cabinet-type-filter" className="text-xs font-medium text-slate-600">
              ประเภทตู้
            </label>
            <Select
              value={typeFilter}
              onValueChange={(v) => onTypeFilterChange(v as CabinetTypeCode | 'all')}
            >
              <SelectTrigger id="cabinet-type-filter" className={cn('h-10 w-full shadow-sm', fieldInputClass)}>
                <SelectValue placeholder="ทุกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {CABINET_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
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
            {activeKeyword.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                คำค้น: {activeKeyword.trim()}
              </span>
            ) : null}
            {typeFilter !== 'all' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                ประเภท: {typeFilter}
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
