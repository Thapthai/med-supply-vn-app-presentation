'use client';

import { useState, useEffect } from 'react';
import { cabinetDepartmentApi, reportsApi } from '@/lib/api';
import { Loader2, Network } from 'lucide-react';
import { toast } from 'sonner';
import FilterSection from '@/app/admin/management/cabinet-departments/components/FilterSection';
import MappingTable from '@/app/admin/management/cabinet-departments/components/MappingTable';
import CreateMappingDialog, {
  type CreateMappingFormData,
  MAX_ACTIVE_DIVISION_LINKS_PER_CABINET,
} from '@/app/admin/management/cabinet-departments/components/CreateMappingDialog';
import EditMappingDialog from '@/app/admin/management/cabinet-departments/components/EditMappingDialog';
import DeleteMappingDialog from '@/app/admin/management/cabinet-departments/components/DeleteMappingDialog';

interface CabinetDepartment {
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

export default function CabinetDivisionTab() {
  const [mappings, setMappings] = useState<CabinetDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<CabinetDepartment | null>(null);
  const [filterVersion, setFilterVersion] = useState(0);
  const [searchVersion, setSearchVersion] = useState(0);

  const [activeFilters, setActiveFilters] = useState({
    cabinetId: '',
    departmentId: '',
    status: 'ALL',
  });

  const [createFormData, setCreateFormData] = useState<CreateMappingFormData>({
    cabinet_id: '',
    department_ids: [],
    status: 'ACTIVE',
    description: '',
  });

  const [editFormData, setEditFormData] = useState({
    cabinet_id: '',
    department_id: '',
    status: 'ACTIVE',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const mappingsRes = await cabinetDepartmentApi.getAll();

      if (mappingsRes.success && mappingsRes.data) {
        setMappings(mappingsRes.data as CabinetDepartment[]);
      }
    } catch (error: unknown) {
      console.error('Load data error:', error);
      toast.error(
        (error as { message?: string })?.message || 'ไม่สามารถโหลดข้อมูลได้',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: { cabinetId: string; departmentId: string; status: string }) => {
    setActiveFilters(filters);
  };

  const resetFilters = () => {
    setActiveFilters({
      cabinetId: '',
      departmentId: '',
      status: 'ALL',
    });
    setFilterVersion((prev) => prev + 1);
    setSearchVersion((v) => v + 1);
  };

  const handleCreate = () => {
    setCreateFormData({
      cabinet_id: '',
      department_ids: [],
      status: 'ACTIVE',
      description: '',
    });
    setShowCreateDialog(true);
  };

  const handleEdit = (mapping: CabinetDepartment) => {
    setSelectedMapping(mapping);
    setEditFormData({
      cabinet_id: mapping.cabinet_id.toString(),
      department_id: mapping.department_id.toString(),
      status: mapping.status,
      description: mapping.description || '',
    });
    setShowEditDialog(true);
  };

  const handleDelete = (mapping: CabinetDepartment) => {
    setSelectedMapping(mapping);
    setShowDeleteDialog(true);
  };

  const submitCreate = async () => {
    const cabinetId = createFormData.cabinet_id?.trim();
    const cabinetIdNum = parseInt(cabinetId, 10);
    const activeOnCabinet = mappings.filter(
      (m) => m.cabinet_id === cabinetIdNum && m.status === 'ACTIVE',
    ).length;
    const allowedNewSlots = Math.max(0, MAX_ACTIVE_DIVISION_LINKS_PER_CABINET - activeOnCabinet);
    const rawDeptIds = createFormData.department_ids
      .slice(0, allowedNewSlots)
      .map((s) => s?.trim())
      .filter(Boolean);
    const departmentIds = [
      ...new Set(rawDeptIds.map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n))),
    ];
    if (!cabinetId || departmentIds.length === 0) {
      toast.error('กรุณาเลือกตู้และอย่างน้อยหนึ่ง Division');
      return;
    }

    try {
      setSaving(true);
      let ok = 0;
      let lastError: string | undefined;
      for (const department_id of departmentIds) {
        const response = await cabinetDepartmentApi.create({
          cabinet_id: parseInt(cabinetId, 10),
          department_id,
          status: createFormData.status,
          description: createFormData.description,
        });
        if (response.success) {
          ok += 1;
        } else {
          lastError = response.message || 'ไม่สามารถสร้างการเชื่อมโยงได้';
          break;
        }
      }
      if (ok > 0) {
        toast.success(
          ok === departmentIds.length
            ? `สร้างการเชื่อมโยง ${ok} รายการเรียบร้อยแล้ว`
            : `สร้างได้ ${ok} จาก ${departmentIds.length} รายการ${lastError ? ` — ${lastError}` : ''}`,
        );
        setShowCreateDialog(false);
        loadData();
      } else {
        toast.error(lastError || 'ไม่สามารถสร้างการเชื่อมโยงได้');
      }
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedMapping) return;

    if (!editFormData.cabinet_id || !editFormData.department_id) {
      toast.error('กรุณาเลือกตู้และแผนก');
      return;
    }

    const status =
      editFormData.status && editFormData.status.trim() !== '' ? editFormData.status : 'ACTIVE';

    try {
      setSaving(true);
      const response = await cabinetDepartmentApi.update(selectedMapping.id, {
        cabinet_id: parseInt(editFormData.cabinet_id),
        department_id: parseInt(editFormData.department_id),
        status: status,
        description: editFormData.description,
      });

      if (response.success) {
        toast.success('อัพเดทการเชื่อมโยงเรียบร้อยแล้ว');
        setShowEditDialog(false);
        resetFilters();
        loadData();
      } else {
        toast.error(response.message || 'ไม่สามารถอัพเดทการเชื่อมโยงได้');
      }
    } catch (error: unknown) {
      console.error('Update error:', error);
      toast.error((error as { message?: string })?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      const response = await cabinetDepartmentApi.delete(selectedMapping.id);

      if (response.success) {
        toast.success('ลบการเชื่อมโยงเรียบร้อยแล้ว');
        setShowDeleteDialog(false);
        loadData();
      } else {
        toast.error(response.message || 'ไม่สามารถลบการเชื่อมโยงได้');
      }
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      toast.info(`กำลังสร้างรายงาน ${format === 'excel' ? 'Excel' : 'PDF'}...`);
      const params = {
        cabinetId: activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined,
        departmentId: activeFilters.departmentId
          ? parseInt(activeFilters.departmentId, 10)
          : undefined,
        status: activeFilters.status !== 'ALL' ? activeFilters.status : undefined,
      };
      if (format === 'excel') {
        await reportsApi.downloadCabinetDepartmentsExcel(params);
      } else {
        await reportsApi.downloadCabinetDepartmentsPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format === 'excel' ? 'Excel' : 'PDF'} สำเร็จ`);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'ไม่สามารถสร้างรายงานได้');
    }
  };

  const filteredMappings = mappings.filter((mapping) => {
    const matchesCabinet =
      activeFilters.cabinetId === '' || mapping.cabinet_id.toString() === activeFilters.cabinetId;

    const matchesDepartment =
      activeFilters.departmentId === '' ||
      mapping.department_id.toString() === activeFilters.departmentId;

    const matchesStatus =
      activeFilters.status === 'ALL' || mapping.status === activeFilters.status;

    return matchesCabinet && matchesDepartment && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
          <Network className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            จัดการตู้ Cabinet - Division
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            จัดการตู้ Cabinet และเชื่อมโยงกับ Division
          </p>
        </div>
      </div>

      <FilterSection
        onSearch={handleSearch}
        onBeforeSearch={() => setSearchVersion((v) => v + 1)}
        key={`filter-${filterVersion}`}
      />

      <MappingTable
        key={`table-${searchVersion}`}
        mappings={filteredMappings}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExportExcel={() => handleExportReport('excel')}
        onExportPdf={() => handleExportReport('pdf')}
        onCreateClick={handleCreate}
      />

      <CreateMappingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        formData={createFormData}
        setFormData={setCreateFormData}
        onSubmit={submitCreate}
        saving={saving}
        existingMappings={mappings}
      />

      <EditMappingDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        formData={editFormData}
        setFormData={setEditFormData}
        onSubmit={submitEdit}
        saving={saving}
        selectedMapping={selectedMapping}
      />

      <DeleteMappingDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={submitDelete}
        saving={saving}
        selectedMapping={selectedMapping}
      />
    </div>
  );
}
