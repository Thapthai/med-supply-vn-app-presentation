'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { formatCEToBEDMY, parseBEDMYToCE } from '@/lib/datePickerBE';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const BE_OFFSET = 543;

interface DatePickerBEProps {
  /** ค่า YYYY-MM-DD (ค.ศ.) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** เปิดปฏิทินเป็น fixed + portal ไป body (ใช้ใน table/overflow — ไม่โดนตัดขอบกล่อง) */
  popoverPortal?: boolean;
  /** วันที่ขั้นต่ำ YYYY-MM-DD (ค.ศ.) — เลือกหรือพิมพ์ก่อนวันนี้ไม่ได้ */
  minDate?: string;
  /** ขอบแดงเมื่อยังไม่ได้กรอกหรือค่าไม่ผ่าน */
  invalid?: boolean;
}

export function DatePickerBE({
  value,
  onChange,
  placeholder = 'วว/ดด/ปปปป (พ.ศ.)',
  className,
  id,
  disabled,
  popoverPortal = false,
  minDate,
  invalid = false,
}: DatePickerBEProps) {
  const [inputText, setInputText] = React.useState(() => formatCEToBEDMY(value));
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, (m || 1) - 1, 1);
    }
    return new Date();
  });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const portalPanelRef = React.useRef<HTMLDivElement>(null);
  const [portalPlacement, setPortalPlacement] = React.useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const updatePortalPlacement = React.useCallback(() => {
    if (!popoverPortal || !open || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const gap = 4;
    const pad = 8;
    const minW = Math.max(r.width, 260);
    let left = r.left;
    if (left + minW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - minW);
    }
    let top = r.bottom + gap;
    const estPanelH = 280;
    if (top + estPanelH > window.innerHeight - pad) {
      top = Math.max(pad, r.top - gap - estPanelH);
    }
    setPortalPlacement({ top, left, minWidth: minW });
  }, [popoverPortal, open]);

  React.useLayoutEffect(() => {
    if (!popoverPortal || !open) {
      setPortalPlacement(null);
      return;
    }
    updatePortalPlacement();
    const onMove = () => updatePortalPlacement();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [popoverPortal, open, updatePortalPlacement]);

  React.useEffect(() => {
    setInputText(formatCEToBEDMY(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputText(v);
  };

  const isBeforeMin = (ce: string) => Boolean(minDate && ce < minDate);

  const handleBlur = () => {
    const ce = parseBEDMYToCE(inputText);
    if (ce && !isBeforeMin(ce)) {
      onChange(ce);
      setInputText(formatCEToBEDMY(ce));
    } else if (value) {
      setInputText(formatCEToBEDMY(value));
    } else {
      setInputText('');
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const yy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const ce = `${yy}-${mm}-${dd}`;
    if (isBeforeMin(ce)) return;
    onChange(ce);
    setInputText(formatCEToBEDMY(ce));
    setOpen(false);
  };

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const viewYearBE = viewYear + BE_OFFSET;

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const handlePrevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));

  React.useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (portalPanelRef.current?.contains(t)) return;
      setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', onOutside);
      return () => document.removeEventListener('mousedown', onOutside);
    }
  }, [open]);

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const calendarPanel = (
    <div
      ref={popoverPortal ? portalPanelRef : undefined}
      className={cn(
        'rounded-md border bg-white p-3 shadow-lg',
        !popoverPortal && 'absolute top-full left-0 z-50 mt-1',
      )}
      style={
        popoverPortal && portalPlacement
          ? {
              position: 'fixed',
              top: portalPlacement.top,
              left: portalPlacement.left,
              minWidth: portalPlacement.minWidth,
              zIndex: 100_003,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
          ‹
        </Button>
        <span className="text-sm font-medium tabular-nums">
          {monthNames[viewMonth]} {viewYearBE}
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
          ›
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((w) => (
          <div key={w} className="font-medium text-gray-500 py-1">
            {w}
          </div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />;
          const cellYmd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const tooEarly = isBeforeMin(cellYmd);
          const selected = value === cellYmd;
          return (
            <button
              key={d}
              type="button"
              disabled={tooEarly}
              className={cn(
                'h-8 w-8 rounded',
                tooEarly && 'cursor-not-allowed text-gray-300 hover:bg-transparent',
                !tooEarly && selected && 'bg-blue-600 text-white hover:bg-blue-700',
                !tooEarly && !selected && 'text-gray-800 hover:bg-blue-100',
              )}
              onClick={() => handleSelectDay(viewYear, viewMonth + 1, d)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );

  const showInlineCalendar = open && !popoverPortal;
  const showPortalCalendar =
    popoverPortal && open && portalPlacement != null && typeof document !== 'undefined';

  const isTall = className?.includes('h-10');

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex w-full items-stretch rounded-md',
        invalid && 'ring-1 ring-rose-200/70',
      )}
    >
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={inputText}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        aria-invalid={invalid}
        className={cn(
          'min-w-0 flex-1 rounded-r-none border-r-0 font-medium shadow-none',
          isTall ? 'h-10' : 'h-9',
          disabled && 'bg-slate-50 text-slate-400',
          invalid && 'border-rose-200 bg-white focus-visible:border-rose-300 focus-visible:ring-rose-100',
          className,
        )}
        autoComplete="off"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          'shrink-0 rounded-l-none px-0',
          isTall ? 'h-10 w-10' : 'h-9 w-9',
          disabled && 'bg-slate-50 text-slate-400',
          invalid && 'border-rose-200 bg-white text-rose-400 hover:bg-white hover:text-rose-500',
        )}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="เลือกวันที่"
      >
        <CalendarIcon className="h-4 w-4" />
      </Button>
      {showInlineCalendar ? calendarPanel : null}
      {showPortalCalendar ? createPortal(calendarPanel, document.body) : null}
    </div>
  );
}
