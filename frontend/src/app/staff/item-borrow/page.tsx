'use client';

import { useCallback, useEffect, useState } from 'react';
import { itemStockApi } from '@/lib/api';
import FilterSection, { type BorrowFilterState } from './components/FilterSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TablePagination from '@/components/TablePagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, BookMarked, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatBangkokDateTime } from '@/lib/formatThaiDateTime';

type DivisionRow = {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
};

type BorrowRow = {
  rowId: number;
  sel: number;
  itemCode: string | null;
  itemName: string | null;
  hnCode: string | null;
  qty: number | null;
  depId: number | null;
  borrowDepartment: DivisionRow | null;
  stockId: number | null;
  slotNo: number | null;
  sensor: number | null;
  sign: string | null;
  userId: number | null;
  isDeproom: string | null;
  modifyDate: string | null;
  cabinet: {
    id: number;
    cabinet_name?: string | null;
    cabinet_code?: string | null;
  } | null;
  cabinetDivisions: DivisionRow[];
};

function formatThDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatBangkokDateTime(iso);
}

function oneDeptLabel(d: DivisionRow): string {
  const name = (d.DepName ?? d.DepName2 ?? '').trim();
  if (!name) return String(d.ID);
  const ref = d.RefDepID?.trim();
  return ref ? `${name} (${ref})` : name;
}

function borrowDepartmentLabel(r: BorrowRow): string {
  if (!r.borrowDepartment) return r.depId != null ? String(r.depId) : '—';
  return oneDeptLabel(r.borrowDepartment);
}

function cabinetDivisionsLabel(r: BorrowRow): string {
  const list = r.cabinetDivisions ?? [];
  if (list.length === 0) return '—';
  return list.map(oneDeptLabel).join(' · ');
}

/** วันนี้ (Asia/Bangkok) เป็น YYYY-MM-DD ค.ศ. — ตรงกับ DatePickerBE */
function todayBangkokYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function initialBorrowFilters(): BorrowFilterState {
  const d = todayBangkokYmd();
  return {
    searchItemCode: '',
    startDate: d,
    endDate: d,
    departmentId: '',
    cabinetId: '',
    borrowDepartmentId: '',
  };
}

export default function StaffItemBorrowPage() {
  const [rows, setRows] = useState<BorrowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BorrowFilterState>(initialBorrowFilters);
  const [appliedFilters, setAppliedFilters] = useState<BorrowFilterState>(initialBorrowFilters);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await itemStockApi.getBorrowList({
        page,
        limit,
        keyword: appliedFilters.searchItemCode.trim() || undefined,
        start_date: appliedFilters.startDate || undefined,
        end_date: appliedFilters.endDate || undefined,
        department_id: appliedFilters.departmentId
          ? Number(appliedFilters.departmentId)
          : undefined,
        cabinet_id: appliedFilters.cabinetId
          ? Number(appliedFilters.cabinetId)
          : undefined,
        borrow_department_id: appliedFilters.borrowDepartmentId
          ? Number(appliedFilters.borrowDepartmentId)
          : undefined,
      });
      if (!res.success) {
        toast.error((res as { message?: string }).message || 'โหลดข้อมูลไม่สำเร็จ');
        setRows([]);
        setTotal(0);
        setLastPage(1);
        return;
      }
      setRows(Array.isArray(res.data) ? (res.data as BorrowRow[]) : []);
      setTotal(res.total ?? 0);
      setLastPage(res.lastPage ?? 1);
    } catch (e) {
      console.error(e);
      toast.error('ไม่สามารถโหลดรายการยืมได้');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onSearch = () => {
    setAppliedFilters(filters);
    setPage(1);
  };
  const onFilterChange = (key: keyof BorrowFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const onClear = () => {
    const reset = initialBorrowFilters();
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  };
  const onRefresh = () => {
    void fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-indigo-600" />
            อุปกรณ์ยืม
          </h1>
        </div>
      </div>

      <FilterSection
        filters={filters}
        appliedFilters={appliedFilters}
        onFilterChange={onFilterChange}
        onSearch={onSearch}
        onClear={onClear}
        onRefresh={onRefresh}
        loading={loading}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>รายการยืมอุปกรณ์</CardTitle>
          <CardDescription>
            {rows.length > 0
              ? `แสดงผล ${rows.length.toLocaleString()} รายการในหน้านี้ · ทั้งหมด ${total.toLocaleString()} รายการ`
              : 'รายการยืมจากระบบ SmartCabinet'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-4">
          {loading && rows.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">ไม่พบรายการยืมอุปกรณ์</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead className="min-w-[140px]">ชื่ออุปกรณ์</TableHead>
                    <TableHead className="text-center w-[56px]">จำนวน</TableHead>
                    <TableHead className="min-w-[180px]">แผนกที่ยืม</TableHead>
                    <TableHead className="min-w-[150px]">ตู้</TableHead>
                    <TableHead className="min-w-[132px] whitespace-nowrap">แก้ไขล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowId}>
                      <TableCell className="font-mono text-sm">{r.itemCode ?? '—'}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={r.itemName ?? ''}>
                        {r.itemName ?? '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{r.qty ?? '—'}</TableCell>
                      <TableCell className="text-sm">{borrowDepartmentLabel(r)}</TableCell>
                      <TableCell className="text-sm">
                        {(r.cabinet?.cabinet_name ?? r.cabinet?.cabinet_code ?? '—') +
                          (r.stockId != null ? ` (${r.stockId})` : '')}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatThDate(r.modifyDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {lastPage > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={lastPage}
              onPageChange={setPage}
              loading={loading}
              summary={
                <>
                  หน้า {page} จาก {lastPage} ({total} อุปกรณ์)
                </>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

