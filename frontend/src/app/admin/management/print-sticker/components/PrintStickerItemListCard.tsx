'use client';

import { Printer, Search, X } from 'lucide-react';
import type { Item } from '@/types/item';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { generatePageNumbers, tomorrowLocalYmd } from '../utils';
import type { SelectedLine } from '../types';

const COL_COUNT = 9;

type PrintStickerItemListCardProps = {
  items: Item[];
  loadingList: boolean;
  total: number;
  page: number;
  totalPages: number;
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onSearch?: () => void;
  onClearKeyword?: () => void;
  onSelectAllOnPage: () => void;
  onClearSelectionOnPage: () => void;
  onPageChange: (nextPage: number) => void;
  selectedItemcodes: Set<string>;
  onToggleRow: (row: Item) => void;
  selectedLines?: SelectedLine[];
  onSetCopies?: (itemcode: string, raw: number | null) => void;
  onExpireDateChange?: (itemcode: string, ymd: string) => void;
  onLotNoChange?: (itemcode: string, lotNo: string) => void;
  onPrintSelected?: () => void;
  printing?: boolean;
  preparing?: boolean;
  mode?: 'auto' | 'manual';
  cabinetLabel?: string;
  /** รายการจาก slot ในตู้ (แสดงคอลัมภ์ในตู้ / min) */
  variant?: 'master' | 'cabinet';
  /** ซ่อน pager (เช่น โหมด Auto ดึงรวมครั้งเดียว) */
  hidePagination?: boolean;
};

export function PrintStickerItemListCard({
  items,
  loadingList,
  total,
  page,
  totalPages,
  keywordInput,
  onKeywordInputChange,
  onSearch,
  onClearKeyword,
  onSelectAllOnPage,
  onClearSelectionOnPage,
  onPageChange,
  selectedItemcodes,
  onToggleRow,
  selectedLines = [],
  onSetCopies,
  onExpireDateChange,
  onLotNoChange,
  onPrintSelected,
  printing = false,
  preparing = false,
  mode = 'manual',
  cabinetLabel,
  variant = 'master',
  hidePagination = false,
}: PrintStickerItemListCardProps) {
  const colCount = COL_COUNT;
  const lineByCode = new Map(selectedLines.map((l) => [l.itemcode, l]));
  const onPageSelectedCount = items.filter((r) => selectedItemcodes.has(r.itemcode)).length;
  const missingExpireCount = selectedLines.filter((l) => !(l.expireDate || '').trim()).length;
  const printableCount = selectedLines.filter((l) => (l.copies ?? 0) > 0).length;
  const canPrint = printableCount > 0 && missingExpireCount === 0 && !preparing && !printing;
  const titlePrefix =
    mode === 'auto'
      ? 'รายการต่ำกว่า Minimum Stock'
      : variant === 'cabinet'
        ? 'เวชภัณฑ์ในตู้'
        : 'รายการ Item';

  return (
    <Card className="min-w-0 border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base font-medium text-slate-800">
            {titlePrefix}
            <span className="ml-1 font-normal text-slate-500">
              — {loadingList && items.length === 0 ? 'กำลังโหลด…' : `${total} รายการแล้ว เลือก ${selectedLines.length} รายการ`}
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="ค้นหา itemcode หรือชื่อ"
                value={keywordInput}
                onChange={(e) => onKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                className="h-9 bg-white pl-8 pr-8"
              />
              {keywordInput ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
                  onClick={() => onClearKeyword?.() ?? onKeywordInputChange('')}
                  aria-label="ล้างคำค้นหา"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onSelectAllOnPage}
              disabled={loadingList || items.length === 0}
            >
              เลือกทั้งหมด
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onClearSelectionOnPage}
              disabled={loadingList || onPageSelectedCount === 0}
            >
              ยกเลิกในหน้านี้
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 pt-0">
        <div className="max-h-[min(70vh,calc(100dvh-15rem))] overflow-y-auto overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-3">เลือก</TableHead>
                <TableHead>itemcode</TableHead>
                <TableHead>ชื่อรายการ</TableHead>
                <TableHead className="w-[64px] text-center text-xs whitespace-nowrap">ในตู้</TableHead>
                <TableHead className="w-[64px] text-center text-xs whitespace-nowrap">Min</TableHead>
                <TableHead className="min-w-[88px] text-xs whitespace-nowrap">Serial No.</TableHead>
                <TableHead className="min-w-[120px] text-xs whitespace-nowrap">Lot No.</TableHead>
                <TableHead className="min-w-[168px] text-xs whitespace-nowrap">Expire Date *</TableHead>
                <TableHead className="w-[80px] text-center text-xs whitespace-nowrap">QTY *</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-10 text-center text-slate-500">
                    กำลังโหลด…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-10 text-center text-slate-500">
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const sel = selectedItemcodes.has(row.itemcode);
                  const line = lineByCode.get(row.itemcode);
                  const qtyIn = typeof row.count_itemstock === 'number' ? row.count_itemstock : variant === 'cabinet' ? 0 : null;
                  const minS = row.cabinetItemSetting?.stock_min ?? row.stock_min ?? row.Minimum;
                  const expireMissing = sel && !(line?.expireDate || '').trim();
                  return (
                    <TableRow
                      key={row.itemcode}
                      className={cn(sel && 'bg-slate-50/80')}
                      onClick={() => onToggleRow(row)}
                    >
                      <TableCell className="w-12 pl-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={sel}
                          onCheckedChange={() => onToggleRow(row)}
                          aria-label={`เลือก ${row.itemcode}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.itemcode}</TableCell>
                      <TableCell className="max-w-[240px] min-w-0 text-sm">
                        <ItemNameWithUnit item={row} showUnitBracket={false} />
                        {cabinetLabel ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-400">{cabinetLabel}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm text-slate-600">
                        {qtyIn == null ? '—' : qtyIn}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm text-slate-600">
                        {typeof minS === 'number' ? minS : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {row.Barcode ?? '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="text"
                          maxLength={50}
                          disabled={!sel}
                          className="h-8 min-w-[7rem] bg-white text-sm font-mono disabled:bg-slate-50 disabled:text-slate-400"
                          value={line?.lotNo ?? ''}
                          onChange={(e) => onLotNoChange?.(row.itemcode, e.target.value)}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex min-h-8 min-w-[10rem] items-center [&_input]:h-8 [&_button]:h-8 [&_button]:w-8">
                          <DatePickerBE
                            id={`expire-${row.itemcode}`}
                            className="items-center"
                            popoverPortal
                            disabled={!sel}
                            minDate={tomorrowLocalYmd()}
                            invalid={expireMissing}
                            value={line?.expireDate || ''}
                            onChange={(v) => onExpireDateChange?.(row.itemcode, v)}
                            placeholder="mm/dd/yyyy"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={Math.max(sel ? (line?.refillCap ?? 0) : (row.refill_qty ?? 0), 0)}
                          disabled={!sel}
                          className="mx-auto h-8 w-[4rem] bg-white text-center font-mono text-sm disabled:bg-slate-50 disabled:text-slate-400"
                          value={
                            sel
                              ? line?.copies == null
                                ? ''
                                : line.copies
                              : typeof row.refill_qty === 'number'
                                ? row.refill_qty
                                : ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '' || raw === '-') {
                              onSetCopies?.(row.itemcode, null);
                              return;
                            }
                            const n = parseInt(raw, 10);
                            onSetCopies?.(row.itemcode, Number.isFinite(n) ? n : null);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>
              เลือกแล้ว <span className="font-medium text-slate-700">{selectedLines.length}</span> รายการ
            </span>
            {missingExpireCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" aria-hidden />
                ยังไม่กรอก Expire Date {missingExpireCount} รายการ
              </span>
            ) : null}
          </div>
          {onPrintSelected ? (
            <Button
              type="button"
              size="sm"
              variant={canPrint ? 'default' : 'secondary'}
              className="h-9 gap-1.5"
              onClick={onPrintSelected}
              disabled={!canPrint}
            >
              <Printer className="h-4 w-4" />
              {preparing || printing ? 'กำลังพิมพ์…' : `พิมพ์สติ๊กเกอร์ (${printableCount})`}
            </Button>
          ) : null}
        </div>
        {!hidePagination && totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              หน้า {page} จาก {totalPages} ({total} รายการ)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={page === 1 || loadingList}
              >
                แรกสุด
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1 || loadingList}
              >
                ก่อนหน้า
              </Button>
              {generatePageNumbers(page, totalPages).map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pNum}
                    type="button"
                    variant={page === pNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pNum as number)}
                    disabled={loadingList}
                  >
                    {pNum}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages || loadingList}
              >
                ถัดไป
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={page === totalPages || loadingList}
              >
                สุดท้าย
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
