'use client';

import { useEffect, useState } from 'react';
import { cabinetApi, cabinetDepartmentApi, reportsApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreateCabinetDialog from '../CreateCabinetDialog';
import EditCabinetDialog from '../EditCabinetDialog';
import DeleteCabinetDialog from '../DeleteCabinetDialog';
import CabinetsTable from '../CabinetsTable';
import CabinetsSearchCard from '../CabinetsSearchCard';
import DivisionTab from '../division-tab/แผนกTab';
import { normalizeCabinetType, type CabinetRow, type CabinetTypeCode } from '../cabinetTypes';

type MappingRow = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: { id: number; cabinet_name?: string; cabinet_code?: string };
  department?: { ID: number; DepName?: string; DepName2?: string };
};

export default function CabinetTab() {
  const [cabinets, setCabinets] = useState<CabinetRow[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<CabinetRow[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [activeDivisionId, setActiveDivisionId] = useState('');
  const [typeFilter, setTypeFilter] = useState<CabinetTypeCode | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDivisionDialog, setShowDivisionDialog] = useState(false);
  const [selectedCabinet, setSelectedCabinet] = useState<CabinetRow | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    void fetchCabinets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeKeyword, activeDivisionId]);

  useEffect(() => {
    filterCabinets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinets, mappings, activeKeyword, typeFilter, activeDivisionId]);

  const mergeLinks = (list: CabinetRow[], rows: MappingRow[]): CabinetRow[] =>
    list.map((cabinet) => ({
      ...cabinet,
      cabinetDepartments:
        cabinet.cabinetDepartments && cabinet.cabinetDepartments.length > 0
          ? cabinet.cabinetDepartments
          : rows.filter((row) => row.cabinet_id === cabinet.id),
    }));

  const fetchCabinets = async () => {
    try {
      setLoading(true);
      const params: { page: number; limit: number; keyword?: string; department_id?: number } = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (activeKeyword.trim()) params.keyword = activeKeyword.trim();
      const deptNum = parseInt(activeDivisionId, 10);
      if (Number.isFinite(deptNum) && deptNum > 0) params.department_id = deptNum;

      const [cabinetRes, mappingRes] = await Promise.all([
        cabinetApi.getAll(params) as Promise<{
          success?: boolean;
          data?: CabinetRow[];
          total?: number;
          lastPage?: number;
          message?: string;
        }>,
        cabinetDepartmentApi.getAll(),
      ]);

      const mappingRows = (mappingRes.success && Array.isArray(mappingRes.data)
        ? mappingRes.data
        : []) as MappingRow[];
      setMappings(mappingRows);

      if (cabinetRes?.success === false) {
        toast.error(cabinetRes.message || 'โหลดข้อมูลตู้ไม่สำเร็จ');
        setCabinets([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }
      if (cabinetRes?.data) {
        setCabinets(mergeLinks(cabinetRes.data, mappingRows));
        setTotalItems(cabinetRes.total ?? 0);
        setTotalPages(cabinetRes.lastPage ?? 1);
      }
    } catch (error) {
      console.error('Failed to fetch cabinets:', error);
      toast.error('ไม่สามารถโหลดข้อมูลตู้ได้');
    } finally {
      setLoading(false);
    }
  };

  const filterCabinets = () => {
    let filtered = cabinets;
    if (activeKeyword.trim()) {
      const kw = activeKeyword.trim().toLowerCase();
      filtered = filtered.filter(
        (cabinet) =>
          cabinet.cabinet_name?.toLowerCase().includes(kw) ||
          cabinet.cabinet_code?.toLowerCase().includes(kw),
      );
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((cabinet) => normalizeCabinetType(cabinet.cabinet_type) === typeFilter);
    }
    if (activeDivisionId.trim()) {
      const deptNum = parseInt(activeDivisionId, 10);
      filtered = filtered.filter((cabinet) =>
        (cabinet.cabinetDepartments ?? []).some((link) => link.department_id === deptNum),
      );
    }
    setFilteredCabinets(filtered);
  };

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
    setActiveDivisionId(divisionId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setDivisionId('');
    setActiveDivisionId('');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (cabinet: CabinetRow) => {
    setSelectedCabinet(cabinet);
    setShowEditDialog(true);
  };

  const handleDelete = (cabinet: CabinetRow) => {
    setSelectedCabinet(cabinet);
    setShowDeleteDialog(true);
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      toast.info(`กำลังสร้างรายงาน ${format === 'excel' ? 'Excel' : 'PDF'}...`);
      if (format === 'excel') {
        await reportsApi.downloadCabinetDepartmentsExcel({});
      } else {
        await reportsApi.downloadCabinetDepartmentsPdf({});
      }
      toast.success(`ดาวน์โหลดรายงาน ${format === 'excel' ? 'Excel' : 'PDF'} สำเร็จ`);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'ไม่สามารถสร้างรายงานได้');
    }
  };

  return (
    <div className="space-y-6">
      <CabinetsSearchCard
        keywordInput={keywordInput}
        activeKeyword={activeKeyword}
        typeFilter={typeFilter}
        divisionId={divisionId}
        activeDivisionId={activeDivisionId}
        onKeywordInputChange={setKeywordInput}
        onTypeFilterChange={setTypeFilter}
        onDivisionIdChange={setDivisionId}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
        onRefresh={() => void fetchCabinets()}
        loading={loading}
      />

      <CabinetsTable
        cabinets={filteredCabinets}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        onCreateClick={() => setShowCreateDialog(true)}
        onManageDivisions={() => setShowDivisionDialog(true)}
        onExportExcel={() => void handleExportReport('excel')}
        onExportPdf={() => void handleExportReport('pdf')}
      />

      <CreateCabinetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => void fetchCabinets()}
      />

      <EditCabinetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        cabinet={selectedCabinet}
        onSuccess={() => void fetchCabinets()}
      />

      <DeleteCabinetDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        cabinet={selectedCabinet}
        onSuccess={() => void fetchCabinets()}
      />

      <Dialog open={showDivisionDialog} onOpenChange={setShowDivisionDialog}>
        <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <div className="border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle>จัดการแผนก</DialogTitle>
              <DialogDescription>เพิ่ม แก้ไข แผนก และรหัสแผนกย่อย โดยไม่ต้องสลับแท็บ</DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <DivisionTab embedded />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
