import { RefreshCw, Package, ChevronDown, ChevronRight, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '../common/StatusBadge';
import { ComparisonPagination } from './ComparisonPagination';
import { useState, useRef, useEffect } from 'react';
import { medicalSuppliesApi } from '@/lib/api';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import type { ComparisonItem, UsageItem } from '../../types';
import type { Item } from '@/types/item';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import QtyWithMainUnit from '@/components/QtyWithMainUnit';

interface ComparisonTableProps {
  loading: boolean;
  items: ComparisonItem[];
  selectedItemCode: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  searchItemCode: string;
  itemTypeFilter: string;
  startDate?: string;
  endDate?: string;
  departmentCode?: string;
  subDepartmentId?: string;
  onSelectItem: (itemCode: string) => void;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export function ComparisonTable({
  loading,
  items,
  selectedItemCode,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  searchItemCode,
  itemTypeFilter,
  startDate,
  endDate,
  departmentCode,
  subDepartmentId,
  onSelectItem,
  onPageChange,
  onExportExcel,
  onExportPdf,
}: ComparisonTableProps) {
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [usageData, setUsageData] = useState<Map<string, UsageItem[]>>(new Map());
  const [usagePagination, setUsagePagination] = useState<Map<string, { page: number; limit: number; total: number }>>(new Map());
  const [loadingUsage, setLoadingUsage] = useState<Set<string>>(new Set());
  const listDropdownRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Group items by type
  const groupedItems = items.reduce((acc: Map<string, ComparisonItem[]>, item) => {
    const typeKey = item.itemTypeName || 'ไม่มีประเภท';
    if (!acc.has(typeKey)) {
      acc.set(typeKey, []);
    }
    acc.get(typeKey)?.push(item);
    return acc;
  }, new Map());

  const fetchUsageData = async (itemCode: string, page: number = 1) => {
    // Prevent duplicate requests
    if (loadingUsage.has(itemCode)) {
      return;
    }

    try {
      setLoadingUsage(prev => new Set(prev).add(itemCode));

      // If fetching page 1, clear existing data first to prevent accumulation
      if (page === 1) {
        setUsageData(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemCode);
          return newMap;
        });
        setUsagePagination(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemCode);
          return newMap;
        });
      }

      const params: any = {
        itemCode: itemCode,
        page: page,
        limit: ITEMS_PER_PAGE,
      };

      // Add date filters if provided
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (departmentCode) params.departmentCode = departmentCode;
      if (subDepartmentId?.trim()) params.subDepartmentId = subDepartmentId.trim();

      const response = await medicalSuppliesApi.getUsageByItemCodeFromItemTable(params) as any;

      if (response && (response.success || response.data)) {
        const responseItems = Array.isArray(response.data) ? response.data : [];
        const total = response.total || responseItems.length;

        if (page === 1) {
          setUsageData(prev => new Map(prev).set(itemCode, responseItems));
        } else {
          // Append more items for next pages
          setUsageData(prev => {
            const existing = prev.get(itemCode) || [];
            return new Map(prev).set(itemCode, [...existing, ...responseItems]);
          });
        }

        setUsagePagination(prev => new Map(prev).set(itemCode, {
          page: page,
          limit: ITEMS_PER_PAGE,
          total: total,
        }));
      } else {
        if (page === 1) {
          setUsageData(prev => new Map(prev).set(itemCode, []));
        }
      }
    } catch (error: any) {
      if (page === 1) {
        setUsageData(prev => new Map(prev).set(itemCode, []));
      }
    } finally {
      setLoadingUsage(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemCode);
        return newSet;
      });
    }
  };

  const toggleItemExpanded = (itemCode: string) => {
    const newExpanded = new Set(expandedItems);

    if (newExpanded.has(itemCode)) {
      // Collapsing - remove from expanded set
      newExpanded.delete(itemCode);
    } else {
      // Expanding - add to expanded set
      newExpanded.add(itemCode);
    }

    // Update expanded items first (this controls visibility)
    setExpandedItems(newExpanded);

    // If collapsing, clean up all associated data
    if (newExpanded.has(itemCode) === false) {
      // Clear usage data
      setUsageData(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemCode);
        return newMap;
      });
      // Clear pagination data
      setUsagePagination(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemCode);
        return newMap;
      });
      // Clear loading state
      setLoadingUsage(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemCode);
        return newSet;
      });
    } else {
      // If expanding, fetch fresh data
      fetchUsageData(itemCode);
    }
  };

  // Refresh sub data when date/department filter changes
  useEffect(() => {
    // Clear all usage data and pagination when filters change
    setUsageData(new Map());
    setUsagePagination(new Map());

    // If there are expanded items, refetch their data with new filters
    if (expandedItems.size > 0) {
      expandedItems.forEach(itemCode => {
        fetchUsageData(itemCode, 1);
      });
    }
  }, [startDate, endDate, departmentCode, subDepartmentId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) {
        setIsListDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>รายการเปรียบเทียบทั้งหมด</CardTitle>
            <CardDescription>
              คลิกที่รายการเพื่อดูรายละเอียดการเปรียบเทียบ
              {(searchItemCode || itemTypeFilter) && ' (กรองแล้ว)'}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={onExportExcel}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={onExportPdf}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบรายการเปรียบเทียบ</p>
            <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบว่ามีข้อมูลในระบบ</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <TableRow className="hover:bg-transparent border-b-2 border-purple-200">
                    <TableHead className="w-[40px] font-bold text-purple-900"></TableHead>
                    <TableHead className="w-[120px] font-bold text-purple-900">รหัสเวชภัณฑ์</TableHead>
                    <TableHead className="font-bold text-purple-900">ชื่อเวชภัณฑ์</TableHead>
                    <TableHead className="text-center font-bold text-purple-900">จำนวนเบิก</TableHead>
                    <TableHead className="text-center font-bold text-purple-900">จำนวนใช้</TableHead>
                    <TableHead className="text-center font-bold text-purple-900">จำนวนแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน</TableHead>
                    <TableHead className="text-center font-bold text-purple-900">ผลต่าง</TableHead>
                    <TableHead className="text-center font-bold text-purple-900">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.flatMap((item) => {
                    const isExpanded = expandedItems.has(item.itemcode);
                    const itemUsageData = usageData.get(item.itemcode) || [];
                    const isLoadingUsage = loadingUsage.has(item.itemcode);
                    const isSelected = selectedItemCode === item.itemcode;
                    const difference = (item.total_dispensed ?? 0) - (item.total_used ?? 0) - (item.total_returned ?? 0);

                    const rows = [
                      // Main Item Row
                      <TableRow
                        key={`item-${item.itemcode}`}
                        className={`cursor-pointer transition-all border-l-4 ${isSelected
                          ? 'bg-purple-50 border-l-purple-600 hover:bg-purple-100'
                          : 'border-l-transparent hover:bg-gray-50'
                          }`}
                      >
                        <TableCell
                          className="w-[40px] text-purple-600 font-semibold hover:text-purple-700"
                          onClick={() => toggleItemExpanded(item.itemcode)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-gray-900"
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          {isSelected && <Badge className="mr-2 bg-purple-600 hover:bg-purple-700">เลือก</Badge>}
                          {item.itemcode}
                        </TableCell>
                        <TableCell
                          className="max-w-[260px] min-w-0 text-gray-800"
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          <ItemNameWithUnit
                            item={item as unknown as Item}
                            qtyMain={item.total_dispensed}
                          />
                        </TableCell>

                        <TableCell
                          className="text-center font-semibold text-gray-900"
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          <QtyWithMainUnit
                            qty={item.total_dispensed}
                            item={item as unknown as Item}
                          />
                        </TableCell>
                        <TableCell
                          className="text-center font-semibold text-gray-900"
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          <QtyWithMainUnit
                            qty={item.total_used}
                            item={item as unknown as Item}
                          />
                        </TableCell>
                        <TableCell
                          className="text-center font-semibold text-gray-900"
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          {item.total_returned ?? 0}
                        </TableCell>
                        <TableCell
                          className={`text-center font-bold text-lg ${difference === 0 ? 'text-green-600' :
                            difference > 0 ? 'text-orange-600' : 'text-red-600'
                            }`}
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          {difference > 0 && '+'}
                          {difference}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          onClick={() => onSelectItem(item.itemcode)}
                        >
                          <StatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>,
                    ];

                    // Sub Rows - Usage Items
                    if (isExpanded) {
                      if (isLoadingUsage) {
                        rows.push(
                          <TableRow key={`${item.itemcode}-loading`} className="bg-blue-50">
                            <TableCell colSpan={8} className="text-center py-6">
                              <RefreshCw className="h-5 w-5 animate-spin inline-block mr-2 text-blue-600" />
                              <span className="text-blue-700 font-medium">กำลังโหลดรายการผู้ป่วย...</span>
                            </TableCell>
                          </TableRow>
                        );
                      } else if (itemUsageData.length === 0) {
                        rows.push(
                          <TableRow key={`${item.itemcode}-empty`} className="bg-blue-50">
                            <TableCell colSpan={8} className="text-center py-6">
                              <Package className="h-5 w-5 inline-block mr-2 text-blue-400" />
                              <span className="text-blue-600 font-medium">ไม่พบรายการผู้ป่วยที่ใช้เวชภัณฑ์นี้</span>
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        const pagination = usagePagination.get(item.itemcode);
                        const currentTotal = pagination?.total || 0;
                        const currentPage = pagination?.page || 1;
                        const hasMorePages = itemUsageData.length < currentTotal;

                        itemUsageData.forEach((usage: UsageItem, usageIndex: number) => {
                          const isDiscontinued = ['discontinue', 'discontinued'].includes(usage.order_item_status?.toLowerCase() ?? '');
                          // Use combination of usage_id and supply_item_id for unique key (same as UsageItemsTable)
                          const uniqueKey = usage.supply_item_id
                            ? `${item.itemcode}-usage-${usage.usage_id}-${usage.supply_item_id}`
                            : `${item.itemcode}-usage-${usage.usage_id}-${usageIndex}`;
                          rows.push(
                            <TableRow
                              key={uniqueKey}
                              className={isDiscontinued ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-400' : 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-400'}
                            >
                              <TableCell className={`pl-12 font-semibold ${isDiscontinued ? 'text-red-500' : 'text-blue-500'}`}>
                                └
                              </TableCell>
                              <TableCell className="text-sm font-medium text-gray-700">
                                HN/EN :<br /> {usage.patient_hn} <br /> {usage.patient_en}
                              </TableCell>
                              <TableCell className="text-sm text-gray-800">
                                แผนกย่อย: {usage.department_name || usage.department_code || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {usage.created_at ? formatUtcDateTime(String(usage.created_at)) : '-'}
                              </TableCell>
                              {/* <TableCell className="text-right text-sm text-gray-400">
                                -
                              </TableCell> */}
                              <TableCell className="text-center font-semibold text-sm text-indigo-700">
                                <QtyWithMainUnit
                                  qty={usage.qty_used}
                                  item={item as unknown as Item}
                                />
                              </TableCell>
                              <TableCell className="text-center text-sm text-gray-400">-</TableCell>
                              <TableCell className="text-center text-sm">
                                {usage.qty_returned ? (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                                    คืน {usage.qty_returned}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {(() => {
                                  const status = usage.order_item_status || '-';
                                  const statusLower = status.toLowerCase();

                                  if (statusLower === 'discontinue' || statusLower === 'discontinued') {
                                    return (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                                        ยกเลิก
                                      </Badge>
                                    );
                                  } else if (statusLower === 'verified') {
                                    return (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500"></span>
                                        ยืนยันแล้ว
                                      </Badge>
                                    );
                                  } else if (status === '-') {
                                    return <span className="text-gray-400">-</span>;
                                  } else {
                                    return (
                                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-indigo-500"></span>
                                        {status}
                                      </Badge>
                                    );
                                  }
                                })()}
                              </TableCell>
                            </TableRow>
                          );
                        });

                        // See More Button
                        if (hasMorePages) {
                          rows.push(
                            <TableRow
                              key={`${item.itemcode}-see-more`}
                              className="bg-blue-100 hover:bg-blue-200 border-l-4 border-l-blue-400"
                            >
                              <TableCell colSpan={8} className="text-center py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchUsageData(item.itemcode, currentPage + 1)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                                >
                                  ดูเพิ่มเติม ({itemUsageData.length} / {currentTotal})
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      }
                    }

                    return rows;
                  })}
                </TableBody>
              </Table>
            </div>

            <ComparisonPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
