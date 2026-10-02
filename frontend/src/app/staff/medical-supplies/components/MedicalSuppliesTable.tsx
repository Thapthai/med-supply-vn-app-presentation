'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Package, XCircle, Download, ChevronRight } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { formatPrintDateTime, formatUtcDateTime, formatYyyyMmDdThaiUtc } from '@/lib/formatThaiDateTime';

interface MedicalSuppliesTableProps {
  loading: boolean;
  supplies: any[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onSelectSupply?: (supply: any) => void;
  selectedSupplyId?: number | null;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  exportLoading?: 'excel' | 'pdf' | null;
  filters: {
    startDate: string;
    endDate: string;
    patientHN: string;
    patientName?: string;
    keyword: string;
    firstName: string;
    lastName: string;
    assessionNo: string;
    itemName?: string;
    departmentCode?: string;
    printDate?: string;
    timePrintDate?: string;
  };
}

function SubDepartmentCell({ supplyData }: { supplyData: Record<string, unknown> }) {
  const name = String(supplyData.sub_department_name ?? '').trim();
  if (!name) {
    return <span className="text-gray-400 text-xs sm:text-sm">-</span>;
  }
  return (
    <div className="text-xs sm:text-sm text-gray-800 leading-tight min-w-0 max-w-[200px] truncate" title={name}>
      {name}
    </div>
  );
}

export default function MedicalSuppliesTable({
  loading,
  supplies,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onSelectSupply,
  selectedSupplyId,
  onExportExcel,
  onExportPdf,
  exportLoading,
  filters,
}: MedicalSuppliesTableProps) {


  const formatDate = (dateString: string) => formatUtcDateTime(dateString);

  const getBillingStatusBadge = (status: string | null | undefined) => {
    if (!status) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-500"></span>
          ไม่ระบุ
        </Badge>
      );
    }

    const statusLower = status.toLowerCase();
    const statusConfig: any = {
      'cancelled': {
        label: 'ยกเลิก',
        className: 'bg-red-50 text-red-700 border-red-200',
        dotColor: 'bg-red-500'
      },
      'paid': {
        label: 'ชำระแล้ว',
        className: 'bg-green-50 text-green-700 border-green-200',
        dotColor: 'bg-green-500'
      },
      'pending': {
        label: 'รอชำระ',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        dotColor: 'bg-yellow-500'
      },
      'verified': {
        label: 'ยืนยันแล้ว',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500'
      },
    };

    const config = statusConfig[statusLower] || {
      label: status,
      className: 'bg-gray-50 text-gray-700 border-gray-200',
      dotColor: 'bg-gray-500'
    };

    return (
      <Badge variant="outline" className={`${config.className} border text-xs`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${config.dotColor}`}></span>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0 pb-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-1.5 min-w-0">
          <CardTitle className="text-base sm:text-lg">รายการเบิกอุปกรณ์</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            ทั้งหมด {totalItems} รายการ
            {filters.startDate && filters.endDate && (
              <span className="ml-1 sm:ml-2">
                (วันที่ {formatYyyyMmDdThaiUtc(filters.startDate)} - {formatYyyyMmDdThaiUtc(filters.endDate)})
              </span>
            )}
          </CardDescription>
        </div>
        {(onExportExcel ?? onExportPdf) && (
          <div className="flex shrink-0 items-center gap-2 flex-wrap">
            {onExportExcel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExcel}
                disabled={exportLoading !== undefined && exportLoading !== null}
                className="flex-1 sm:flex-initial"
              >
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{exportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}</span>
              </Button>
            )}
            {onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPdf}
                disabled={exportLoading !== undefined && exportLoading !== null}
                className="flex-1 sm:flex-initial"
              >
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}</span>
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 py-3 sm:px-6 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12 flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>กำลังโหลดข้อมูล...</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-sm sm:text-base text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : supplies.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>ไม่พบรายการเบิก</p>
              </TooltipContent>
            </Tooltip>
            <p className="text-sm text-gray-500">ไม่พบรายการเบิก</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          <>
            {/* มือถือ: แสดงเป็นการ์ดเรียงแนวตั้ง */}
            <div className="md:hidden space-y-3">
              {supplies.map((supply, index) => {
                const supplyData = supply.data || supply;
                const id = supply.id || supplyData.id;
                const supplyItems = supplyData.supply_items || supply.supply_items || [];
                const activeItems = supplyItems.filter((item: any) => {
                  const status = item.order_item_status?.toLowerCase() || '';
                  return status !== 'discontinue' && status !== 'discontinued';
                });
                const totalQtyPending = activeItems.reduce((sum: number, item: any) => {
                  const qty = item.qty || 0;
                  const qtyUsed = item.qty_used_with_patient || 0;
                  const qtyReturned = item.qty_returned_to_cabinet || 0;
                  const qtyPending = qty - qtyUsed - qtyReturned;
                  return sum + (qtyPending > 0 ? qtyPending : 0);
                }, 0);
                const usageUpdated = supplyData.updated_at || supply.updated_at;
                const itemUpdatedDates = (supplyItems || []).map((item: any) => item.updated_at).filter(Boolean);
                const allDates = [usageUpdated, ...itemUpdatedDates].filter(Boolean);
                const latestDateTime = allDates.length ? allDates.reduce((a: string, b: string) => (new Date(a) > new Date(b) ? a : b)) : null;
                const isSelected = selectedSupplyId === id;
                return (
                  <div
                    key={id ?? index}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSupply?.(supply)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSupply?.(supply); } }}
                    className={`w-full text-left rounded-lg border-2 p-4 transition-colors cursor-pointer ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">#{(currentPage - 1) * itemsPerPage + index + 1}</span>
                          <span className="font-medium text-gray-900">HN {supplyData.patient_hn || '-'} / EN {supplyData.en || '-'}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {supplyData.department_name || supplyData.department_code || '-'}
                        </div>
                        <div className="flex flex-wrap gap-2 items-start">
                          <SubDepartmentCell supplyData={supplyData as Record<string, unknown>} />
                          {getBillingStatusBadge(supplyData.billing_status || supply.billing_status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>เบิก: {formatDate(supply.created_at || supplyData.created_at || supplyData.usage_datetime)}</span>
                          {latestDateTime && <span>อัปเดต: {formatDate(latestDateTime)}</span>}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">{activeItems.length} รายการ</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">Qty {totalQtyPending}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: แสดงเป็นตาราง */}
            <div className="hidden md:block overflow-x-auto max-w-full">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 sm:w-[80px] text-xs sm:text-sm whitespace-nowrap">ลำดับ</TableHead>
                    <TableHead className="min-w-[90px] text-xs sm:text-sm">HN / EN คนไข้</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">แผนก</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm whitespace-nowrap">แผนกย่อย</TableHead>
                    <TableHead className="min-w-[90px] text-xs sm:text-sm whitespace-nowrap">เวลาที่เบิก</TableHead>
                    <TableHead className="min-w-[90px] text-xs sm:text-sm whitespace-nowrap">วันเวลา</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">วันที่ และเวลาที่พิมพ์บิล</TableHead>
                    <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จำนวนรายการ</TableHead>
                    <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จำนวนอุปกรณ์ที่ถูกใช้งาน</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplies.map((supply, index) => {
                    const supplyData = supply.data || supply;
                    const id = supply.id || supplyData.id;
                    const patientName = `${supplyData.first_name || ''} ${supplyData.lastname || ''}`.trim() ||
                      supplyData.patient_name_th || '-';
                    const recordedByName = supplyData.recorded_by_display ||
                      supply.recorded_by_display ||
                      supply.recorded_by_name ||
                      supplyData.recorded_by_name || '-';

                    // Get unique item names for display
                    const supplyItems = supplyData.supply_items || supply.supply_items || [];

                    // Filter out Discontinue items for count
                    const activeItems = supplyItems.filter((item: any) => {
                      const status = item.order_item_status?.toLowerCase() || '';
                      return status !== 'discontinue' && status !== 'discontinued';
                    });

                    // Calculate total qty_pending for active items (excluding Discontinue)
                    const totalQtyPending = activeItems.reduce((sum: number, item: any) => {
                      const qty = item.qty || 0;
                      const qtyUsed = item.qty_used_with_patient || 0;
                      const qtyReturned = item.qty_returned_to_cabinet || 0;
                      const qtyPending = qty - qtyUsed - qtyReturned;
                      return sum + (qtyPending > 0 ? qtyPending : 0);
                    }, 0);

                    const itemNames: string[] = Array.from(
                      new Set(
                        supplyItems
                          .map((item: any) => item.order_item_description || item.supply_name || '')
                          .filter((name: string) => name && name.trim() !== '')
                      )
                    ) as string[];

                    // วันเวลาล่าสุดที่ยิงหรืออัปเดต (ใช้ค่าล่าสุดระหว่าง usage กับ supply_items)
                    const usageUpdated = supplyData.updated_at || supply.updated_at;
                    const itemUpdatedDates = (supplyItems || [])
                      .map((item: any) => item.updated_at)
                      .filter(Boolean);
                    const allDates = [usageUpdated, ...itemUpdatedDates].filter(Boolean);
                    const latestDateTime = allDates.length
                      ? allDates.reduce((a: string, b: string) => (new Date(a) > new Date(b) ? a : b))
                      : null;

                    const isSelected = selectedSupplyId === id;

                    return (
                      <TableRow
                        key={id || index}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-purple-100 hover:bg-purple-100' : 'hover:bg-gray-50'
                          }`}
                        onClick={() => onSelectSupply && onSelectSupply(supply)}
                      >
                        <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3 tabular-nums">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          <div className="text-xs sm:text-sm text-gray-700 leading-tight">
                            <div>HN {supplyData.patient_hn || '-'}</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">EN {supplyData.en || '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                          {supplyData.department_name || supplyData.department_code || '-'}
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          <SubDepartmentCell supplyData={supplyData as Record<string, unknown>} />
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                          {formatDate(supply.created_at || supplyData.created_at || supplyData.usage_datetime)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                          {latestDateTime ? formatDate(latestDateTime) : '-'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                          {formatPrintDateTime(supplyData.print_date, supplyData.time_print_date)}
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="inline-flex items-center justify-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-800 font-semibold text-xs sm:text-sm">
                            {activeItems.length || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="inline-flex items-center justify-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-800 font-semibold text-xs sm:text-sm">
                            {totalQtyPending || 0}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          {getBillingStatusBadge(supplyData.billing_status || supply.billing_status)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!loading && supplies.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            variant="responsive"
            className="mt-4 sm:mt-6"
            summary={
              <>
                หน้า {currentPage} จาก {totalPages} ({totalItems} รายการ)
              </>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
