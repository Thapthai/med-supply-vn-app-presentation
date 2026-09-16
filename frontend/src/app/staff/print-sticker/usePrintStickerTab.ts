'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { staffCabinetApi } from '@/lib/staffApi/cabinetApi';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import { staffItemStockApi } from '@/lib/staffApi/itemStockApi';
import { staffStickerPrintApi } from '@/lib/staffApi/stickerPrintApi';
import type { Item } from '@/types/item';
import {
  AUTO_FETCH_LIMIT,
  MAX_PRINT,
  MAX_TOTAL_LABELS,
  PAGE_SIZE,
} from '@/app/staff/print-sticker/constants';
import type { SelectedLine } from '@/app/staff/print-sticker/types';
import { clampCopies, localYmd } from '@/app/staff/print-sticker/utils';
import {
  applyPrintedCopiesToItems,
  mergeRemainingPrintCap,
  printableCapForRow,
} from '@/app/staff/print-sticker/helpers';

export function usePrintStickerTab() {
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
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
  const selectedItemcodes = useMemo(
    () => new Set(selectedLines.map((l) => l.itemcode)),
    [selectedLines],
  );

  const [printing, setPrinting] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const displayItems = useMemo(() => {
    if (mode !== 'auto') return items;
    return items.filter(
      (i) => (i.refill_qty ?? 0) > 0 || selectedItemcodes.has(i.itemcode),
    );
  }, [items, mode, selectedItemcodes]);

  const listTotal = mode === 'auto' ? displayItems.length : total;
  const listTotalPages = mode === 'auto' ? 1 : totalPages;
  const hidePagination = mode === 'auto';
  const cabinetPairSelected = Boolean(cabinetId);

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
        const res = await staffCabinetApi.getById(id);
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
  }, [departmentId, cabinetId, mode]);

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

  const fetchCabinetItems = useCallback(async (opts?: {
    skipAutoSelect?: boolean;
    silent?: boolean;
    remainingByCode?: Map<string, number>;
  }) => {
    const finishList = (list: Item[]) =>
      opts?.remainingByCode?.size ? mergeRemainingPrintCap(list, opts.remainingByCode) : list;
    const setLoading = (v: boolean) => {
      if (!opts?.silent) setLoadingList(v);
    };

    if (!cabinetId) {
      if (mode === 'auto') {
        toast.error('เลือก Division และตู้');
      }
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    const cab = parseInt(cabinetId, 10);
    if (Number.isNaN(cab)) {
      toast.error('ตู้ไม่ถูกต้อง');
      return;
    }

    const dep = departmentId ? parseInt(departmentId, 10) : undefined;
    const depParam = dep != null && Number.isFinite(dep) && dep > 0 ? dep : undefined;

    if (mode === 'manual') {
      try {
        setLoading(true);
        const res = (await staffItemsApi.getAll({
          page,
          limit: PAGE_SIZE,
          cabinet_id: cab,
          ...(depParam ? { department_id: depParam } : {}),
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

        const list = finishList(Array.isArray(res?.data) ? res.data : []);
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
        setLoading(false);
      }
      return;
    }

    if (mode === 'auto' && !depParam) {
      toast.error('โหมด Auto ต้องเลือก Division');
      return;
    }

    try {
      setLoading(true);
      const res = (await staffItemsApi.getCabinetSlotItems({
        page: 1,
        limit: AUTO_FETCH_LIMIT,
        cabinet_id: cab,
        ...(depParam ? { department_id: depParam } : {}),
        ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
      })) as {
        success?: boolean;
        data?: Item[];
        total?: number;
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

      if (list.filter((i) => Number(i.refill_qty ?? 0) > 0).length === 0) {
        const fallback = (await staffItemsApi.getAll({
          page: 1,
          limit: AUTO_FETCH_LIMIT,
          cabinet_id: cab,
          ...(depParam ? { department_id: depParam } : {}),
          status: 'ACTIVE',
          sort_by: 'itemcode',
          sort_order: 'asc',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as { success?: boolean; data?: Item[] };

        if (fallback?.success !== false) {
          list = Array.isArray(fallback?.data) ? fallback.data : list;
        }
      }

      const merged = finishList(list);
      setItems(merged);
      setTotal(merged.filter((i) => Number(i.refill_qty ?? 0) > 0).length);
      setTotalPages(1);

      if (!opts?.skipAutoSelect) {
        const need = merged.filter((i) => Number(i.refill_qty ?? 0) > 0);
        setSelectedLines(
          need.map((row) =>
            buildLineFromRow(
              row,
              Math.max(1, Number(row.refill_qty ?? 0)),
              Math.max(0, Number(row.refill_qty ?? 0)),
            ),
          ),
        );
      }
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [departmentId, cabinetId, mode, page, activeKeyword, buildLineFromRow]);

  useEffect(() => {
    if (!cabinetId) return;
    void fetchCabinetItems();
  }, [cabinetId, page, activeKeyword, fetchCabinetItems]);

  const toggleRow = (row: Item) => {
    const code = row.itemcode;
    const cap = printableCapForRow(row);
    setSelectedLines((prev) => {
      const i = prev.findIndex((l) => l.itemcode === code);
      if (i >= 0) return prev.filter((l) => l.itemcode !== code);
      if (cap <= 0) return prev;
      return [
        ...prev,
        buildLineFromRow(row, mode === 'auto' ? Math.max(1, cap) : 1, cap),
      ];
    });
  };

  const selectAllOnPage = () => {
    setSelectedLines((prev) => {
      const have = new Set(prev.map((l) => l.itemcode));
      const next = [...prev];
      for (const row of displayItems) {
        if (have.has(row.itemcode)) continue;
        const cap = printableCapForRow(row);
        if (cap <= 0) continue;
        have.add(row.itemcode);
        next.push(
          buildLineFromRow(
            row,
            mode === 'auto' ? Math.max(1, cap) : 1,
            cap,
          ),
        );
      }
      return next;
    });
  };

  const clearSelectionOnPage = () => {
    const onPage = new Set(displayItems.map((i) => i.itemcode));
    setSelectedLines((prev) => prev.filter((l) => !onPage.has(l.itemcode)));
  };

  const upsertSelectedLine = useCallback(
    (itemcode: string, patch: Partial<SelectedLine>) => {
      setSelectedLines((prev) => {
        const idx = prev.findIndex((l) => l.itemcode === itemcode);
        if (idx >= 0) {
          return prev.map((l) => (l.itemcode === itemcode ? { ...l, ...patch } : l));
        }
        const row = items.find((i) => i.itemcode === itemcode);
        if (!row) return prev;
        const cap = printableCapForRow(row);
        const base = buildLineFromRow(row, 1, cap);
        return [...prev, { ...base, ...patch }];
      });
    },
    [items, buildLineFromRow],
  );

  const setCopiesFor = (itemcode: string, raw: number | null) => {
    setSelectedLines((prev) => {
      const line = prev.find((l) => l.itemcode === itemcode);
      if (!line) {
        const row = items.find((i) => i.itemcode === itemcode);
        if (!row) return prev;
        const cap = printableCapForRow(row);
        const copies = raw == null ? null : clampCopies(raw, cap);
        return [...prev, { ...buildLineFromRow(row, 1, cap), copies }];
      }
      return prev.map((l) => {
        if (l.itemcode !== itemcode) return l;
        if (raw == null) return { ...l, copies: null };
        return { ...l, copies: clampCopies(raw, l.refillCap) };
      });
    });
  };

  const setExpireDateFor = (itemcode: string, ymd: string) => {
    const trimmed = ymd.trim();
    if (!trimmed) {
      setSelectedLines((prev) => prev.filter((l) => l.itemcode !== itemcode));
      return;
    }
    upsertSelectedLine(itemcode, { expireDate: trimmed });
  };

  const setLotNoFor = (itemcode: string, lotNo: string) => {
    const v = lotNo.slice(0, 50);
    upsertSelectedLine(itemcode, { lotNo: v });
  };

  const removeLine = (itemcode: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.itemcode !== itemcode));
  };

  useEffect(() => {
    const next = keywordInput.trim();
    if (next === '') {
      setActiveKeyword('');
      return;
    }
    const timer = window.setTimeout(() => {
      setActiveKeyword(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const handleSearch = () => {
    setActiveKeyword(keywordInput.trim());
    setPage(1);
  };

  const handleClearKeyword = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildLinesWithCopies = () => {
    if (!cabinetId || !cabinetStockId || cabinetStockId <= 0) {
      toast.error('เลือกตู้ที่มี stock_id ก่อนบันทึกเตรียมพิมพ์');
      return null;
    }

    const depNum = departmentId ? parseInt(departmentId, 10) : undefined;

    const linesWithExpire = selectedLines.filter((l) => (l.expireDate ?? '').trim());
    if (linesWithExpire.length === 0) {
      toast.error('กรอกวันหมดอายุอย่างน้อย 1 รายการที่จะพิมพ์');
      return null;
    }
    if (linesWithExpire.length > MAX_PRINT) {
      toast.error(`พิมพ์ได้ไม่เกิน ${MAX_PRINT} รายการต่อครั้ง`);
      return null;
    }

    const today = localYmd();
    const invalidExpire = linesWithExpire.find((l) => {
      const copies = clampCopies(l.copies, l.refillCap);
      if (copies <= 0) return false;
      const exp = (l.expireDate ?? '').trim();
      return !exp || exp <= today;
    });
    if (invalidExpire) {
      toast.error(`วันหมดอายุของ ${invalidExpire.itemcode} ต้องมากกว่าวันนี้`);
      return null;
    }

    const linesWithCopies = linesWithExpire
      .map((l) => {
        const copies = clampCopies(l.copies, l.refillCap);
        const exp = (l.expireDate ?? '').trim();
        const lot = (l.lotNo ?? '').trim();
        return {
          itemcode: l.itemcode,
          copies,
          stock_id: cabinetStockId,
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
      department_id: depNum && Number.isFinite(depNum) ? depNum : undefined,
    };
  };

  const handlePrepareAndPrint = async () => {
    const built = buildLinesWithCopies();
    if (!built) return;

    try {
      setPreparing(true);
      const stockRes = await staffItemStockApi.createForPrintByStock({
        ...(built.department_id ? { department_id: built.department_id } : {}),
        lines: built.lines.map(({ itemcode, stock_id, copies, expire_date, lot_no }) => ({
          itemcode,
          stock_id,
          copies,
          ...(expire_date ? { expire_date } : {}),
          ...(lot_no ? { lot_no } : {}),
        })),
      });

      if (stockRes?.success === false) {
        toast.error(stockRes.message || stockRes.error || 'บันทึก stock ไม่สำเร็จ');
        return;
      }

      const createdRows = (stockRes?.data?.rows ?? []).map((r) => ({
        RowID: Number(r.RowID),
        ItemCode: r.ItemCode ?? null,
        RfidCode: r.RfidCode ?? null,
      }));

      const grouped = new Map<string, number>();
      for (const row of createdRows) {
        const code = row.ItemCode?.trim();
        if (!code) continue;
        grouped.set(code, (grouped.get(code) ?? 0) + 1);
      }
      const payloadItems = [...grouped.entries()].map(([itemcode, copies]) => ({ itemcode, copies }));
      if (payloadItems.length === 0) {
        toast.error('บันทึกแล้วแต่ไม่มี itemcode ที่พิมพ์ได้');
        return;
      }

      setPrinting(true);
      const res = await staffStickerPrintApi.printLabelItems({ items: payloadItems });
      toast.success(res.message, {
        description: `${res.lineCount} แถว · ${res.count} แผ่น · ${res.totalBytesSent} bytes → ${res.host}:${res.port} · ${res.template} · ${new Date(res.printedAt).toLocaleString('th-TH')}`,
      });

      const remainingByCode = new Map<string, number>();
      for (const line of selectedLines) {
        const printed = grouped.get(line.itemcode) ?? 0;
        remainingByCode.set(line.itemcode, Math.max(0, line.refillCap - printed));
      }

      setItems((prev) => applyPrintedCopiesToItems(prev, grouped));
      setSelectedLines((prev) =>
        prev.map((l) => {
          const remaining = remainingByCode.get(l.itemcode) ?? Math.max(0, l.refillCap);
          return { ...l, refillCap: remaining, copies: remaining > 0 ? remaining : 0 };
        }),
      );
      void fetchCabinetItems({
        skipAutoSelect: true,
        silent: true,
        remainingByCode,
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'พิมพ์สติกเกอร์ไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setPreparing(false);
      setPrinting(false);
    }
  };

  const reloadDisabled = loadingList || (mode === 'auto' && !cabinetPairSelected) || !cabinetId;

  const reloadButtonLabel = loadingList
    ? 'กำลังโหลด…'
    : !cabinetId
      ? 'เลือกตู้ก่อน'
      : 'โหลดรายการจากตู้';

  return {
    mode,
    setMode,
    departmentId,
    setDepartmentId,
    cabinetId,
    setCabinetId,
    cabinetStockId,
    reloadDisabled,
    reloadButtonLabel,
    loadingList,
    fetchCabinetItems,
    displayItems,
    listTotal,
    listTotalPages,
    page,
    hidePagination,
    keywordInput,
    setKeywordInput,
    handleSearch,
    handleClearKeyword,
    handlePageChange,
    selectedItemcodes,
    toggleRow,
    selectAllOnPage,
    clearSelectionOnPage,
    cabinetPairSelected,
    selectedLines,
    preparing,
    printing,
    setCopiesFor,
    setExpireDateFor,
    setLotNoFor,
    handlePrepareAndPrint,
  };
}
