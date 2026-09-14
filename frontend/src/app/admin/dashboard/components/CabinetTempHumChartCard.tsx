'use client';

import { Fragment, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, FileSpreadsheet, FileText, Loader2, Thermometer } from 'lucide-react';
import { cabinetTempHumApi, reportsApi } from '@/lib/api';
import type {
  CabinetTempHumChartCabinet,
  CabinetTempHumChartData,
  CabinetTempHumChartPoint,
} from '@/lib/cabinet-http-clients';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';

const SUB_LOG_VISIBLE_COUNT = 10;
/** header 40px + 10 แถว × 36px */
const SUB_LOG_SCROLL_MAX_HEIGHT = 40 + SUB_LOG_VISIBLE_COUNT * 36;

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
  return `${n.toFixed(1)}%`;
}

function monthLabel(year: number, month: number) {
  return `${TH_MONTHS[month - 1] ?? month} ${year + 543}`;
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
  const step = niceStep((yMax - yMin) / 3);
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

function formatAxisTime(value: string) {
  return formatUtcDateTime(value, { year: undefined, month: 'short', day: 'numeric' });
}

function TempHumLineChart({
  points,
  title,
  gradientId,
}: {
  points: CabinetTempHumChartPoint[];
  title: string;
  gradientId: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const layout = useMemo(() => {
    const width = 800;
    const height = 300;
    const padL = 52;
    const padR = 52;
    const padT = 28;
    const padB = 56;
    const temps = points.map((p) => p.temp_log);
    const hums = points.map((p) => p.hum_log);
    const tempDomain = niceDomain(Math.min(...temps), Math.max(...temps));
    const humDomain = niceDomain(Math.min(...hums), Math.max(...hums));
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const times = points.map((p) => new Date(p.create_date).getTime());
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const tSpan = Math.max(tMax - tMin, 1);
    const xInset = points.length === 1 ? innerW / 2 : Math.max(innerW * 0.08, 28);
    const xs = points.map((_, i) => {
      if (points.length === 1) return padL + innerW / 2;
      return padL + xInset + ((times[i] - tMin) / tSpan) * (innerW - xInset * 2);
    });
    const tempYs = points.map(
      (p) => padT + ((tempDomain.yMax - p.temp_log) / (tempDomain.yMax - tempDomain.yMin)) * innerH,
    );
    const humYs = points.map(
      (p) => padT + ((humDomain.yMax - p.hum_log) / (humDomain.yMax - humDomain.yMin)) * innerH,
    );
    const tempLine = smoothPath(xs, tempYs);
    const humLine = smoothPath(xs, humYs);
    const area = `${tempLine} L ${xs[xs.length - 1].toFixed(2)} ${(padT + innerH).toFixed(2)} L ${xs[0].toFixed(2)} ${(padT + innerH).toFixed(2)} Z`;
    const xLabels =
      points.length === 1
        ? [{ x: xs[0], label: formatAxisTime(points[0].create_date) }]
        : [
            { x: xs[0], label: formatAxisTime(points[0].create_date) },
            { x: xs[xs.length - 1], label: formatAxisTime(points[points.length - 1].create_date) },
          ];
    return {
      width,
      height,
      padL,
      padR,
      padT,
      innerH,
      xs,
      tempYs,
      humYs,
      tempLine,
      humLine,
      area,
      tempDomain,
      humDomain,
      xLabels,
    };
  }, [points]);

  if (points.length === 0) return null;

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * layout.width;
    let nearest = 0;
    let best = Infinity;
    layout.xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const hi = hoverIndex ?? points.length - 1;
  const hover = points[hi];
  const tooltipLeft = Math.min(Math.max((layout.xs[hi] / layout.width) * 100, 18), 82);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white px-4 pb-8 pt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
            อุณหภูมิ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
            ความชื้น
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-[280px] w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`กราฟอุณหภูมิและความชื้น ${title}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fff7ed" stopOpacity="0" />
          </linearGradient>
        </defs>
        {layout.tempDomain.ticks.map((tick) => {
          const y =
            layout.padT +
            ((layout.tempDomain.yMax - tick) / (layout.tempDomain.yMax - layout.tempDomain.yMin)) * layout.innerH;
          return (
            <g key={`t-${tick}`}>
              <line
                x1={layout.padL}
                x2={layout.width - layout.padR}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="5 6"
              />
              <text x={layout.padL - 10} y={y + 4} textAnchor="end" fill="#c2410c" fontSize="11">
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}
        {layout.humDomain.ticks.map((tick) => {
          const y =
            layout.padT +
            ((layout.humDomain.yMax - tick) / (layout.humDomain.yMax - layout.humDomain.yMin)) * layout.innerH;
          return (
            <text key={`h-${tick}`} x={layout.width - layout.padR + 10} y={y + 4} fill="#0369a1" fontSize="11">
              {tick.toFixed(1)}
            </text>
          );
        })}
        <path d={layout.area} fill={`url(#${gradientId})`} />
        <path d={layout.humLine} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={layout.tempLine} fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {layout.xs.map((x, i) => (
          <g key={points[i].id}>
            <circle cx={x} cy={layout.humYs[i]} r={i === hi ? 5 : 3.5} fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
            <circle cx={x} cy={layout.tempYs[i]} r={i === hi ? 6 : 4.5} fill="#ea580c" stroke="#fff" strokeWidth="2.5" />
          </g>
        ))}
        {hover && (
          <line
            x1={layout.xs[hi]}
            x2={layout.xs[hi]}
            y1={layout.padT}
            y2={layout.padT + layout.innerH}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />
        )}
        {layout.xLabels.map((item) => (
          <text key={`${item.x}-${item.label}`} x={item.x} y={layout.height - 18} textAnchor="middle" fill="#64748b" fontSize="11">
            {item.label}
          </text>
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute top-12 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-md"
          style={{ left: `${tooltipLeft}%` }}
        >
          <div className="font-semibold text-orange-700">{formatTemp(hover.temp_log)}</div>
          <div className="font-semibold text-sky-700">{formatHum(hover.hum_log)}</div>
          <div className="text-slate-500">{formatUtcDateTime(hover.create_date)}</div>
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
        <TempHumLineChart
          points={data.points}
          title={`${cabinetLabel(cabinet)} · ${monthLabel(year, month)}`}
          gradientId={`tempFill-${cabinetId}`}
        />
      )}
    </div>
  );
}

export default function CabinetTempHumChartCard() {
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [cabinets, setCabinets] = useState<CabinetTempHumChartCabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

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

  const toggleCabinet = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
    <Card className="gap-0 overflow-visible rounded-xl border-slate-200/80 py-0 shadow-sm">
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
            <Thermometer className="h-4 w-4 text-orange-600" />
          </span>
          อุณหภูมิและความชื้นในตู้
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs"
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
            className="h-8 gap-1.5 text-xs"
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
            className="h-8 gap-1.5 text-xs"
            disabled={exportLoading != null}
            onClick={() => void exportPdf()}
          >
            {exportLoading === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-8 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                    <TableHead className="w-10 px-2 py-3" />
                    <TableHead className="px-3 py-3 text-slate-600">ลำดับ</TableHead>
                    <TableHead className="px-3 py-3 text-slate-600">ตู้</TableHead>
                    <TableHead className="px-3 py-3 text-slate-600">วันที่</TableHead>
                    <TableHead className="px-3 py-3 text-slate-600">เวลา</TableHead>
                    <TableHead className="px-3 py-3 text-slate-600">อุณหภูมิ</TableHead>
                    <TableHead className="px-3 py-3 text-slate-600">ความชื้น</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cabinets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        ไม่มีข้อมูลใน {monthLabel(year, month)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    cabinets.map((c, i) => {
                      const id = cabinetSelectValue(c);
                      const active = selectedIds.includes(id);
                      const at = c.last_log_at ? formatUtcDateTime(c.last_log_at) : '—';
                      const [datePart, timePart] = at.includes(' ') ? at.split(/ (?=\d{1,2}:)/) : [at, '—'];
                      const logs = c.logs ?? [];
                      return (
                        <Fragment key={`${c.log_cabinet_id}-${c.app_cabinet_id ?? 'none'}`}>
                          <TableRow
                            className={`cursor-pointer ${active ? 'bg-orange-50 hover:bg-orange-50' : 'hover:bg-slate-50'}`}
                            onClick={() => toggleCabinet(id)}
                          >
                            <TableCell className="px-2 py-3">
                              <button
                                type="button"
                                className="rounded p-1 hover:bg-slate-200/80"
                                aria-expanded={active}
                                aria-label={active ? 'ยุบรายการวันเวลา' : 'ขยายดูแต่ละวันเวลา'}
                              >
                                {active ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </TableCell>
                            <TableCell className="px-3 py-3">{i + 1}</TableCell>
                            <TableCell className="px-3 py-3 font-medium text-slate-800">
                              <div className="flex flex-col">
                                <span>{cabinetLabel(c)}</span>
                                <span className="text-xs font-normal text-slate-500">
                                  {c.log_count ?? logs.length} บันทึก
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-3 text-slate-600">{datePart}</TableCell>
                            <TableCell className="px-3 py-3 text-slate-600">{timePart}</TableCell>
                            <TableCell className="px-3 py-3 font-semibold text-orange-700">{formatTemp(c.latest_temp)}</TableCell>
                            <TableCell className="px-3 py-3 font-semibold text-sky-700">{formatHum(c.latest_hum)}</TableCell>
                          </TableRow>
                          {active && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={7} className="bg-slate-50 px-4 py-3">
                                {logs.length === 0 ? (
                                  <p className="py-4 text-center text-sm text-slate-500">ไม่มีบันทึกวันเวลาในเดือนนี้</p>
                                ) : (
                                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                                    <div
                                      className="overflow-y-auto overscroll-contain"
                                      style={
                                        logs.length > SUB_LOG_VISIBLE_COUNT
                                          ? { maxHeight: SUB_LOG_SCROLL_MAX_HEIGHT }
                                          : undefined
                                      }
                                    >
                                      <table className="w-full caption-bottom text-sm">
                                        <thead className="sticky top-0 z-10 bg-slate-100">
                                          <tr className="border-b border-slate-200">
                                            <th className="h-10 px-3 text-left font-medium text-slate-600">ลำดับ</th>
                                            <th className="h-10 px-3 text-left font-medium text-slate-600">วันที่</th>
                                            <th className="h-10 px-3 text-left font-medium text-slate-600">เวลา</th>
                                            <th className="h-10 px-3 text-left font-medium text-slate-600">อุณหภูมิ</th>
                                            <th className="h-10 px-3 text-left font-medium text-slate-600">ความชื้น</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {logs.map((log, logIndex) => {
                                            const logAt = formatUtcDateTime(log.create_date);
                                            const [logDate, logTime] = logAt.includes(' ')
                                              ? logAt.split(/ (?=\d{1,2}:)/)
                                              : [logAt, '—'];
                                            return (
                                              <tr key={log.id} className="h-9 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                <td className="px-3 text-slate-500">{logIndex + 1}</td>
                                                <td className="px-3 text-slate-700">{logDate}</td>
                                                <td className="px-3 text-slate-700">{logTime}</td>
                                                <td className="px-3 font-medium text-orange-700">{formatTemp(log.temp_log)}</td>
                                                <td className="px-3 font-medium text-sky-700">{formatHum(log.hum_log)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    {logs.length > SUB_LOG_VISIBLE_COUNT ? (
                                      <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                                        แสดง 10 จาก {logs.length} รายการ — เลื่อนเมาส์เพื่อดูที่เหลือ
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-slate-500">คลิกที่ตู้เพื่อดูบันทึกแต่ละวันเวลาและกราฟด้านล่าง กดซ้ำเพื่อปิด</p>
            {selectedCabinets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                เลือกตู้จากตารางเพื่อดูกราฟอุณหภูมิและความชื้น
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
