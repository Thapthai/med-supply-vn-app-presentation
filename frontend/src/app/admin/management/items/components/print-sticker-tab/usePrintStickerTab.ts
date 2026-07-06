'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cabinetApi, cabinetDepartmentApi, departmentApi, itemsApi, itemStockApi, stickerPrintApi } from '@/lib/api';
import type { Item } from '@/types/item';
import {
  AUTO_FETCH_LIMIT,
  MAX_PRINT,
  MAX_TOTAL_LABELS,
  PAGE_SIZE,
} from '@/app/admin/management/print-sticker/constants';
import type { SelectedLine } from '@/app/admin/management/print-sticker/types';
import { clampCopies } from '@/app/admin/management/print-sticker/utils';
import { mapCabinetFromMapping, manualRefillCap } from './helpers';
import type {
  CabinetDepartmentMapping,
  CabinetOpt,
  DepartmentOpt,
  PreparedStockRow,
  PrintMode,
} from './types';

export function usePrintStickerTab() {

  const [departments, setDepartments] = useState<DepartmentOpt[]>([]);
  const [cabinets, setCabinets] = useState<CabinetOpt[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [cabinetId, setCabinetId] = useState('');
  const [cabinetStockId, setCabinetStockId] = useState<number | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const selectedItemcodes = useMemo(() => new Set(selectedLines.map((l) => l.itemcode)), [selectedLines]);

  const [printing, setPrinting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparedRows, setPreparedRows] = useState<PreparedStockRow[]>([]);
  const [selectedPreparedRowIds, setSelectedPreparedRowIds] = useState<number[]>([]);
  const [deletingPrepared, setDeletingPrepared] = useState(false);

  const [mode, setMode] = useState<PrintMode>('manual');

  const displayItems = useMemo(() => {
    if (mode !== 'auto') return items;
    return items.filter((i) => (i.refill_qty ?? 0) > 0);
  }, [items, mode]);

  const listTotal = mode === 'auto' ? displayItems.length : total;
  const listTotalPages = mode === 'auto' ? 1 : totalPages;
  const hidePagination = mode === 'auto';

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 80, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as DepartmentOpt[]);
      }
    } catch {
      toast.error('โหลด Division ไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      let next: CabinetOpt[] = [];
      if (!departmentIdStr) {
        setCabinets([]);
        return;
      }
      const deptId = parseInt(departmentIdStr, 10);
      if (Number.isNaN(deptId)) {
        setCabinets([]);
        return;
      }
      const response = await cabinetDepartmentApi.getAll({
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
        next = Array.from(unique.values());
      }
      setCabinets(next);
    } catch {
      toast.error('โหลดตู้ไม่สำเร็จ');
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    void resolveCabinets(departmentId);
  }, [departmentId, resolveCabinets]);

  useEffect(() => {
    if (cabinetId && cabinets.length > 0) {
      const ok = cabinets.some((c) => c.id.toString() === cabinetId);
      if (!ok) setCabinetId('');
    }
  }, [cabinets, cabinetId]);

  useEffect(() => {
    let cancelled = false;
    async function loadStock() {
      if (!cabinetId) {
        setCabinetStockId(null);
        return;
      }
      const id = parseInt(cabinetId, 10);
      if (Number.isNaN(id)) {
        setCabinetStockId(null);
        return;
      }
      try {
        const res = await cabinetApi.getById(id);
        const sid = res?.data?.stock_id;
        const n = typeof sid === 'number' ? sid : null;
        if (!cancelled) setCabinetStockId(n ?? null);
      } catch {
        if (!cancelled) setCabinetStockId(null);
      }
    }
    void loadStock();
    return () => {
      cancelled = true;
    };
  }, [cabinetId]);

  useEffect(() => {
    setPage(1);
    setKeywordInput('');
    setActiveKeyword('');
    setSelectedLines([]);
    setItems([]);
    setTotal(0);
    setTotalPages(1);
    setCabinetId('');
    setCabinetStockId(null);
  }, [departmentId]);

  const buildLineFromRow = useCallback(
    (row: Item, copies: number, refillCap: number): SelectedLine => ({
      itemcode: row.itemcode,
      itemname: (row.itemname ?? '—').trim() || '—',
      copies: refillCap <= 0 ? 0 : clampCopies(copies, refillCap),
      refillCap,
      expireDate: '',
      lotNo: '',
      SubUnitQty: row.SubUnitQty,
      unit: row.unit,
      subUnit: row.subUnit,
    }),
    [],
  );

  const fetchCabinetItems = useCallback(async () => {
    // Manual — ยังไม่เลือกตู้: โหลดรายการ Item master (ค้นหาได้โดยไม่ต้องเลือกตู้)
    if (mode === 'manual' && !cabinetId) {
      try {
        setLoadingList(true);
        const res = (await itemsApi.getMasterList({
          page,
          limit: PAGE_SIZE,
          sort_by: 'itemcode',
          sort_order: 'asc',
          item_status_filter: 'active',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          lastPage?: number;
          message?: string;
        };
        if (res?.success === false) {
          toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
          setItems([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }
        const list = Array.isArray(res?.data) ? res.data : [];
        const t = res?.total ?? list.length;
        setItems(list);
        setTotal(t);
        setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil(t / PAGE_SIZE)));
      } catch {
        toast.error('โหลดรายการไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoadingList(false);
      }
      return;
    }

    if (!departmentId || !cabinetId) {
      toast.error('เลือก Division และตู้');
      return;
    }
    const dep = parseInt(departmentId, 10);
    const cab = parseInt(cabinetId, 10);
    if (Number.isNaN(dep) || Number.isNaN(cab)) {
      toast.error('Division หรือตู้ไม่ถูกต้อง');
      return;
    }

    // Manual + เลือกตู้แล้ว: ใช้รายการแบบหน้า Items (มี RFID / meta ครบ)
    // — ไม่ใช้ endpoint slot เพราะของในตู้อาจไม่มีใน itemslotincabinet
    if (mode === 'manual') {
      try {
        setLoadingList(true);
        const res = (await itemsApi.getAll({
          page,
          limit: PAGE_SIZE,
          cabinet_id: cab,
          department_id: dep,
          status: 'ACTIVE',
          sort_by: 'itemcode',
          sort_order: 'asc',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          lastPage?: number;
          message?: string;
        };

        if (res?.success === false) {
          toast.error(res.message || 'โหลดรายการในตู้ไม่สำเร็จ');
          setItems([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        const list = Array.isArray(res?.data) ? res.data : [];
        const t = res?.total ?? list.length;
        setItems(list);
        setTotal(t);
        setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil(t / PAGE_SIZE)));
      } catch {
        toast.error('โหลดรายการในตู้ไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoadingList(false);
      }
      return;
    }

    try {
      setLoadingList(true);
      const res = (await itemsApi.getCabinetSlotItems({
        page: 1,
        limit: AUTO_FETCH_LIMIT,
        cabinet_id: cab,
        department_id: dep,
        ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
      })) as {
        success?: boolean;
        data?: Item[];
        total?: number;
        lastPage?: number;
        message?: string;
      };

      if (res?.success === false) {
        toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      let list = Array.isArray(res?.data) ? res.data : [];

      // ถ้า endpoint slot ไม่คืนรายการที่ต้องเติมเลย → fallback ไปใช้รายการที่คำนวณ refill_qty
      if (list.filter((i) => Number(i.refill_qty ?? 0) > 0).length === 0) {
        const fallback = (await itemsApi.getAll({
          page: 1,
          limit: AUTO_FETCH_LIMIT,
          cabinet_id: cab,
          department_id: dep,
          status: 'ACTIVE',
          sort_by: 'itemcode',
          sort_order: 'asc',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          lastPage?: number;
          message?: string;
        };

        if (fallback?.success !== false) {
          list = Array.isArray(fallback?.data) ? fallback.data : list;
        }
      }

      setItems(list);
      setTotal(list.filter((i) => Number(i.refill_qty ?? 0) > 0).length);
      setTotalPages(1);

      const need = list.filter((i) => Number(i.refill_qty ?? 0) > 0);
      setSelectedLines(
        need.map((row) =>
          buildLineFromRow(
            row,
            Math.max(1, Number(row.refill_qty ?? 0)),
            Math.max(0, Number(row.refill_qty ?? 0)),
          ),
        ),
      );
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoadingList(false);
    }
  }, [departmentId, cabinetId, mode, page, activeKeyword, buildLineFromRow]);

  useEffect(() => {
    if (mode === 'manual' && !cabinetId) {
      void fetchCabinetItems();
      return;
    }
    if (!departmentId || !cabinetId) {
      return;
    }
    void fetchCabinetItems();
  }, [mode, departmentId, cabinetId, page, activeKeyword, fetchCabinetItems]);

  const toggleRow = (row: Item) => {
    const code = row.itemcode;
    if (mode === 'auto') {
      const ref = Math.max(0, Number(row.refill_qty ?? 0));
      if (ref <= 0) return;
      setSelectedLines((prev) => {
        const i = prev.findIndex((l) => l.itemcode === code);
        if (i >= 0) return prev.filter((l) => l.itemcode !== code);
        return [
          ...prev,
          buildLineFromRow(row, Math.max(1, ref), ref),
        ];
      });
      return;
    }

    const cap = manualRefillCap(row);
    setSelectedLines((prev) => {
      const i = prev.findIndex((l) => l.itemcode === code);
      if (i >= 0) return prev.filter((l) => l.itemcode !== code);
      return [...prev, buildLineFromRow(row, 1, cap)];
    });
  };

  const selectAllOnPage = () => {
    const capFor = mode === 'auto' ? (r: Item) => Math.max(0, Number(r.refill_qty ?? 0)) : manualRefillCap;
    setSelectedLines((prev) => {
      const have = new Set(prev.map((l) => l.itemcode));
      const next = [...prev];
      for (const row of displayItems) {
        const ref = mode === 'auto' ? Number(row.refill_qty ?? 0) : 0;
        if (mode === 'auto' && ref <= 0) continue;
        if (!have.has(row.itemcode)) {
          const cap = capFor(row);
          if (cap <= 0) continue;
          have.add(row.itemcode);
          next.push(
            buildLineFromRow(
              row,
              mode === 'auto' ? Math.max(1, ref) : 1,
              cap,
            ),
          );
        }
      }
      return next;
    });
  };

  const clearSelectionOnPage = () => {
    const onPage = new Set(displayItems.map((i) => i.itemcode));
    setSelectedLines((prev) => prev.filter((l) => !onPage.has(l.itemcode)));
  };

  const setCopiesFor = (itemcode: string, raw: number) => {
    setSelectedLines((prev) =>
      prev.map((l) => {
        if (l.itemcode !== itemcode) return l;
        return { ...l, copies: clampCopies(raw, l.refillCap) };
      }),
    );
  };

  const setExpireDateFor = (itemcode: string, ymd: string) => {
    setSelectedLines((prev) =>
      prev.map((l) => (l.itemcode === itemcode ? { ...l, expireDate: ymd } : l)),
    );
  };

  const setLotNoFor = (itemcode: string, lotNo: string) => {
    const v = lotNo.slice(0, 50);
    setSelectedLines((prev) =>
      prev.map((l) => (l.itemcode === itemcode ? { ...l, lotNo: v } : l)),
    );
  };

  const removeLine = (itemcode: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.itemcode !== itemcode));
  };

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const departmentSelectOptions = useMemo(
    () => [
      {
        value: '',
        label: '— ไม่เลือก Division —',
        subLabel:
          mode === 'manual'
            ? 'โหลดรายการ Item ที่ใช้งาน (ไม่กรองตามแผนก/ตู้)'
            : 'ในโหมด Auto ต้องเลือก Division จริง',
      },
      ...departments.map((d) => ({
        value: String(d.ID),
        label: `${d.DepName ?? ''} ${d.DepName2 ? `(${d.DepName2})` : ''}`.trim() || `ID ${d.ID}`,
        subLabel: `ID ${d.ID}`,
      })),
    ],
    [mode, departments],
  );

  const cabOptions = cabinets.map((c) => ({
    value: String(c.id),
    label: `${c.cabinet_name ?? c.cabinet_code ?? 'ตู้'}`.trim(),
    subLabel: c.cabinet_code ?? undefined,
  }));

  const buildLinesWithCopies = () => {
    const hasFilter = Boolean(departmentId && cabinetId);
    const depNum = departmentId ? parseInt(departmentId, 10) : undefined;

    let targetStockId = 0;
    if (hasFilter) {
      if (!cabinetStockId || cabinetStockId <= 0) {
        toast.error('ตู้นี้ยังไม่มี stock_id — ใช้เตรียมพิมพ์จากตู้นี้ไม่ได้');
        return null;
      }
      targetStockId = cabinetStockId;
    } else if (mode === 'auto') {
      toast.error('โหมด Auto ต้องเลือก Division และตู้ก่อน');
      return null;
    }

    if (selectedLines.length === 0) {
      toast.error('เลือกอย่างน้อย 1 รายการ');
      return null;
    }
    if (selectedLines.length > MAX_PRINT) {
      toast.error(`เลือกได้ไม่เกิน ${MAX_PRINT} รายการต่อครั้ง`);
      return null;
    }

    const linesWithCopies = selectedLines
      .map((l) => {
        const copies = clampCopies(l.copies, l.refillCap);
        const exp = (l.expireDate ?? '').trim();
        const lot = (l.lotNo ?? '').trim();
        return {
          itemcode: l.itemcode,
          copies,
          stock_id: targetStockId,
          ...(exp ? { expire_date: exp } : {}),
          ...(lot ? { lot_no: lot.slice(0, 50) } : {}),
        };
      })
      .filter((l) => l.copies > 0);

    if (linesWithCopies.length === 0) {
      toast.error('ไม่มีแผ่นที่พิมพ์ได้ — ตรวจสอบจำนวนและเพดานต่อรายการ');
      return null;
    }

    const totalSheets = linesWithCopies.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return null;
    }

    return {
      lines: linesWithCopies,
      department_id: hasFilter && depNum && Number.isFinite(depNum) ? depNum : undefined,
    };
  };

  const handlePrepare = async () => {
    const built = buildLinesWithCopies();
    if (!built) return;

    try {
      setPreparing(true);
      const stockRes = await itemStockApi.createForPrintByStock({
        ...(built.department_id ? { department_id: built.department_id } : {}),
        lines: built.lines.map(
          ({ itemcode, stock_id, copies, expire_date, lot_no }) => ({
            itemcode,
            stock_id,
            copies,
            ...(expire_date ? { expire_date } : {}),
            ...(lot_no ? { lot_no } : {}),
          }),
        ),
      });

      if (stockRes?.success === false) {
        const msg =
          typeof stockRes.message === 'string'
            ? stockRes.message
            : stockRes.error ?? 'บันทึก stock ไม่สำเร็จ';
        toast.error(msg);
        return;
      }

      const createdRows = (stockRes?.data?.rows ?? []).map((r) => ({
        RowID: Number(r.RowID),
        ItemCode: r.ItemCode ?? null,
        RfidCode: r.RfidCode ?? null,
      }));
      setPreparedRows(createdRows);
      setSelectedPreparedRowIds(createdRows.map((r) => r.RowID));
      toast.success(`บันทึก itemstock สำเร็จ ${createdRows.length} แถว`);
      setSelectedLines([]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'บันทึก itemstock ไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setPreparing(false);
    }
  };

  const handleDeletePrepared = async () => {
    if (selectedPreparedRowIds.length === 0) {
      toast.error('เลือกแถวที่ต้องการลบก่อน');
      return;
    }
    try {
      setDeletingPrepared(true);
      const res = await itemStockApi.deleteForPrintRows(selectedPreparedRowIds);
      if (res?.success === false) {
        toast.error(res.message || res.error || 'ลบรายการไม่สำเร็จ');
        return;
      }

      const deleted = new Set(selectedPreparedRowIds);
      const nextRows = preparedRows.filter((r) => !deleted.has(r.RowID));
      setPreparedRows(nextRows);
      setSelectedPreparedRowIds(nextRows.map((r) => r.RowID));
      toast.success(`ลบสำเร็จ ${res?.data?.count ?? selectedPreparedRowIds.length} แถว`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'ลบรายการไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setDeletingPrepared(false);
    }
  };

  const handlePrint = async () => {
    if (preparedRows.length === 0) {
      toast.error('ยังไม่มีรายการที่บันทึกไว้สำหรับพิมพ์');
      return;
    }

    const grouped = new Map<string, number>();
    for (const row of preparedRows) {
      const code = row.ItemCode?.trim();
      if (!code) continue;
      grouped.set(code, (grouped.get(code) ?? 0) + 1);
    }
    const payloadItems = [...grouped.entries()].map(([itemcode, copies]) => ({ itemcode, copies }));
    if (payloadItems.length === 0) {
      toast.error('ไม่มี itemcode ที่พิมพ์ได้ในรายการที่บันทึก');
      return;
    }

    try {
      setPrinting(true);
      const res = await stickerPrintApi.printLabelItems({ items: payloadItems });
      toast.success(res.message, {
        description: `${res.lineCount} แถว · ${res.count} แผ่น · ${res.totalBytesSent} bytes → ${res.host}:${res.port} · ${res.template} · ${new Date(res.printedAt).toLocaleString('th-TH')}`,
      });
      setPreparedRows([]);
      setSelectedPreparedRowIds([]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'ส่งพิมพ์ไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setKeywordInput('');
    setActiveKeyword('');
    setSelectedLines([]);
  }, [mode]);

  const manualShowsAllItems = mode === 'manual' && !departmentId && !cabinetId;
  const manualFilterIncomplete = mode === 'manual' && !!departmentId && !cabinetId;
  const cabinetPairSelected = !!departmentId && !!cabinetId;

  const reloadDisabled = loadingList || (mode === 'auto' && !cabinetPairSelected);

  const reloadButtonLabel = loadingList
    ? 'กำลังโหลด…'
    : manualShowsAllItems
      ? 'โหลดรายการ Item'
      : 'โหลดรายการจากตู้';

  const orderEmptyHint =
    mode === 'auto'
      ? 'โหลดแล้วแต่ยังไม่มีรายการต้องเติม (หรือ Max=0)'
      : 'ยังไม่มีรายการ — ติ๊กเวชภัณฑ์จากตารางในตู้';

  return {
    mode,
    setMode,
    departmentId,
    setDepartmentId,
    cabinetId,
    setCabinetId,
    cabinetStockId,
    loadingDepartments,
    loadingCabinets,
    loadDepartments,
    resolveCabinets,
    departmentSelectOptions,
    cabOptions,
    manualFilterIncomplete,
    reloadDisabled,
    reloadButtonLabel,
    fetchCabinetItems,
    loadingList,
    displayItems,
    listTotal,
    listTotalPages,
    page,
    hidePagination,
    keywordInput,
    setKeywordInput,
    handleSearch,
    handlePageChange,
    selectedItemcodes,
    toggleRow,
    selectAllOnPage,
    clearSelectionOnPage,
    cabinetPairSelected,
    selectedLines,
    preparing,
    setCopiesFor,
    setExpireDateFor,
    setLotNoFor,
    removeLine,
    clearSelectedLines: () => setSelectedLines([]),
    handlePrepare,
    preparedRows,
    selectedPreparedRowIds,
    setSelectedPreparedRowIds,
    deletingPrepared,
    printing,
    handleDeletePrepared,
    handlePrint,
    orderEmptyHint,
  };
}
