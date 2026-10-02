'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import { departmentApi } from '@/lib/api';
import { MAX_ACTIVE_DIVISION_LINKS_PER_CABINET } from '@/app/admin/management/cabinet-departments/components/CreateMappingDialog';

type Dept = { ID: number; DepName?: string; DepName2?: string };

export type DivisionPick = {
  id: string;
  label: string;
};

function deptLabel(d: Dept): string {
  return d.DepName?.trim() || d.DepName2?.trim() || `แผนก #${d.ID}`;
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    const v = id.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    next.push(v);
  }
  return next;
}

type CabinetDivisionPickerProps = {
  open: boolean;
  values: DivisionPick[];
  onChange: (values: DivisionPick[]) => void;
  disabled?: boolean;
};

export default function CabinetDivisionPicker({
  open,
  values,
  onChange,
  disabled = false,
}: CabinetDivisionPickerProps) {
  const [options, setOptions] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDepartments = useCallback(async (keyword?: string) => {
    setLoading(true);
    try {
      const response = await departmentApi.getAll({
        limit: 50,
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
      });
      if (response.success && Array.isArray(response.data)) {
        setOptions(response.data as Dept[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadDepartments();
  }, [open, loadDepartments]);

  const slots = values.length === 0 ? [{ id: '', label: '' }] : values;
  const filledCount = values.filter((v) => v.id).length;
  const canAdd = filledCount < MAX_ACTIVE_DIVISION_LINKS_PER_CABINET && filledCount === slots.length && !disabled;

  const setSlot = (index: number, id: string) => {
    const dept = options.find((d) => String(d.ID) === id);
    const next = slots.map((slot, i) =>
      i === index
        ? id
          ? { id, label: dept ? deptLabel(dept) : slot.label || id }
          : { id: '', label: '' }
        : slot,
    );
    const picked = uniqueIds(next.map((s) => s.id));
    onChange(
      picked.map((deptId) => {
        const known = next.find((s) => s.id === deptId);
        return { id: deptId, label: known?.label || deptId };
      }),
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div>
        <p className="text-sm font-medium text-slate-900">เชื่อมโยง แผนก</p>
        <p className="text-xs text-slate-500">
          เลือกได้สูงสุด {MAX_ACTIVE_DIVISION_LINKS_PER_CABINET} แผนก ตู้ใหม่จะใช้ แผนก แรกช่วยสร้างรหัสตู้
        </p>
      </div>
      <div className="space-y-2">
        {slots.map((slot, index) => {
          const others = new Set(slots.filter((_, i) => i !== index).map((s) => s.id).filter(Boolean));
          return (
            <SearchableSelect
              key={`division-slot-${index}`}
              label={index === 0 ? 'แผนก' : `แผนกที่ ${index + 1}`}
              placeholder="ค้นหาแล้วเลือกแผนก"
              searchPlaceholder="ค้นหาชื่อแผนก"
              value={slot.id}
              onValueChange={(v) => setSlot(index, v)}
              options={options
                .filter((d) => !others.has(String(d.ID)))
                .map((d) => ({
                  value: String(d.ID),
                  label: deptLabel(d),
                  subLabel: d.DepName2 && d.DepName ? d.DepName2 : undefined,
                }))}
              loading={loading}
              onSearch={(kw) => void loadDepartments(kw)}
              initialDisplay={slot.id ? { label: slot.label } : undefined}
              allowClear
              disabled={disabled}
              positionMode="flow"
            />
          );
        })}
      </div>
      {canAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...values.filter((v) => v.id), { id: '', label: '' }])}
        >
          <Plus className="h-4 w-4" />
          เพิ่ม แผนก
        </Button>
      ) : null}
      {filledCount === 0 ? (
        <p className="text-xs text-slate-500">ยังไม่เลือกก็ได้ แล้วค่อยมาแก้ตอนแก้ไขตู้</p>
      ) : null}
    </div>
  );
}
