import { useMemo, useState, Fragment } from 'react';
import { Download, RefreshCw, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import TablePagination from '@/components/TablePagination';
import type { DispensedItem } from '../types';
import type { Item } from '@/types/item';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import QtyWithMainUnit from '@/components/QtyWithMainUnit';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import {
  buildDispensedGroups,
  DISPENSED_GROUP_TIME_TOLERANCE_SEC,
} from '@/lib/dispenseFromCabinet/buildDispensedGroups';

const COLUMN_COUNT = 9;

interface DispensedTableProps {
  loading: boolean;
  items: DispensedItem[];
  currentPage: number;
  totalPages: number;
  totalRawItems: number;
  totalGroups: number;
  groupsPerPage: number;
  searchItemCode: string;
  itemTypeFilter: string;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export default function DispensedTable({
  loading,
  items,
  currentPage,
  totalPages,
  totalRawItems,
  totalGroups,
  groupsPerPage,
  searchItemCode,
  itemTypeFilter,
  onPageChange,
  onExportExcel,
  onExportPdf,
}: DispensedTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildDispensedGroups(items), [items]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * groupsPerPage;
    return groups.slice(start, start + groupsPerPage);
  }, [groups, currentPage, groupsPerPage]);

  const groupRowOffset = (currentPage - 1) * groupsPerPage;

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalDispensedQty = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty ?? 1), 0),
    [items],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
        <div className="space-y-1.5">
          <CardTitle>รายการเบิกอุปกรณ์จากตู้</CardTitle>
          <CardDescription>
            {items.length > 0
              ? `แสดง ${paginatedGroups.length} กลุ่มในหน้านี้ (สูงสุด ${groupsPerPage} กลุ่มต่อหน้า) · รวม ${totalGroups} กลุ่ม จาก ${totalRawItems} รายการดิบ (รวม ${totalDispensedQty.toLocaleString()} ชิ้น) · จัดกลุ่มตามรหัสอุปกรณ์และเวลาที่เบิก ±${DISPENSED_GROUP_TIME_TOLERANCE_SEC} วินาที`
              : 'รายการอุปกรณ์ที่เบิกจากตู้ SmartCabinet'}
            {(searchItemCode || itemTypeFilter !== 'all') && items.length > 0 && ' (กรองแล้ว)'}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onExportExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={onExportPdf} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
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
            <p className="text-gray-500">ไม่พบรายการเบิกอุปกรณ์</p>
            <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบว่ามีข้อมูลในระบบ</p>
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
                    <TableHead className="text-center">
                      <span className="block">จำนวน</span>
                      <span className="block text-xs font-normal text-muted-foreground">หน่วยการเบิก</span>
                    </TableHead>
                    <TableHead>วันที่เบิก</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>ชื่อผู้เบิก</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.map((group, groupIndex) => {
                    const isExpanded = expandedKeys.has(group.key);
                    const rowNum = groupRowOffset + groupIndex + 1;
                    return (
                      <Fragment key={group.key}>
                        <TableRow
                          className={cn(
                            'transition-colors',
                            isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/80',
                          )}
                        >
                          <TableCell className="w-12">
                            <button
                              type="button"
                              onClick={() => toggleExpand(group.key)}
                              className="hover:bg-gray-200 p-1 rounded"
                              aria-label={isExpanded ? 'ย่อ' : 'ขยาย'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{rowNum}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {group.itemcode || '-'}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {group.itemname || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <QtyWithMainUnit
                              qty={group.totalQty}
                              item={group.items[0] as unknown as Item}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatUtcDateTime(group.dispenseTime)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.departmentName ?? '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.cabinetUserName ?? '-'}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div>
                                <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  รายการเบิกในกลุ่ม ({group.items.length} รายการ · รวม{' '}
                                  {group.totalQty.toLocaleString()} ชิ้น)
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">ลำดับ</TableHead>
                                        <TableHead>รหัสอุปกรณ์</TableHead>
                                        <TableHead>ชื่ออุปกรณ์</TableHead>
                                        <TableHead>HN</TableHead>
                                        <TableHead className="text-center">
                                          <span className="block">จำนวน</span>
                                          <span className="block text-xs font-normal text-muted-foreground">
                                            หน่วยการเบิก
                                          </span>
                                        </TableHead>
                                        <TableHead>วันที่เบิก</TableHead>
                                        <TableHead>Division (ที่ตั้งตู้)</TableHead>
                                        <TableHead className="min-w-[120px]">Division ที่ยืม</TableHead>
                                        <TableHead className="w-[88px] text-center">หมายเหตุ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item, idx) => (
                                        <TableRow
                                          key={`${group.key}-${idx}-${item.RowID}-${item.RfidCode ?? ''}-${item.modifyDate ?? ''}`}
                                          className="hover:bg-gray-100/80"
                                        >
                                          <TableCell className="font-medium">{idx + 1}</TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-white px-2 py-0.5 rounded border">
                                              {item.itemcode || '-'}
                                            </code>
                                          </TableCell>
                                          <TableCell className="min-w-0 max-w-[220px] text-slate-700">
                                            <ItemNameWithUnit
                                              item={item as unknown as Item}
                                              showUnitBracket={false}
                                            />
                                          </TableCell>
                                          <TableCell className="font-mono text-sm text-slate-700">
                                            {item.hn?.trim() || item.HnCode?.trim() || '—'}
                                          </TableCell>
                                          <TableCell className="text-center font-medium text-slate-700">
                                            <QtyWithMainUnit
                                              qty={item.qty ?? 1}
                                              item={item as unknown as Item}
                                            />
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {formatUtcDateTime(item.modifyDate)}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {item.departmentName || '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {item.borrowDepartmentName?.trim()
                                              ? item.borrowDepartmentName
                                              : '-'}
                                          </TableCell>
                                          <TableCell className="text-center text-sm">
                                            {item.isBorrow || item.borrowRemark ? (
                                              <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-amber-900 border border-amber-200/80">
                                                {item.borrowRemark?.trim() || 'ยืม'}
                                              </span>
                                            ) : (
                                              '—'
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
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

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              summary={
                <>
                  หน้า {currentPage} จาก {totalPages} ({totalGroups} กลุ่ม · {totalRawItems} รายการ)
                </>
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
