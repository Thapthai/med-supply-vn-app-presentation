'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SubDepartmentRow } from '../types';

type Props = {
  rows: SubDepartmentRow[];
  loading: boolean;
  totalLoaded: number;
  onEdit: (r: SubDepartmentRow) => void;
  onDelete: (r: SubDepartmentRow) => void;
};

export default function SubDepartmentsTable({
  rows,
  loading,
  totalLoaded,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader>
        <CardTitle>รหัสแผนกย่อยที่ตั้งในระบบ</CardTitle>
        <CardDescription>
          {loading && totalLoaded === 0
            ? 'กำลังโหลด...'
            : totalLoaded === 0
              ? 'ยังไม่มีรหัส — กด «เพิ่มรหัส» จากตารางแผนกด้านบน หรือปุ่ม «เพิ่มรหัสแผนกย่อย»'
              : `แสดง ${rows.length} รายการ${rows.length !== totalLoaded ? ` จากทั้งหมด ${totalLoaded}` : ''} · แต่ละรหัสผูกกับแผนกหนึ่งแผนก`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && totalLoaded === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">กำลังโหลด...</p>
        ) : totalLoaded === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">ไม่พบรายการที่ตรงเงื่อนไข</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">ลำดับ</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>รหัส (code)</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="text-right">Usage records</TableHead>
                  <TableHead>ใช้งาน</TableHead>
                  <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, ri) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-center tabular-nums text-slate-600">{ri + 1}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={r.department?.DepName || r.department?.DepName2}
                    >
                      {r.department?.DepName || r.department?.DepName2 || `ID ${r.department_id}`}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{r.code}</TableCell>
                    <TableCell>{r.name || '—'}</TableCell>
                    <TableCell
                      className="max-w-[220px] truncate text-sm text-slate-600"
                      title={r.description || undefined}
                    >
                      {r.description?.trim() ? r.description : '—'}
                    </TableCell>
                    <TableCell className="text-right">{r._count?.medicalSupplyUsages ?? 0}</TableCell>
                    <TableCell>
                      {r.status ? (
                        <span className="text-xs font-medium text-emerald-700">เปิด</span>
                      ) : (
                        <span className="text-xs text-slate-500">ปิด</span>
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
      </CardContent>
    </Card>
  );
}
