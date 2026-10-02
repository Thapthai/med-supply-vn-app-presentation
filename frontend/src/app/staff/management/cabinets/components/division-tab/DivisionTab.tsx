'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { staffMedicalSupplySubDepartmentsApi } from '@/lib/staffApi/medicalSupplySubDepartmentsApi';
import { staffDepartmentApi } from '@/lib/staffApi/departmentApi';
import {
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';
import { toast } from 'sonner';
import { Building2, Plus, RefreshCw, RotateCcw, Search } from 'lucide-react';
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
import SubDepartmentFormDialog from '@/app/staff/management/departments/components/SubDepartmentFormDialog';
import SubDepartmentDeleteDialog from '@/app/staff/management/departments/components/SubDepartmentDeleteDialog';
import DepartmentFormDialog, {
  type DepartmentFormPayload,
} from '@/app/staff/management/departments/components/DepartmentFormDialog';
import DepartmentMasterTable from '@/app/staff/management/departments/components/DepartmentMasterTable';
import DepartmentDetailsCard from '@/app/staff/management/departments/components/DepartmentDetailsCard';
import type { DeptRow, StatusFilter, SubDepartmentRow } from '@/app/staff/management/departments/types';
import {
  buildRoleDivisionSummary,
  filterSubRowsInDepartmentScope,
} from '@/app/staff/management/departments/utils';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';
const DEPTS_PER_PAGE = 10;

export default function DivisionTab() {
  const [rows, setRows] = useState<SubDepartmentRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [deptKwInput, setDeptKwInput] = useState('');
  const [subKwInput, setSubKwInput] = useState('');
  const [activeDeptKw, setActiveDeptKw] = useState('');
  const [activeSubKw, setActiveSubKw] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [roleDepartments, setRoleDepartments] = useState<DeptRow[]>([]);
  const [scopeLoading, setScopeLoading] = useState(true);

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

  /** undefined = ยังไม่รู้ scope, null = ไม่จำกัด, number[] = เฉพาะแผนกที่อนุญาต */
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);

  const roleDeptIdSet = useMemo(
    () => new Set(roleDepartments.map((d) => d.ID)),
    [roleDepartments],
  );

  const roleDivisionSummary = useMemo(
    () => buildRoleDivisionSummary(roleDepartments),
    [roleDepartments],
  );

  const rowsInRoleScope = useMemo(
    () => filterSubRowsInDepartmentScope(rows, roleDeptIdSet),
    [rows, roleDeptIdSet],
  );

  const loadRoleDepartments = useCallback(async () => {
    try {
      setScopeLoading(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      const list = (await fetchStaffDepartmentsForFilter({
        page: 1,
        limit: 500,
        allowedDepartmentIds: allowed,
      })) as DeptRow[];
      setRoleDepartments(
        list.slice().sort((a, b) =>
          (a.DepName || a.DepName2 || '').localeCompare(b.DepName || b.DepName2 || ''),
        ),
      );
    } catch {
      toast.error('โหลดรายการแผนกตามสิทธิ์ไม่สำเร็จ');
      setRoleDepartments([]);
    } finally {
      setScopeLoading(false);
    }
  }, []);

  const loadSubs = useCallback(async () => {
    if (scopeLoading) return;
    try {
      setLoadingSubs(true);
      const res = await staffMedicalSupplySubDepartmentsApi.getAll();
      if (res.success === false || !Array.isArray(res.data)) {
        toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
        setRows([]);
        return;
      }
      const scoped = filterSubRowsInDepartmentScope(
        res.data as SubDepartmentRow[],
        roleDeptIdSet,
      );
      setRows(scoped);
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoadingSubs(false);
    }
  }, [scopeLoading, roleDeptIdSet]);

  useEffect(() => {
    void loadRoleDepartments();
  }, [loadRoleDepartments]);

  useEffect(() => {
    if (!scopeLoading) {
      void loadSubs();
    }
  }, [scopeLoading, loadSubs]);

  const subRowsFiltered = useMemo(() => {
    let list = rowsInRoleScope;
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
  }, [rowsInRoleScope, activeSubKw, statusFilter]);

  const departmentsForTable = useMemo(() => {
    let base = roleDepartments;
    const qd = activeDeptKw.trim().toLowerCase();
    if (qd) {
      base = base.filter((d) => {
        const idStr = String(d.ID);
        return (
          idStr.includes(qd) ||
          (d.DepName || '').toLowerCase().includes(qd) ||
          (d.DepName2 || '').toLowerCase().includes(qd) ||
          (d.RefDepID || '').toLowerCase().includes(qd)
        );
      });
    }
    const hasSubFilters = activeSubKw.trim().length > 0 || statusFilter !== 'all';
    if (hasSubFilters) {
      const ids = new Set(subRowsFiltered.map((r) => r.department_id));
      base = base.filter((d) => ids.has(d.ID));
    }
    return base;
  }, [roleDepartments, activeDeptKw, activeSubKw, statusFilter, subRowsFiltered]);

  const totalPages = useMemo(
    () =>
      departmentsForTable.length > 0
        ? Math.ceil(departmentsForTable.length / DEPTS_PER_PAGE)
        : 1,
    [departmentsForTable.length],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    if (selectedDept && !departmentsForTable.some((d) => d.ID === selectedDept.ID)) {
      setSelectedDept(null);
    }
  }, [departmentsForTable, selectedDept]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const applySearch = () => {
    setActiveDeptKw(deptKwInput);
    setActiveSubKw(subKwInput);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setDeptKwInput('');
    setSubKwInput('');
    setActiveDeptKw('');
    setActiveSubKw('');
    setStatusFilter('all');
    setCurrentPage(1);
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
        const res = await staffDepartmentApi.update(deptMainEditDept.ID, body);
        if (res.success === false) {
          toast.error(res.message || 'อัปเดตแผนกไม่สำเร็จ');
          return;
        }
        toast.success(res.message || 'อัปเดตแผนกแล้ว');
        setDeptMainOpen(false);
        setDeptMainEditDept(null);
        await loadRoleDepartments();
        const row = res.data as DeptRow | undefined;
        if (row?.ID != null) setSelectedDept(row);
        return;
      }
      const res = await staffDepartmentApi.create({
        DepName: payload.DepName || undefined,
        DepName2: payload.DepName2 || undefined,
        RefDepID: payload.RefDepID.trim() || undefined,
      });
      if (res.success === false) {
        toast.error(res.message || 'สร้างแผนกไม่สำเร็จ');
        return;
      }
      toast.success(res.message || 'สร้างแผนกแล้ว');
      setDeptMainOpen(false);
      await loadRoleDepartments();
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
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 50,
        allowedDepartmentIds: allowed,
      });
      setDepartments(list as DeptRow[]);
    } catch {
      toast.error('โหลดรายการแผนกไม่สำเร็จ');
      setDepartments([]);
    } finally {
      setFormDeptLoading(false);
    }
  };

  const openCreateForDepartmentId = (departmentId: number) => {
    const d = roleDepartments.find((x) => x.ID === departmentId);
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
    setDepartments(roleDepartments);
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
      toast.error('กรุณาเลือกแผนก');
      return;
    }
    if (!roleDeptIdSet.has(formDepartmentId)) {
      toast.error('ไม่มีสิทธิ์จัดการแผนกนี้');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await staffMedicalSupplySubDepartmentsApi.update(editing.id, {
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
        const res = await staffMedicalSupplySubDepartmentsApi.create({
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
      const res = await staffMedicalSupplySubDepartmentsApi.delete(deleteTarget.id);
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
      ? rowsInRoleScope
          .filter((r) => r.department_id === selectedDept.ID)
          .slice()
          .sort((a, b) => a.code.localeCompare(b.code))
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">จัดการแผนก</h2>
            <p className="text-sm text-slate-500">แสดงเฉพาะแผนกตามสิทธิ์ของคุณ</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadRoleDepartments().then(() => loadSubs());
            }}
            disabled={loadingSubs || scopeLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingSubs ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {selectedDept ? 'เพิ่มรหัส (แผนกที่เลือก)' : 'เพิ่มรหัสแผนกย่อย'}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
            onClick={openDeptMainCreate}
          >
            <Plus className="h-4 w-4 shrink-0" />
            เพิ่มแผนก
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-600" />
              กรองข้อมูล
            </CardTitle>
            {!scopeLoading && roleDivisionSummary ? (
              <p className="text-xs text-muted-foreground mt-1">
                แผนก ตามสิทธิ์: {roleDivisionSummary}
              </p>
            ) : null}
            {!scopeLoading && roleDepartments.length === 0 ? (
              <p className="text-xs text-amber-700 mt-1">
                ไม่พบแผนกที่คุณได้รับอนุญาต — ติดต่อผู้ดูแลระบบเพื่อกำหนดสิทธิ์แผนก
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">ค้นหาใน แผนก ตามสิทธิ์ของคุณ</p>
              <Input
                placeholder="ชื่อ, ชื่อย่อ, ID, RefDepID..."
                value={deptKwInput}
                onChange={(e) => setDeptKwInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className={fieldInputClass}
              />
            </div>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">ค้นหารหัสแผนกย่อย</span>
              <Input
                placeholder="code, ชื่อ, รายละเอียด..."
                value={subKwInput}
                onChange={(e) => setSubKwInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className={fieldInputClass}
              />
            </div>
            <div className="flex min-w-[140px] flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">สถานะรหัส</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
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
              <Button type="button" variant="secondary" onClick={applySearch} className="gap-1.5">
                <Search className="h-4 w-4" />
                ค้นหา
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters} className="gap-1.5">
                <RotateCcw className="h-4 w-4" />
                ล้าง
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <DepartmentMasterTable
        departments={departmentsForTable}
        subRows={subRowsFiltered}
        loadingDepartments={scopeLoading}
        loadingSubRows={loadingSubs}
        selectedDepartmentId={selectedDept?.ID ?? null}
        onSelectDepartment={(d) => setSelectedDept(d)}
        onEditMainDepartment={openDeptMainEdit}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        itemsPerPage={DEPTS_PER_PAGE}
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
