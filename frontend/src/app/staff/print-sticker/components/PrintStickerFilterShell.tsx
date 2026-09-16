'use client';

import { Zap, LayoutList, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PrintStickerFilterSection from '@/app/staff/print-sticker/components/PrintStickerFilterSection';

type Props = {
  mode: 'auto' | 'manual';
  onModeChange: (mode: 'auto' | 'manual') => void;
  departmentId: string;
  cabinetId: string;
  cabinetStockId: number | null;
  onDepartmentIdChange: (id: string) => void;
  onCabinetIdChange: (id: string) => void;
  reloadDisabled: boolean;
  reloadButtonLabel: string;
  loadingList: boolean;
  onReload: () => void;
};

export default function PrintStickerFilterShell({
  mode,
  onModeChange,
  departmentId,
  cabinetId,
  cabinetStockId,
  onDepartmentIdChange,
  onCabinetIdChange,
  reloadDisabled,
  reloadButtonLabel,
  loadingList,
  onReload,
}: Props) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex flex-col gap-6 pt-6">
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
              <span className="block text-xs text-slate-500">พิมพ์รายการที่ต่ำกว่า Minimum</span>
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
              <span className="block text-xs text-slate-500">เลือกรายการจากตู้ตามสิทธิ์</span>
            </span>
          </button>
        </div>

        <PrintStickerFilterSection
          mode={mode}
          departmentId={departmentId}
          cabinetId={cabinetId}
          cabinetStockId={cabinetStockId}
          onDepartmentIdChange={onDepartmentIdChange}
          onCabinetIdChange={onCabinetIdChange}
        />

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
