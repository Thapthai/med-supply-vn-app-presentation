'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { medicalSupplySubDepartmentsApi, departmentApi } from '@/lib/api';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import SubDepartmentsFilters from '@/app/admin/management/departments/components/SubDepartmentsFilters';
import SubDepartmentFormDialog from '@/app/admin/management/departments/components/SubDepartmentFormDialog';
import SubDepartmentDeleteDialog from '@/app/admin/management/departments/components/SubDepartmentDeleteDialog';
import DepartmentFormDialog, {
  type DepartmentFormPayload,
} from '@/app/admin/management/departments/components/DepartmentFormDialog';
import DepartmentMasterTable from '@/app/admin/management/departments/components/DepartmentMasterTable';
import DepartmentDetailsCard from '@/app/admin/management/departments/components/DepartmentDetailsCard';
import type { DeptRow, StatusFilter, SubDepartmentRow } from '@/app/admin/management/departments/types';

export default function DivisionTab() {
  const [rows, setRows] = useState<SubDepartmentRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [deptKwInput, setDeptKwInput] = useState('');
  const [subKwInput, setSubKwInput] = useState('');
  const [activeDeptKw, setActiveDeptKw] = useState('');
  const [activeSubKw, setActiveSubKw] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchVersion, setSearchVersion] = useState(0);

  const [filterDepartments, setFilterDepartments] = useState<DeptRow[]>([]);
  const [filterDeptLoading, setFilterDeptLoading] = useState(false);

  const [selectedDept, setSelectedDept] = useState<DeptRow | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubDepartmentRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [formDepartmentId, setFormDepartmentId] = useState<number | null>(null);
  const [formDeptLoading, setFormDeptLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SubDepartmentRow | null>(null);

  const [deptMainOpen, setDeptMainOpen] = useState(false);
  const [deptMainMode, setDeptMainMode] = useState<'create' | 'edit'>('create');
  const [deptMainEditDept, setDeptMainEditDept] = useState<DeptRow | null>(null);
  const [creatingDept, setCreatingDept] = useState(false);

  const loadSubs = useCallback(async () => {
    try {
      setLoadingSubs(true);
      const res = await medicalSupplySubDepartmentsApi.getAll();
      if (res.success === false || !Array.isArray(res.data)) {
        toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
        setRows([]);
        return;
      }
      setRows(res.data as SubDepartmentRow[]);
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const loadFilterDepartments = useCallback(async () => {
    try {
      setFilterDeptLoading(true);
      const response = await departmentApi.getAll({ limit: 500 });
      if (response.success && response.data) {
        const list = (response.data as DeptRow[]).slice().sort((a, b) => {
          return (a.DepName || a.DepName2 || '').localeCompare(b.DepName || b.DepName2 || '');
        });
        setFilterDepartments(list);
      }
    } catch {
      toast.error('โหลดรายการแผนกไม่สำเร็จ');
    } finally {
      setFilterDeptLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterDepartments();
  }, [loadFilterDepartments]);

  const subRowsFiltered = useMemo(() => {
    let list = rows;
    const q = activeSubKw.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const code = (r.code || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desc.includes(q);
      });
    }
    if (statusFilter === 'active') list = list.filter((r) => r.status);
    if (statusFilter === 'inactive') list = list.filter((r) => !r.status);
    return list;
  }, [rows, activeSubKw, statusFilter]);

  const departmentsForTable = useMemo(() => {
    const qd = activeDeptKw.trim().toLowerCase();
    let base = filterDepartments.filter((d) => {
      if (!qd) return true;
      const idStr = String(d.ID);
      return (
        idStr.includes(qd) ||
        (d.DepName || '').toLowerCase().includes(qd) ||
        (d.DepName2 || '').toLowerCase().includes(qd) ||
        (d.RefDepID || '').toLowerCase().includes(qd)
      );
    });
    const hasSubFilters = activeSubKw.trim().length > 0 || statusFilter !== 'all';
    if (hasSubFilters) {
      const ids = new Set(subRowsFiltered.map((r) => r.department_id));
      base = base.filter((d) => ids.has(d.ID));
    }
    return base;
  }, [filterDepartments, activeDeptKw, activeSubKw, statusFilter, subRowsFiltered]);

  useEffect(() => {
    if (selectedDept && !departmentsForTable.some((d) => d.ID === selectedDept.ID)) {
      setSelectedDept(null);
    }
  }, [departmentsForTable, selectedDept]);

  const applySearch = () => {
    setActiveDeptKw(deptKwInput);
    setActiveSubKw(subKwInput);
    setSearchVersion((v) => v + 1);
  };

  const resetFilters = () => {
    setDeptKwInput('');
    setSubKwInput('');
    setActiveDeptKw('');
    setActiveSubKw('');
    setStatusFilter('all');
    setSearchVersion((v) => v + 1);
  };

  const openDeptMainCreate = () => {
    setDeptMainMode('create');
    setDeptMainEditDept(null);
    setDeptMainOpen(true);
  };

  const openDeptMainEdit = (d: DeptRow) => {
    setDeptMainMode('edit');
    setDeptMainEditDept(d);
    setDeptMainOpen(true);
  };

  const submitDeptMainForm = async (payload: DepartmentFormPayload) => {
    const body = {
      DepName: payload.DepName,
      DepName2: payload.DepName2,
      RefDepID: payload.RefDepID.trim(),
    };
    setCreatingDept(true);
    try {
      if (deptMainMode === 'edit' && deptMainEditDept) {
        const res = await departmentApi.update(deptMainEditDept.ID, body);
        if (res.success === false) {
          toast.error(res.message || 'อัปเดตแผนกไม่สำเร็จ');
          return;
        }
        toast.success(res.message || 'อัปเดตแผนกหลักแล้ว');
        setDeptMainOpen(false);
        setDeptMainEditDept(null);
        await loadFilterDepartments();
        const row = res.data as DeptRow | undefined;
        if (row?.ID != null) setSelectedDept(row);
        return;
      }
      const res = await departmentApi.create({
        DepName: payload.DepName || undefined,
        DepName2: payload.DepName2 || undefined,
        RefDepID: payload.RefDepID.trim() || undefined,
      });
      if (res.success === false) {
        toast.error(res.message || 'สร้างแผนกไม่สำเร็จ');
        return;
      }
      toast.success(res.message || 'สร้างแผนกหลักแล้ว');
      setDeptMainOpen(false);
      await loadFilterDepartments();
      const row = res.data as DeptRow | undefined;
      if (row?.ID != null) setSelectedDept(row);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || (deptMainMode === 'edit' ? 'อัปเดตแผนกไม่สำเร็จ' : 'สร้างแผนกไม่สำเร็จ'));
    } finally {
      setCreatingDept(false);
    }
  };

  const loadDepartments = async (keyword?: string) => {
    try {
      setFormDeptLoading(true);
      const response = await departmentApi.getAll({ limit: 10, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as DeptRow[]);
      }
    } catch {
      toast.error('โหลดรายการแผนกไม่สำเร็จ');
      setDepartments([]);
    } finally {
      setFormDeptLoading(false);
    }
  };

  const openCreateForDepartmentId = (departmentId: number) => {
    const d = filterDepartments.find((x) => x.ID === departmentId);
    setEditing(null);
    setFormCode('');
    setFormLabel('');
    setFormDescription('');
    setFormDepartmentId(departmentId);
    setFormActive(true);
    setDepartments(d ? [d] : []);
    setFormOpen(true);
  };

  const openCreate = () => {
    if (selectedDept) {
      openCreateForDepartmentId(selectedDept.ID);
      return;
    }
    setEditing(null);
    setFormCode('');
    setFormLabel('');
    setFormDescription('');
    setFormDepartmentId(null);
    setFormActive(true);
    setDepartments([]);
    setFormOpen(true);
  };

  const openEdit = (r: SubDepartmentRow) => {
    setEditing(r);
    setFormCode(r.code);
    setFormLabel(r.name || '');
    setFormDescription(r.description || '');
    setFormDepartmentId(r.department_id);
    setFormActive(r.status);
    setDepartments([]);
    setFormOpen(true);
  };

  const submitForm = async () => {
    const code = formCode.trim();
    if (!code) {
      toast.error('กรุณากรอกรหัสแผนกย่อย (code)');
      return;
    }
    if (formDepartmentId == null) {
      toast.error('กรุณาเลือกแผนกหลัก');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await medicalSupplySubDepartmentsApi.update(editing.id, {
          department_id: formDepartmentId,
          code,
          name: formLabel.trim() || undefined,
          description: formDescription.trim() ? formDescription.trim() : null,
          status: formActive,
        });
        if (res.success === false) {
          toast.error(res.message || 'อัปเดตไม่สำเร็จ');
          return;
        }
        toast.success('บันทึกแล้ว');
      } else {
        const res = await medicalSupplySubDepartmentsApi.create({
          department_id: formDepartmentId,
          code,
          name: formLabel.trim() || undefined,
          description: formDescription.trim() ? formDescription.trim() : null,
          status: formActive,
        });
        if (res.success === false) {
          toast.error(res.message || 'สร้างไม่สำเร็จ');
          return;
        }
        toast.success('บันทึกแล้ว');
      }
      setFormOpen(false);
      loadSubs();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await medicalSupplySubDepartmentsApi.delete(deleteTarget.id);
      if (res.success === false) {
        toast.error(res.message || 'ลบไม่สำเร็จ');
        return;
      }
      toast.success('ลบแล้ว');
      setDeleteTarget(null);
      loadSubs();
    } catch {
      toast.error('ลบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const detailSubs =
    selectedDept != null
      ? rows
          .filter((r) => r.department_id === selectedDept.ID)
          .slice()
          .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">จัดการ Division</h2>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            คลิกแถว Division เพื่อดูและจัดการรหัสแผนกย่อยด้านล่าง
          </p>
        </div>
      </div>

      <SubDepartmentsFilters
        deptKeywordInput={deptKwInput}
        activeDeptKeyword={activeDeptKw}
        subKeywordInput={subKwInput}
        activeSubKeyword={activeSubKw}
        statusFilter={statusFilter}
        onDeptKeywordInputChange={setDeptKwInput}
        onSubKeywordInputChange={setSubKwInput}
        onStatusFilterChange={setStatusFilter}
        onSearch={applySearch}
        onClearFilters={resetFilters}
        onRefresh={() => {
          loadSubs();
          loadFilterDepartments();
        }}
        loading={loadingSubs || filterDeptLoading}
      />

      <DepartmentMasterTable
        departments={departmentsForTable}
        subRows={subRowsFiltered}
        loadingDepartments={filterDeptLoading}
        loadingSubRows={loadingSubs}
        deptKeywordInput={deptKwInput}
        onDeptKeywordInputChange={setDeptKwInput}
        subKeywordInput={subKwInput}
        onSubKeywordInputChange={setSubKwInput}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSearch={applySearch}
        onResetFilters={resetFilters}
        searchVersion={searchVersion}
        selectedDepartmentId={selectedDept?.ID ?? null}
        onSelectDepartment={(d) => setSelectedDept(d)}
        showFilterToolbar={false}
        onEditMainDepartment={openDeptMainEdit}
        onCreateSubDepartment={openCreate}
        onCreateMainDepartment={openDeptMainCreate}
        createSubDepartmentLabel={
          selectedDept ? 'เพิ่มรหัสแผนกย่อย (แผนกที่เลือก)' : 'เพิ่มรหัสแผนกย่อย'
        }
      />

      {selectedDept && (
        <DepartmentDetailsCard
          department={selectedDept}
          subRows={detailSubs}
          onClose={() => setSelectedDept(null)}
          onAdd={() => openCreateForDepartmentId(selectedDept.ID)}
          onEditMain={() => openDeptMainEdit(selectedDept)}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <DepartmentFormDialog
        open={deptMainOpen}
        onOpenChange={(o) => {
          setDeptMainOpen(o);
          if (!o) {
            setDeptMainEditDept(null);
            setDeptMainMode('create');
          }
        }}
        saving={creatingDept}
        mode={deptMainMode}
        initialDepartment={deptMainMode === 'edit' ? deptMainEditDept : null}
        onSubmit={submitDeptMainForm}
      />

      <SubDepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        formCode={formCode}
        onFormCodeChange={setFormCode}
        formLabel={formLabel}
        onFormLabelChange={setFormLabel}
        formDescription={formDescription}
        onFormDescriptionChange={setFormDescription}
        formActive={formActive}
        onFormActiveChange={setFormActive}
        formDepartmentId={formDepartmentId}
        onFormDepartmentIdChange={setFormDepartmentId}
        departments={departments}
        formDeptLoading={formDeptLoading}
        onSearchDepartments={loadDepartments}
        saving={saving}
        onSubmit={submitForm}
      />

      <SubDepartmentDeleteDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        saving={saving}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
