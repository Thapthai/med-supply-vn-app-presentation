'use client';

import { Loader2, Printer } from 'lucide-react';
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

export type PrintStickerConfirmLine = {
  itemcode: string;
  itemname: string;
  copies: number;
  expireDate: string;
  lotNo?: string;
};

type PrintStickerConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: PrintStickerConfirmLine[];
  onConfirm: () => void;
  busy?: boolean;
};

export function PrintStickerConfirmDialog({
  open,
  onOpenChange,
  lines,
  onConfirm,
  busy = false,
}: PrintStickerConfirmDialogProps) {
  const itemCount = lines.length;
  const sheetCount = lines.reduce((sum, l) => sum + l.copies, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-b px-6 py-4">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <DialogTitle>ยืนยันการพิมพ์สติ๊กเกอร์</DialogTitle>
                <DialogDescription>
                  {itemCount} รายการ · รวม {sheetCount} แผ่น — ตรวจสอบรายการด้านล่างก่อนพิมพ์
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
                    <TableCell className="text-center text-sm font-medium tabular-nums">
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
          <Button onClick={onConfirm} disabled={busy || itemCount === 0}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังพิมพ์…
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                ยืนยันพิมพ์ ({sheetCount} แผ่น)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
