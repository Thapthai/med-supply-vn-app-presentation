'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TH_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function monthLabel(year: number, month: number) {
  return `${TH_MONTHS[month - 1] ?? month} ${year + 543}`;
}

type MonthPickerBEProps = {
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
  className?: string;
  disabled?: boolean;
};

export function MonthPickerBE({ year, month, onChange, className, disabled }: MonthPickerBEProps) {
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(year);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<{ top: number; left: number } | null>(null);

  const updatePlacement = React.useCallback(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = 264;
    const height = 220;
    const gap = 4;
    const pad = 8;
    let left = rect.right - width;
    if (left < pad) left = pad;
    if (left + width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - pad - width);
    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - gap - height);
    }
    setPlacement({ top, left });
  }, [open]);

  React.useEffect(() => {
    if (open) setViewYear(year);
  }, [open, year]);

  React.useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    updatePlacement();
    window.addEventListener('scroll', updatePlacement, true);
    window.addEventListener('resize', updatePlacement);
    return () => {
      window.removeEventListener('scroll', updatePlacement, true);
      window.removeEventListener('resize', updatePlacement);
    };
  }, [open, updatePlacement]);

  React.useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', onOutside);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onOutside);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [open]);

  const panel =
    open && placement ? (
      <div
        ref={panelRef}
        className="w-[16.5rem] rounded-md border border-slate-200 bg-white p-3 shadow-lg"
        style={{ position: 'fixed', top: placement.top, left: placement.left, zIndex: 100_003 }}
      >
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewYear((current) => current - 1)}
            aria-label="ปีก่อนหน้า"
          >
            «
          </Button>
          <span className="text-sm font-medium tabular-nums">{viewYear + 543}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewYear((current) => current + 1)}
            aria-label="ปีถัดไป"
          >
            »
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {TH_MONTHS.map((name, index) => {
            const nextMonth = index + 1;
            const selected = viewYear === year && nextMonth === month;
            return (
              <button
                key={name}
                type="button"
                className={cn(
                  'rounded-md px-1 py-1.5 text-[12px] leading-tight',
                  selected ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100',
                )}
                onClick={() => {
                  onChange({ year: viewYear, month: nextMonth });
                  setOpen(false);
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="เลือกเดือน"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-full min-w-[10.5rem] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 text-left text-xs text-slate-700 shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{monthLabel(year, month)}</span>
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
