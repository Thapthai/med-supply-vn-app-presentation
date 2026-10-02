'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { itemsApi, departmentApi } from '@/lib/api';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import { Boxes } from 'lucide-react';
import CreateItemDialog from './components/CreateItemDialog';
import EditItemDialog from '@/app/admin/management/items/components/item-tab/components/EditItemDialog';
import DeleteItemDialog from '@/app/admin/management/items/components/item-tab/components/DeleteItemDialog';
import ItemUploadDialog from './components/ItemUploadDialog';
import ItemsSearchCard, { type ItemStatusFilter } from './components/ItemsSearchCard';
import ItemsMasterTableCard from './components/ItemsMasterTableCard';
import { ITEMS_PAGE_SIZE } from './components/itemPagination';
import type { DeptRow } from './components/itemHelpers';

const FETCH_BATCH_LIMIT = 5000;

type AppliedFilters = {
  keyword: string;
  statusFilter: ItemStatusFilter;
  departmentFilter: string;
};

export default function ItemTab() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    keyword: '',
    statusFilter: 'all',
    departmentFilter: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [departments, setDepartments] = useState<DeptRow[]>([]);

  const totalPages = useMemo(
    () => (allItems.length > 0 ? Math.ceil(allItems.length / ITEMS_PAGE_SIZE) : 1),
    [allItems.length],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await departmentApi.getAll({ limit: 500 });
        if (res.success && Array.isArray(res.data)) {
          setDepartments(res.data as DeptRow[]);
        }
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const deptMap = useMemo(() => {
    const m = new Map<number, DeptRow>();
    departments.forEach((d) => m.set(d.ID, d));
    return m;
  }, [departments]);

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'ทุกแผนก' },
      ...departments.map((d) => ({
        value: String(d.ID),
        label: (d.DepName || d.DepName2 || `แผนก #${d.ID}`).trim(),
      })),
    ],
    [departments],
  );

  const appliedDepartmentId = useMemo(() => {
    if (appliedFilters.departmentFilter === 'all') return undefined;
    const n = parseInt(appliedFilters.departmentFilter, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [appliedFilters.departmentFilter]);

  const fetchList = useCallback(
    async (overrideFilters?: AppliedFilters, opts?: { resetPage?: boolean; silent?: boolean }) => {
      const active = overrideFilters ?? appliedFilters;
      try {
        setLoading(true);
        const baseParams: Record<string, string | number> = {
          sort_by: 'itemcode',
          sort_order: 'asc',
        };
        if (active.keyword.trim()) baseParams.keyword = active.keyword.trim();
        if (active.statusFilter !== 'all') baseParams.item_status_filter = active.statusFilter;

        const aggregated: Item[] = [];
        let reportedTotal = 0;
        let fetchPage = 1;

        while (true) {
          const res = (await itemsApi.getMasterList({
            ...baseParams,
            page: fetchPage,
            limit: FETCH_BATCH_LIMIT,
          })) as {
            success?: boolean;
            data?: Item[] | { data?: Item[] };
            total?: number;
            message?: string;
          };

          if (res?.success === false) {
            toast.error((res as { message?: string }).message || 'โหลดรายการไม่สำเร็จ');
            setAllItems([]);
            setTotal(0);
            break;
          }

          const raw = res?.data;
          const batch = Array.isArray(raw)
            ? raw
            : raw != null && typeof raw === 'object' && Array.isArray(raw.data)
              ? raw.data
              : [];

          reportedTotal =
            typeof res.total === 'number' ? res.total : aggregated.length + batch.length;
          aggregated.push(...batch);

          if (batch.length < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
            break;
          }
          fetchPage += 1;
          if (fetchPage > 500) {
            console.warn('admin items master: stopped batch fetch after 500 pages');
            break;
          }
        }

        setAllItems(aggregated);
        setTotal(reportedTotal);
        if (opts?.resetPage !== false) {
          setCurrentPage(1);
        }

        if (!opts?.silent && aggregated.length === 0) {
          toast.info('ไม่พบรายการ Item ตามเงื่อนไขที่เลือก');
        }
      } catch (e) {
        console.error(e);
        toast.error('โหลดรายการไม่สำเร็จ');
        setAllItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!user?.id || initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchList(undefined, { resetPage: true, silent: true });
  }, [user?.id, fetchList]);

  const handleSearch = () => {
    const next: AppliedFilters = { keyword: keywordInput, statusFilter, departmentFilter };
    setAppliedFilters(next);
    setCurrentPage(1);
    void fetchList(next, { resetPage: true });
  };

  const handleClearFilters = () => {
    const cleared: AppliedFilters = { keyword: '', statusFilter: 'all', departmentFilter: 'all' };
    setKeywordInput('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setAppliedFilters(cleared);
    setCurrentPage(1);
    void fetchList(cleared, { resetPage: true, silent: true });
  };

  const handleStatusFilterChange = (value: ItemStatusFilter) => {
    setStatusFilter(value);
  };

  const handlePageChange = useCallback((nextPage: number) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleEdit = (item: Item) => {
    setSelected(item);
    setEditOpen(true);
  };

  const handleDelete = (item: Item) => {
    setSelected(item);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2.5">
          <Boxes className="h-7 w-7 text-amber-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">จัดการ Item (Master)</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            รายการรหัสเวชภัณฑ์ในฐานข้อมูล รวมรายการที่ยังไม่มีในตู้
          </p>
        </div>
      </div>

      <ItemsSearchCard
        keywordInput={keywordInput}
        activeKeyword={appliedFilters.keyword}
        statusFilter={statusFilter}
        departmentFilter={departmentFilter}
        departmentOptions={departmentOptions}
        onKeywordInputChange={setKeywordInput}
        onStatusFilterChange={handleStatusFilterChange}
        onDepartmentFilterChange={setDepartmentFilter}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
        onRefresh={() => fetchList(undefined, { resetPage: false, silent: true })}
        loading={loading}
      />

      <ItemsMasterTableCard
        items={allItems}
        loading={loading}
        currentPage={currentPage}
        itemsPerPage={ITEMS_PAGE_SIZE}
        total={total}
        totalPages={totalPages}
        deptMap={deptMap}
        departmentFilter={appliedDepartmentId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateClick={() => setCreateOpen(true)}
        onUploadClick={() => setUploadOpen(true)}
        onPageChange={handlePageChange}
      />

      <ItemUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => fetchList(undefined, { resetPage: false, silent: true })}
      />

      <CreateItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={user?.id}
        onSuccess={() => fetchList(undefined, { resetPage: false, silent: true })}
      />
      <EditItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={selected}
        onSuccess={() => fetchList(undefined, { resetPage: false, silent: true })}
      />
      <DeleteItemDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={selected}
        onSuccess={() => fetchList(undefined, { resetPage: false, silent: true })}
      />
    </div>
  );
}
