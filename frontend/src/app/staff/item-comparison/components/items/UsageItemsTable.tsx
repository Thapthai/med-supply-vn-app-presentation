'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { itemComparisonApi } from '@/lib/staffApi/itemComparisonApi';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import { toast } from 'sonner';
import { ComparisonPagination } from '../comparison/ComparisonPagination';
import type { UsageItem } from '../../types';

interface UsageItemsTableProps {
  itemCode: string;
  itemName: string;
  startDate?: string;
  endDate?: string;
  departmentCode?: string;
  subDepartmentId?: string;
  itemsPerPage?: number;
}

export function UsageItemsTable({
  itemCode,
  itemName,
  startDate,
  endDate,
  departmentCode,
  subDepartmentId,
  itemsPerPage = 5,
}: UsageItemsTableProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UsageItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const fetchUsageData = async (page: number = 1) => {
    if (!itemCode) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const params: any = {
        itemCode: itemCode,
        page,
        limit: itemsPerPage,
      };

      // Add date filters if provided
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (departmentCode?.trim()) params.departmentCode = departmentCode.trim();
      if (subDepartmentId?.trim()) params.subDepartmentId = subDepartmentId.trim();

      const response = await itemComparisonApi.getUsageByItemCodeFromItemTable(params) as any;
      
      if (response && (response.success || response.data)) {
        const responseItems = Array.isArray(response.data) ? response.data : [];
        
        const total = response.total || responseItems.length;
        const currentPageNum = response.page || page;
        const limit = response.limit || itemsPerPage;
        const totalPagesNum = response.totalPages || Math.ceil(total / limit);
        
        setItems(responseItems);
        setTotalItems(total);
        setTotalPages(totalPagesNum);
        setCurrentPage(currentPageNum);
        
        if (responseItems.length === 0) {
          toast.info('ไม่พบรายการผู้ป่วยที่ใช้เวชภัณฑ์นี้');
        }
      } else {
        toast.error(response?.message || 'ไม่สามารถโหลดรายการใช้งานได้');
        setItems([]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดรายการใช้งาน');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData(1);
  }, [itemCode, startDate, endDate, departmentCode, subDepartmentId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsageData(page);
  };

  const totalUsed = items.reduce((sum, item) => sum + (item.qty_used || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ผู้ป่วยที่ใช้เวชภัณฑ์นี้</CardTitle>
        <CardDescription>รายการผู้ป่วยทั้งหมดที่ใช้ {itemName}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">กำลังโหลด...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบรายการใช้งาน</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                พบผู้ป่วยที่ใช้เวชภัณฑ์ทั้งหมด: <span className="text-2xl font-bold">{totalItems}</span> ราย
              </p>
              <p className="text-xs text-blue-700 mt-1">
                รวมจำนวนที่ใช้: {totalUsed} ชิ้น
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ลำดับ</TableHead>
                    <TableHead>HN</TableHead>
                    <TableHead>ชื่อคนไข้</TableHead>
                    <TableHead>EN</TableHead>
                    <TableHead>แผนกย่อย</TableHead>
                    <TableHead>วันที่ใช้</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จำนวนใช้</TableHead>
                    <TableHead className="text-right">จำนวนคืน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const isDiscontinued = ['discontinue', 'discontinued'].includes(item.order_item_status?.toLowerCase() ?? '');
                    // Use combination of usage_id and supply_item_id for unique key
                    const uniqueKey = item.supply_item_id 
                      ? `${item.usage_id}-${item.supply_item_id}` 
                      : `${item.usage_id}-${index}`;
                    return (
                      <TableRow 
                        key={uniqueKey}
                        className={isDiscontinued ? 'bg-red-50' : ''}
                      >
                        <TableCell>{((currentPage - 1) * itemsPerPage) + index + 1}</TableCell>
                        <TableCell className="font-medium text-blue-600">{item.patient_hn}</TableCell>
                        <TableCell>{item.patient_name || '-'}</TableCell>
                        <TableCell>{item.patient_en || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.department_code || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.created_at ? formatUtcDateTime(String(item.created_at)) : '-'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const status = item.order_item_status || '-';
                            const statusLower = status.toLowerCase();
                            
                            if (statusLower === 'discontinue' || statusLower === 'discontinued') {
                              return (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                                  ยกเลิก
                                </Badge>
                              );
                            } else if (statusLower === 'verified') {
                              return (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500"></span>
                                  ยืนยันแล้ว
                                </Badge>
                              );
                            } else if (status === '-') {
                              return <span className="text-gray-400">-</span>;
                            } else {
                              return (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500"></span>
                                  {status}
                                </Badge>
                              );
                            }
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">{item.qty_used || 0}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">{item.qty_returned || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <ComparisonPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
