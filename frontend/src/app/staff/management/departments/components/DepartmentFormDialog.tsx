'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DeptRow } from '../types';

const fieldInputClass = 'bg-white';

export type DepartmentFormPayload = {
  DepName: string;
  DepName2: string;
  RefDepID: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  mode: 'create' | 'edit';
  initialDepartment?: DeptRow | null;
  onSubmit: (payload: DepartmentFormPayload) => void;
};

export default function DepartmentFormDialog({
  open,
  onOpenChange,
  saving,
  mode,
  initialDepartment,
  onSubmit,
}: Props) {
  const [depName, setDepName] = useState('');
  const [depName2, setDepName2] = useState('');
  const [refDepId, setRefDepId] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialDepartment) {
      setDepName(initialDepartment.DepName ?? '');
      setDepName2(initialDepartment.DepName2 ?? '');
      setRefDepId(initialDepartment.RefDepID ?? '');
    } else {
      setDepName('');
      setDepName2('');
      setRefDepId('');
    }
  }, [open, mode, initialDepartment]);

  const handleSubmit = () => {
    if (!depName.trim() && !depName2.trim()) return;
    onSubmit({
      DepName: depName.trim(),
      DepName2: depName2.trim(),
      RefDepID: refDepId.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'แก้ไขแผนก' : 'เพิ่มแผนก'}</DialogTitle>
          {mode === 'create' && (
            <DialogDescription>
              กรอกชื่อแผนกหรือชื่อย่ออย่างน้อยหนึ่งช่อง (รหัสแผนก ID สร้างอัตโนมัติ)
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {mode === 'edit' && initialDepartment != null && (
            <div className="space-y-1.5">
              <Label>รหัสแผนก (ID)</Label>
              <Input value={String(initialDepartment.ID)} disabled className="bg-muted" readOnly />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="staff-dept-main-name">ชื่อแผนก</Label>
            <Input
              id="staff-dept-main-name"
              value={depName}
              onChange={(e) => setDepName(e.target.value)}
              placeholder="เช่น อายุรกรรม"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className={fieldInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-dept-main-name2">ชื่อย่อ (DepName2)</Label>
            <Input
              id="staff-dept-main-name2"
              value={depName2}
              onChange={(e) => setDepName2(e.target.value)}
              placeholder="เช่น MED"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className={fieldInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-dept-main-ref">รหัสอ้างอิง (RefDepID) — ไม่บังคับ</Label>
            <Input
              id="staff-dept-main-ref"
              value={refDepId}
              onChange={(e) => setRefDepId(e.target.value)}
              placeholder="เช่น REF-001"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className={fieldInputClass}
            />
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
            onClick={handleSubmit}
            disabled={saving || (!depName.trim() && !depName2.trim())}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
