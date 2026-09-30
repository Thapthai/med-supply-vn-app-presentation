'use client';

import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { StickerLabelPreview } from '@/components/print-sticker/StickerLabelPreview';
import type { PrintStickerConfirmLine } from '@/components/print-sticker/PrintStickerConfirmDialog';
import { toast } from 'sonner';
import { cabinetDepartmentApi, departmentApi, stickerPrintApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Pagination from '@/components/Pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatBangkokDateTime } from '@/lib/formatThaiDateTime';
import type { CabinetDepartmentMapping, CabinetOpt, DepartmentOpt, StickerPrintHistoryRow } from '../types';
import { mapCabinetFromMapping } from '../helpers';
import PrintStickerHistoryFilterCard, {
  EMPTY_PRINT_HISTORY_FILTERS,
  type PrintStickerHistoryFilters,
} from './PrintStickerHistoryFilterCard';
import PrintStickerHistoryDetailDialog from './PrintStickerHistoryDetailDialog';

const PAGE_SIZE = 10;

export type PrintStickerHistoryApis = {
  listHistory: typeof stickerPrintApi.listHistory;
  getDepartments: (keyword?: string) => Promise<{ success?: boolean; data?: DepartmentOpt[] }>;
  getCabinetMappings: (params: {
    departmentId: number;
    keyword?: string;
  }) => Promise<{ success?: boolean; data?: CabinetDepartmentMapping[] }>;
};

const defaultHistoryApis: PrintStickerHistoryApis = {
  listHistory: stickerPrintApi.listHistory,
  getDepartments: (keyword) => departmentApi.getAll({ limit: 80, keyword }),
  getCabinetMappings: ({ departmentId, keyword }) =>
    cabinetDepartmentApi.getAll({
      departmentId,
      keyword: keyword || undefined,
    }),
};

function printerUserLabel(row: StickerPrintHistoryRow): string {
  const u = row.printedBy;
  if (!u) return '—';
  const name = `${u.fname ?? ''} ${u.lname ?? ''}`.trim();
  return name || u.email || '—';
}

function formatPrintedAt(iso: string): string {
  return formatBangkokDateTime(iso);
}

function cabLabel(row: StickerPrintHistoryRow): string {
  const snap = (row.cabinet_name ?? '').trim();
  if (snap) return snap;
  return (row.cabinet?.cabinet_name ?? row.cabinet?.cabinet_code ?? '').trim() || '—';
}

function deptLabel(row: StickerPrintHistoryRow): string {
  const snap = (row.department_name ?? '').trim();
  if (snap) return snap;
  const d = row.department;
  if (!d) return '—';
  return `${d.DepName ?? ''} ${d.DepName2 ? `(${d.DepName2})` : ''}`.trim() || '—';
}
function historyLinePreview(line: StickerPrintHistoryRow['lines'][number]): PrintStickerConfirmLine {
  return {
    itemcode: line.itemcode,
    itemname: line.item_name || line.itemcode,
    copies: line.copies,
    expireDate: line.expire_date || '',
  };
}

function sourceLabel(source: string): string {
  if (source === 'printLabel-items') return 'พิมพ์หลายรายการ';
  if (source === 'printLabel-item') return 'พิมพ์รายการเดียว';
  if (source === 'printLabel') return 'ทดพิมพ์';
  if (source === 'manual') return 'บันทึกเอง';
  return source;
}

export default function PrintStickerHistoryTab({
  apis = defaultHistoryApis,
}: {
  apis?: PrintStickerHistoryApis;
}) {
  const [rows, setRows] = useState<StickerPrintHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formFilters, setFormFilters] = useState<PrintStickerHistoryFilters>(EMPTY_PRINT_HISTORY_FILTERS);
  const [activeFilters, setActiveFilters] = useState<PrintStickerHistoryFilters>(EMPTY_PRINT_HISTORY_FILTERS);
  const [selectedRow, setSelectedRow] = useState<StickerPrintHistoryRow | null>(null);
  const [departments, setDepartments] = useState<DepartmentOpt[]>([]);
  const [cabinets, setCabinets] = useState<CabinetOpt[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await apis.getDepartments(keyword);
      if (response.success && response.data) {
        setDepartments(response.data as DepartmentOpt[]);
      }
    } catch {
      toast.error('โหลด Division ไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, [apis]);

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      if (!departmentIdStr) {
        setCabinets([]);
        return;
      }
      const deptId = parseInt(departmentIdStr, 10);
      if (Number.isNaN(deptId)) {
        setCabinets([]);
        return;
      }
      const response = await apis.getCabinetMappings({
        departmentId: deptId,
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const unique = new Map<number, CabinetOpt>();
        mappings
          .filter((mapping) => mapping.status === 'ACTIVE')
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
          });
        setCabinets(Array.from(unique.values()));
      } else {
        setCabinets([]);
      }
    } catch {
      toast.error('โหลดตู้ไม่สำเร็จ');
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, [apis]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  const departmentOptions = departments.map((d) => ({
    value: String(d.ID),
    label: `${d.DepName ?? ''} ${d.DepName2 ? `(${d.DepName2})` : ''}`.trim() || `ID ${d.ID}`,
    subLabel: `ID ${d.ID}`,
  }));

  const cabinetOptions = cabinets.map((c) => ({
    value: String(c.id),
    label: `${c.cabinet_name ?? c.cabinet_code ?? 'ตู้'}`.trim(),
    subLabel: c.cabinet_code ?? undefined,
  }));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apis.listHistory({
        page,
        limit: PAGE_SIZE,
        keyword: activeFilters.keyword.trim() || undefined,
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        source: activeFilters.source || undefined,
        status: activeFilters.status || undefined,
        department_id: activeFilters.departmentId
          ? parseInt(activeFilters.departmentId, 10)
          : undefined,
        cabinet_id: activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined,
      });
      if (!res?.data) {
        toast.error('โหลดประวัติการพิมพ์ไม่สำเร็จ');
        return;
      }
      setRows(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
    } catch {
      toast.error('โหลดประวัติการพิมพ์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [page, activeFilters, apis]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedRow(null);
  }, [page, activeFilters]);

  const handleSearch = () => {
    setPage(1);
    setActiveFilters({
      ...formFilters,
      keyword: formFilters.keyword.trim(),
    });
  };

  const handleClearFilters = () => {
    setFormFilters(EMPTY_PRINT_HISTORY_FILTERS);
    setActiveFilters(EMPTY_PRINT_HISTORY_FILTERS);
    setPage(1);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PrintStickerHistoryFilterCard
        formFilters={formFilters}
        activeFilters={activeFilters}
        onFormChange={(patch) => setFormFilters((p) => ({ ...p, ...patch }))}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
        onRefresh={() => void load()}
        loading={loading}
        departmentOptions={departmentOptions}
        cabinetOptions={cabinetOptions}
        loadingDepartments={loadingDepartments}
        loadingCabinets={loadingCabinets}
        onSearchDepartments={(kw) => void loadDepartments(kw)}
        onSearchCabinets={(kw) => void resolveCabinets(formFilters.departmentId, kw)}
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-800">
            <History className="h-4 w-4 text-slate-500" />
            ประวัติการพิมพ์สติ๊กเกอร์
            <span className="font-normal text-slate-500">
              — {loading && rows.length === 0 ? 'กำลังโหลด…' : `${total} ครั้ง`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[184px]">พรีวิว</TableHead>
                  <TableHead className="whitespace-nowrap">เลขที่เอกสาร</TableHead>
                  <TableHead className="whitespace-nowrap">วันที่พิมพ์</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>ตู้</TableHead>
                  <TableHead>ผู้พิมพ์</TableHead>
                  <TableHead className="text-center">รายการ</TableHead>
                  <TableHead className="text-center">แผ่น</TableHead>
                  <TableHead>เครื่อง</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-500">
                      กำลังโหลด…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-500">
                      ยังไม่มีประวัติการพิมพ์
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedRow(row)}
                    >
                      <TableCell className="w-[184px]">
                        {row.lines?.[0] ? (
                          <StickerLabelPreview line={historyLinePreview(row.lines[0])} size="thumb" />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {row.doc_no || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {formatPrintedAt(row.printed_at)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm" title={deptLabel(row)}>
                        {deptLabel(row)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm" title={cabLabel(row)}>
                        {cabLabel(row)}
                      </TableCell>
                      <TableCell className="text-sm">{printerUserLabel(row)}</TableCell>
                      <TableCell className="text-center tabular-nums text-sm">{row.line_count}</TableCell>
                      <TableCell className="text-center tabular-nums text-sm font-medium">
                        {row.total_copies}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {row.host ? `${row.host}${row.port ? `:${row.port}` : ''}` : '—'}
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {sourceLabel(row.source)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            row.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700',
                          )}
                        >
                          {row.status === 'SUCCESS' ? 'สำเร็จ' : row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 ? (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
          ) : null}
        </CardContent>
      </Card>

      <PrintStickerHistoryDetailDialog
        row={selectedRow}
        open={selectedRow != null}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
      />
    </div>
  );
}
