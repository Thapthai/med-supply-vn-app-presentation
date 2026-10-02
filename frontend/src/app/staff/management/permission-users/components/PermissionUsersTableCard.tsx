'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Edit, Search, X } from 'lucide-react';
import {
  staffRoleDisplayLabel,
  staffPortalCanManageStaffUserRow,
  readStaffRoleCodeFromStorage,
  readStaffUserIdFromStorage,
} from '@/lib/staffRolePolicy';
import type { StaffUser, StaffRoleOption } from '../types';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';
import PermissionUsersPageLoading from './PermissionUsersPageLoading';

export interface PermissionUsersTableCardProps {
  visibleUsers: StaffUser[];
  rolesCatalog: StaffRoleOption[];
  loading: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onEditUser: (user: StaffUser) => void;
  onManageDepartments: (user: StaffUser) => void;
  createDialog: ReactNode;
}

function roleDisplayName(user: StaffUser): string {
  const n = user.role_name?.trim();
  if (n) return n;
  return staffRoleDisplayLabel(user.role);
}

export default function PermissionUsersTableCard({
  visibleUsers,
  rolesCatalog,
  loading,
  searchQuery,
  onSearchQueryChange,
  onEditUser,
  onManageDepartments,
  createDialog,
}: PermissionUsersTableCardProps) {
  const viewerRoleCode = readStaffRoleCodeFromStorage();
  const viewerUserId = readStaffUserIdFromStorage();

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>รายการ User</CardTitle>
            <CardDescription>แสดงผู้ใช้งาน Staff ทั้งหมด — สิทธิ์เข้าหน้านี้ควบคุมจากเมนู Staff</CardDescription>
          </div>
          {createDialog}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="ค้นหา User (อีเมล, ชื่อ, บทบาท)..."
              className={cn('pl-10', fieldInputClass)}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            {searchQuery ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 transform"
                type="button"
                onClick={() => onSearchQueryChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <PermissionUsersPageLoading />
        ) : visibleUsers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {searchQuery ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีข้อมูล User'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm font-medium">ลำดับ</TableHead>
                <TableHead className="text-sm font-medium">ชื่อ-นามสกุล</TableHead>
                <TableHead className="text-sm font-medium">อีเมล</TableHead>
                <TableHead className="text-sm font-medium">บทบาท</TableHead>
                <TableHead className="text-sm font-medium">สถานะ</TableHead>
                {/* <TableHead className="text-right">จัดการ</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((user, index) => {
                const canEdit = staffPortalCanManageStaffUserRow(
                  viewerRoleCode,
                  viewerUserId,
                  user.id,
                  user.role,
                );
                return (
                <TableRow key={user.id}>
                  <TableCell className="text-sm text-foreground">{index + 1}</TableCell>
                  <TableCell className="text-sm text-foreground">
                    {user.fname} {user.lname}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span className="inline-block max-w-[220px] truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-foreground dark:border-slate-700 dark:bg-slate-900/40">
                      {roleDisplayName(user)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {user.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => onManageDepartments(user)}
                        disabled={!canEdit}
                        title={
                          canEdit
                            ? 'จัดการสิทธิ์แผนกของผู้ใช้รายนี้'
                            : 'ไม่มีสิทธิ์จัดการผู้ใช้รายนี้'
                        }
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => onEditUser(user)}
                        disabled={!canEdit}
                        title={
                          canEdit
                            ? 'แก้ไข Role และสถานะใช้งาน'
                            : 'ไม่มีสิทธิ์แก้ไขผู้ใช้รายนี้ (หัวหน้าสายจัดการลูกสาย หรือผู้ที่มี Role เดียวกับแถว)'
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
