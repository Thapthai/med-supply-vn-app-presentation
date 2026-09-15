'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateInput } from '@/components/DateInput';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { DailyCabinetStockArchiveRow } from '@/lib/api';

export type DailyCabinetStockArchivesApi = {
  listArchives: (p?: { limit?: number; offset?: number }) => Promise<DailyCabinetStockArchiveRow[]>;
  downloadArchive: (id: number) => Promise<void>;
  runArchive: (reportDate?: string) => Promise<void>;
};

function formatBytes(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DailyCabinetStockArchivesPanel({ api }: { api: DailyCabinetStockArchivesApi }) {
  const [rows, setRows] = useState<DailyCabinetStockArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [backfillDate, setBackfillDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listArchives({ limit: 365 });
      setRows(data);
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, DailyCabinetStockArchiveRow[]>();
    for (const r of rows) {
      const arr = m.get(r.report_date) ?? [];
      arr.push(r);
      m.set(r.report_date, arr);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const handleDownload = async (id: number) => {
    try {
      setDownloadingId(id);
      await api.downloadArchive(id);
      toast.success('ดาวน์โหลดแล้ว');
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'ดาวน์โหลดไม่สำเร็จ');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRunYesterday = async () => {
    try {
      setRunning(true);
      await api.runArchive();
      toast.success('สำรองรายงานเมื่อวานเรียบร้อย');
      await load();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'สำรองรายงานไม่สำเร็จ');
    } finally {
      setRunning(false);
    }
  };

  const handleRunBackfill = async () => {
    const d = backfillDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      toast.error('กรุณาใส่วันที่เป็น YYYY-MM-DD');
      return;
    }
    try {
      setRunning(true);
      await api.runArchive(d);
      toast.success(`สำรองรายงานวันที่ ${d} เรียบร้อย`);
      await load();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'สำรองรายงานไม่สำเร็จ');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <CalendarClock className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานสต๊อกตู้ — สำรองรายวัน</h1>
            <p className="text-sm text-gray-600">
              สำรองรายงานด้วยปุ่มด้านล่างหรือ API — ยังไม่เปิดตั้งเวลาอัตโนมัติ
            </p>
            <p className="mt-1 text-xs text-gray-500">
              รายงานเป็นภาพรวมทั้งระบบ (ไม่กรองตู้/แผนก) — จำนวนในตู้เป็นข้อมูลปัจจุบันจากตู้ ส่วนการใช้งาน/ชำรุด/วันหมดอายุอ้างอิงตามวันที่รายงาน
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button type="button" size="sm" onClick={() => void handleRunYesterday()} disabled={running}>
            {running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-1 h-4 w-4" />}
            สำรองเมื่อวาน
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">สำรองย้อนหลัง (ระบุวันที่)</CardTitle>
          <CardDescription>เลือกวันที่เพื่อสร้างหรืออัปเดตไฟล์ของวันนั้น</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500" htmlFor="backfill-date">
              วันที่
            </label>
            <DateInput
              id="backfill-date"
              className="w-[200px]"
              value={backfillDate}
              onChange={setBackfillDate}
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void handleRunBackfill()} disabled={running}>
            สำรองวันนี้
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : byDate.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            ยังไม่มีไฟล์สำรอง — กด «สำรองเมื่อวาน» หรือเลือกวันที่แล้วสำรอง
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byDate.map(([date, dayRows]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{date}</CardTitle>
                <CardDescription>
                  {dayRows.length} ไฟล์
                  {dayRows[0]?.filter_key ? ` · filter: ${dayRows[0].filter_key}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">รูปแบบ</TableHead>
                      <TableHead>ไฟล์</TableHead>
                      <TableHead className="w-[100px] text-right">ขนาด</TableHead>
                      <TableHead className="w-[180px]">บันทึกเมื่อ</TableHead>
                      <TableHead className="w-[120px] text-right">ดาวน์โหลด</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayRows
                      .slice()
                      .sort((a, b) => a.format.localeCompare(b.format))
                      .map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.format === 'excel' ? (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <FileSpreadsheet className="h-4 w-4" /> Excel
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700">
                                <FileText className="h-4 w-4" /> PDF
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate font-mono text-xs text-gray-600">
                            {r.file_path}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatBytes(r.file_size)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDownload(r.id)}
                              disabled={downloadingId === r.id}
                            >
                              {downloadingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="mr-1 h-4 w-4" /> ดาวน์โหลด
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
