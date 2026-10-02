'use client';

import { Fragment, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DeptRow, SubDepartmentRow } from '../types';

const SUB_PREVIEW_COUNT = 5;

type Props = {
  departments: DeptRow[];
  subRows: SubDepartmentRow[];
  loadingDepartments: boolean;
  loadingSubRows: boolean;
  selectedDepartmentId: number | null;
  onSelectDepartment: (dept: DeptRow | null) => void;
  onEditMainDepartment: (dept: DeptRow) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
};

function generatePageNumbers(currentPage: number, totalPages: number) {
  const pages: (number | string)[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
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
  return pages;
}

export default function DepartmentMasterTable({
  departments,
  subRows,
  loadingDepartments,
  loadingSubRows,
  selectedDepartmentId,
  onSelectDepartment,
  onEditMainDepartment,
  currentPage,
  onPageChange,
  itemsPerPage,
}: Props) {
  const [expandedDepartmentId, setExpandedDepartmentId] = useState<number | null>(null);
  const [subShowAllByDept, setSubShowAllByDept] = useState<Record<number, boolean>>({});

  const totalPages = Math.max(1, Math.ceil(departments.length / itemsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * itemsPerPage;
  const pageDepartments = departments.slice(startIndex, startIndex + itemsPerPage);

  const subsByDeptId = useMemo(() => {
    const map = new Map<number, SubDepartmentRow[]>();
    for (const row of subRows) {
      const list = map.get(row.department_id);
      if (list) list.push(row);
      else map.set(row.department_id, [row]);
    }
    return map;
  }, [subRows]);

  const subsByDept = (deptId: number) => subsByDeptId.get(deptId) ?? [];

  const handleDropdownToggle = (e: React.MouseEvent, deptId: number) => {
    e.stopPropagation();
    setExpandedDepartmentId((prev) => {
      if (prev === deptId) {
        setSubShowAllByDept((m) => {
          if (!m[deptId]) return m;
          const next = { ...m };
          delete next[deptId];
          return next;
        });
        return null;
      }
      return deptId;
    });
  };

  const handleRowClick = (dept: DeptRow) => {
    if (selectedDepartmentId === dept.ID) {
      onSelectDepartment(null);
      return;
    }
    onSelectDepartment(dept);
  };

  const busy = loadingDepartments || loadingSubRows;

  return (
    <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-slate-800 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-cyan-600" />
          แผนกและรหัสแผนกย่อย ({departments.length} แผนกตามสิทธิ์)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="overflow-x-auto rounded-b-xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b border-slate-200">
                <TableHead className="w-12" />
                <TableHead className="text-slate-600 font-semibold w-16">ลำดับ</TableHead>
                <TableHead className="text-slate-600 font-semibold">รหัสแผนก</TableHead>
                <TableHead className="text-slate-600 font-semibold">ชื่อแผนก</TableHead>
                <TableHead className="text-slate-600 font-semibold">ชื่อย่อ</TableHead>
                <TableHead className="text-center text-slate-600 font-semibold">จำนวนรหัสแผนกย่อย</TableHead>
                <TableHead className="w-[120px] text-right text-slate-600 font-semibold">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {busy && departments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-600" />
                    <p className="mt-2 text-muted-foreground">กำลังโหลด...</p>
                  </TableCell>
                </TableRow>
              ) : pageDepartments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    ไม่พบแผนกตามเงื่อนไข
                  </TableCell>
                </TableRow>
              ) : (
                pageDepartments.map((dept, index) => {
                  const subs = subsByDept(dept.ID);
                  const showAllSubs = subShowAllByDept[dept.ID] === true;
                  const visibleSubs =
                    showAllSubs || subs.length <= SUB_PREVIEW_COUNT
                      ? subs
                      : subs.slice(0, SUB_PREVIEW_COUNT);
                  const subHiddenCount = subs.length - SUB_PREVIEW_COUNT;
                  const isSelected = selectedDepartmentId === dept.ID;
                  return (
                    <Fragment key={dept.ID}>
                      <TableRow
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-50/80' : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => handleRowClick(dept)}
                      >
                        <TableCell onClick={(e) => handleDropdownToggle(e, dept.ID)}>
                          <button
                            type="button"
                            className="hover:bg-slate-200/80 p-1 rounded"
                            aria-label={expandedDepartmentId === dept.ID ? 'ยุบ' : 'ขยายดูรหัสแผนกย่อย'}
                          >
                            {expandedDepartmentId === dept.ID ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="tabular-nums">{startIndex + index + 1}</TableCell>
                        <TableCell className="font-medium">{dept.ID}</TableCell>
                        <TableCell>{dept.DepName || '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{dept.DepName2?.trim() ? dept.DepName2 : '—'}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-slate-700">{subs.length}</span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onEditMainDepartment(dept)}
                            aria-label="แก้ไขแผนก"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedDepartmentId === dept.ID && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-slate-50 p-4 align-top">
                            {loadingSubRows ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                                กำลังโหลดรหัสแผนกย่อย...
                              </div>
                            ) : subs.length === 0 ? (
                              <p className="text-center text-sm text-muted-foreground py-6">
                                ยังไม่มีรหัสแผนกย่อย — คลิกแถวแผนกแล้วเพิ่มรหัสจากการ์ดด้านล่าง
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700 mb-2">รหัสแผนกย่อย (ดูอย่างเดียว)</p>
                                <div className="overflow-x-auto rounded-md border bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>รหัส (code)</TableHead>
                                        <TableHead>ชื่อ</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">Usage</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {visibleSubs.map((r) => (
                                        <TableRow key={r.id}>
                                          <TableCell className="font-mono font-medium">{r.code}</TableCell>
                                          <TableCell>{r.name || '—'}</TableCell>
                                          <TableCell>
                                            {r.status ? (
                                              <span className="text-xs font-medium text-emerald-700">เปิด</span>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">ปิด</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right tabular-nums">
                                            {r._count?.medicalSupplyUsages ?? 0}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                {subHiddenCount > 0 && !showAllSubs && (
                                  <div className="pt-2 flex justify-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSubShowAllByDept((m) => ({ ...m, [dept.ID]: true }));
                                      }}
                                    >
                                      ดูเพิ่มเติม ({subHiddenCount} รายการ)
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              หน้า {effectivePage} จาก {totalPages} ({departments.length} แผนก)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={effectivePage === 1}>
                แรกสุด
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(effectivePage - 1)}
                disabled={effectivePage === 1}
              >
                ก่อนหน้า
              </Button>
              {generatePageNumbers(effectivePage, totalPages).map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={effectivePage === page ? 'default' : 'outline'}
                    size="sm"
                    className={effectivePage === page ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                    onClick={() => onPageChange(page as number)}
                  >
                    {page}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(effectivePage + 1)}
                disabled={effectivePage >= totalPages}
              >
                ถัดไป
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={effectivePage >= totalPages}
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
