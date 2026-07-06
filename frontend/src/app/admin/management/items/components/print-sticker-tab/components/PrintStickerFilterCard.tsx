'use client';

import { Zap, LayoutList, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import type { PrintMode, SelectOption } from '../types';

type Props = {
  mode: PrintMode;
  onModeChange: (mode: PrintMode) => void;
  departmentId: string;
  onDepartmentIdChange: (id: string) => void;
  cabinetId: string;
  onCabinetIdChange: (id: string) => void;
  cabinetStockId: number | null;
  departmentSelectOptions: SelectOption[];
  cabOptions: SelectOption[];
  loadingDepartments: boolean;
  loadingCabinets: boolean;
  onSearchDepartments: (keyword?: string) => void;
  onSearchCabinets: (keyword?: string) => void;
  manualFilterIncomplete: boolean;
  reloadDisabled: boolean;
  reloadButtonLabel: string;
  loadingList: boolean;
  onReload: () => void;
};

export default function PrintStickerFilterCard({
  mode,
  onModeChange,
  departmentId,
  onDepartmentIdChange,
  cabinetId,
  onCabinetIdChange,
  cabinetStockId,
  departmentSelectOptions,
  cabOptions,
  loadingDepartments,
  loadingCabinets,
  onSearchDepartments,
  onSearchCabinets,
  manualFilterIncomplete,
  reloadDisabled,
  reloadButtonLabel,
  loadingList,
  onReload,
}: Props) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex flex-col gap-6 pt-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onModeChange('auto')}
            className={cn(
              'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'auto'
                ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                : 'border-slate-200 hover:bg-muted/40',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Zap className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 space-y-0.5">
              <span className="block text-lg font-medium text-slate-900">Auto</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('manual')}
            className={cn(
              'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'manual'
                ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                : 'border-slate-200 hover:bg-muted/40',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <LayoutList className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 space-y-0.5">
              <span className="block text-lg font-medium text-slate-900">Manual</span>
            </span>
          </button>
        </div>

        <div
          className={cn(
            'rounded-xl border px-4 py-4 transition-colors sm:px-5',
            mode === 'auto' ? 'border-amber-200/90 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60',
          )}
        >
          <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {mode === 'auto' ? 'ระบุ Division และตู้' : 'กรองตู้'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Division"
              placeholder={mode === 'manual' ? 'ไม่เลือก = โหลด Item ใช้งาน' : 'เลือก Division'}
              value={departmentId}
              required={mode === 'auto'}
              allowClear={mode === 'manual'}
              clearLabel="ไม่เลือก"
              onValueChange={onDepartmentIdChange}
              options={departmentSelectOptions}
              loading={loadingDepartments}
              onSearch={onSearchDepartments}
            />
            <SearchableSelect
              label="ตู้"
              placeholder={
                departmentId ? 'เลือกตู้' : mode === 'manual' ? 'เลือก Division' : 'เลือก Division ก่อน'
              }
              value={cabinetId}
              required={mode === 'auto'}
              disabled={!departmentId}
              allowClear={mode === 'manual' && !!departmentId}
              clearLabel="ไม่เลือก"
              onValueChange={onCabinetIdChange}
              options={cabOptions}
              loading={loadingCabinets}
              onSearch={(kw) => (departmentId ? onSearchCabinets(kw) : undefined)}
            />
          </div>
          {(mode === 'auto' || cabinetId) && (
            <div className="mt-3 rounded-md bg-background/80 px-3 py-2 text-xs text-muted-foreground">
              {cabinetStockId != null ? (
                <span>
                  ตู้:{' '}
                  <span className="font-mono font-medium text-slate-800">{cabinetStockId}</span>
                </span>
              ) : cabinetId ? (
                <span className="text-amber-800">กำลังโหลด Stock ID...</span>
              ) : mode === 'auto' ? (
                <span>เลือกตู้เมื่อเลือก Division แล้ว</span>
              ) : null}
            </div>
          )}
          {manualFilterIncomplete && (
            <p className="mt-2 text-xs font-medium text-amber-900">
              เลือก Division อยู่ — เลือกตู้เพื่อโหลดรายการในตู้ หรือค้นหา Item ทั้งระบบได้โดยไม่ต้องเลือกตู้
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
          <Button
            type="button"
            className="h-10 shrink-0 gap-2"
            disabled={reloadDisabled}
            onClick={onReload}
          >
            <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
            {reloadButtonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
