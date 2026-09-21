'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { itemStockApi, itemsApi, stickerPrintApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import { Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportsApi } from '@/lib/api';
import { getCabinetQty } from '@/lib/itemUnitDisplay';
import EditItemDialog from '../management/items/components/item-tab/components/EditItemDialog';
import DeleteItemDialog from '../management/items/components/item-tab/components/DeleteItemDialog';
import UpdateMinMaxDialog from './components/UpdateMinMaxDialog';
import FilterSection from './components/FilterSection';
import ItemsTable from './components/ItemsTable';
 

function isItemVisible(item: Item): boolean {
  const qty = getCabinetQty(item);
  const refill = Math.max(0, Number(item.refill_qty ?? 0));
  return qty !== 0 || refill > 0;
}

const FETCH_BATCH_LIMIT = 5000;
const ITEMS_PER_PAGE = 10;

type ActiveFilters = {
  searchTerm: string;
  departmentId: string;
  cabinetId: string;
  statusFilter: string;
  keyword: string;
};

const defaultFilters: ActiveFilters = {
  searchTerm: '',
  departmentId: '',
  cabinetId: '',
  statusFilter: 'all',
  keyword: '',
};

export default function ItemsPage() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMinMaxDialog, setShowMinMaxDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportLoading, setReportLoading] = useState<'excel' | 'pdf' | null>(null);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRawItems, setTotalRawItems] = useState(0);
  const [refillPreview, setRefillPreview] = useState<Item[]>([]);
  const [refillCount, setRefillCount] = useState(0);

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
      overrideFilters?: ActiveFilters,
      opts?: { resetPage?: boolean; silent?: boolean },
    ) => {
      if (!user?.id || !hasSearched) {
        setLoading(false);
        return;
      }

      const filters = overrideFilters ?? activeFilters;

      try {
        setLoading(true);
        const baseParams: Record<string, string | number> = {
          status: 'ACTIVE',
        };
        const kw = filters.keyword || filters.searchTerm;
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
        let previewFromApi: Item[] = [];
        let refillTotalFromApi = 0;

        while (true) {
          const response = (await itemsApi.getAll({
            ...baseParams,
            page: fetchPage,
            limit: FETCH_BATCH_LIMIT,
          })) as {
            success?: boolean;
            data?: Item[] | { data?: Item[] };
            total?: number;
            refill_preview?: Item[];
            refill_count?: number;
            message?: string;
          };

          if (response?.success === false) {
            toast.error((response as { message?: string }).message || 'โหลดข้อมูลไม่สำเร็จ');
            setAllItems([]);
            setTotalRawItems(0);
            setRefillPreview([]);
            setRefillCount(0);
            break;
          }

          if (fetchPage === 1) {
            previewFromApi = Array.isArray(response.refill_preview) ? response.refill_preview : [];
            refillTotalFromApi =
              typeof response.refill_count === 'number' ? response.refill_count : previewFromApi.length;
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
            console.warn('admin items: stopped batch fetch after 500 pages');
            break;
          }
        }

        setAllItems(aggregated);
        setTotalRawItems(reportedTotal);
        setRefillPreview(previewFromApi);
        setRefillCount(refillTotalFromApi);
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
        setRefillPreview([]);
        setRefillCount(0);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, hasSearched, activeFilters],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!user?.id || initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchItems(undefined, { resetPage: true, silent: true });
  }, [user?.id, fetchItems]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = (filters: ActiveFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
    setHasSearched(true);
    void fetchItems(filters, { resetPage: true });
  };

  const handleResetFilters = () => {
    setActiveFilters(defaultFilters);
    setCurrentPage(1);
    setHasSearched(true);
    void fetchItems(defaultFilters, { resetPage: true, silent: true });
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

  const handleQuickPrintSticker = async (item: Item, copies: number) => {
    const deptId = parseInt(activeFilters.departmentId, 10);
    const cabId = parseInt(activeFilters.cabinetId, 10);
    if (Number.isNaN(deptId) || Number.isNaN(cabId)) {
      toast.error('กรุณาเลือก Division และตู้ Cabinet ก่อนพิมพ์สติ๊กเกอร์');
      return;
    }

    const refillQty = Math.max(0, Number((item as Item & { refill_qty?: number }).refill_qty ?? 0));
    if (refillQty <= 0) {
      toast.error('ไม่สามารถพิมพ์ได้ เพราะจำนวนที่ต้องเติมเป็น 0');
      return;
    }
    const safeCopies = Math.max(1, Math.min(refillQty, copies));

    try {
      const printRes = await stickerPrintApi.printLabelItems({
        items: [{ itemcode: item.itemcode, copies: safeCopies }],
        department_id: deptId,
        cabinet_id: cabId,
      });

      const stockRes = await itemStockApi.createForPrint({
        lines: [
          {
            itemcode: item.itemcode,
            cabinet_id: cabId,
            department_id: deptId,
            copies: safeCopies,
          },
        ],
      });

      if (stockRes?.success === false) {
        toast.error(stockRes.message || stockRes.error || 'พิมพ์สำเร็จ แต่บันทึก stock ไม่สำเร็จ');
        return;
      }

      toast.success(`พิมพ์สติ๊กเกอร์สำเร็จ ${safeCopies} แผ่น (${item.itemcode})`, {
        description: `${printRes.host}:${printRes.port} · ${printRes.template}`,
      });
      await fetchItems(undefined, { resetPage: false, silent: true });
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ??
        (error as Error)?.message ??
        'พิมพ์สติ๊กเกอร์ไม่สำเร็จ';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    }
  };

  const handleDownloadCabinetStockExcel = async () => {
    try {
      setReportLoading('excel');
      const cabinetId = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined;
      const departmentId = activeFilters.departmentId
        ? parseInt(activeFilters.departmentId, 10)
        : undefined;
      await reportsApi.downloadCabinetStockExcel({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  const handleDownloadCabinetStockPdf = async () => {
    try {
      setReportLoading('pdf');
      const cabinetId = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined;
      const departmentId = activeFilters.departmentId
        ? parseInt(activeFilters.departmentId, 10)
        : undefined;
      await reportsApi.downloadCabinetStockPdf({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
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
            onSearch={handleSearch}
            onBeforeSearch={() => setCurrentPage(1)}
            onReset={handleResetFilters}
            onRefresh={() => void fetchItems(undefined, { resetPage: false, silent: true })}
            loading={loading}
          />

          {/* <RefillPreviewCard
            items={refillPreview}
            totalNeedRefill={refillCount}
            loading={loading}
          /> */}

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
            onPrintSticker={handleQuickPrintSticker}
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
      </AppLayout>
    </ProtectedRoute>
  );
}
