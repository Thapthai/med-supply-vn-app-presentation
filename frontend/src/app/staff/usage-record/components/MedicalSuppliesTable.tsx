'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Package, XCircle } from 'lucide-react';
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
  onCancelBill?: (supply: any) => void;
  filters: {
    startDate: string;
    endDate: string;
    patientHN: string;
    keyword: string;
    firstName: string;
    lastName: string;
    assessionNo: string;
    itemName?: string;
  };
}

function SubDepartmentCell({ supplyData }: { supplyData: Record<string, unknown> }) {
  const name = String(supplyData.sub_department_name ?? '').trim();
  if (!name) {
    return <span className="text-gray-400 text-sm">-</span>;
  }
  return (
    <div className="text-sm text-gray-800 leading-tight min-w-0 max-w-[200px] truncate" title={name}>
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
  onCancelBill,
  filters,
}: MedicalSuppliesTableProps) {
  
  const canShowCancelBill = (supply: any): boolean => {
    const supplyData = supply.data || supply;
    const createdDate = supplyData.created_at || supply.created_at;
    const billingStatus = supplyData.billing_status || supply.billing_status;
    
    // ถ้า cancel แล้ว ไม่แสดงปุ่ม
    if (billingStatus && billingStatus.toLowerCase() === 'cancelled') {
      return false;
    }
    
    if (!createdDate) {
      return false;
    }
    
    try {
      const created = new Date(createdDate);
      const today = new Date();
      
      // เอาแค่วันที่ ไม่เอาเวลา
      const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // คำนวณความแตกต่างของวัน (วันเบิก - วันนี้)
      const diffTime = todayDay.getTime() - createdDay.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // แสดงปุ่มเฉพาะเมื่อวันเบิก - วันนี้ ไม่เกิน 1 วัน (0 หรือ 1 วัน)
      return diffDays >= 0 && diffDays <= 1;
    } catch (e) {
      return false;
    }
  };
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
      <Badge variant="outline" className={`${config.className} border`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${config.dotColor}`}></span>
        {config.label}
      </Badge>
    );
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>รายการเบิกอุปกรณ์</CardTitle>
            <CardDescription>
              ทั้งหมด {totalItems} รายการ
              {filters.startDate && filters.endDate && (
                <span className="ml-2">
                  (วันที่ {formatYyyyMmDdThaiUtc(filters.startDate)} - {formatYyyyMmDdThaiUtc(filters.endDate)})
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>กำลังโหลดข้อมูล...</p>
                </TooltipContent>
              </Tooltip>
              <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
            </div>
          ) : supplies.length === 0 ? (
            <div className="text-center py-12">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>ไม่พบรายการเบิก</p>
                </TooltipContent>
              </Tooltip>
              <p className="text-gray-500">ไม่พบรายการเบิก</p>
              <p className="text-sm text-gray-400 mt-2">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
            </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ลำดับ</TableHead>
                  <TableHead>HN / EN คนไข้</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>ประเภทผู้ป่วย</TableHead>
                  <TableHead>เวลาที่เบิก</TableHead>
                  <TableHead>Date and TimeBillPrinted</TableHead>
                  <TableHead className="text-center">จำนวนรายการ</TableHead>
                  <TableHead className="text-center">จำนวนอุปกรณ์ที่ถูกใช้งาน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
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

                  const isSelected = selectedSupplyId === id;

                  return (
                    <TableRow
                      key={id || index}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-purple-100 hover:bg-purple-100' : 'hover:bg-gray-50'
                        }`}
                      onClick={() => onSelectSupply && onSelectSupply(supply)}
                    >
                      <TableCell className="text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 leading-tight">
                          <div>HN {supplyData.patient_hn || '-'}</div>
                          <div className="text-xs text-gray-500">EN {supplyData.en || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplyData.department_name || supplyData.department_code || '-'}
                      </TableCell>
                      <TableCell>
                        <SubDepartmentCell supplyData={supplyData as Record<string, unknown>} />
                      </TableCell>
                      <TableCell>
                        {formatDate(supply.created_at || supplyData.created_at || supplyData.usage_datetime)}
                      </TableCell>
                      <TableCell>
                        {formatPrintDateTime(supplyData.print_date, supplyData.time_print_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold">
                          {activeItems.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold">
                          {totalQtyPending || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getBillingStatusBadge(supplyData.billing_status || supply.billing_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {canShowCancelBill(supply) && onCancelBill && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelBill(supply);
                                }}
                              >
                                <XCircle className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancel Bill ข้ามวัน</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && supplies.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-500">
              หน้า {currentPage} จาก {totalPages} ({totalItems} รายการ)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                แรกสุด
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ก่อนหน้า
              </Button>

              {generatePageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ถัดไป
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
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
