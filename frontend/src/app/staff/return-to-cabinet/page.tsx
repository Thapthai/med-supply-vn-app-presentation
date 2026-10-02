'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { returnedItemsApi } from '@/lib/staffApi/returnedItemsApi';
import { buildReturnedGroups } from '@/lib/returnToCabinet/buildReturnedGroups';
import FilterSection from './components/FilterSection';
import ReturnedTable from './components/ReturnedTable';
import type { DispensedItem, FilterState, SummaryData } from './types';

// วันที่วันนี้ในรูปแบบ YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const GROUPS_PER_PAGE = 10;
const FETCH_BATCH_LIMIT = 5000;
export default function ReturnToCabinetPage() {
  const [loadingList, setLoadingList] = useState(false);
  const [returnedList, setReturnedList] = useState<DispensedItem[]>([]);
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

  const allGroups = useMemo(() => buildReturnedGroups(returnedList), [returnedList]);
  const totalGroups = allGroups.length;
  const totalPages = useMemo(
    () => (totalGroups > 0 ? Math.ceil(totalGroups / GROUPS_PER_PAGE) : 1),
    [totalGroups],
  );

  const fetchReturnedList = async (
    overrideFilters?: FilterState,
    options?: { resetPage?: boolean; silent?: boolean },
  ) => {
    const activeFilters = overrideFilters ?? filters;
    try {
      setLoadingList(true);
      const params: Record<string, unknown> = {
        page: 1,
        limit: FETCH_BATCH_LIMIT,
      };
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
      if (activeFilters.itemTypeFilter && activeFilters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(activeFilters.itemTypeFilter, 10);
      }
      if (activeFilters.departmentId?.trim()) params.departmentId = activeFilters.departmentId;
      if (activeFilters.subDepartmentId?.trim()) {
        params.subDepartmentId = activeFilters.subDepartmentId;
      }
      if (activeFilters.cabinetId?.trim()) params.cabinetId = activeFilters.cabinetId;

      const aggregated: DispensedItem[] = [];
      let reportedTotal = 0;
      let page = 1;

      while (true) {
        const response = (await returnedItemsApi.getReturnedItems({
          ...params,
          page,
          limit: FETCH_BATCH_LIMIT,
        })) as {
          success?: boolean;
          message?: string;
          data?: unknown;
          total?: number;
        };

        if (response?.success !== true) {
          toast.error(response?.message || 'ไม่สามารถโหลดข้อมูลได้');
          break;
        }

        const raw = response.data;
        const returnedData = Array.isArray(raw)
          ? raw
          : raw != null && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
            ? ((raw as { data: DispensedItem[] }).data ?? [])
            : [];

        reportedTotal = Number(response.total ?? reportedTotal ?? 0);
        aggregated.push(...returnedData);

        const batchLen = returnedData.length;
        if (batchLen < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
          break;
        }
        page += 1;
        if (page > 500) {
          console.warn('staff return-to-cabinet: stopped batch fetch after 500 pages');
          break;
        }
      }

      setReturnedList(aggregated);
      setTotalRawItems(reportedTotal);
      if (options?.resetPage !== false) {
        setCurrentPage(1);
      }

      if (!options?.silent) {
        if (aggregated.length === 0) {
          toast.info('ไม่พบข้อมูลการคืนอุปกรณ์เข้าตู้ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
        } else {
          toast.success(`พบ ${reportedTotal} รายการคืนอุปกรณ์เข้าตู้`);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchReturnedList(undefined, { resetPage: true, silent: true });
    // โหลดครั้งแรกด้วยตัวกรองว่าง = ทั้งหมดตามช่วงวันที่
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    void fetchReturnedList(undefined, { resetPage: true });
  };

  const handleClearSearch = () => {
    const resetFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '',
      subDepartmentId: '',
      cabinetId: '',
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setCurrentPage(1);
    void fetchReturnedList(resetFilters, { resetPage: true, silent: true });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือกแผนกก่อนส่งออกรายงาน');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนส่งออกรายงาน');
      return;
    }
    try {
      const params: any = {};
      if (filters.searchItemCode) params.keyword = filters.searchItemCode;
      if (filters.itemTypeFilter && filters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(filters.itemTypeFilter, 10);
      }
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.subDepartmentId) params.subDepartmentId = filters.subDepartmentId;
      params.cabinetId = filters.cabinetId;

      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      if (format === 'excel') {
        await returnedItemsApi.downloadReturnToCabinetReportExcel(params);
      } else {
        await returnedItemsApi.downloadReturnToCabinetReportPdf(params);
      }

      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    }
  };

  const calculateSummary = (): SummaryData => {
    const totalQty = returnedList.reduce((sum, item) => sum + (item.qty || 0), 0);
    return {
      total: totalRawItems,
      totalQty,
    };
  };

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getItemTypes = () => {
    const types = new Map();
    returnedList.forEach((item) => {
      if (item.itemtypeID && item.itemType) {
        types.set(item.itemtypeID, item.itemType);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id: id.toString(), name }));
  };

  const summary = calculateSummary();

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <RotateCcw className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานเติมอุปกรณ์เข้าตู้</h1>
            <p className="text-sm text-gray-500 mt-1">
              รายการอุปกรณ์ทั้งหมดที่เติมเข้าตู้ SmartCabinet
            </p>
          </div>
        </div>
 

        <FilterSection
          filters={filters}
          appliedFilters={appliedFilters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onRefresh={() => void fetchReturnedList(undefined, { resetPage: false })}
          itemTypes={getItemTypes()}
          loading={loadingList}
          departmentDisabled={false}
        />

        <ReturnedTable
          loading={loadingList}
          items={returnedList}
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
