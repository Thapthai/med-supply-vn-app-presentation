"use client";

import { useState, Fragment, useMemo } from "react";
import { Package, RefreshCw, Gauge, ChevronDown, ChevronRight, Archive, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/item";
import ItemNameWithUnit from "@/components/ItemNameWithUnit";
import { formatUtcDateTime } from "@/lib/formatThaiDateTime";
import { getCabinetQty, toStockLimitNumber } from "@/lib/itemUnitDisplay";

/** itemcode -> max_available_qty (แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / รอแจ้ง) จาก will-return */
interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  /** false = ยังไม่กดค้นหา — แสดงข้อความแนะนำแทน «ไม่พบข้อมูล» */
  hasSearched?: boolean;
  /** true = เลือกตู้แล้ว — แสดง Min/Max + ไฮไลต์สีแถวต้องเติม/หมดอายุ */
  showCabinetMinMax?: boolean;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onUpdateMinMax: (item: Item) => void;
  onPrintSticker: (item: Item, copies: number) => void;
  onPageChange: (page: number) => void;
  headerActions?: React.ReactNode;
}

const COLUMN_COUNT = 12;
const NEAR_EXPIRY_DAYS = 30;

function isExpired(expireStr: string | null | undefined): boolean {
  if (!expireStr) return false;
  const d = new Date(expireStr);
  return d.getTime() < Date.now();
}

function isNearExpiry(expireStr: string | null | undefined): boolean {
  if (!expireStr) return false;
  const d = new Date(expireStr);
  const now = Date.now();
  const end = new Date(now);
  end.setDate(end.getDate() + NEAR_EXPIRY_DAYS);
  return d.getTime() >= now && d.getTime() <= end.getTime();
}

function getItemDepartmentDisplay(item: Item): string {
  if (item.department?.DepName || item.department?.DepName2) {
    return item.department.DepName || item.department.DepName2 || "-";
  }
  const itemStocks = item.itemStocks ?? [];
  const names = new Set<string>();
  itemStocks.forEach((stock) => {
    stock.cabinet?.cabinetDepartments?.forEach((cd) => {
      const name = cd.department?.DepName || cd.department?.DepName2;
      if (name) names.add(name);
    });
  });
  return names.size > 0 ? [...names].join(", ") : "-";
}

/** เรียงให้แถวของตู้เดียวกันอยู่ติดกัน — ชื่อตู้ แล้วรหัสตู้ แล้ว RowID */
function sortItemStocksByCabinet<
  T extends {
    RowID?: number;
    cabinet?: { cabinet_name?: string | null; cabinet_code?: string | null };
  },
>(stocks: T[]): T[] {
  const key = (s: T) => {
    const name = (s.cabinet?.cabinet_name ?? "").trim().toLowerCase();
    const code = (s.cabinet?.cabinet_code ?? "").trim().toLowerCase();
    return { name: name || "\uffff", code: code || "\uffff", row: s.RowID ?? 0 };
  };
  return [...stocks].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    const byName = ka.name.localeCompare(kb.name, "th", { sensitivity: "base" });
    if (byName !== 0) return byName;
    const byCode = ka.code.localeCompare(kb.code, "th", { sensitivity: "base" });
    if (byCode !== 0) return byCode;
    return ka.row - kb.row;
  });
}

export default function ItemsTable({
  items,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  hasSearched = true,
  showCabinetMinMax = false,
  onUpdateMinMax,
  onPrintSticker,
  onPageChange,
  headerActions,
}: ItemsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<{ item: Item; maxCopies: number } | null>(null);
  const [printCopiesInput, setPrintCopiesInput] = useState("1");

  /** ไม่แสดงแถวที่จำนวนในตู้ = 0 — ยกเว้นเมื่อเลือกตู้และ refill > 0 */
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const qty = getCabinetQty(item);
      const refill = Math.max(0, Number((item as Item & { refill_qty?: number }).refill_qty ?? 0));
      return qty !== 0 || refill > 0;
    });
  }, [items]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visibleItems.slice(start, start + itemsPerPage);
  }, [visibleItems, currentPage, itemsPerPage]);

  const rowOffset = (currentPage - 1) * itemsPerPage;

  const effectiveTotalPages = useMemo(
    () => (visibleItems.length > 0 ? Math.ceil(visibleItems.length / itemsPerPage) : 1),
    [visibleItems.length, itemsPerPage],
  );

  const getStatusBadge = (status: number | undefined) => {
    if (status === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          ใช้งาน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        ไม่ใช้งาน
      </span>
    );
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (effectiveTotalPages <= maxVisible) {
      for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(effectiveTotalPages);
      } else if (currentPage >= effectiveTotalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = effectiveTotalPages - 3; i <= effectiveTotalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(effectiveTotalPages);
      }
    }
    return pages;
  };

  const openPrintDialog = (item: Item, refillQty: number) => {
    if (refillQty <= 0) return;
    setPrintTarget({ item, maxCopies: refillQty });
    setPrintCopiesInput(String(refillQty));
    setPrintDialogOpen(true);
  };

  const closePrintDialog = () => {
    setPrintDialogOpen(false);
    setPrintTarget(null);
    setPrintCopiesInput("1");
  };

  const confirmPrintSticker = () => {
    if (!printTarget) return;
    const parsed = Number.parseInt(printCopiesInput, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return;
    const safeCopies = Math.max(1, Math.min(printTarget.maxCopies, parsed));
    onPrintSticker(printTarget.item, safeCopies);
    closePrintDialog();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
        <div className="space-y-1.5">
          <CardTitle>รายการอุปกรณ์</CardTitle>
          <CardDescription>
            {visibleItems.length > 0
              ? `แสดง ${paginatedItems.length} รายการในหน้านี้ (สูงสุด ${itemsPerPage} รายการต่อหน้า) · รวม ${visibleItems.length} อุปกรณ์ที่มีในตู้`
              : "รายการอุปกรณ์ทั้งหมดในระบบ"}
            {items.length !== visibleItems.length
              ? ` (ไม่นับ ${items.length - visibleItems.length} รายการที่จำนวนในตู้เป็น 0)`
              : ""}
            {totalItems > visibleItems.length ? ` · จากทั้งหมด ${totalItems} อุปกรณ์` : ""}
          </CardDescription>
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {hasSearched
                ? 'ไม่พบข้อมูลอุปกรณ์'
                : 'กำหนดเงื่อนไขแล้วกด «ค้นหา» เพื่อแสดงรายการ'}
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              ไม่มีรายการที่แสดง — รายการในหน้านี้ทั้งหมดมีจำนวนในตู้เป็น 0 ({items.length} รายการ)
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead className="w-[100px]">ลำดับ</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead className="text-center">จำนวนในตู้</TableHead>
                    <TableHead className="text-center">จำนวนที่ถูกใช้งาน</TableHead>
                    <TableHead className="text-center">Min/Max</TableHead>
                    <TableHead className="text-center">จำนวนที่ต้องเติม</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>

                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => {
                    const countItemStock = getCabinetQty(item);
                    const refillQty = Math.max(
                      0,
                      Number((item as Item & { refill_qty?: number }).refill_qty ?? 0),
                    );
                    const stockMin = showCabinetMinMax ? toStockLimitNumber(item.stock_min) : 0;
                    const stockMax = showCabinetMinMax ? toStockLimitNumber(item.stock_max) : 0;
                    const isLowStock = stockMin > 0 && countItemStock < stockMin;
                    const itemStocks = sortItemStocksByCabinet(
                      (item.itemStocks ?? []).filter(
                        (s) => s.IsStock === true || (s as { IsStock?: boolean | number }).IsStock === 1,
                      ),
                    );
                    const refillByCabinet = item.refill_by_cabinet ?? [];
                    const hasCabinetRefillSummary = refillByCabinet.some(
                      (row) => row.refill_qty > 0 || row.stock_max > 0,
                    );
                    const canExpandRow = itemStocks.length > 0 || refillByCabinet.length > 0;
                    const isExpanded = expandedRow === item.itemcode;
                    const hasExpired = itemStocks.some((s) => isExpired(s.ExpireDate));
                    const hasNearExpiry = !hasExpired && itemStocks.some((s) => isNearExpiry(s.ExpireDate));

                    return (
                      <Fragment key={item.itemcode}>
                        <TableRow
                          className={cn(
                            "transition-colors",
                            hasExpired && showCabinetMinMax && "bg-orange-100 hover:bg-orange-200",
                            !hasExpired && hasNearExpiry && showCabinetMinMax && "bg-amber-100 hover:bg-amber-200",
                            !hasExpired &&
                            !hasNearExpiry &&
                            showCabinetMinMax &&
                            isLowStock &&
                            "bg-red-100 hover:bg-red-200",
                            !hasExpired &&
                            !hasNearExpiry &&
                            !(showCabinetMinMax && isLowStock) &&
                            "hover:bg-slate-50/80"
                          )}
                        >
                          <TableCell className="w-12">
                            {canExpandRow ? (
                              <button
                                type="button"
                                onClick={() => setExpandedRow(isExpanded ? null : item.itemcode)}
                                className="rounded p-1 hover:bg-slate-200"
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 inline-block" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {rowOffset + index + 1}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.itemcode}
                            </code>
                          </TableCell>
                          <TableCell className={cn("min-w-0 max-w-[280px]", showCabinetMinMax && hasExpired && "text-red-600")}>
                            <div className="flex flex-col gap-1">
                              <ItemNameWithUnit
                                item={item}
                                qtyMain={getCabinetQty(item)}
                                nameClassName={showCabinetMinMax && hasExpired ? "text-red-600 font-semibold" : undefined}
                              />
                              {showCabinetMinMax && hasExpired ? (
                                <span className="text-xs font-medium text-red-600">(มีอุปกรณ์หมดอายุ)</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{getItemDepartmentDisplay(item)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Archive className="h-4 w-4 text-blue-600" />
                              <span className={`font-semibold ${isLowStock ? "text-red-600" : "text-blue-600"}`}>
                                {countItemStock.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-slate-700">{item.qty_in_use ?? 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {showCabinetMinMax ? (
                              <>
                                <span className="text-gray-600">{stockMin}</span>
                                <span className="mx-1 text-gray-400">/</span>
                                <span className="text-gray-600">{stockMax}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'font-medium',
                                showCabinetMinMax && refillQty > 0
                                  ? 'inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-900'
                                  : 'font-medium text-slate-700',
                              )}
                            >
                              {refillQty}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(item.item_status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPrintDialog(item, refillQty)}
                                title={
                                  refillQty > 0
                                    ? `พิมพ์สติ๊กเกอร์ (สูงสุด ${refillQty})`
                                    : "ไม่สามารถพิมพ์ได้ เพราะจำนวนที่ต้องเติมเป็น 0"
                                }
                                className="text-sky-600 hover:text-sky-700 hover:border-sky-600"
                                disabled={refillQty <= 0}
                              >
                                <Printer className="h-4 w-4" />
                              </Button> */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onUpdateMinMax(item)}
                                title="ตั้งค่า Min/Max"
                                className="text-purple-600 hover:text-purple-700 hover:border-purple-600"
                              >
                                <Gauge className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && canExpandRow && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div className="space-y-4">
                                {hasCabinetRefillSummary ? (
                                  <div>
                                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                      <Gauge className="h-4 w-4" />
                                      ต้องเติมต่อตู้ (Max − จำนวนในตู้)
                                    </h4>
                                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                                            <TableHead className="text-slate-600">ตู้ (Cabinet)</TableHead>
                                            <TableHead className="text-center text-slate-600">ในตู้</TableHead>
                                            <TableHead className="text-center text-slate-600">Max</TableHead>
                                            <TableHead className="text-center text-slate-600">ต้องเติม</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {refillByCabinet.map((row) => {
                                            const rowMin = row.stock_min ?? 0;
                                            const rowLowStock = rowMin > 0 && row.in_cabinet < rowMin;
                                            return (
                                            <TableRow
                                              key={row.cabinet_id}
                                              className={cn(
                                                "border-b border-slate-100",
                                                rowLowStock && "bg-red-50/60 hover:bg-red-50/60",
                                              )}
                                            >
                                              <TableCell className="font-medium text-slate-800">
                                                {row.cabinet_name?.trim() || `#${row.cabinet_id}`}
                                              </TableCell>
                                              <TableCell className="text-center font-medium text-blue-700">
                                                {row.in_cabinet.toLocaleString()}
                                              </TableCell>
                                              <TableCell className="text-center text-muted-foreground">
                                                {row.stock_max.toLocaleString()}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {row.refill_qty > 0 ? (
                                                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-900">
                                                    {row.refill_qty.toLocaleString()}
                                                  </span>
                                                ) : (
                                                  <span className="text-muted-foreground">0</span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                ) : null}
                                {itemStocks.length > 0 ? (
                                  <div>
                                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                      <Package className="h-4 w-4" />
                                      รายการสต็อกอุปกรณ์ในตู้ ({itemStocks.length} รายการ)
                                    </h4>
                                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                                            <TableHead className="w-14 text-slate-600">ลำดับ</TableHead>
                                            <TableHead className="text-slate-600">ตู้ (Cabinet)</TableHead>
                                            <TableHead className="text-slate-600">สถานะสต็อก</TableHead>
                                            <TableHead className="text-slate-600">หมดอายุ</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {itemStocks.map((stock, idx) => {
                                            const expireStr = stock.ExpireDate;
                                            const expired = isExpired(expireStr);
                                            const nearExpiry = !expired && isNearExpiry(expireStr);
                                            const expireDisplay = expireStr
                                              ? formatUtcDateTime(expireStr)
                                              : "-";
                                            const inCabinet =
                                              stock.IsStock === true ||
                                              (stock as { IsStock?: boolean | number }).IsStock === 1;
                                            return (
                                              <TableRow
                                                key={stock.RowID ?? idx}
                                                className={cn(
                                                  "border-b border-slate-100",
                                                  expired && "bg-red-50 hover:bg-red-50",
                                                  !expired && nearExpiry && "bg-amber-50/80 hover:bg-amber-50/80"
                                                )}
                                              >
                                                <TableCell className="text-slate-600">{idx + 1}</TableCell>
                                                <TableCell className="text-slate-800">
                                                  {stock.cabinet?.cabinet_name || stock.cabinet?.cabinet_code || "-"}
                                                </TableCell>
                                                <TableCell>
                                                  {inCabinet ? (
                                                    <Badge
                                                      variant="default"
                                                      className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                                    >
                                                      อยู่ในตู้
                                                    </Badge>
                                                  ) : (
                                                    <Badge
                                                      variant="secondary"
                                                      className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100"
                                                    >
                                                      ถูกเบิก
                                                    </Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-slate-700">
                                                  <span className="tabular-nums">{expireDisplay}</span>
                                                  {expired && (
                                                    <Badge
                                                      variant="destructive"
                                                      className="ml-2 border-red-200 bg-red-100 text-red-800 hover:bg-red-100"
                                                    >
                                                      หมดอายุ
                                                    </Badge>
                                                  )}
                                                  {!expired && nearExpiry && (
                                                    <Badge
                                                      variant="secondary"
                                                      className="ml-2 border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100"
                                                    >
                                                      ใกล้หมดอายุ
                                                    </Badge>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {effectiveTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-500">
                  หน้า {currentPage} จาก {effectiveTotalPages} ({visibleItems.length} อุปกรณ์)
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
                    แรกสุด
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                    ก่อนหน้า
                  </Button>
                  {generatePageNumbers().map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page as number)}
                      >
                        {page}
                      </Button>
                    )
                  )}
                  <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === effectiveTotalPages}>
                    ถัดไป
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onPageChange(effectiveTotalPages)} disabled={currentPage === effectiveTotalPages}>
                    สุดท้าย
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={printDialogOpen} onOpenChange={(open) => (open ? setPrintDialogOpen(true) : closePrintDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>พิมพ์สติ๊กเกอร์</DialogTitle>
            <DialogDescription>
              {printTarget ? `รหัส: ${printTarget.item.itemcode}` : "กำหนดจำนวนแผ่นที่ต้องการพิมพ์"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
              สูงสุดที่พิมพ์ได้:{" "}
              <span className="font-semibold text-slate-900">
                {printTarget?.maxCopies ?? 0}
              </span>{" "}
              แผ่น (ตามจำนวนที่ต้องเติม)
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">จำนวนที่ต้องการพิมพ์</label>
              <Input
                type="number"
                min={1}
                max={printTarget?.maxCopies ?? 1}
                value={printCopiesInput}
                onChange={(e) => setPrintCopiesInput(e.target.value)}
                placeholder="ระบุจำนวนแผ่น"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePrintDialog}>
              ยกเลิก
            </Button>
            <Button
              onClick={confirmPrintSticker}
              disabled={
                !printTarget ||
                !Number.isFinite(Number.parseInt(printCopiesInput, 10)) ||
                Number.parseInt(printCopiesInput, 10) < 1 ||
                Number.parseInt(printCopiesInput, 10) > (printTarget?.maxCopies ?? 0)
              }
            >
              พิมพ์สติ๊กเกอร์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
