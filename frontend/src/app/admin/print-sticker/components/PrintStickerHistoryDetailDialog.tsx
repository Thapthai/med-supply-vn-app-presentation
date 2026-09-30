'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { StickerLabelPreview, STICKER_H_DOTS, STICKER_V_DOTS } from '@/components/print-sticker/StickerLabelPreview';
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
import { cn } from '@/lib/utils';
import type { StickerPrintHistoryRow } from '../types';

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
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const lines = row?.lines ?? [];
  const previewSource = selectedCode
    ? lines.find((line) => line.itemcode === selectedCode) ?? null
    : null;
  const previewLine = previewSource ? historyLinePreview(previewSource) : null;

  useEffect(() => {
    setSelectedCode(null);
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="border-b px-6 py-4">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <DialogTitle>รายละเอียดการพิมพ์สติ๊กเกอร์</DialogTitle>
                <DialogDescription>
                  {row
                    ? `${row.doc_no ? `${row.doc_no} · ` : ''}${row.line_count} รายการ · รวม ${row.total_copies} แผ่น — กดแถวเพื่อดูตัวอย่างฉลาก`
                    : 'ดูรายการที่พิมพ์ในครั้งนี้'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {row ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500">
                ตัวอย่างฉลาก · {STICKER_H_DOTS}×{STICKER_V_DOTS} จุด
                {previewLine
                  ? `${previewLine.copies > 1 ? ` · พิมพ์ ${previewLine.copies} แผ่น` : ''}`
                  : ' · กดแถวรายการเพื่อแสดง'}
              </p>
              {previewLine ? (
                <button
                  type="button"
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setZoomOpen(true)}
                  title="ขยายตัวอย่าง"
                >
                  <StickerLabelPreview line={previewLine} size="hero" />
                </button>
              ) : (
                <div
                  className="flex items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400"
                  style={{ width: 360, height: (360 * STICKER_V_DOTS) / STICKER_H_DOTS }}
                >
                  ยังไม่ได้เลือกรายการ
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">รายการที่พิมพ์</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs">itemcode</TableHead>
                      <TableHead className="text-xs">ชื่อรายการ</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">หมดอายุ</TableHead>
                      <TableHead className="w-16 text-center text-xs">QTY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                          ไม่มีรายการในครั้งนี้
                        </TableCell>
                      </TableRow>
                    ) : (
                      lines.map((line) => (
                        <TableRow
                          key={line.id}
                          className={cn(
                            'cursor-pointer',
                            selectedCode === line.itemcode && 'bg-primary/[0.06]',
                          )}
                          onClick={() => {
                            setSelectedCode(line.itemcode);
                            setZoomOpen(false);
                          }}
                        >
                          <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm" title={line.item_name || ''}>
                            {line.item_name || '—'}
                          </TableCell>
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
          </div>
        ) : null}

        <DialogFooter className="gap-3 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
        </DialogFooter>
        <StickerPreviewZoom
          open={zoomOpen}
          line={previewLine}
          onClose={() => setZoomOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
