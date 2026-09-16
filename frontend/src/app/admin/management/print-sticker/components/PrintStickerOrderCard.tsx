'use client';

import { Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MAX_PRINT,
  MAX_TOTAL_LABELS,
} from '../constants';
import type { SelectedLine } from '../types';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';
import { clampCopies, tomorrowLocalYmd } from '../utils';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import type { Item } from '@/types/item';

type PrintStickerOrderCardProps = {
  selectedLines: SelectedLine[];
  preparing: boolean;
  onSetCopies: (itemcode: string, raw: number | null) => void;
  onExpireDateChange: (itemcode: string, ymd: string) => void;
  onLotNoChange: (itemcode: string, lotNo: string) => void;
  onRemoveLine: (itemcode: string) => void;
  onClearAll: () => void;
  onPrepare: () => void;
  emptyHint?: string;
};

export function PrintStickerOrderCard({
  selectedLines,
  preparing,
  onSetCopies,
  onExpireDateChange,
  onLotNoChange,
  onRemoveLine,
  onClearAll,
  onPrepare,
  emptyHint = 'ยังไม่มีรายการ — เลือกจากตารางด้านบน',
}: PrintStickerOrderCardProps) {
  const totalSheets = selectedLines.reduce((s, l) => s + clampCopies(l.copies, l.refillCap), 0);
  const hasPrintableSheets = totalSheets > 0;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">สั่งพิมพ์</CardTitle>

      </CardHeader>
      <CardContent className="space-y-4">
        {selectedLines.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <div className="max-h-[min(60vh,28rem)] overflow-auto rounded-md border">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-[1] w-10 bg-background px-2 align-middle" />
                  <TableHead className="min-w-[100px] align-middle py-2">รหัสอุปกรณ์</TableHead>
                  <TableHead className="min-w-[120px] align-middle py-2">ชื่ออุปกรณ์</TableHead>
                  <TableHead className="min-w-[120px] align-middle py-2 text-xs">Lot No.</TableHead>
                  <TableHead className="w-[132px] align-middle py-2 text-xs">หมดอายุ</TableHead>
                  <TableHead className="w-[72px] align-middle py-2 text-center text-xs">สูงสุด</TableHead>
                  <TableHead className="align-middle py-2 text-center text-xs">จำนวน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedLines.map((line) => {
                  const inputDisabled = line.refillCap <= 0;

                  return (
                    <TableRow key={line.itemcode}>
                      <TableCell className="sticky left-0 z-[1] bg-background px-2 align-middle py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`เอา ${line.itemcode} ออก`}
                          onClick={() => onRemoveLine(line.itemcode)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="align-middle py-2 font-mono text-sm">{line.itemcode}</TableCell>
                      <TableCell className="max-w-[180px] min-w-0 align-middle py-2 text-sm">
                        <ItemNameWithUnit
                          item={
                            {
                              itemcode: line.itemcode,
                              itemname: line.itemname,
                              SubUnitQty: line.SubUnitQty,
                              unit: line.unit,
                              subUnit: line.subUnit,
                            } as Item
                          }
                          qtyMain={line.copies ?? 0}
                        />
                      </TableCell>
                      <TableCell className="align-middle py-2">
                        <Input
                          type="text"
                          maxLength={50}
                          className={cn('h-8 min-w-[7rem] text-sm font-mono', fieldInputClass)}
                          placeholder=""
                          value={line.lotNo ?? ''}
                          onChange={(e) => onLotNoChange(line.itemcode, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="align-middle py-2">
                        <div className="flex min-h-8 min-w-[10rem] items-center [&_input]:h-8 [&_button]:h-8 [&_button]:w-8 [&_button]:min-h-8 [&_button]:min-w-8">
                          <DatePickerBE
                            id={`expire-${line.itemcode}`}
                            className="items-center"
                            popoverPortal
                            minDate={tomorrowLocalYmd()}
                            invalid={!(line.expireDate || '').trim()}
                            value={line.expireDate || ''}
                            onChange={(v) => onExpireDateChange(line.itemcode, v)}
                            placeholder="วว/ดด/ปปปป (พ.ศ.)"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-2 text-center tabular-nums text-muted-foreground">
                        <div className="flex min-h-8 items-center justify-center">
                          {line.refillCap}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-2 text-center">
                        <div className="flex min-h-8 items-center justify-center">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={Math.max(line.refillCap, 0)}
                            className={cn('h-8 w-[4rem] text-center font-mono text-sm', fieldInputClass)}
                            value={line.refillCap <= 0 || line.copies == null ? '' : line.copies}
                            disabled={inputDisabled}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '' || raw === '-') {
                                onSetCopies(line.itemcode, null);
                                return;
                              }
                              const n = parseInt(raw, 10);
                              onSetCopies(line.itemcode, Number.isFinite(n) ? n : null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedLines.length} แถว · รวม <span className="font-medium text-slate-800">{totalSheets}</span> แผ่น
          </span>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs sm:text-sm"
              onClick={onClearAll}
              disabled={selectedLines.length === 0}
            >
              ล้างทั้งหมด
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs sm:text-sm"
              onClick={onPrepare}
              disabled={preparing || selectedLines.length === 0 || !hasPrintableSheets}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              {preparing ? 'กำลังบันทึก…' : 'บันทึกเตรียมพิมพ์'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
