'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { getStaffAllowedDepartmentIds } from '@/lib/staffDepartmentScope';
import { Loader2, Network } from 'lucide-react';
import { toast } from 'sonner';
import FilterSection from '@/app/staff/management/cabinet-departments/components/FilterSection';
import MappingTable from '@/app/staff/management/cabinet-departments/components/MappingTable';
import CreateMappingDialog from '@/app/staff/management/cabinet-departments/components/CreateMappingDialog';
import EditMappingDialog from '@/app/staff/management/cabinet-departments/components/EditMappingDialog';
import DeleteMappingDialog from '@/app/staff/management/cabinet-departments/components/DeleteMappingDialog';
import CreateCabinetDialog from '@/app/staff/cabinets/components/CreateCabinetDialog';

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
  };
}

export default function CabinetDivisionTab() {
  const [mappings, setMappings] = useState<CabinetDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateCabinetDialog, setShowCreateCabinetDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<CabinetDepartment | null>(null);
  const [filterVersion, setFilterVersion] = useState(0);
  /** undefined = ยังโหลดขอบเขตแผนกตามสิทธิ์ */
  const [allowedDepartmentIds, setAllowedDepartmentIds] = useState<number[] | null | undefined>(
    undefined,
  );

  const [activeFilters, setActiveFilters] = useState({
    cabinetId: '',
    departmentId: '',
    status: 'ALL',
  });

  const [formData, setFormData] = useState({
    cabinet_id: '',
    department_id: '',
    status: 'ACTIVE',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    getStaffAllowedDepartmentIds().then(setAllowedDepartmentIds);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const mappingsRes = await staffCabinetDepartmentApi.getAll();

      if (mappingsRes.success && mappingsRes.data) {
        setMappings(mappingsRes.data as CabinetDepartment[]);
      }
    } catch (error: unknown) {
      console.error('Load data error:', error);
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลได้');
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
  };

  const handleFilterFormReset = () => {
    setActiveFilters({
      cabinetId: '',
      departmentId: '',
      status: 'ALL',
    });
  };

  const handleCreate = () => {
    setFormData({
      cabinet_id: '',
      department_id: '',
      status: 'ACTIVE',
      description: '',
    });
    setShowCreateDialog(true);
  };

  const handleEdit = (mapping: CabinetDepartment) => {
    setSelectedMapping(mapping);
    setFormData({
      cabinet_id: String(mapping.cabinet_id ?? ''),
      department_id: String(mapping.department_id ?? ''),
      status: mapping.status,
      description: mapping.description || '',
    });
    setShowEditDialog(true);
  };

  const handleDelete = (mapping: CabinetDepartment) => {
    setSelectedMapping(mapping);
    setShowDeleteDialog(true);
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
        await staffCabinetDepartmentApi.downloadCabinetDepartmentsExcel(params);
      } else {
        await staffCabinetDepartmentApi.downloadCabinetDepartmentsPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format === 'excel' ? 'Excel' : 'PDF'} สำเร็จ`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถสร้างรายงานได้');
    }
  };

  const submitCreate = async () => {
    if (!formData.cabinet_id || !formData.department_id) {
      toast.error('กรุณาเลือกอุปกรณ์และแผนก');
      return;
    }

    try {
      setSaving(true);
      const response = await staffCabinetDepartmentApi.create({
        cabinet_id: parseInt(formData.cabinet_id),
        department_id: parseInt(formData.department_id),
        status: formData.status,
        description: formData.description,
      });

      if (response.success) {
        toast.success('สร้างการเชื่อมโยงเรียบร้อยแล้ว');
        setShowCreateDialog(false);
        loadData();
      } else {
        toast.error(response.message || 'ไม่สามารถสร้างการเชื่อมโยงได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedMapping) return;

    if (!formData.cabinet_id || !formData.department_id) {
      toast.error('กรุณาเลือกตู้และแผนก');
      return;
    }

    const status = formData.status && formData.status.trim() !== '' ? formData.status : 'ACTIVE';

    try {
      setSaving(true);
      const response = await staffCabinetDepartmentApi.update(selectedMapping.id, {
        cabinet_id: parseInt(formData.cabinet_id),
        department_id: parseInt(formData.department_id),
        status: status,
        description: formData.description,
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
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      const response = await staffCabinetDepartmentApi.delete(selectedMapping.id);

      if (response.success) {
        toast.success('ลบการเชื่อมโยงเรียบร้อยแล้ว');
        setShowDeleteDialog(false);
        loadData();
      } else {
        toast.error(response.message || 'ไม่สามารถลบการเชื่อมโยงได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const filteredMappings = mappings.filter((mapping) => {
    if (allowedDepartmentIds === undefined) return false;
    if (allowedDepartmentIds !== null && !allowedDepartmentIds.includes(mapping.department_id)) {
      return false;
    }

    const matchesCabinet =
      activeFilters.cabinetId === '' || String(mapping.cabinet_id ?? '') === activeFilters.cabinetId;

    const matchesDepartment =
      activeFilters.departmentId === '' ||
      String(mapping.department_id ?? '') === activeFilters.departmentId;

    const matchesStatus = activeFilters.status === 'ALL' || mapping.status === activeFilters.status;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              จัดการตู้ Cabinet - แผนก
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              จัดการตู้ Cabinet และเชื่อมโยงกับแผนก
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreate}
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-shadow shrink-0"
        >
          <Network className="mr-2 h-5 w-5" />
          เพิ่มการเชื่อมโยง
        </Button>
      </div>

      <FilterSection
        onSearch={handleSearch}
        onReset={handleFilterFormReset}
        key={filterVersion}
        departmentDisabled={false}
      />

      <MappingTable
        mappings={filteredMappings}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExportExcel={() => handleExportReport('excel')}
        onExportPdf={() => handleExportReport('pdf')}
      />

      <CreateMappingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        formData={formData}
        setFormData={setFormData}
        onSubmit={submitCreate}
        saving={saving}
        existingMappings={mappings}
      />

      <CreateCabinetDialog
        open={showCreateCabinetDialog}
        onOpenChange={setShowCreateCabinetDialog}
        onSuccess={loadData}
      />

      <EditMappingDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        formData={formData}
        setFormData={setFormData}
        onSubmit={submitEdit}
        saving={saving}
        selectedMapping={selectedMapping}
      />

      <DeleteMappingDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={submitDelete}
        saving={saving}
      />
    </div>
  );
}
