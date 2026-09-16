"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Package } from "lucide-react";
import { staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import { toast } from "sonner";
import { formatUtcDateTime } from "@/lib/formatThaiDateTime";
import TablePagination from "@/components/TablePagination";

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

export default function CabinetDetailsCard({ selectedRow, onClose, asModal = false }: CabinetDetailsCardProps) {
  const [itemStocks, setItemStocks] = useState<ItemStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const loadItemStocks = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const response = await staffCabinetDepartmentApi.getItemStocksByCabinet(selectedRow.cabinet_id, {
        page,
        limit: itemsPerPage,
      });

      if (response.success && response.data) {
        const stocks = Array.isArray(response.data) ? response.data : [];
        setItemStocks(stocks);
        const total = (response as { total?: number }).total ?? stocks.length;
        setTotalItems(total);
        setCurrentPage(page);
      } else {
        toast.error("ไม่สามารถโหลดข้อมูล ItemStock ได้");
      }
    } catch (error: unknown) {
      console.error("Error loading item stocks:", error);
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [selectedRow.cabinet_id]);

  useEffect(() => {
    loadItemStocks(1);
  }, [loadItemStocks]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

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
                  {selectedRow.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">หมายเหตุ</label>
              <p className="text-base break-words whitespace-pre-wrap">{selectedRow.description || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">จำนวนอุปกรณ์</label>
              <div className="inline-flex items-center gap-1">
                <Package className="text-blue-600 h-4 w-4" />
                <span className="text-lg font-bold text-slate-700">
                  {selectedRow.itemstock_dispensed_count ?? 0} / {selectedRow.itemstock_count ?? 0}
                </span>
                <span className="text-sm text-slate-500">(ถูกเบิก / ในตู้)</span>
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
                      {/* <TableHead>RFID</TableHead> */}
                      <TableHead>รหัสอุปกรณ์</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>สถานะสต็อก</TableHead>
                      <TableHead>วันที่แก้ไข</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemStocks.map((stock, index) => (
                      <TableRow key={`detail-stock-${stock.StockID}-${index}`}>
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        {/* <TableCell>{stock.RfidCode || "-"}</TableCell> */}
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
                        <TableCell>
                          {stock.LastCabinetModify
                            ? formatUtcDateTime(String(stock.LastCabinetModify))
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={loadItemStocks}
                loading={loading}
                variant="responsive"
                summary={
                  <>
                    หน้า {currentPage} จาก {totalPages} ({totalItems} รายการ)
                  </>
                }
              />
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
