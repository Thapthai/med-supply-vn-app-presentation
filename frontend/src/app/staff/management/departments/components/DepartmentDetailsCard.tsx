'use client';

import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DeptRow, SubDepartmentRow } from '../types';

const SUBS_PER_PAGE = 10;

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

type Props = {
  department: DeptRow;
  subRows: SubDepartmentRow[];
  onClose: () => void;
  onAdd: () => void;
  onEditMain: () => void;
  onEdit: (r: SubDepartmentRow) => void;
  onDelete: (r: SubDepartmentRow) => void;
};

export default function DepartmentDetailsCard({
  department,
  subRows,
  onClose,
  onAdd,
  onEditMain,
  onEdit,
  onDelete,
}: Props) {
  const [subPage, setSubPage] = useState(1);

  useEffect(() => {
    setSubPage(1);
  }, [department.ID]);

  const subTotalPages = Math.max(1, Math.ceil(subRows.length / SUBS_PER_PAGE));
  const effectiveSubPage = Math.min(subPage, subTotalPages);
  const subStart = (effectiveSubPage - 1) * SUBS_PER_PAGE;
  const pageSubRows = subRows.slice(subStart, subStart + SUBS_PER_PAGE);

  useEffect(() => {
    setSubPage((p) => Math.min(p, subTotalPages));
  }, [subRows.length, subTotalPages]);

  return (
    <Card className="mt-6 border-slate-200/80 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="flex items-center justify-between gap-3 text-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-5 w-5 shrink-0 text-cyan-600" />
            <span className="truncate">
              รายละเอียดแผนก: {department.DepName || department.DepName2 || `ID ${department.ID}`}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEditMain}>
              <Pencil className="h-4 w-4 mr-1" />
              แก้ไขแผนก
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-600" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มรหัสแผนกย่อย
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="ปิด">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b text-sm">
          <div>
            <p className="text-muted-foreground">รหัสแผนก (ID)</p>
            <p className="text-lg font-medium">{department.ID}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ชื่อแผนก</p>
            <p className="text-lg font-medium">{department.DepName || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ชื่อย่อ (DepName2)</p>
            <p className="text-lg font-mono">{department.DepName2?.trim() ? department.DepName2 : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">RefDepID</p>
            <p className="text-lg font-mono">{department.RefDepID?.trim() ? department.RefDepID : '—'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3">
            รหัสแผนกย่อย ({subRows.length} รายการ)
          </h3>
          {subRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-slate-50/50">
              ยังไม่มีรหัสแผนกย่อย — กด «เพิ่มรหัสแผนกย่อย» เพื่อสร้าง
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/80">
                    <TableHead className="w-14 text-center">ลำดับ</TableHead>
                    <TableHead>รหัส (code)</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="text-right">Usage</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSubRows.map((r, ri) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center tabular-nums text-muted-foreground">{subStart + ri + 1}</TableCell>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell>{r.name || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={r.description || undefined}>
                        {r.description?.trim() ? r.description : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r._count?.medicalSupplyUsages ?? 0}</TableCell>
                      <TableCell>
                        {r.status ? (
                          <span className="text-xs font-medium text-emerald-700">เปิด</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">ปิด</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => onEdit(r)}
                          aria-label="แก้ไขรหัสแผนกย่อย"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(r)}
                          aria-label="ลบรหัสแผนกย่อย"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {subTotalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                หน้า {effectiveSubPage} จาก {subTotalPages} ({subRows.length} รายการ)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSubPage(1)} disabled={effectiveSubPage === 1}>
                  แรกสุด
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  disabled={effectiveSubPage === 1}
                >
                  ก่อนหน้า
                </Button>
                {generatePageNumbers(effectiveSubPage, subTotalPages).map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={effectiveSubPage === page ? 'default' : 'outline'}
                      size="sm"
                      className={effectiveSubPage === page ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                      onClick={() => setSubPage(page as number)}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))}
                  disabled={effectiveSubPage >= subTotalPages}
                >
                  ถัดไป
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubPage(subTotalPages)}
                  disabled={effectiveSubPage >= subTotalPages}
                >
                  สุดท้าย
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
