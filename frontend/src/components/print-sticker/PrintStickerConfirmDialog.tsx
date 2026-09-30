'use client';

import { Loader2, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { STICKER_H_DOTS, STICKER_V_DOTS, StickerLabelPreview } from './StickerLabelPreview';
import { StickerPreviewZoom } from './StickerPreviewZoom';

export type PrintStickerConfirmLine = {
  itemcode: string;
  itemname: string;
  copies: number;
  expireDate: string;
  lotNo?: string;
  usageCode?: string;
  /** เพดานจำนวนที่พิมพ์ได้จริง — ถ้า copies เกิน จะขึ้นคำเตือน */
  maxCopies?: number;
};

type PrintStickerConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: PrintStickerConfirmLine[];
  /** true = พิมพ์จำนวนที่ใส่แม้เกินค่าสูงสุด, false = พิมพ์ไม่เกินค่าสูงสุด */
  onConfirm: (printOverLimit: boolean) => void;
  onCopiesChange?: (itemcode: string, copies: number | null) => void;
  resolveUsageCodes?: (itemcodes: string[]) => Promise<Record<string, string>>;
  busy?: boolean;
};

function isOverLimit(line: PrintStickerConfirmLine) {
  return line.maxCopies != null && line.copies > line.maxCopies;
}

export function PrintStickerConfirmDialog({
  open,
  onOpenChange,
  lines,
  onConfirm,
  onCopiesChange,
  resolveUsageCodes,
  busy = false,
}: PrintStickerConfirmDialogProps) {
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [usageByCode, setUsageByCode] = useState<Record<string, string>>({});
  const codesKey = lines.map((line) => line.itemcode).join(',');

  useEffect(() => {
    if (!open) {
      setQtyDraft({});
      setSelectedCode(null);
      setZoomOpen(false);
      setUsageByCode({});
      return;
    }
    setQtyDraft((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return Object.fromEntries(lines.map((line) => [line.itemcode, String(line.copies)]));
    });
    const codes = codesKey.split(',').filter(Boolean);
    if (!resolveUsageCodes || codes.length === 0) return;
    void resolveUsageCodes(codes)
      .then((data) => setUsageByCode(data ?? {}))
      .catch(() => setUsageByCode({}));
  }, [open, resolveUsageCodes, codesKey, lines]);

  const itemCount = lines.length;
  const normalLines = lines.filter((line) => !isOverLimit(line));
  const overLimitLines = lines.filter(isOverLimit);
  const enteredSheetCount = lines.reduce((sum, line) => sum + line.copies, 0);
  const previewLine = selectedCode
    ? (() => {
        const line = lines.find((row) => row.itemcode === selectedCode);
        if (!line) return null;
        return {
          ...line,
          usageCode: line.usageCode || usageByCode[line.itemcode],
        };
      })()
    : null;

  const selectRow = (itemcode: string) => {
    setSelectedCode(itemcode);
    setZoomOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (zoomOpen) {
          setZoomOpen(false);
          return;
        }
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="border-b px-6 py-4">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <DialogTitle>ยืนยันการพิมพ์สติ๊กเกอร์</DialogTitle>
                <DialogDescription>
                  {itemCount} รายการ · รวม {enteredSheetCount} แผ่น — กดแถวเพื่อดูตัวอย่างฉลาก
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

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

          {normalLines.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">จำนวนปกติ</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs">itemcode</TableHead>
                      <TableHead className="text-xs">ชื่อรายการ</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Lot No.</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">หมดอายุ</TableHead>
                      <TableHead className="w-16 text-center text-xs">QTY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalLines.map((line) => (
                      <TableRow
                        key={line.itemcode}
                        className={cn(
                          'cursor-pointer',
                          selectedCode === line.itemcode && 'bg-primary/[0.06]',
                        )}
                        onClick={() => selectRow(line.itemcode)}
                      >
                        <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={line.itemname}>
                          {line.itemname || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {line.lotNo?.trim() ? line.lotNo : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {formatCEToDMY(line.expireDate) || line.expireDate}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium tabular-nums">
                          {line.copies}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {overLimitLines.length > 0 ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-red-700">จำนวนเกินค่าสูงสุด</p>
                <p className="text-sm text-red-700">แก้จำนวนในตารางนี้ได้ก่อนยืนยันพิมพ์</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-red-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50 hover:bg-red-50">
                      <TableHead className="text-xs text-red-800">itemcode</TableHead>
                      <TableHead className="text-xs text-red-800">ชื่อรายการ</TableHead>
                      <TableHead className="text-xs whitespace-nowrap text-red-800">Lot No.</TableHead>
                      <TableHead className="text-xs whitespace-nowrap text-red-800">หมดอายุ</TableHead>
                      <TableHead className="w-24 text-center text-xs text-red-800">ค่าสูงสุด</TableHead>
                      <TableHead className="w-28 text-center text-xs text-red-800">จำนวน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overLimitLines.map((line) => (
                      <TableRow
                        key={line.itemcode}
                        className={cn(
                          'cursor-pointer',
                          selectedCode === line.itemcode && 'bg-red-50',
                        )}
                        onClick={() => selectRow(line.itemcode)}
                      >
                        <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={line.itemname}>
                          {line.itemname || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {line.lotNo?.trim() ? line.lotNo : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {formatCEToDMY(line.expireDate) || line.expireDate}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium tabular-nums text-red-700">
                          {line.maxCopies}
                        </TableCell>
                        <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={busy || !onCopiesChange}
                            title={`ค่าสูงสุด ${line.maxCopies}`}
                            className="mx-auto h-8 w-16 border-red-600 bg-white text-center font-mono text-sm text-red-700 ring-2 ring-red-200 focus-visible:border-red-600 focus-visible:ring-red-400"
                            value={qtyDraft[line.itemcode] ?? String(line.copies)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setQtyDraft((prev) => ({ ...prev, [line.itemcode]: raw }));
                              if (raw === '' || raw === '-') return;
                              const n = parseInt(raw, 10);
                              if (Number.isFinite(n)) onCopiesChange?.(line.itemcode, Math.max(0, n));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-3 border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => onConfirm(true)}
            disabled={busy || itemCount === 0}
            className={overLimitLines.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังพิมพ์…
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                ยืนยันพิมพ์ ({enteredSheetCount} แผ่น)
              </>
            )}
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
