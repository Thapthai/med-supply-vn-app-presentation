'use client';

import { useRef } from 'react';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { DeptRow, SubDepartmentRow } from '../types';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SubDepartmentRow | null;
  formCode: string;
  onFormCodeChange: (v: string) => void;
  formLabel: string;
  onFormLabelChange: (v: string) => void;
  formDescription: string;
  onFormDescriptionChange: (v: string) => void;
  formActive: boolean;
  onFormActiveChange: (v: boolean) => void;
  formDepartmentId: number | null;
  onFormDepartmentIdChange: (v: number | null) => void;
  departments: DeptRow[];
  formDeptLoading: boolean;
  onSearchDepartments: (keyword?: string) => void;
  saving: boolean;
  onSubmit: () => void;
};

export default function SubDepartmentFormDialog({
  open,
  onOpenChange,
  editing,
  formCode,
  onFormCodeChange,
  formLabel,
  onFormLabelChange,
  formDescription,
  onFormDescriptionChange,
  formActive,
  onFormActiveChange,
  formDepartmentId,
  onFormDepartmentIdChange,
  departments,
  formDeptLoading,
  onSearchDepartments,
  saving,
  onSubmit,
}: Props) {
  const dropdownSlotRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div ref={dropdownSlotRef} className="relative flex min-h-0 flex-1 flex-col p-6 pb-2">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editing ? 'แก้ไขรหัสแผนกย่อย' : 'เพิ่มรหัสแผนกย่อย'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 overflow-y-auto flex-1 pr-1 min-h-0">
            <SearchableSelect
              label="แผนก"
              portalTargetRef={dropdownSlotRef}
              placeholder="เลือกแผนก"
              value={formDepartmentId != null ? String(formDepartmentId) : ''}
              onValueChange={(v) => onFormDepartmentIdChange(v === '' ? null : Number(v))}
              options={departments.map((d) => ({
                value: d.ID.toString(),
                label: d.DepName || '',
                subLabel: d.DepName2 || '',
              }))}
              loading={formDeptLoading}
              required
              onSearch={onSearchDepartments}
              searchPlaceholder="ค้นหาชื่อแผนก..."
              initialDisplay={
                formDepartmentId != null && editing?.department_id === formDepartmentId
                  ? {
                      label: editing.department?.DepName || `แผนก ID ${formDepartmentId}`,
                      subLabel: editing.department?.DepName2 || '',
                    }
                  : undefined
              }
            />
            <div className="space-y-2">
              <Label htmlFor="sd-code">รหัส (code)</Label>
              <Input
                id="sd-code"
                value={formCode}
                onChange={(e) => onFormCodeChange(e.target.value)}
                placeholder="เช่น emergency-opd, emergency-ipd"
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd-label">ชื่อแสดง</Label>
              <Input
                id="sd-label"
                value={formLabel}
                onChange={(e) => onFormLabelChange(e.target.value)}
                placeholder="คำอธิบายสั้น ๆ (ไม่บังคับ)"
                className={fieldInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd-desc">รายละเอียด</Label>
              <Textarea
                id="sd-desc"
                value={formDescription}
                onChange={(e) => onFormDescriptionChange(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
                rows={3}
                className={cn('resize-y min-h-[72px]', fieldInputClass)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sd-active">เปิดใช้งาน</Label>
              <Switch id="sd-active" checked={formActive} onCheckedChange={onFormActiveChange} />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-3 border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
              onClick={onSubmit}
              disabled={saving || formDeptLoading}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
