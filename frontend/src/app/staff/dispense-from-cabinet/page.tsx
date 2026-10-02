'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DispensedItemsApi } from '@/lib/staffApi/dispensedItemsApi';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import FilterSection from './components/FilterSection';
import DispensedTable from './components/DispensedTable';
import { buildDispensedGroups } from '@/lib/dispenseFromCabinet/buildDispensedGroups';
import type { DispensedItem, FilterState } from './types';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const GROUPS_PER_PAGE = 10;
const FETCH_BATCH_LIMIT = 5000;

export default function DispenseFromCabinetPage() {
  const [loadingList, setLoadingList] = useState(false);
  const [dispensedList, setDispensedList] = useState<DispensedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: '',
    subDepartmentId: '',
    cabinetId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: '',
    subDepartmentId: '',
    cabinetId: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRawItems, setTotalRawItems] = useState(0);

  const allGroups = useMemo(() => buildDispensedGroups(dispensedList), [dispensedList]);
  const totalGroups = allGroups.length;
  const totalPages = useMemo(
    () => (totalGroups > 0 ? Math.ceil(totalGroups / GROUPS_PER_PAGE) : 1),
    [totalGroups],
  );

  const fetchDispensedList = useCallback(
    async (
      overrideFilters?: FilterState,
      opts?: { resetPage?: boolean; silent?: boolean },
    ) => {
      const activeFilters = overrideFilters ?? filters;
      try {
        setLoadingList(true);
        const params: Record<string, string | number> = {
          page: 1,
          limit: FETCH_BATCH_LIMIT,
        };
        if (activeFilters.startDate) params.startDate = activeFilters.startDate;
        if (activeFilters.endDate) params.endDate = activeFilters.endDate;
        if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
        if (activeFilters.departmentId?.trim()) params.departmentId = activeFilters.departmentId;
        if (activeFilters.subDepartmentId?.trim()) {
          params.subDepartmentId = activeFilters.subDepartmentId;
        }
        if (activeFilters.cabinetId?.trim()) params.cabinetId = activeFilters.cabinetId;

        const aggregated: DispensedItem[] = [];
        let reportedTotal = 0;
        let page = 1;

        while (true) {
          const response = await DispensedItemsApi.getDispensedItemsFromSlots({
            ...params,
            page,
            limit: FETCH_BATCH_LIMIT,
          });

          if (!response?.success || !Array.isArray(response.data)) {
            toast.error(response?.message || 'ไม่สามารถโหลดข้อมูลได้');
            setDispensedList([]);
            setTotalRawItems(0);
            break;
          }

          const batch = response.data;
          reportedTotal =
            typeof response.total === 'number' ? response.total : aggregated.length + batch.length;
          aggregated.push(...batch);

          if (batch.length < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
            break;
          }
          page += 1;
          if (page > 500) {
            console.warn('staff dispense-from-cabinet: stopped batch fetch after 500 pages');
            break;
          }
        }

        if (aggregated.length > 0 || reportedTotal === 0) {
          setDispensedList(aggregated);
          setTotalRawItems(reportedTotal);
          if (opts?.resetPage !== false) {
            setCurrentPage(1);
          }

          if (!opts?.silent) {
            if (aggregated.length === 0) {
              toast.info('ไม่พบข้อมูลการเบิกอุปกรณ์ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
            } else {
              toast.success(`พบ ${reportedTotal} รายการเบิกอุปกรณ์`);
            }
          }
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        );
      } finally {
        setLoadingList(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchDispensedList(undefined, { resetPage: true, silent: true });
  }, [fetchDispensedList]);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    void fetchDispensedList(undefined, { resetPage: true });
  };

  const handleClearSearch = () => {
    const clearedFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '',
      subDepartmentId: '',
      cabinetId: '',
    };
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    setCurrentPage(1);
    void fetchDispensedList(clearedFilters, { resetPage: true, silent: true });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือก Division ก่อนส่งออกรายงาน');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนส่งออกรายงาน');
      return;
    }
    try {
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);
      const params = {
        keyword: filters.searchItemCode || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        departmentId: filters.departmentId || undefined,
        subDepartmentId: filters.subDepartmentId || undefined,
        cabinetId: filters.cabinetId,
      };
      if (format === 'excel') {
        await DispensedItemsApi.downloadDispensedItemsExcel(params);
      } else {
        await DispensedItemsApi.downloadDispensedItemsPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${msg}`);
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานเบิกอุปกรณ์จากตู้</h1>
            <p className="text-sm text-gray-500 mt-1">
              รายการอุปกรณ์ทั้งหมดที่เบิกจากตู้ SmartCabinet
            </p>
          </div>
        </div>

        <FilterSection
          filters={filters}
          appliedFilters={appliedFilters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onRefresh={() => fetchDispensedList(undefined, { resetPage: false, silent: true })}
          loading={loadingList}
          departmentDisabled={false}
        />

        <DispensedTable
          loading={loadingList}
          items={dispensedList}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRawItems={totalRawItems}
          totalGroups={totalGroups}
          groupsPerPage={GROUPS_PER_PAGE}
          searchItemCode={filters.searchItemCode}
          itemTypeFilter={filters.itemTypeFilter}
          onPageChange={handlePageChange}
          onExportExcel={() => handleExportReport('excel')}
          onExportPdf={() => handleExportReport('pdf')}
        />
      </div>
    </>
  );
}
