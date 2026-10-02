'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import { Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { staffReportApi } from '@/lib/staffApi/reportApi';
import { getCabinetQty } from '@/lib/itemUnitDisplay';
import CreateItemDialog from './components/CreateItemDialog';
import EditItemDialog from './components/EditItemDialog';
import DeleteItemDialog from './components/DeleteItemDialog';
import UpdateMinMaxDialog from './components/UpdateMinMaxDialog';
import FilterSection, { type StaffItemsSearchFilters } from './components/FilterSection';
import ItemsTable from './components/ItemsTable';

const FETCH_BATCH_LIMIT = 5000;
const ITEMS_PER_PAGE = 10;

const defaultFilters: StaffItemsSearchFilters = {
  searchTerm: '',
  departmentId: '',
  cabinetId: '',
  statusFilter: 'all',
  keyword: '',
};

function isItemVisible(item: Item): boolean {
  const qty = getCabinetQty(item);
  const refill = Math.max(0, Number(item.refill_qty ?? 0));
  return qty !== 0 || refill > 0;
}

export default function ItemsPage() {
  const [itemsFilterKey, setItemsFilterKey] = useState(0);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMinMaxDialog, setShowMinMaxDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportLoading, setReportLoading] = useState<'excel' | 'pdf' | null>(null);

  const [activeFilters, setActiveFilters] = useState<StaffItemsSearchFilters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRawItems, setTotalRawItems] = useState(0);

  const filteredItems = useMemo(() => {
    let filtered = allItems;
    if (activeFilters.statusFilter !== 'all') {
      filtered = filtered.filter((item) =>
        activeFilters.statusFilter === 'active' ? item.item_status === 0 : item.item_status !== 0,
      );
    }
    return filtered;
  }, [allItems, activeFilters.statusFilter]);

  const showCabinetMinMax = useMemo(
    () => Boolean(activeFilters.cabinetId.trim()),
    [activeFilters.cabinetId],
  );

  const visibleItemCount = useMemo(
    () => filteredItems.filter((item) => isItemVisible(item)).length,
    [filteredItems],
  );

  const totalPages = useMemo(
    () => (visibleItemCount > 0 ? Math.ceil(visibleItemCount / ITEMS_PER_PAGE) : 1),
    [visibleItemCount],
  );

  const fetchItems = useCallback(
    async (
      overrideFilters?: StaffItemsSearchFilters,
      opts?: { resetPage?: boolean; silent?: boolean },
    ) => {
      if (!hasSearched && !overrideFilters) {
        setLoading(false);
        return;
      }

      const filters = overrideFilters ?? activeFilters;

      try {
        setLoading(true);
        const baseParams: Record<string, string | number> = {
          status: 'ACTIVE',
        };
        const kw = (filters.keyword || filters.searchTerm || '').trim();
        if (kw) baseParams.keyword = kw;

        if (filters.departmentId) {
          const deptId = parseInt(filters.departmentId, 10);
          if (!Number.isNaN(deptId)) baseParams.department_id = deptId;
        }

        if (filters.cabinetId) {
          const cabId = parseInt(filters.cabinetId, 10);
          if (!Number.isNaN(cabId)) baseParams.cabinet_id = cabId;
        }

        const aggregated: Item[] = [];
        let reportedTotal = 0;
        let fetchPage = 1;

        while (true) {
          const response = (await staffItemsApi.getAll({
            ...baseParams,
            page: fetchPage,
            limit: FETCH_BATCH_LIMIT,
          })) as {
            success?: boolean;
            data?: Item[] | { data?: Item[] };
            total?: number;
            message?: string;
          };

          if (response?.success === false) {
            toast.error(response.message || 'โหลดข้อมูลไม่สำเร็จ');
            setAllItems([]);
            setTotalRawItems(0);
            break;
          }

          const raw = response?.data;
          const batch = Array.isArray(raw)
            ? raw
            : raw != null && typeof raw === 'object' && Array.isArray(raw.data)
              ? raw.data
              : [];

          reportedTotal =
            typeof response.total === 'number' ? response.total : aggregated.length + batch.length;
          aggregated.push(...batch);

          if (batch.length < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
            break;
          }
          fetchPage += 1;
          if (fetchPage > 500) {
            console.warn('staff items: stopped batch fetch after 500 pages');
            break;
          }
        }

        setAllItems(aggregated);
        setTotalRawItems(reportedTotal);
        if (opts?.resetPage !== false) {
          setCurrentPage(1);
        }

        if (!opts?.silent && aggregated.length === 0) {
          toast.info('ไม่พบข้อมูลอุปกรณ์ตามเงื่อนไขที่เลือก');
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
        toast.error('ไม่สามารถโหลดข้อมูลสินค้าได้');
        setAllItems([]);
        setTotalRawItems(0);
      } finally {
        setLoading(false);
      }
    },
    [hasSearched, activeFilters],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    if (hasSearched) {
      void fetchItems(undefined, { resetPage: false, silent: true });
    }
  }, [hasSearched, fetchItems]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = (filters: StaffItemsSearchFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
    setHasSearched(true);
    void fetchItems(filters, { resetPage: true });
  };

  const handleResetFilters = () => {
    setItemsFilterKey((k) => k + 1);
    setActiveFilters(defaultFilters);
    setCurrentPage(1);
    setHasSearched(false);
    setAllItems([]);
    setTotalRawItems(0);
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleDelete = (item: Item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleUpdateMinMax = (item: Item) => {
    setSelectedItem(item);
    setShowMinMaxDialog(true);
  };

  const handleDownloadCabinetStockExcel = async () => {
    if (!activeFilters.departmentId?.trim()) {
      toast.error('กรุณาเลือกแผนกก่อนดาวน์โหลดรายงาน');
      return;
    }
    if (!activeFilters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนดาวน์โหลดรายงาน');
      return;
    }
    try {
      setReportLoading('excel');
      const cabinetId = parseInt(activeFilters.cabinetId, 10);
      const departmentId = activeFilters.departmentId
        ? parseInt(activeFilters.departmentId, 10)
        : undefined;
      await staffReportApi.downloadCabinetStockExcel({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  const handleDownloadCabinetStockPdf = async () => {
    if (!activeFilters.departmentId?.trim()) {
      toast.error('กรุณาเลือกแผนกก่อนดาวน์โหลดรายงาน');
      return;
    }
    if (!activeFilters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนดาวน์โหลดรายงาน');
      return;
    }
    try {
      setReportLoading('pdf');
      const cabinetId = parseInt(activeFilters.cabinetId, 10);
      const departmentId = activeFilters.departmentId
        ? parseInt(activeFilters.departmentId, 10)
        : undefined;
      await staffReportApi.downloadCabinetStockPdf({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการสต๊อกอุปกรณ์ในตู้</h1>
              <p className="text-sm text-gray-500">รายการอุปกรณ์ทั้งหมดในระบบ</p>
            </div>
          </div>
        </div>

        <FilterSection
          key={itemsFilterKey}
          onSearch={handleSearch}
          onBeforeSearch={() => setCurrentPage(1)}
          onReset={handleResetFilters}
          onRefresh={() => void fetchItems(undefined, { resetPage: false, silent: true })}
          loading={loading}
          activeFilters={activeFilters}
          departmentDisabled={false}
          initialAutoSearch
        />

        <ItemsTable
          items={filteredItems}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRawItems}
          itemsPerPage={ITEMS_PER_PAGE}
          hasSearched={hasSearched}
          showCabinetMinMax={showCabinetMinMax}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateMinMax={handleUpdateMinMax}
          onPageChange={handlePageChange}
          headerActions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCabinetStockExcel}
                disabled={reportLoading !== null}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {reportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCabinetStockPdf}
                disabled={reportLoading !== null}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {reportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
              </Button>
            </div>
          }
        />
      </div>

      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => fetchItems(undefined, { resetPage: false, silent: true })}
      />

      <EditItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={selectedItem}
        onSuccess={() => fetchItems(undefined, { resetPage: false, silent: true })}
      />

      <DeleteItemDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={selectedItem}
        onSuccess={() => fetchItems(undefined, { resetPage: false, silent: true })}
      />

      <UpdateMinMaxDialog
        open={showMinMaxDialog}
        onOpenChange={setShowMinMaxDialog}
        item={selectedItem}
        cabinetId={
          activeFilters.cabinetId
            ? (() => {
                const n = parseInt(activeFilters.cabinetId, 10);
                return Number.isNaN(n) ? undefined : n;
              })()
            : undefined
        }
        onSuccess={() => fetchItems(undefined, { resetPage: false, silent: true })}
      />
    </>
  );
}
