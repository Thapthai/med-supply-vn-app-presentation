'use client';

import { useCallback, useEffect, useState } from 'react';
import { staffCabinetApi } from '@/lib/staffApi/cabinetApi';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import CreateCabinetDialog from './components/CreateCabinetDialog';
import EditCabinetDialog from './components/EditCabinetDialog';
import DeleteCabinetDialog from './components/DeleteCabinetDialog';
import CabinetsTable from './components/CabinetsTable';
import CabinetsSearchCard, {
  type CabinetsSearchFilters,
} from '../management/cabinets/components/CabinetsSearchCard';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
  temp_min?: number | string | null;
  temp_max?: number | string | null;
  hum_min?: number | string | null;
  hum_max?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

const defaultFilters: CabinetsSearchFilters = {
  keyword: '',
  departmentId: '',
};

export default function CabinetsPage() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<CabinetsSearchFilters>(defaultFilters);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchCabinets = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoading(true);
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: itemsPerPage,
        };

        if (activeFilters.keyword.trim()) {
          params.keyword = activeFilters.keyword.trim();
        }

        const deptNum = activeFilters.departmentId
          ? parseInt(activeFilters.departmentId, 10)
          : NaN;
        if (Number.isFinite(deptNum) && deptNum > 0) {
          params.department_id = deptNum;
        }

        const response = await staffCabinetApi.getAll(params);
        if (response.data) {
          setCabinets(response.data as Cabinet[]);
          setTotalItems(response.total || 0);
          setTotalPages(response.lastPage || 1);
        }
      } catch (error: unknown) {
        console.error('Failed to fetch cabinets:', error);
        toast.error('ไม่สามารถโหลดข้อมูลตู้ Cabinet ได้');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [currentPage, activeFilters, itemsPerPage],
  );

  useEffect(() => {
    void fetchCabinets();
  }, [fetchCabinets]);

  useEffect(() => {
    let filtered = cabinets;
    if (activeFilters.keyword.trim()) {
      const kw = activeFilters.keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (cabinet) =>
          cabinet.cabinet_name?.toLowerCase().includes(kw) ||
          cabinet.cabinet_code?.toLowerCase().includes(kw),
      );
    }
    setFilteredCabinets(filtered);
  }, [cabinets, activeFilters.keyword]);

  const handleSearch = (filters: CabinetsSearchFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (cabinet: Cabinet) => {
    setSelectedCabinet(cabinet);
    setShowEditDialog(true);
  };

  const handleDelete = (cabinet: Cabinet) => {
    setSelectedCabinet(cabinet);
    setShowDeleteDialog(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการตู้ Cabinet</h1>
            <p className="text-sm text-gray-500">แสดงตู้ตามสิทธิ์ Division ของ role</p>
          </div>
        </div>

        <CabinetsSearchCard
          onSearch={handleSearch}
          onReset={handleResetFilters}
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
        />
      </div>

      <CreateCabinetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchCabinets}
      />

      <EditCabinetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        cabinet={selectedCabinet}
        onSuccess={fetchCabinets}
      />

      <DeleteCabinetDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        cabinet={selectedCabinet}
        onSuccess={fetchCabinets}
      />
    </>
  );
}
