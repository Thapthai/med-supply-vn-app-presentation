'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, Thermometer } from 'lucide-react';
import { cabinetTempHumApi, reportsApi } from '@/lib/api';
import type {
  CabinetTempHumChartCabinet,
  CabinetTempHumChartData,
  CabinetTempHumChartPoint,
} from '@/lib/cabinet-http-clients';
import { formatUtcDateTime, toUtcYyyyMmDd } from '@/lib/formatThaiDateTime';
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

function cabinetSelectValue(row: { app_cabinet_id: number | null; log_cabinet_id: number }) {
  return row.app_cabinet_id ?? row.log_cabinet_id;
}

function cabinetLabel(row: {
  cabinet_name: string | null;
  cabinet_code: string | null;
  log_cabinet_id: number;
}) {
  const name = row.cabinet_name?.trim() || row.cabinet_code?.trim();
  return name ? `${name}` : `ตู้ #${row.log_cabinet_id}`;
}

function formatTemp(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}°C`;
}

function formatHum(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)} RH`;
}

function monthLabel(year: number, month: number) {
  return `${TH_MONTHS[month - 1] ?? month} ${year + 543}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatLogTime(value: string) {
  return formatUtcDateTime(value, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupLogsByDay(logs: CabinetTempHumChartPoint[], year: number, month: number) {
  const map = new Map<number, CabinetTempHumChartPoint[]>();
  for (const log of logs) {
    const ymd = toUtcYyyyMmDd(log.create_date);
    if (!ymd) continue;
    const [y, m, d] = ymd.split('-').map(Number);
    if (y !== year || m !== month || !d) continue;
    const list = map.get(d) ?? [];
    list.push(log);
    map.set(d, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.create_date).getTime() - new Date(b.create_date).getTime());
  }
  return map;
}

function collectTimes(
  cabinets: CabinetTempHumChartCabinet[],
  year: number,
  month: number,
): string[] {
  const set = new Set<string>();
  for (const cabinet of cabinets) {
    for (const log of cabinet.logs ?? []) {
      const ymd = toUtcYyyyMmDd(log.create_date);
      if (!ymd) continue;
      const [y, m] = ymd.split('-').map(Number);
      if (y !== year || m !== month) continue;
      set.add(formatLogTime(log.create_date));
    }
  }
  return [...set].sort();
}

function readingAt(
  byDay: Map<number, CabinetTempHumChartPoint[]>,
  day: number,
  time: string,
): CabinetTempHumChartPoint | undefined {
  return (byDay.get(day) ?? []).find((log) => formatLogTime(log.create_date) === time);
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function niceStep(raw: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.1))));
  const err = raw / exp;
  if (err <= 1) return 1 * exp;
  if (err <= 2) return 2 * exp;
  if (err <= 5) return 5 * exp;
  return 10 * exp;
}

function niceDomain(minT: number, maxT: number) {
  const mid = (minT + maxT) / 2;
  const half = Math.max((maxT - minT) / 2 + 0.6, 1.4);
  const yMin = mid - half;
  const yMax = mid + half;
  const step = niceStep((yMax - yMin) / 5);
  const start = Math.floor(yMin / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= yMax + step * 0.01; v += step) {
    ticks.push(Number(v.toFixed(2)));
  }
  const first = ticks[0] ?? yMin;
  const last = ticks[ticks.length - 1] ?? yMax;
  return { yMin: Math.min(first, yMin), yMax: Math.max(last, yMax), ticks };
}

function smoothPath(xs: number[], ys: number[]) {
  if (xs.length === 0) return '';
  if (xs.length === 1) return `M ${xs[0]} ${ys[0]}`;
  if (xs.length === 2) return `M ${xs[0]} ${ys[0]} L ${xs[1]} ${ys[1]}`;
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cpx = (xs[i] + xs[i + 1]) / 2;
    d += ` C ${cpx} ${ys[i]}, ${cpx} ${ys[i + 1]}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return d;
}

const LINE_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#14b8a6', '#f97316', '#64748b'];

type TimeSeries = {
  time: string;
  color: string;
  points: { day: number; value: number }[];
};

function buildTimeSeries(
  points: CabinetTempHumChartPoint[],
  year: number,
  month: number,
  metric: 'temp' | 'hum',
): TimeSeries[] {
  const byTime = new Map<string, { day: number; value: number }[]>();
  for (const point of points) {
    const ymd = toUtcYyyyMmDd(point.create_date);
    if (!ymd) continue;
    const [y, m, d] = ymd.split('-').map(Number);
    if (y !== year || m !== month || !d) continue;
    const time = formatLogTime(point.create_date);
    const value = metric === 'temp' ? point.temp_log : point.hum_log;
    if (value == null || Number.isNaN(value)) continue;
    const list = byTime.get(time) ?? [];
    const existing = list.find((item) => item.day === d);
    if (existing) existing.value = value;
    else list.push({ day: d, value });
    byTime.set(time, list);
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, seriesPoints], i) => ({
      time,
      color: LINE_COLORS[i % LINE_COLORS.length],
      points: seriesPoints.sort((a, b) => a.day - b.day),
    }));
}

function useIsMobile(query = '(max-width: 639px)') {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);
  return matches;
}

function DailyMetricChart({
  points,
  year,
  month,
  metric,
  title,
}: {
  points: CabinetTempHumChartPoint[];
  year: number;
  month: number;
  metric: 'temp' | 'hum';
  title: string;
}) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const dayCount = daysInMonth(year, month);
  const series = useMemo(() => buildTimeSeries(points, year, month, metric), [points, year, month, metric]);

  const layout = useMemo(() => {
    const width = 980;
    const height = 400;
    const padL = 58;
    const padR = 20;
    const padT = 32;
    const padB = 48;
    const values = series.flatMap((s) => s.points.map((p) => p.value));
    const domain = values.length
      ? niceDomain(Math.min(...values), Math.max(...values))
      : { yMin: 0, yMax: 1, ticks: [0, 1] };
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const xAt = (day: number) =>
      dayCount <= 1 ? padL + innerW / 2 : padL + ((day - 1) / (dayCount - 1)) * innerW;
    const yAt = (value: number) =>
      padT + ((domain.yMax - value) / Math.max(domain.yMax - domain.yMin, 0.1)) * innerH;
    const lines = series.map((s) => ({
      ...s,
      xs: s.points.map((p) => xAt(p.day)),
      ys: s.points.map((p) => yAt(p.value)),
      path: smoothPath(
        s.points.map((p) => xAt(p.day)),
        s.points.map((p) => yAt(p.value)),
      ),
    }));
    const xLabels = Array.from({ length: dayCount }, (_, i) => i + 1).filter((day) =>
      isMobile ? day === 1 || day === dayCount || day % 5 === 0 : true,
    );
    return { width, height, padL, padR, padT, innerW, innerH, domain, xAt, yAt, lines, xLabels };
  }, [series, dayCount, isMobile]);

  if (series.length === 0) return null;

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * layout.width;
    let nearest = 1;
    let best = Infinity;
    for (let day = 1; day <= dayCount; day += 1) {
      const d = Math.abs(layout.xAt(day) - x);
      if (d < best) {
        best = d;
        nearest = day;
      }
    }
    setHoverDay(nearest);
  };

  const unit = metric === 'temp' ? '°C' : 'RH';
  const axisColor = metric === 'temp' ? '#c2410c' : '#0369a1';
  const day = hoverDay;
  const tooltipRows =
    day == null
      ? []
      : layout.lines
          .map((s) => {
            const point = s.points.find((p) => p.day === day);
            return point ? { time: s.time, color: s.color, value: point.value } : null;
          })
          .filter((row): row is { time: string; color: string; value: number } => row != null);
  const tooltipLeft =
    day == null ? 50 : Math.min(Math.max((layout.xAt(day) / layout.width) * 100, isMobile ? 28 : 16), isMobile ? 72 : 84);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white px-3 pb-4 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
      <p className="mb-2 text-center text-sm font-semibold leading-snug text-slate-800 sm:mb-1 sm:text-base">{title}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[220px] w-full min-w-0 touch-pan-y sm:h-[320px] sm:flex-1 lg:h-[400px]"
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={onMove}
          onPointerLeave={() => setHoverDay(null)}
          role="img"
          aria-label={title}
        >
          <text
            x={layout.padL - 10}
            y={layout.padT - 8}
            textAnchor="end"
            fill={axisColor}
            fontSize="13"
            fontWeight="600"
          >
            {unit}
          </text>
          {layout.domain.ticks.map((tick) => {
            const y = layout.yAt(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={layout.padL}
                  x2={layout.width - layout.padR}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="5 6"
                />
                <text x={layout.padL - 10} y={y + 5} textAnchor="end" fill={axisColor} fontSize="13">
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}
          {day != null && (
            <line
              x1={layout.xAt(day)}
              x2={layout.xAt(day)}
              y1={layout.padT}
              y2={layout.padT + layout.innerH}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
            />
          )}
          {layout.lines.map((s) => (
            <g key={s.time}>
              <path
                d={s.path}
                fill="none"
                stroke={s.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.xs.map((x, i) => (
                <circle
                  key={`${s.time}-${s.points[i].day}`}
                  cx={x}
                  cy={s.ys[i]}
                  r={day === s.points[i].day ? 6 : 4.5}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth="2"
                />
              ))}
            </g>
          ))}
          {layout.xLabels.map((labelDay) => (
            <text
              key={`x-${labelDay}`}
              x={layout.xAt(labelDay)}
              y={layout.height - 22}
              textAnchor="middle"
              fill="#64748b"
              fontSize="13"
            >
              {labelDay}
            </text>
          ))}
          <text
            x={layout.padL + layout.innerW / 2}
            y={layout.height - 4}
            textAnchor="middle"
            fill="#64748b"
            fontSize="13"
          >
            วันที่
          </text>
        </svg>
        <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1.5 sm:w-24 sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-2.5">
          <p className="text-xs font-semibold text-slate-500">เวลา</p>
          {layout.lines.map((s) => (
            <span key={s.time} className="inline-flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
              <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: s.color }} />
              {s.time}
            </span>
          ))}
        </div>
      </div>
      {day != null && tooltipRows.length > 0 && (
        <div
          className="pointer-events-none absolute top-8 z-10 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-md sm:top-10"
          style={{ left: `${tooltipLeft}%` }}
        >
          <div className="mb-1 font-semibold text-slate-700">วันที่ {day}</div>
          {tooltipRows.map((row) => (
            <div key={row.time} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: row.color }} />
              <span className="text-slate-500">{row.time}</span>
              <span className="font-semibold" style={{ color: row.color }}>
                {row.value.toFixed(1)}
                {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CabinetChartBlock({
  cabinet,
  year,
  month,
}: {
  cabinet: CabinetTempHumChartCabinet;
  year: number;
  month: number;
}) {
  const [data, setData] = useState<CabinetTempHumChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPdfLoading, setChartPdfLoading] = useState(false);
  const cabinetId = cabinetSelectValue(cabinet);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await cabinetTempHumApi.getChart({
          cabinet_id: cabinetId,
          year,
          month,
          limit: 2000,
        });
        if (!cancelled && response.success && response.data) {
          setData(response.data);
        } else if (!cancelled) {
          setData(null);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [cabinetId, year, month]);

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : !data?.points.length ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
          ไม่มีข้อมูลกราฟของ {cabinetLabel(cabinet)} ในเดือนนี้
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs sm:w-auto"
              disabled={chartPdfLoading}
              onClick={async () => {
                try {
                  setChartPdfLoading(true);
                  await reportsApi.downloadCabinetTempHumChartPdf({
                    year,
                    month,
                    cabinet_id: cabinetId,
                  });
                } catch (error) {
                  console.error('Failed to export cabinet temp hum chart pdf:', error);
                } finally {
                  setChartPdfLoading(false);
                }
              }}
            >
              {chartPdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {chartPdfLoading ? 'กำลังโหลด...' : 'PDF กราฟ'}
            </Button>
          </div>
          <DailyMetricChart
            points={data.points}
            year={year}
            month={month}
            metric="temp"
            title={`อุณหภูมิ ${cabinetLabel(cabinet)} · เดือน ${monthLabel(year, month)}`}
          />
          <DailyMetricChart
            points={data.points}
            year={year}
            month={month}
            metric="hum"
            title={`ความชื้นสัมพัทธ์ ${cabinetLabel(cabinet)} · เดือน ${monthLabel(year, month)}`}
          />
        </div>
      )}
    </div>
  );
}

export default function CabinetTempHumChartCardV2() {
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [cabinets, setCabinets] = useState<CabinetTempHumChartCabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await cabinetTempHumApi.getOverview({ year, month });
        if (!cancelled && response.success && response.data) {
          setCabinets(response.data.cabinets);
          setSelectedIds((prev) => prev.filter((id) => response.data!.cabinets.some((c) => cabinetSelectValue(c) === id)));
        } else if (!cancelled) {
          setCabinets([]);
        }
      } catch (error) {
        console.error('Failed to fetch cabinet temperature overview:', error);
        if (!cancelled) setCabinets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const selectedCabinets = cabinets.filter((c) => selectedIds.includes(cabinetSelectValue(c)));
  const dayCount = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);
  const timeSlots = useMemo(() => {
    const slots = collectTimes(cabinets, year, month);
    return slots.length > 0 ? slots : ['—'];
  }, [cabinets, year, month]);
  const today = currentYearMonth();
  const todayDay = today.year === year && today.month === month ? new Date().getDate() : null;

  useLayoutEffect(() => {
    const scroller = calendarScrollRef.current;
    const todayCol = todayColRef.current;
    if (!scroller || !todayCol || todayDay == null) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const colRect = todayCol.getBoundingClientRect();
    const stickyWidth = Array.from(todayCol.parentElement?.querySelectorAll('th[rowspan]') ?? []).reduce(
      (sum, el) => sum + el.getBoundingClientRect().width,
      0,
    ) || 208;
    const visible = scroller.clientWidth - stickyWidth;
    const colCenter = colRect.left - scrollerRect.left + scroller.scrollLeft + colRect.width / 2;
    scroller.scrollLeft = Math.max(0, colCenter - stickyWidth - visible / 2);
  }, [todayDay, year, month, loading, cabinets.length]);

  const toggleCabinet = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? [] : [id]));
  };

  const exportExcel = async () => {
    try {
      setExportLoading('excel');
      await reportsApi.downloadCabinetTempHumExcel({ year, month });
    } catch (error) {
      console.error('Failed to export cabinet temp hum excel:', error);
    } finally {
      setExportLoading(null);
    }
  };

  const exportPdf = async () => {
    try {
      setExportLoading('pdf');
      await reportsApi.downloadCabinetTempHumPdf({ year, month });
    } catch (error) {
      console.error('Failed to export cabinet temp hum pdf:', error);
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-slate-200/80 py-0 shadow-sm">
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-slate-100 bg-slate-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm text-slate-800 sm:text-base">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
            <Thermometer className="h-4 w-4 text-orange-600" />
          </span>
          <span className="leading-snug">อุณหภูมิและความชื้นในตู้</span>
        </CardTitle>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <input
            type="month"
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs sm:w-auto sm:flex-none"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) {
                setYear(y);
                setMonth(m);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 gap-1.5 text-xs sm:flex-none"
            disabled={exportLoading != null}
            onClick={() => void exportExcel()}
          >
            {exportLoading === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            {exportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 gap-1.5 text-xs sm:flex-none"
            disabled={exportLoading != null}
            onClick={() => void exportPdf()}
          >
            {exportLoading === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-6 pt-4 sm:px-5 sm:pb-8 sm:pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-xl border-2 border-white bg-slate-50/60">
              <div className="px-4 py-3 text-center text-sm font-semibold tracking-wide text-slate-600">
                เดือน {monthLabel(year, month)}
              </div>
              {cabinets.length === 0 ? (
                <p className="py-10 text-center text-slate-500">ไม่มีข้อมูลใน {monthLabel(year, month)}</p>
              ) : (
                <div ref={calendarScrollRef} className="relative overflow-x-auto overscroll-x-contain border-t border-slate-200 [-webkit-overflow-scrolling:touch]">
                  <p className="px-3 py-2 text-center text-[11px] text-slate-400 sm:hidden">
                    เลื่อนซ้าย–ขวา เพื่อดูวันที่อื่น
                  </p>
                  <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th
                          rowSpan={2}
                          className="sticky left-0 z-30 w-36 min-w-36 max-w-36 bg-slate-100 px-2 py-2 text-left text-[11px] font-semibold text-slate-500 sm:w-44 sm:min-w-44 sm:max-w-44 sm:px-2.5 sm:text-[13px]"
                        >
                          ชื่อตู้
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-36 z-30 w-32 min-w-32 max-w-32 bg-slate-100 px-1.5 py-2 text-center text-[11px] font-semibold text-slate-500 shadow-[inset_-2px_0_0_#94a3b8] sm:left-44 sm:w-36 sm:min-w-36 sm:max-w-36 sm:text-[13px]"
                        >
                          รายการ
                        </th>
                        {days.map((day) => {
                          const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
                          const isWeekend = weekday === 0 || weekday === 6;
                          const isToday = todayDay === day;
                          return (
                            <th
                              key={day}
                              ref={isToday ? todayColRef : undefined}
                              colSpan={timeSlots.length}
                              className={cn(
                                'border-b border-l-2 border-l-slate-400 border-b-slate-200 px-1 py-2 text-center text-[11px] font-semibold sm:text-xs',
                                isToday && 'bg-orange-50 text-orange-700',
                                !isToday && isWeekend && 'bg-slate-100/70 text-slate-400',
                                !isToday && !isWeekend && 'text-slate-600',
                              )}
                            >
                              <span className="sm:hidden">{day}</span>
                              <span className="hidden sm:inline">วันที่ {day}</span>
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        {days.flatMap((day) => {
                          const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
                          const isWeekend = weekday === 0 || weekday === 6;
                          const isToday = todayDay === day;
                          return timeSlots.map((time, timeIndex) => (
                            <th
                              key={`${day}-${time}`}
                              className={cn(
                                'min-w-[3.25rem] border-b border-slate-200 px-1 py-1.5 text-center text-[10px] font-medium whitespace-nowrap sm:min-w-[4.5rem] sm:text-[11px]',
                                timeIndex === 0 ? 'border-l-2 border-l-slate-400' : 'border-l border-l-slate-200',
                                isToday && 'bg-orange-50 text-orange-700',
                                !isToday && isWeekend && 'bg-slate-100/70 text-slate-400',
                                !isToday && !isWeekend && 'text-slate-500',
                              )}
                            >
                              {time}
                            </th>
                          ));
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {cabinets.map((c, i) => {
                        const id = cabinetSelectValue(c);
                        const active = selectedIds.includes(id);
                        const byDay = groupLogsByDay(c.logs ?? [], year, month);
                        const rowClass = cn(
                          'cursor-pointer',
                          active ? 'bg-orange-50/50' : 'hover:bg-white/70',
                        );
                        const nameClass = cn(
                          'sticky left-0 z-30 w-36 min-w-36 max-w-36 border-b-2 border-b-slate-400 px-2 py-2 align-middle text-left sm:w-44 sm:min-w-44 sm:max-w-44 sm:px-2.5 sm:py-3',
                          active ? 'bg-orange-50' : 'bg-white',
                        );
                        const metricClass = cn(
                          'sticky left-36 z-30 w-32 min-w-32 max-w-32 px-1.5 py-2 text-center text-[11px] font-semibold whitespace-nowrap shadow-[inset_-2px_0_0_#94a3b8] sm:left-44 sm:w-36 sm:min-w-36 sm:max-w-36 sm:text-xs',
                          active ? 'bg-orange-50' : 'bg-white',
                        );
                        return (
                          <Fragment key={`${c.log_cabinet_id}-${c.app_cabinet_id ?? 'none'}`}>
                            <tr className={rowClass} onClick={() => toggleCabinet(id)}>
                              <td rowSpan={2} className={nameClass}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="line-clamp-2 break-words text-[11px] font-semibold leading-snug text-slate-800 sm:text-sm">
                                    {i + 1}. {cabinetLabel(c)}
                                  </span>
                                </div>
                              </td>
                              <td className={cn(metricClass, 'border-b border-slate-100 text-orange-600')}>
                                อุณหภูมิ
                              </td>
                              {days.flatMap((day) => {
                                const isToday = todayDay === day;
                                return timeSlots.map((time, timeIndex) => {
                                  const log = readingAt(byDay, day, time);
                                  return (
                                    <td
                                      key={`t-${day}-${time}`}
                                      className={cn(
                                        'border-b border-slate-100 px-1 py-1.5 text-center text-xs font-semibold text-orange-600 whitespace-nowrap sm:py-3 sm:text-sm',
                                        timeIndex === 0 ? 'border-l-2 border-l-slate-400' : 'border-l border-l-slate-100',
                                        isToday && 'bg-orange-50/80',
                                      )}
                                    >
                                      {formatTemp(log?.temp_log)}
                                    </td>
                                  );
                                });
                              })}
                            </tr>
                            <tr className={rowClass} onClick={() => toggleCabinet(id)}>
                              <td className={cn(metricClass, 'border-b-2 border-b-slate-400 text-sky-600')}>
                                ความชื้นสัมพัทธ์
                              </td>
                              {days.flatMap((day) => {
                                const isToday = todayDay === day;
                                return timeSlots.map((time, timeIndex) => {
                                  const log = readingAt(byDay, day, time);
                                  return (
                                    <td
                                      key={`h-${day}-${time}`}
                                      className={cn(
                                        'border-b-2 border-b-slate-400 px-1 py-1.5 text-center text-xs font-semibold text-sky-600 whitespace-nowrap sm:py-3 sm:text-sm',
                                        timeIndex === 0 ? 'border-l-2 border-l-slate-400' : 'border-l border-l-slate-100',
                                        isToday && 'bg-orange-50/80',
                                      )}
                                    >
                                      {formatHum(log?.hum_log)}
                                    </td>
                                  );
                                });
                              })}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
                สีส้ม = อุณหภูมิ
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
                สีฟ้า = ความชื้นสัมพัทธ์
              </span>
              <span>คลิกที่แถวตู้เพื่อดูกราฟด้านล่าง กดซ้ำเพื่อปิด</span>
            </div>
            {selectedCabinets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                เลือกตู้จากตารางเพื่อดูกราฟอุณหภูมิและความชื้นสัมพัทธ์
              </p>
            ) : (
              <div className="flex flex-col gap-5 pb-2">
                {selectedCabinets.map((c) => (
                  <CabinetChartBlock
                    key={`${c.log_cabinet_id}-${c.app_cabinet_id ?? 'none'}`}
                    cabinet={c}
                    year={year}
                    month={month}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
