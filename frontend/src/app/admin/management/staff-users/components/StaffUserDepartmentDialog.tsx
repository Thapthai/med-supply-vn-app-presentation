'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { departmentApi, staffPermissionDepartmentApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { StaffUser } from './types';

const fieldInputClass = 'bg-white';

interface DepartmentRow {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
}

function mainDepartmentLabel(d: DepartmentRow): string {
  return (d.DepName ?? d.DepName2 ?? '').trim() || `แผนก #${d.ID}`;
}

export interface StaffUserDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StaffUser | null;
}

export function StaffUserDepartmentDialog({ open, onOpenChange, user }: StaffUserDepartmentDialogProps) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [unrestrictedFromServer, setUnrestrictedFromServer] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      const res = await departmentApi.getAll({ page: 1, limit: 5000, isCancel: false });
      const data = Array.isArray(res?.data) ? res.data : (res as { data?: DepartmentRow[] })?.data ?? [];
      setDepartments(
        (data as DepartmentRow[])
          .filter((d) => d?.ID != null && d.ID > 0)
          .sort((a, b) => mainDepartmentLabel(a).localeCompare(mainDepartmentLabel(b), 'th')),
      );
    } catch (e: unknown) {
      console.error(e);
      toast.error('โหลดรายการ แผนก ไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadForUser = useCallback(async (id: number) => {
    try {
      setLoadingUser(true);
      const res = await staffPermissionDepartmentApi.getByUser({ user_id: id });
      const data = res?.data;
      if (!data) {
        setSelected(new Set());
        setUnrestrictedFromServer(true);
        return;
      }
      setUnrestrictedFromServer(data.unrestricted === true);
      setSelected(new Set((data.departments ?? []).map((d) => d.id)));
    } catch (e: unknown) {
      console.error(e);
      toast.error('โหลดสิทธิ์แผนกไม่สำเร็จ');
      setSelected(new Set());
      setUnrestrictedFromServer(true);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    if (departments.length === 0) loadDepartments();
    if (user) loadForUser(user.id);
  }, [open, user, departments.length, loadDepartments, loadForUser]);

  const toggle = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(departments.map((d) => d.ID)));
  const clearAll = () => setSelected(new Set());

  const save = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const department_ids = [...selected].sort((a, b) => a - b);
      const res = await staffPermissionDepartmentApi.set({ user_id: user.id, department_ids });
      if (res?.success === false) {
        toast.error((res as { message?: string }).message ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      toast.success(res?.message ?? 'บันทึกสิทธิ์แผนกแล้ว');
      onOpenChange(false);
    } catch (e: unknown) {
      console.error(e);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => {
      const label = mainDepartmentLabel(d).toLowerCase();
      return (
        String(d.ID).includes(q) ||
        label.includes(q) ||
        (d.DepName ?? '').toLowerCase().includes(q) ||
        (d.DepName2 ?? '').toLowerCase().includes(q)
      );
    });
  }, [departments, search]);

  const busy = loadingDepartments || loadingUser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>จัดการสิทธิ์แผนก</DialogTitle>
          <DialogDescription>
            {user
              ? `${user.fname} ${user.lname} (${user.email}) — ติ๊กเฉพาะแผนกที่อนุญาต, ไม่ติ๊กเลย = เห็นทุกแผนก`
              : 'เลือกผู้ใช้'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="ค้นหา ID หรือชื่อแผนก…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn('pl-9', fieldInputClass)}
              disabled={busy}
              aria-label="ค้นหาแผนก"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={selectAll} disabled={busy || saving}>
              เลือกทุกแผนก
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={clearAll} disabled={busy || saving}>
              ล้างทั้งหมด
            </Button>
          </div>
        </div>

        {!busy && unrestrictedFromServer && selected.size === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            ผู้ใช้นี้<strong> ไม่จำกัดแผนก</strong> (เห็นทุกแผนก) — ติ๊กด้านล่างเพื่อจำกัด
          </div>
        )}

        <div className="max-h-[min(50vh,420px)] overflow-y-auto pr-1">
          {busy ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {search.trim() ? `ไม่พบรายการที่ตรงกับ "${search.trim()}"` : 'ไม่มีข้อมูลแผนก'}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filteredDepartments.map((d) => (
                <li
                  key={d.ID}
                  className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <Checkbox
                    id={`admin-spd-dept-${d.ID}`}
                    checked={selected.has(d.ID)}
                    onCheckedChange={(v) => toggle(d.ID, v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor={`admin-spd-dept-${d.ID}`} className="cursor-pointer text-sm leading-tight">
                    <span className="mt-0.5 block font-medium text-slate-800">{mainDepartmentLabel(d)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={save} disabled={!user || busy || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
