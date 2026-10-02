"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
    DepName2?: string;
  };
}

interface DeleteMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  saving: boolean;
  selectedMapping?: CabinetDepartmentMapping | null;
}

function cabinetLabel(mapping: CabinetDepartmentMapping | null | undefined): string {
  if (!mapping?.cabinet) return mapping ? `ตู้ #${mapping.cabinet_id}` : "—";
  return mapping.cabinet.cabinet_name || mapping.cabinet.cabinet_code || `ตู้ #${mapping.cabinet_id}`;
}

function departmentLabel(mapping: CabinetDepartmentMapping | null | undefined): string {
  if (!mapping?.department) return mapping ? `แผนก #${mapping.department_id}` : "—";
  return mapping.department.DepName || mapping.department.DepName2 || `แผนก #${mapping.department_id}`;
}

export default function DeleteMappingDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
  selectedMapping,
}: DeleteMappingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>ยืนยันการลบการเชื่อมโยง</DialogTitle>
              <DialogDescription className="mt-1">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600">
            คุณแน่ใจหรือไม่ที่จะลบการเชื่อมโยงระหว่างตู้และแผนก นี้?
          </p>
          {selectedMapping && (
            <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-gray-500 shrink-0">ตู้ Cabinet</span>
                <span className="font-medium text-right">{cabinetLabel(selectedMapping)}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-gray-500 shrink-0">แผนก</span>
                <span className="font-medium text-right">{departmentLabel(selectedMapping)}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-gray-500 shrink-0">สถานะ</span>
                <span className="font-medium">{selectedMapping.status}</span>
              </div>
              {selectedMapping.description?.trim() ? (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500 shrink-0">หมายเหตุ</span>
                  <span className="font-medium text-right max-w-[200px]">{selectedMapping.description}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-3 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              "ลบการเชื่อมโยง"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
