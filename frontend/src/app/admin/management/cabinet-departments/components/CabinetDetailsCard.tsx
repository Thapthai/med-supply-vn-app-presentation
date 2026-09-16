"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Package } from "lucide-react";
import { cabinetDepartmentApi } from "@/lib/api";
import { toast } from "sonner";
import { formatUtcDateTime } from "@/lib/formatThaiDateTime";

interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
  itemstock_count?: number;
  itemstock_dispensed_count?: number;
}

interface ItemStock {
  StockID: number;
  RfidCode?: string;
  ItemCode?: string;
  Qty?: number;
  IsStock?: boolean;
  LastCabinetModify?: string;
  item?: {
    itemcode?: string;
    itemname?: string;
  };
}

interface CabinetDetailsCardProps {
  selectedRow: CabinetDepartment;
  onClose: () => void;
  asModal?: boolean;
}

/** ตรงกับ admin/management/items */
const PAGE_SIZE = 10;

function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push("...");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push("...");
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

export default function CabinetDetailsCard({ selectedRow, onClose, asModal = false }: CabinetDetailsCardProps) {
  const [itemStocks, setItemStocks] = useState<ItemStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadItemStocks(1);
  }, [selectedRow.cabinet_id]);

  const loadItemStocks = async (page: number) => {
    try {
      setLoading(true);
      const response = await cabinetDepartmentApi.getItemStocksByCabinet(selectedRow.cabinet_id, {
        page,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const stocks = Array.isArray(response.data) ? response.data : [];
        setItemStocks(stocks);
        // Get total from response or estimate from data
        const total = (response as any).total || stocks.length;
        setTotalItems(total);
        setCurrentPage(page);
      } else {
        toast.error("ไม่สามารถโหลดข้อมูล ItemStock ได้");
      }
    } catch (error: any) {
      console.error("Error loading item stocks:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handlePageChange = (nextPage: number) => {
    const next = Math.min(Math.max(1, nextPage), totalPages);
    void loadItemStocks(next);
    if (!asModal && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const title = `รายละเอียดตู้ ${selectedRow.cabinet?.cabinet_name || "-"}`;
  const body = (
    <>
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">รหัสตู้</label>
              <p className="text-lg">{selectedRow.cabinet?.cabinet_code || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ชื่อตู้</label>
              <p className="text-lg">{selectedRow.cabinet?.cabinet_name || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">แผนก</label>
              <p className="text-lg">{selectedRow.department?.DepName || "-"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">สถานะ</label>
              <div className="mt-1">
                <Badge variant={selectedRow.status === "ACTIVE" ? "default" : "secondary"}>
                  {selectedRow.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">หมายเหตุ</label>
              <p className="text-base break-words whitespace-pre-wrap">{selectedRow.description || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">จำนวนอุปกรณ์ที่อยู่ในตู้</label>
              <div className="inline-flex items-center gap-1">
                <Package className="text-blue-600 h-4 w-4" />
                <span className="text-lg font-bold text-slate-700">
                  {selectedRow.itemstock_count ?? 0}
                </span>
                {/* <span className="text-sm text-slate-500">(ในตู้)</span> */}
              </div>
            </div>
          </div>
        </div>

        {/* Item Stocks List */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" />
            รายการอุปกรณ์ในตู้ ({totalItems} รายการ)
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
          ) : itemStocks.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ลำดับ</TableHead>
                      <TableHead>รหัสอุปกรณ์</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>สถานะสต็อก</TableHead>
                      <TableHead>วันที่แก้ไข</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemStocks.map((stock, index) => (
                      <TableRow key={`detail-stock-${index}-${stock.StockID ?? ""}`}>
                        <TableCell>{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                        <TableCell>{stock.item?.itemcode || stock.ItemCode || "-"}</TableCell>
                        <TableCell>{stock.item?.itemname || "-"}</TableCell>
                        <TableCell>{stock.Qty || 0}</TableCell>
                        <TableCell>
                          {stock.IsStock === true || (stock as { IsStock?: boolean | number }).IsStock === 1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                              อยู่ในตู้
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              ถูกเบิก
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {stock.LastCabinetModify
                            ? formatUtcDateTime(String(stock.LastCabinetModify))
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination — ให้ตรงกับ admin/management/items */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    หน้า {currentPage} จาก {totalPages} ({totalItems} รายการ)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1 || loading}
                    >
                      แรกสุด
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      ก่อนหน้า
                    </Button>
                    {generatePageNumbers(currentPage, totalPages).map((pNum, idx) =>
                      pNum === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={pNum}
                          type="button"
                          variant={currentPage === pNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pNum as number)}
                          disabled={loading}
                        >
                          {pNum}
                        </Button>
                      ),
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      ถัดไป
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages || loading}
                    >
                      สุดท้าย
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">ไม่พบอุปกรณ์ในตู้นี้</div>
          )}
        </div>
    </>
  );

  if (asModal) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-5 w-5 shrink-0" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            {body}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <span>{title}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
