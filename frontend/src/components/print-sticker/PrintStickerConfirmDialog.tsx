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

export type PrintStickerConfirmLine = {
  itemcode: string;
  itemname: string;
  copies: number;
  expireDate: string;
  lotNo?: string;
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
  busy?: boolean;
};

export function PrintStickerConfirmDialog({
  open,
  onOpenChange,
  lines,
  onConfirm,
  onCopiesChange,
  busy = false,
}: PrintStickerConfirmDialogProps) {
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [warningCodes, setWarningCodes] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQtyDraft({});
      setWarningCodes([]);
      setPreviewIndex(0);
      return;
    }
    setWarningCodes((prev) => {
      if (prev.length > 0) return prev;
      return lines
        .filter((line) => line.maxCopies != null && line.copies > line.maxCopies)
        .map((line) => line.itemcode);
    });
    setQtyDraft((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return Object.fromEntries(lines.map((line) => [line.itemcode, String(line.copies)]));
    });
  }, [open, lines]);

  const itemCount = lines.length;
  const overLimitLines = lines.filter(
    (line) => line.maxCopies != null && line.copies > line.maxCopies,
  );
  const warningLines = lines.filter((line) => warningCodes.includes(line.itemcode));
  const enteredSheetCount = lines.reduce((sum, line) => sum + line.copies, 0);
  const cappedSheetCount = lines.reduce((sum, line) => {
    if (line.maxCopies != null) return sum + Math.min(line.copies, line.maxCopies);
    return sum + line.copies;
  }, 0);
  const previewLine = lines[Math.min(previewIndex, Math.max(lines.length - 1, 0))];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="border-b px-6 py-4">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <DialogTitle>ยืนยันการพิมพ์สติ๊กเกอร์</DialogTitle>
                <DialogDescription>
                  {itemCount} รายการ · รวม {enteredSheetCount} แผ่น — ตรวจสอบรายการด้านล่างก่อนพิมพ์
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {previewLine ? (
            <div className="mb-4 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500">
                ตัวอย่างฉลาก · {STICKER_H_DOTS}×{STICKER_V_DOTS} จุด
                {lines.length > 1 ? ` · รายการ ${Math.min(previewIndex, lines.length - 1) + 1}/${lines.length}` : ''}
                {previewLine.copies > 1 ? ` · พิมพ์ ${previewLine.copies} แผ่น` : ''}
              </p>
              <StickerLabelPreview line={previewLine} />
              {lines.length > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={previewIndex <= 0}
                    onClick={() => setPreviewIndex((index) => Math.max(0, index - 1))}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={previewIndex >= lines.length - 1}
                    onClick={() => setPreviewIndex((index) => Math.min(lines.length - 1, index + 1))}
                  >
                    ถัดไป
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {warningLines.length > 0 ? (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">จำนวนเกินค่าสูงสุด</p>
              <p className="mt-1 text-sm text-red-700">แก้จำนวนในตารางได้ หรือเลือกพิมพ์ค่าที่เกินกับไม่เกินค่าสูงสุด</p>
              <div className="mt-3 overflow-hidden rounded-md border border-red-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50 hover:bg-red-50">
                      <TableHead className="text-xs text-red-800">itemcode</TableHead>
                      <TableHead className="text-xs text-red-800">ชื่อรายการ</TableHead>
                      <TableHead className="w-24 text-center text-xs text-red-800">ค่าสูงสุด</TableHead>
                      <TableHead className="w-28 text-center text-xs text-red-800">จำนวน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warningLines.map((line) => {
                      const draftRaw = qtyDraft[line.itemcode];
                      const draftCopies =
                        draftRaw == null || draftRaw === '' || draftRaw === '-'
                          ? line.copies
                          : parseInt(draftRaw, 10);
                      const overMax =
                        line.maxCopies != null &&
                        Number.isFinite(draftCopies) &&
                        draftCopies > line.maxCopies;
                      return (
                        <TableRow key={line.itemcode}>
                          <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm" title={line.itemname}>
                            {line.itemname || '—'}
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium tabular-nums text-red-700">
                            {line.maxCopies}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              disabled={busy || !onCopiesChange}
                              title={overMax ? `ค่าสูงสุด ${line.maxCopies}` : undefined}
                              className={cn(
                                'mx-auto h-8 w-16 bg-white text-center font-mono text-sm',
                                overMax &&
                                  'border-red-600 text-red-700 ring-2 ring-red-200 focus-visible:border-red-600 focus-visible:ring-red-400',
                              )}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {overLimitLines.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-300 bg-white text-red-700 hover:bg-red-100"
                  onClick={() => onConfirm(false)}
                  disabled={busy || itemCount === 0}
                >
                  ไม่พิมพ์ค่าที่เกิน ({cappedSheetCount} แผ่น)
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => onConfirm(true)}
                  disabled={busy || itemCount === 0}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังพิมพ์…
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      พิมพ์ค่าที่เกิน ({enteredSheetCount} แผ่น)
                    </>
                  )}
                </Button>
              </div>
              ) : null}
            </div>
          ) : null}
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
                {lines.map((line) => (
                  <TableRow key={line.itemcode}>
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
                    <TableCell
                      className={
                        line.maxCopies != null && line.copies > line.maxCopies
                          ? 'text-center text-sm font-semibold tabular-nums text-red-600'
                          : 'text-center text-sm font-medium tabular-nums'
                      }
                    >
                      {line.copies}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-3 border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            ยกเลิก
          </Button>
          {overLimitLines.length === 0 ? (
            <Button onClick={() => onConfirm(false)} disabled={busy || itemCount === 0}>
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
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
