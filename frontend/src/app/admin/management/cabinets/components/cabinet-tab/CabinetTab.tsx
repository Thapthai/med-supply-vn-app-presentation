'use client';

import { useEffect, useState } from 'react';
import { cabinetApi } from '@/lib/api';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import CreateCabinetDialog from '../CreateCabinetDialog';
import EditCabinetDialog from '../EditCabinetDialog';
import DeleteCabinetDialog from '../DeleteCabinetDialog';
import CabinetsTable from '../CabinetsTable';
import CabinetsSearchCard from '../CabinetsSearchCard';
import { normalizeCabinetType, type CabinetTypeCode } from '../cabinetTypes';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
  created_at?: string;
  updated_at?: string;
}

export default function CabinetTab() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<CabinetTypeCode | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCabinets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeKeyword]);

  useEffect(() => {
    filterCabinets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinets, activeKeyword, typeFilter]);

  const fetchCabinets = async () => {
    try {
      setLoading(true);
      const params: { page: number; limit: number; keyword?: string } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (activeKeyword.trim()) {
        params.keyword = activeKeyword.trim();
      }

      const response = (await cabinetApi.getAll(params)) as {
        success?: boolean;
        data?: Cabinet[];
        total?: number;
        lastPage?: number;
        message?: string;
      };
      if (response?.success === false) {
        toast.error(response.message || 'โหลดข้อมูลตู้ไม่สำเร็จ');
        setCabinets([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }
      if (response?.data) {
        setCabinets(response.data);
        setTotalItems(response.total ?? 0);
        setTotalPages(response.lastPage ?? 1);
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
    setFilteredCabinets(filtered);
  };

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setTypeFilter('all');
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
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Package className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">จัดการตู้ Cabinet</h2>
          <p className="text-sm text-gray-500">จัดการและดูรายการตู้ทั้งหมด</p>
        </div>
      </div>

      <CabinetsSearchCard
        keywordInput={keywordInput}
        activeKeyword={activeKeyword}
        typeFilter={typeFilter}
        onKeywordInputChange={setKeywordInput}
        onTypeFilterChange={setTypeFilter}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
        onRefresh={fetchCabinets}
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
    </div>
  );
}
