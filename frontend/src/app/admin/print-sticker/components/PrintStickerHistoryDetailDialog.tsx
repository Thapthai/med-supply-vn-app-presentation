'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { StickerLabelPreview } from '@/components/print-sticker/StickerLabelPreview';
import type { PrintStickerConfirmLine } from '@/components/print-sticker/PrintStickerConfirmDialog';
import { StickerPreviewZoom } from '@/components/print-sticker/StickerPreviewZoom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCEToDMY } from '@/lib/datePickerBE';
import { formatBangkokDateTime } from '@/lib/formatThaiDateTime';
import { cn } from '@/lib/utils';
import type { StickerPrintHistoryRow } from '../types';

function printerUserLabel(row: StickerPrintHistoryRow): string {
  const u = row.printedBy;
  if (!u) return '—';
  const name = `${u.fname ?? ''} ${u.lname ?? ''}`.trim();
  return name || u.email || '—';
}

function formatPrintedAt(iso: string): string {
  return formatBangkokDateTime(iso);
}

function cabLabel(row: StickerPrintHistoryRow): string {
  const snap = (row.cabinet_name ?? '').trim();
  if (snap) return snap;
  return (row.cabinet?.cabinet_name ?? row.cabinet?.cabinet_code ?? '').trim() || '—';
}

function deptLabel(row: StickerPrintHistoryRow): string {
  const snap = (row.department_name ?? '').trim();
  if (snap) return snap;
  const d = row.department;
  if (!d) return '—';
  return `${d.DepName ?? ''} ${d.DepName2 ? `(${d.DepName2})` : ''}`.trim() || '—';
}

function sourceLabel(source: string): string {
  if (source === 'printLabel-items') return 'พิมพ์หลายรายการ';
  if (source === 'printLabel-item') return 'พิมพ์รายการเดียว';
  if (source === 'printLabel') return 'ทดพิมพ์';
  if (source === 'manual') return 'บันทึกเอง';
  return source;
}

function historyLinePreview(line: StickerPrintHistoryRow['lines'][number]): PrintStickerConfirmLine {
  return {
    itemcode: line.itemcode,
    itemname: line.item_name || line.itemcode,
    copies: line.copies,
    expireDate: line.expire_date || '',
  };
}

type Props = {
  row: StickerPrintHistoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PrintStickerHistoryDetailDialog({ row, open, onOpenChange }: Props) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const lines = row?.lines ?? [];
  const previewLine = lines[Math.min(previewIndex, Math.max(lines.length - 1, 0))];

  useEffect(() => {
    setPreviewIndex(0);
    setZoomOpen(false);
  }, [row?.id, open]);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (zoomOpen) {
          setZoomOpen(false);
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="border-b px-6 py-4">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <History className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <DialogTitle>รายละเอียดการพิมพ์สติ๊กเกอร์</DialogTitle>
                <DialogDescription>
                  {row
                    ? `${row.doc_no ? `${row.doc_no} · ` : ''}${row.line_count} รายการ · รวม ${row.total_copies} แผ่น`
                    : 'ดูรายการที่พิมพ์ในครั้งนี้'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {row ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-2 rounded-lg border bg-slate-50 p-4 sm:grid-cols-2">
              <InfoItem label="เลขที่เอกสาร" value={row.doc_no || '—'} />
              <InfoItem label="วันที่พิมพ์" value={formatPrintedAt(row.printed_at)} />
              <InfoItem label="ผู้พิมพ์" value={printerUserLabel(row)} />
              <InfoItem label="แผนก" value={deptLabel(row)} />
              <InfoItem label="ตู้" value={cabLabel(row)} />
              <InfoItem label="ประเภท" value={sourceLabel(row.source)} />
              <InfoItem
                label="สถานะ"
                value={row.status === 'SUCCESS' ? 'สำเร็จ' : row.status}
              />
              <InfoItem
                label="เครื่อง"
                value={row.host ? `${row.host}${row.port ? `:${row.port}` : ''}` : '—'}
              />
              {row.remark ? <InfoItem label="หมายเหตุ" value={row.remark} /> : null}
            </div>

            {previewLine ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-slate-500">ตัวอย่างฉลาก</p>
                <button
                  type="button"
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setZoomOpen(true)}
                  title="ขยายตัวอย่าง"
                >
                  <StickerLabelPreview line={historyLinePreview(previewLine)} size="hero" />
                </button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[184px] text-xs">พรีวิว</TableHead>
                    <TableHead className="text-xs">itemcode</TableHead>
                    <TableHead className="text-xs">ชื่อรายการ</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">หมดอายุ</TableHead>
                    <TableHead className="w-16 text-center text-xs">QTY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(row.lines ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        ไม่มีรายการในครั้งนี้
                      </TableCell>
                    </TableRow>
                  ) : (
                    (row.lines ?? []).map((line, index) => (
                      <TableRow key={line.id}>
                        <TableCell className="w-[184px]">
                          <button
                            type="button"
                            className={cn(
                              'rounded border p-0.5 transition-colors',
                              index === previewIndex
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-slate-200 hover:border-slate-400',
                            )}
                            title="กดเพื่อขยายตัวอย่าง"
                            onClick={() => {
                              setPreviewIndex(index);
                              setZoomOpen(true);
                            }}
                          >
                            <StickerLabelPreview line={historyLinePreview(line)} size="thumb" />
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                        <TableCell className="text-sm">{line.item_name || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {line.expire_date ? formatCEToDMY(line.expire_date) : '—'}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium tabular-nums">
                          {line.copies}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-3 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
        </DialogFooter>
        <StickerPreviewZoom
          open={zoomOpen}
          line={previewLine ? historyLinePreview(previewLine) : null}
          onClose={() => setZoomOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('truncate text-sm font-medium text-slate-900')} title={value}>
        {value}
      </p>
    </div>
  );
}
