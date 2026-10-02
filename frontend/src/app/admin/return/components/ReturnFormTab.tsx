'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import type { Item } from '@/types/item';
import type { WillReturnItem } from '../types';

const ITEM_PAGE_SIZE = 15;

export interface ReturnFormSubmitParams {
  itemCode: string;
  stockId: number | null;
  qty: number;
  reason: string;
  note: string;
}

interface ReturnFormTabProps {
  willReturnItems: WillReturnItem[];
  loadingWillReturn: boolean;
  loadWillReturnItems: () => Promise<void>;
  onSubmit: (params: ReturnFormSubmitParams) => Promise<void>;
  isSubmitting: boolean;
}

function getRowKey(item: WillReturnItem): string {
  return `${item.ItemCode}-${item.StockID ?? 0}`;
}

const DEFAULT_FORM = { qty: 1, reason: 'EXPIRED', note: '' };

export default function ReturnFormTab({
  willReturnItems,
  loadingWillReturn,
  loadWillReturnItems,
  onSubmit,
  isSubmitting,
}: ReturnFormTabProps) {
  const [itemSearch, setItemSearch] = useState('');
  const [formByKey, setFormByKey] = useState<Record<string, { qty: number; reason: string; note: string }>>({});
  const [submittingRowKey, setSubmittingRowKey] = useState<string | null>(null);

  // ฟอร์มแบบเดิม (dropdown)
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');
  const [selectedStockID, setSelectedStockID] = useState<number | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>('EXPIRED');
  const [note, setNote] = useState<string>('');
  const [itemDropdownPage, setItemDropdownPage] = useState(0);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const [itemDropdownRect, setItemDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const itemTriggerRef = useRef<HTMLButtonElement>(null);
  const itemPanelRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return willReturnItems;
    return willReturnItems.filter(
      (i) =>
        (i.itemname ?? '').toLowerCase().includes(q) ||
        (i.ItemCode ?? '').toLowerCase().includes(q) ||
        (i.cabinet_code ?? '').toLowerCase().includes(q) ||
        (i.cabinet_name ?? '').toLowerCase().includes(q) ||
        (i.department_name ?? '').toLowerCase().includes(q),
    );
  }, [willReturnItems, itemSearch]);

  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / ITEM_PAGE_SIZE));
  const paginatedItems = useMemo(
    () =>
      filteredItems.slice(
        itemDropdownPage * ITEM_PAGE_SIZE,
        itemDropdownPage * ITEM_PAGE_SIZE + ITEM_PAGE_SIZE,
      ),
    [filteredItems, itemDropdownPage],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        itemDropdownOpen &&
        itemTriggerRef.current &&
        !itemTriggerRef.current.contains(target) &&
        itemPanelRef.current &&
        !itemPanelRef.current.contains(target)
      ) {
        setItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [itemDropdownOpen]);

  useEffect(() => {
    if (!itemDropdownOpen || !itemTriggerRef.current) {
      setItemDropdownRect(null);
      return;
    }
    const updateRect = () => {
      if (itemTriggerRef.current) {
        const r = itemTriggerRef.current.getBoundingClientRect();
        setItemDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [itemDropdownOpen]);

  useEffect(() => {
    setItemDropdownPage(0);
  }, [itemSearch]);

  const selectedItem = willReturnItems.find(
    (i) => i.ItemCode === selectedItemCode && (selectedStockID == null || i.StockID === selectedStockID),
  );
  const maxQty = selectedItem?.max_available_qty ?? 0;

  const selectItem = (item: WillReturnItem) => {
    setSelectedItemCode(item.ItemCode);
    setSelectedStockID(item.StockID ?? null);
    setQty((prev) => Math.min(prev, item.max_available_qty || 1));
  };

  const handleSubmitForm = async () => {
    if (!selectedItemCode || !selectedItem) return;
    const qtyToSubmit = Math.min(Math.max(1, qty), maxQty);
    if (qtyToSubmit < 1 || maxQty < 1) return;
    try {
      await onSubmit({
        itemCode: selectedItemCode,
        stockId: selectedStockID,
        qty: qtyToSubmit,
        reason,
        note: reason === 'OTHER' ? note : '',
      });
      setSelectedItemCode('');
      setSelectedStockID(null);
      setQty(1);
      setReason('EXPIRED');
      setNote('');
      setItemSearch('');
      setItemDropdownPage(0);
    } catch {
      // error handled by parent
    }
  };

  const getForm = (item: WillReturnItem) => formByKey[getRowKey(item)] ?? DEFAULT_FORM;

  const setRowForm = (item: WillReturnItem, updates: Partial<{ qty: number; reason: string; note: string }>) => {
    const key = getRowKey(item);
    setFormByKey((prev) => ({
      ...prev,
      [key]: { ...DEFAULT_FORM, ...prev[key], ...updates },
    }));
  };

  const handleSubmitRow = async (item: WillReturnItem) => {
    const key = getRowKey(item);
    const form = getForm(item);
    const maxQty = item.max_available_qty ?? 0;
    const qtyToSubmit = Math.min(Math.max(1, form.qty), maxQty);
    if (maxQty < 1 || qtyToSubmit < 1) return;

    try {
      setSubmittingRowKey(key);
      await onSubmit({
        itemCode: item.ItemCode,
        stockId: item.StockID ?? null,
        qty: qtyToSubmit,
        reason: form.reason,
        note: form.reason === 'OTHER' ? form.note : '',
      });
      setFormByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      // error handled by parent (toast)
    } finally {
      setSubmittingRowKey(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* การ์ดตารางแบบแจ้งคืนในแถว */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                แจ้งคืนอุปกรณ์ (แบบตาราง)
              </CardTitle>
         
            </div>

          </div>
        </CardHeader>
        <CardContent className="px-4 py-4">
          {loadingWillReturn ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <span className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
              กำลังโหลดรายการ...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              {willReturnItems.length === 0
                ? 'ไม่มีรายการที่ต้องแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน'
                : 'ไม่พบรายการที่ตรงกับคำค้น'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-12 text-center">ลำดับ</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead>ตู้ แผนก</TableHead>
                    <TableHead className="text-center min-w-[140px]">เบิก | ใช้แล้ว | สูงสุดแจ้งได้</TableHead>
                    <TableHead className="w-24 text-center">จำนวน</TableHead>
                    <TableHead className="w-48">สาเหตุ</TableHead>
                    <TableHead className="min-w-[160px]">หมายเหตุ (ถ้าเลือกอื่นๆ)</TableHead>
                    <TableHead className="w-28 text-center">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => {
                    const key = getRowKey(item);
                    const form = getForm(item);
                    const maxQty = item.max_available_qty ?? 0;
                    const isSubmittingRow = submittingRowKey === key;
                    const disabled = isSubmitting || isSubmittingRow || maxQty < 1;

                    return (
                      <TableRow key={key} className="align-middle">
                        <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{item.ItemCode}</code>
                        </TableCell>
                        <TableCell className="min-w-0 max-w-[260px] text-slate-800">
                          <ItemNameWithUnit item={item as unknown as Item} />
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm whitespace-pre-line">
                          แผนก {item.department_name ?? '-'}
                          {'\n'}
                          ตู้ {item.cabinet_code || item.cabinet_name || '-'}
                        </TableCell>
                        <TableCell className="p-2 align-middle text-center">
                          <div className="inline-flex items-center justify-center gap-0 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 shadow-sm">
                            <span className="min-w-[2rem] text-center text-sm font-medium text-slate-700">{item.withdraw_qty ?? 0}</span>
                            <span className="h-4 w-px bg-slate-300" />
                            <span className="min-w-[2rem] text-center text-sm font-medium text-slate-700">{item.used_qty ?? 0}</span>
                            <span className="h-4 w-px bg-slate-300" />
                            <span className="min-w-[2rem] text-center text-sm font-semibold text-emerald-700">{maxQty}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={form.qty}
                            onChange={(e) =>
                              setRowForm(item, {
                                qty: Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)),
                              })
                            }
                            className="h-9 w-full text-center"
                          />
                        </TableCell>
                        <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={form.reason}
                            onValueChange={(v) =>
                              setRowForm(item, {
                                reason: v,
                                ...(v !== 'OTHER' ? { note: '' } : {}),
                              })
                            }
                          >
                            <SelectTrigger className="h-auto min-h-9 w-full min-w-[220px] !w-full max-w-none whitespace-normal border-slate-200 py-2 text-sm [&_[data-slot=select-value]]:line-clamp-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                              <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
                              <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
                              <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
                              <SelectItem value="OTHER">อื่นๆ (ระบุหมายเหตุ เช่น หาย)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={form.reason === 'OTHER' ? form.note : ''}
                            onChange={(e) => setRowForm(item, { note: e.target.value })}
                            placeholder={
                              form.reason === 'OTHER' ? 'เช่น หาย' : 'เลือก "อื่นๆ" เพื่อกรอก'
                            }
                            disabled={form.reason !== 'OTHER'}
                            className="h-9 w-full min-w-[160px] text-sm disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </TableCell>
                        <TableCell className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={disabled}
                            onClick={() => handleSubmitRow(item)}
                          >
                            {isSubmittingRow ? (
                              <>
                                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                กำลังบันทึก...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" />
                                แจ้งคืน
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
