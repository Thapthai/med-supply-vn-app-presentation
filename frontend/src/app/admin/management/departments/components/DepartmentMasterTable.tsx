'use client';

import { Fragment, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Loader2, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DeptRow, StatusFilter, SubDepartmentRow } from '../types';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';
const DEPTS_PER_PAGE = 10;
const SUB_PREVIEW_COUNT = 5;

type Props = {
  departments: DeptRow[];
  subRows: SubDepartmentRow[];
  loadingDepartments: boolean;
  loadingSubRows: boolean;
  deptKeywordInput: string;
  onDeptKeywordInputChange: (v: string) => void;
  subKeywordInput: string;
  onSubKeywordInputChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  onSearch: () => void;
  onResetFilters: () => void;
  /** เปลี่ยนเมื่อกดค้นหา — รีเซ็ตหน้าเป็นหน้า 1 */
  searchVersion: number;
  selectedDepartmentId: number | null;
  onSelectDepartment: (dept: DeptRow | null) => void;
  /** false = ซ่อนแถบค้นหาในการ์ด (ใช้เมื่อย้ายฟอร์มค้นหาไปไว้หน้าแม่) */
  showFilterToolbar?: boolean;
  /** แก้ไขแผนกจากแถวตาราง */
  onEditMainDepartment?: (dept: DeptRow) => void;
  onCreateSubDepartment?: () => void;
  onCreateMainDepartment?: () => void;
  createSubDepartmentLabel?: string;
};

export default function DepartmentMasterTable({
  departments,
  subRows,
  loadingDepartments,
  loadingSubRows,
  deptKeywordInput,
  onDeptKeywordInputChange,
  subKeywordInput,
  onSubKeywordInputChange,
  statusFilter,
  onStatusFilterChange,
  onSearch,
  onResetFilters,
  searchVersion,
  selectedDepartmentId,
  onSelectDepartment,
  showFilterToolbar = true,
  onEditMainDepartment,
  onCreateSubDepartment,
  onCreateMainDepartment,
  createSubDepartmentLabel = 'เพิ่มรหัสแผนกย่อย',
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDepartmentId, setExpandedDepartmentId] = useState<number | null>(null);
  /** แผนกที่ขยายแล้วกด «ดูเพิ่มเติม» ให้เห็นรหัสย่อยทั้งหมด */
  const [subShowAllByDept, setSubShowAllByDept] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [searchVersion]);

  const totalPages = Math.max(1, Math.ceil(departments.length / DEPTS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * DEPTS_PER_PAGE;
  const endIndex = startIndex + DEPTS_PER_PAGE;
  const pageDepartments = departments.slice(startIndex, endIndex);

  const subsByDept = (deptId: number) => subRows.filter((r) => r.department_id === deptId);

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
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="flex flex-row flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-600" />
            แผนกและรหัสแผนกย่อย ({departments.length} แผนก)
          </CardTitle>
          {(onCreateSubDepartment || onCreateMainDepartment) ? (
            <div className="flex flex-wrap justify-end gap-2 shrink-0">
              {onCreateSubDepartment ? (
                <Button
                  type="button"
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
                  onClick={onCreateSubDepartment}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  {createSubDepartmentLabel}
                </Button>
              ) : null}
              {onCreateMainDepartment ? (
                <Button
                  type="button"
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
                  onClick={onCreateMainDepartment}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  เพิ่มแผนก
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {showFilterToolbar ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">ค้นหาแผนก</span>
              <Input
                placeholder="ชื่อ, ชื่อย่อ, ID, RefDepID..."
                value={deptKeywordInput}
                onChange={(e) => onDeptKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={fieldInputClass}
              />
            </div>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">ค้นหารหัสแผนกย่อย</span>
              <Input
                placeholder="code, ชื่อ, รายละเอียด..."
                value={subKeywordInput}
                onChange={(e) => onSubKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={fieldInputClass}
              />
            </div>
            <div className="flex min-w-[140px] flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">สถานะรหัส</span>
              <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
                <SelectTrigger className={cn('w-full lg:w-[160px]', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="active">เปิดใช้งาน</SelectItem>
                  <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onSearch} className="gap-1.5">
                <Search className="h-4 w-4" />
                ค้นหา
              </Button>
              <Button type="button" variant="outline" onClick={onResetFilters} className="gap-1.5">
                <RotateCcw className="h-4 w-4" />
                ล้าง
              </Button>
            </div>
          </div>
        ) : null}
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
                {onEditMainDepartment ? (
                  <TableHead className="w-[120px] text-right text-slate-600 font-semibold">จัดการ</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {busy && departments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={onEditMainDepartment ? 8 : 7} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-600" />
                    <p className="mt-2 text-muted-foreground">กำลังโหลด...</p>
                  </TableCell>
                </TableRow>
              ) : pageDepartments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={onEditMainDepartment ? 8 : 7} className="text-center py-12 text-muted-foreground">
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
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-cyan-50/80' : 'hover:bg-slate-50/80'
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
                        {onEditMainDepartment ? (
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
                        ) : null}
                      </TableRow>
                      {expandedDepartmentId === dept.ID && (
                        <TableRow>
                          <TableCell colSpan={onEditMainDepartment ? 8 : 7} className="bg-slate-50 p-4 align-top">
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

        {departments.length > DEPTS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              แสดง {departments.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, departments.length)} จาก{' '}
              {departments.length} แผนก
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={effectivePage <= 1}
              >
                ก่อนหน้า
              </Button>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={effectivePage === page ? 'default' : 'outline'}
                    size="sm"
                    className={effectivePage === page ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={effectivePage >= totalPages}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
