'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Printer, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import { departmentApi } from '@/lib/api';
import {
  departmentDispenseApi,
  type DepartmentDispenseDocument,
  type DepartmentDispenseItem,
} from '@/lib/departmentDispenseApi';

type DepartmentOpt = {
  ID: number;
  DepName?: string;
  DepName2?: string;
  RefDepID?: string;
};

type SelectedItem = {
  itemcode: string;
  itemname?: string | null;
  /** อนุญาต '' ตอนกำลังล้างค่าในช่องกรอก */
  qty: number | '';
};

function deptLabel(d: DepartmentOpt): string {
  const name = (d.DepName ?? d.DepName2 ?? '').trim() || String(d.ID);
  const ref = d.RefDepID?.trim();
  return ref ? `${name} (${ref})` : name;
}

function formatThDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return iso;
  }
}

export default function DepartmentDispenseWizard() {
  const [departments, setDepartments] = useState<DepartmentOpt[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [items, setItems] = useState<DepartmentDispenseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastDoc, setLastDoc] = useState<DepartmentDispenseDocument | null>(null);
  const prevDepartmentIdRef = useRef('');

  const selectedDept = useMemo(
    () => departments.find((d) => String(d.ID) === departmentId) ?? null,
    [departments, departmentId],
  );

  const selectedByCode = useMemo(() => {
    const map = new Map<string, SelectedItem>();
    for (const s of selected) map.set(s.itemcode, s);
    return map;
  }, [selected]);

  const canSubmit = useMemo(
    () =>
      !!departmentId &&
      selected.some((s) => typeof s.qty === 'number' && s.qty > 0),
    [departmentId, selected],
  );

  const loadDepartments = useCallback(async (kw?: string) => {
    try {
      setLoadingDepartments(true);
      const res = await departmentApi.getAll({ limit: 80, keyword: kw });
      if (res.success && res.data) setDepartments(res.data as DepartmentOpt[]);
    } catch {
      toast.error('โหลดหน่วยงานไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!departmentId) {
      setItems([]);
      return;
    }
    try {
      setLoadingItems(true);
      const res = await departmentDispenseApi.listDepartmentItems(
        Number(departmentId),
        appliedKeyword || undefined,
      );
      if (res.success && res.data) {
        setItems(res.data.items);
      } else {
        toast.error('โหลดรายการไม่สำเร็จ');
      }
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
    } finally {
      setLoadingItems(false);
    }
  }, [departmentId, appliedKeyword]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (departmentId !== prevDepartmentIdRef.current) {
      setSelected([]);
      setKeywordInput('');
      setAppliedKeyword('');
      prevDepartmentIdRef.current = departmentId;
    }
    if (!departmentId) {
      setItems([]);
      return;
    }
    void loadItems();
  }, [departmentId, appliedKeyword, loadItems]);

  const upsertSelectedQty = (
    item: Pick<DepartmentDispenseItem, 'itemcode' | 'itemname'>,
    qty: number | '',
  ) => {
    setSelected((prev) => {
      const numericZero = typeof qty === 'number' && qty <= 0;
      if (qty === '' || numericZero) {
        return prev.filter((l) => l.itemcode !== item.itemcode);
      }
      const exists = prev.some((l) => l.itemcode === item.itemcode);
      if (!exists) {
        return [...prev, { itemcode: item.itemcode, itemname: item.itemname, qty }];
      }
      return prev.map((l) => (l.itemcode === item.itemcode ? { ...l, qty } : l));
    });
  };

  const setSelectedQty = (itemcode: string, qty: number | '') => {
    setSelected((prev) =>
      prev.map((l) => {
        if (l.itemcode !== itemcode) return l;
        if (qty === '') return { ...l, qty: '' };
        const n = Math.trunc(Number(qty));
        return { ...l, qty: Number.isFinite(n) && n >= 0 ? n : '' };
      }),
    );
  };

  const removeSelected = (itemcode: string) => {
    setSelected((prev) => prev.filter((l) => l.itemcode !== itemcode));
  };

  const clearSelected = () => {
    setSelected([]);
    setRemark('');
  };

  const handleSubmit = async () => {
    if (!departmentId) return;
    const lines = selected
      .filter((s) => typeof s.qty === 'number' && s.qty > 0)
      .map((s) => ({
        itemcode: s.itemcode,
        qty: s.qty as number,
      }));

    if (lines.length === 0) {
      toast.error('กรุณาเลือกรายการและระบุจำนวนเบิกอย่างน้อย 1');
      return;
    }

    try {
      setSubmitting(true);
      const res = await departmentDispenseApi.createDocument({
        department_id: Number(departmentId),
        remark: remark.trim() || undefined,
        lines,
      });
      if (res.success && res.data) {
        setLastDoc(res.data);
        toast.success(`บันทึกเอกสาร ${res.data.doc_no} สำเร็จ`);
        setDepartmentId('');
        setSelected([]);
        setItems([]);
        setRemark('');
        setKeywordInput('');
        setAppliedKeyword('');
      } else {
        toast.error(res.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => window.print();

  const resetWizard = () => {
    setDepartmentId('');
    setKeywordInput('');
    setAppliedKeyword('');
    setItems([]);
    setSelected([]);
    setRemark('');
    setLastDoc(null);
  };

  const parseQtyInput = (raw: string): number | '' => {
    if (raw === '') return '';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : '';
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #dispense-print-area,
          #dispense-print-area * {
            visibility: visible;
          }
          #dispense-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {lastDoc && (
        <div className="print:hidden flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
            <span>
              บันทึกเอกสารควบคุมการเบิก <strong>{lastDoc.doc_no}</strong> แล้ว (
              {lastDoc.lines?.length ?? 0} รายการ)
            </span>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              พิมพ์เอกสาร
            </Button>
          </div>
        </div>
      )}

      {lastDoc && (
        <div id="dispense-print-area" className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">เอกสารควบคุมการเบิกอุปกรณ์ให้หน่วยงาน</h2>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <strong>เลขที่เอกสาร:</strong> {lastDoc.doc_no}
            </p>
            <p>
              <strong>หน่วยงาน:</strong>{' '}
              {lastDoc.department ? deptLabel(lastDoc.department as DepartmentOpt) : lastDoc.department_id}
            </p>
            <p>
              <strong>วันที่บันทึก:</strong> {formatThDate(lastDoc.created_at)}
            </p>
            {lastDoc.remark && (
              <p>
                <strong>หมายเหตุ:</strong> {lastDoc.remark}
              </p>
            )}
          </div>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>จำนวนเบิก</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lastDoc.lines ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                  <TableCell>{line.item_name ?? '—'}</TableCell>
                  <TableCell>{line.qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card className="print:hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>เบิกอุปกรณ์ให้หน่วยงาน</CardTitle>
            <CardDescription>
              เลือกหน่วยงาน → ค้นหา/ใส่จำนวนฝั่งซ้าย → ตรวจรายการที่เลือกฝั่งขวา → ส่งข้อมูล
            </CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1" onClick={resetWizard}>
            <RotateCcw className="h-4 w-4" />
            เริ่มใหม่
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchableSelect
            label="หน่วยงาน (Division)"
            placeholder="เลือกหน่วยงาน"
            value={departmentId}
            onValueChange={setDepartmentId}
            options={departments.map((d) => ({
              value: String(d.ID),
              label: deptLabel(d),
            }))}
            loading={loadingDepartments}
            onSearch={(kw) => void loadDepartments(kw)}
            searchPlaceholder="ค้นหาชื่อหน่วยงาน..."
          />

          {!departmentId ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              เลือกหน่วยงานเพื่อเริ่มบันทึกการเบิก
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Left: catalog */}
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">รายการอุปกรณ์</h3>
                  {selectedDept && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      หน่วยงาน: <strong>{deptLabel(selectedDept)}</strong>
                      {' · '}แสดงรายการที่ mapping ตำแหน่งแล้ว
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="ค้นหาจากชื่ออุปกรณ์ หรือ รหัสอุปกรณ์"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setAppliedKeyword(keywordInput.trim());
                        }
                      }}
                      className="h-10 bg-white pl-9 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1"
                      disabled={loadingItems}
                      onClick={() => setAppliedKeyword(keywordInput.trim())}
                    >
                      <Search className="h-4 w-4" />
                      ค้นหา
                    </Button>
                    {appliedKeyword ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                          คำค้น: {appliedKeyword}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-slate-600"
                          disabled={loadingItems}
                          onClick={() => {
                            setKeywordInput('');
                            setAppliedKeyword('');
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          ล้าง
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {loadingItems ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                    ไม่มีรายการที่ mapping แล้ว — ตั้งค่าตำแหน่งที่เมนูตำแหน่งจัดเก็บอุปกรณ์ก่อน
                  </p>
                ) : (
                  <div className="max-h-[480px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ItemCode</TableHead>
                          <TableHead>ItemName</TableHead>
                          <TableHead className="w-24">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const line = selectedByCode.get(item.itemcode);
                          return (
                            <TableRow key={item.itemcode}>
                              <TableCell className="font-mono text-xs">{item.itemcode}</TableCell>
                              <TableCell>{item.itemname ?? '—'}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-20"
                                  value={line ? line.qty : 0}
                                  onChange={(e) => {
                                    const qty = parseQtyInput(e.target.value);
                                    upsertSelectedQty(item, qty === '' ? 0 : qty);
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Right: selected basket */}
              <div className="flex flex-col space-y-3 rounded-lg border p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">รายการที่เลือก</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selected.length > 0
                      ? `${selected.length} รายการ`
                      : 'ใส่จำนวน Qty ฝั่งซ้ายเพื่อเพิ่มรายการ'}
                  </p>
                </div>

                <div className="min-h-[200px] flex-1">
                  {selected.length === 0 ? (
                    <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                      ยังไม่มีรายการที่เลือก
                    </p>
                  ) : (
                    <div className="max-h-[480px] overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ItemCode</TableHead>
                            <TableHead>ItemName</TableHead>
                            <TableHead className="w-24">Qty</TableHead>
                            <TableHead className="w-16 text-right">ลบ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.map((line) => (
                            <TableRow key={line.itemcode}>
                              <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                              <TableCell>{line.itemname ?? '—'}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-20"
                                  value={line.qty}
                                  onChange={(e) =>
                                    setSelectedQty(line.itemcode, parseQtyInput(e.target.value))
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2 text-red-600 hover:text-red-700"
                                  onClick={() => removeSelected(line.itemcode)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  ลบ
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {selected.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
                    <Textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="บันทึกเพิ่มเติมในเอกสารควบคุมการเบิก"
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    disabled={selected.length === 0 && !remark}
                    onClick={clearSelected}
                  >
                    ยกเลิกข้อมูล
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting || !canSubmit}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังบันทึก…
                      </>
                    ) : (
                      'ส่งข้อมูล'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
