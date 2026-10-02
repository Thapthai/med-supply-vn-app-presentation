'use client';

import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Pencil, Trash2, Key, Loader2, Plus } from 'lucide-react';
import type { StaffUser, StaffRoleOption } from './types';
import { StaffUserStatusBadge } from '@/app/admin/management/employee/components/employeeUserStatus';
import { CreateStaffUserDialog } from './CreateStaffUserDialog';

function staffRoleDisplayCell(staff: { role_name?: string | null; role: string }): string {
  const n = staff.role_name?.trim();
  if (n) return n;
  return staff.role?.trim() || '-';
}

interface StaffUsersTableProps {
  loading: boolean;
  users: StaffUser[];
  searchTerm: string;
  staffRoles: StaffRoleOption[];
  isCreateDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
  showSecret: boolean;
  onShowSecretChange: (v: boolean) => void;
  onCopy: (text: string, label: string) => void;
  onUserCreated: () => void;
  onEdit: (staff: StaffUser) => void;
  onManageDepartments: (staff: StaffUser) => void;
  onDelete: (id: number) => void;
  onRegenerateSecret: (id: number) => void;
}

export function StaffUsersTable({
  loading,
  users,
  searchTerm,
  staffRoles,
  isCreateDialogOpen,
  onCreateDialogOpenChange,
  showSecret,
  onShowSecretChange,
  onCopy,
  onUserCreated,
  onEdit,
  onManageDepartments,
  onDelete,
  onRegenerateSecret,
}: StaffUsersTableProps) {
  const openCreateDialog = () => {
    onCreateDialogOpenChange(true);
    onShowSecretChange(false);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่ม Staff User
              </Button>
            </div>
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'ไม่พบรายการที่ตรงกับคำค้น' : 'ยังไม่มี Staff User'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex justify-end mb-4">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่ม Staff User
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ลำดับ</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>รหัสพนักงาน</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันสร้าง</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((staff, index) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{`${staff.fname} ${staff.lname}`}</TableCell>
                    <TableCell className="text-sm">
                      {staff.emp_code ? (
                        <span className="font-mono text-xs">{staff.emp_code}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {staff.employee_display ? (
                        <span className="block text-muted-foreground truncate max-w-[140px]">{staff.employee_display}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <span className="inline-block max-w-[220px] truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-foreground dark:border-slate-700 dark:bg-slate-900/40">
                        {staffRoleDisplayCell(staff)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{staff.client_id?.substring(0, 20)}...</TableCell>
                    <TableCell>
                      <StaffUserStatusBadge isUser={staff.isUser ?? (staff.is_active ? 1 : 0)} />
                    </TableCell>
                    <TableCell>{staff.created_at ? formatUtcDateTime(String(staff.created_at)) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="outline" onClick={() => onEdit(staff)} title="แก้ไข">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => onManageDepartments(staff)} title="จัดการสิทธิ์แผนก">
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => onRegenerateSecret(staff.id)} title="สร้าง Client Secret ใหม่">
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => onDelete(staff.id)} title="ปิดการใช้งาน">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <CreateStaffUserDialog
          open={isCreateDialogOpen}
          onOpenChange={onCreateDialogOpenChange}
          staffRoles={staffRoles}
          onSuccess={onUserCreated}
          showSecret={showSecret}
          onShowSecretChange={onShowSecretChange}
          onCopy={onCopy}
        />
      </CardContent>
    </Card>
  );
}
