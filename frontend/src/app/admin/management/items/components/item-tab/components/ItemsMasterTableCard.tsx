'use client';

import { useMemo } from 'react';
import type { Item } from '@/types/item';
import { Plus, Trash2, RefreshCw, Edit, Boxes, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import ItemStatusBadge from './ItemStatusBadge';
import { formatItemDepartmentsLabel, type DeptRow } from './itemHelpers';

export interface ItemsMasterTableCardProps {
  items: Item[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  total: number;
  totalPages: number;
  deptMap: Map<number, DeptRow>;
  /** กรองเฉพาะแผนกที่เลือก (undefined = ทุกแผนก) */
  departmentFilter?: number;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCreateClick: () => void;
  onUploadClick: () => void;
  onPageChange: (page: number) => void;
}

export default function ItemsMasterTableCard({
  items,
  loading,
  currentPage,
  itemsPerPage,
  deptMap,
  departmentFilter,
  onEdit,
  onDelete,
  onCreateClick,
  onUploadClick,
  onPageChange,
}: ItemsMasterTableCardProps) {
  // เลือกแผนก เจาะจง → แสดงเฉพาะ item ของ แผนก นั้น (รวม "ทุกแผนก" ที่ไม่ระบุแผนก)
  const visibleItems = useMemo(() => {
    if (departmentFilter == null) return items;
    return items.filter((it) => {
      const ids = (it.department_ids ?? []).filter((n) => n != null && n > 0);
      if (ids.length === 0) return true; // ทุกแผนก
      return ids.includes(departmentFilter);
    });
  }, [items, departmentFilter]);

  const visibleTotal = visibleItems.length;
  const visibleTotalPages = Math.max(1, Math.ceil(visibleTotal / itemsPerPage));
  const effectivePage = Math.min(Math.max(1, currentPage), visibleTotalPages);

  const paginatedItems = useMemo(() => {
    const start = (effectivePage - 1) * itemsPerPage;
    return visibleItems.slice(start, start + itemsPerPage);
  }, [visibleItems, effectivePage, itemsPerPage]);

  const rowOffset = (effectivePage - 1) * itemsPerPage;

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (visibleTotalPages <= maxVisible) {
      for (let i = 1; i <= visibleTotalPages; i++) pages.push(i);
    } else if (effectivePage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(visibleTotalPages);
    } else if (effectivePage >= visibleTotalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = visibleTotalPages - 3; i <= visibleTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = effectivePage - 1; i <= effectivePage + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(visibleTotalPages);
    }
    return pages;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
        <div className="space-y-1.5">
          <CardTitle>รายการ Item</CardTitle>
          <CardDescription>
            {visibleTotal > 0
              ? `แสดง ${paginatedItems.length} รายการในหน้านี้ (สูงสุด ${itemsPerPage} รายการต่อหน้า) · รวม ${visibleTotal} รายการ`
              : 'รายการรหัสเวชภัณฑ์ในฐานข้อมูล รวมรายการที่ยังไม่มีในตู้'}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={onUploadClick} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Excel
          </Button>
          <Button type="button" onClick={onCreateClick} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่ม Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : visibleTotal === 0 ? (
          <div className="py-12 text-center">
            <Boxes className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">ไม่พบรายการ</p>
            <p className="mt-2 text-sm text-gray-400">กรุณาตรวจสอบตัวกรองหรือเพิ่มรายการใหม่</p>
            <Button type="button" className="mt-4 gap-2" onClick={onCreateClick}>
              <Plus className="h-4 w-4" />
              เพิ่ม Item
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ลำดับ</TableHead>
                    <TableHead>รหัส Item</TableHead>
                    <TableHead className="min-w-[200px]">ชื่ออุปกรณ์</TableHead>
                    <TableHead>บาร์โค้ด</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>หน่วย</TableHead>
                    <TableHead>หน่วยการเบิก</TableHead>
                    <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((it, i) => (
                    <TableRow key={it.itemcode} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium text-slate-700">{rowOffset + i + 1}</TableCell>
                      <TableCell>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs">{it.itemcode}</code>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[320px] font-medium text-slate-800">
                        <ItemNameWithUnit item={it} showUnitBracket={false} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{it.Barcode || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {formatItemDepartmentsLabel(it, deptMap)}
                      </TableCell>
                      <TableCell>
                        <ItemStatusBadge item={it} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {it.unit?.UnitName?.trim() ? it.unit.UnitName : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {it.subUnit?.UnitName?.trim()
                          ? `${it.subUnit.UnitName}${
                              it.SubUnitQty != null && Number(it.SubUnitQty) > 0 ? ` ×${it.SubUnitQty}` : ''
                            }`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => onEdit(it)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(it)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {visibleTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-500">
                  หน้า {effectivePage} จาก {visibleTotalPages} ({visibleTotal} รายการ)
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={effectivePage === 1}
                  >
                    แรกสุด
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(effectivePage - 1)}
                    disabled={effectivePage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  {generatePageNumbers().map((pNum, idx) =>
                    pNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={pNum}
                        type="button"
                        variant={effectivePage === pNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange(pNum as number)}
                      >
                        {pNum}
                      </Button>
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(effectivePage + 1)}
                    disabled={effectivePage === visibleTotalPages}
                  >
                    ถัดไป
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(visibleTotalPages)}
                    disabled={effectivePage === visibleTotalPages}
                  >
                    สุดท้าย
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
