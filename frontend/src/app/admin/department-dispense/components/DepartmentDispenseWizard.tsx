'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, Download, Loader2, Printer, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  type DepartmentDispenseLocation,
} from '@/lib/departmentDispenseApi';

type DepartmentOpt = {
  ID: number;
  DepName?: string;
  DepName2?: string;
  RefDepID?: string;
};

type SelectedLine = {
  itemcode: string;
  itemname?: string | null;
  qty: number;
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
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<DepartmentDispenseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [locations, setLocations] = useState<DepartmentDispenseLocation[]>([]);
  const [missingLocationCodes, setMissingLocationCodes] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastDoc, setLastDoc] = useState<DepartmentDispenseDocument | null>(null);
  const [history, setHistory] = useState<DepartmentDispenseDocument[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const prevDepartmentIdRef = useRef('');

  const selectedDept = useMemo(
    () => departments.find((d) => String(d.ID) === departmentId) ?? null,
    [departments, departmentId],
  );

  const selectedCodesKey = useMemo(
    () => selected.map((s) => s.itemcode).sort().join(','),
    [selected],
  );

  const locationLines = useMemo(
    () =>
      locations.map((loc) => {
        const sel = selected.find((s) => s.itemcode === loc.itemcode);
        return {
          ...loc,
          dispense_qty: sel?.qty ?? 1,
          itemname: sel?.itemname ?? loc.itemname,
        };
      }),
    [locations, selected],
  );

  const loadDepartments = useCallback(async (kw?: string) => {
    try {
      setLoadingDepartments(true);
      const res = await departmentApi.getAll({ limit: 80, keyword: kw, withCabinet: true });
      if (res.success && res.data) setDepartments(res.data as DepartmentOpt[]);
    } catch {
      toast.error('โหลดหน่วยงานไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await departmentDispenseApi.listDocuments({ page: 1, limit: 10 });
      if (res.success) setHistory(res.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!departmentId) {
      setItems([]);
      return;
    }
    try {
      setLoadingItems(true);
      const res = await departmentDispenseApi.listDepartmentItems(Number(departmentId), keyword);
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
  }, [departmentId, keyword]);

  const loadLocations = useCallback(
    async (codes: string[], deptId: string) => {
      if (codes.length === 0 || !deptId) {
        setLocations([]);
        setMissingLocationCodes([]);
        return;
      }
      try {
        setLoadingLocations(true);
        const res = await departmentDispenseApi.resolveItemLocations(codes, Number(deptId));
        if (res.success && res.data) {
          setLocations(res.data);
          setMissingLocationCodes(res.missing_itemcodes ?? []);
        } else {
          toast.error('โหลดตำแหน่งไม่สำเร็จ');
        }
      } catch {
        toast.error('โหลดตำแหน่งไม่สำเร็จ');
      } finally {
        setLoadingLocations(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDepartments();
    void loadHistory();
  }, [loadDepartments, loadHistory]);

  useEffect(() => {
    if (departmentId !== prevDepartmentIdRef.current) {
      setSelected([]);
      setLocations([]);
      setMissingLocationCodes([]);
      prevDepartmentIdRef.current = departmentId;
    }
    if (!departmentId) {
      setItems([]);
      return;
    }
    const timer = setTimeout(() => void loadItems(), 300);
    return () => clearTimeout(timer);
  }, [departmentId, keyword, loadItems]);

  useEffect(() => {
    const codes = selectedCodesKey ? selectedCodesKey.split(',') : [];
    const timer = setTimeout(() => void loadLocations(codes, departmentId), 200);
    return () => clearTimeout(timer);
  }, [selectedCodesKey, departmentId, loadLocations]);

  const toggleItem = (item: DepartmentDispenseItem, checked: boolean) => {
    setSelected((prev) => {
      if (!checked) return prev.filter((l) => l.itemcode !== item.itemcode);
      if (prev.some((l) => l.itemcode === item.itemcode)) return prev;
      return [...prev, { itemcode: item.itemcode, itemname: item.itemname, qty: 1 }];
    });
  };

  const setQty = (itemcode: string, qty: number) => {
    setSelected((prev) =>
      prev.map((l) => (l.itemcode === itemcode ? { ...l, qty: Math.max(1, qty) } : l)),
    );
  };

  const handleSubmit = async () => {
    if (!departmentId || selected.length === 0) return;
    if (locationLines.length === 0) {
      toast.error('ไม่พบตำแหน่ง — กรุณาตั้งค่าที่เมนูตำแหน่งจัดเก็บอุปกรณ์');
      return;
    }
    try {
      setSubmitting(true);
      const res = await departmentDispenseApi.createDocument({
        department_id: Number(departmentId),
        remark: remark.trim() || undefined,
        lines: selected.map((s) => ({ itemcode: s.itemcode, qty: s.qty })),
      });
      if (res.success && res.data) {
        setLastDoc(res.data);
        toast.success(`บันทึกเอกสาร ${res.data.doc_no} สำเร็จ`);
        void loadHistory();
        setDepartmentId('');
        setSelected([]);
        setItems([]);
        setLocations([]);
        setMissingLocationCodes([]);
        setRemark('');
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

  const handlePrint = () => {
    window.print();
  };

  const resetWizard = () => {
    setDepartmentId('');
    setKeyword('');
    setItems([]);
    setSelected([]);
    setLocations([]);
    setMissingLocationCodes([]);
    setRemark('');
    setLastDoc(null);
  };

  const handleExportHistory = async (format: 'excel' | 'pdf') => {
    if (history.length === 0) {
      toast.error('ไม่มีเอกสารสำหรับส่งออก');
      return;
    }
    try {
      setExportLoading(format);
      toast.info(`กำลังสร้างไฟล์ ${format.toUpperCase()}...`);
      const params = { page: 1, limit: 10 };
      if (format === 'excel') {
        await departmentDispenseApi.downloadDocumentsExcel(params);
      } else {
        await departmentDispenseApi.downloadDocumentsPdf(params);
      }
      toast.success(`ดาวน์โหลด ${format.toUpperCase()} สำเร็จ`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ส่งออกไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setExportLoading(null);
    }
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

      <div className="flex justify-end print:hidden">
        <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={resetWizard}>
          <RotateCcw className="h-4 w-4" />
          เริ่มใหม่
        </Button>
      </div>

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
                <TableHead>Row</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>Shelf</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lastDoc.lines ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                  <TableCell>{line.item_name ?? '—'}</TableCell>
                  <TableCell>{line.qty}</TableCell>
                  <TableCell>{line.location_row ?? '—'}</TableCell>
                  <TableCell>{line.location_rack ?? '—'}</TableCell>
                  <TableCell>{line.location_shelf ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>เบิกอุปกรณ์ให้หน่วยงาน</CardTitle>
          <CardDescription>
            เลือกหน่วยงาน → เลือกรายการเบิก → ตำแหน่งแสดงอัตโนมัติ → บันทึกเอกสารควบคุมการเบิก
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-slate-100 px-3 py-1">1. เลือกหน่วยงาน</span>
            <ChevronRight className="h-4 w-4" />
            <span className="rounded-full bg-slate-100 px-3 py-1">2. เลือกรายการเบิก</span>
            <ChevronRight className="h-4 w-4" />
            <span className="rounded-full bg-slate-100 px-3 py-1">3. ตำแหน่ง + บันทึกเอกสาร</span>
          </div>

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

          {departmentId && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Input
                  placeholder="ค้นหารหัส / ชื่อ Item"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="max-w-xs"
                />
                {selectedDept && (
                  <span className="text-sm text-muted-foreground">
                    หน่วยงาน: <strong>{deptLabel(selectedDept)}</strong>
                  </span>
                )}
              </div>

              {loadingItems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : items.length === 0 ? (
                <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                  ไม่มีรายการ — ตรวจสอบว่า Item ผูกกับหน่วยงานนี้แล้ว
                </p>
              ) : (
                <div className="max-h-[360px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">เลือก</TableHead>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่ออุปกรณ์</TableHead>
                        <TableHead className="w-24">จำนวน</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const line = selected.find((s) => s.itemcode === item.itemcode);
                        const checked = !!line;
                        return (
                          <TableRow key={item.itemcode}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => toggleItem(item, v === true)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.itemcode}</TableCell>
                            <TableCell>{item.itemname ?? '—'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                className="h-8 w-20"
                                disabled={!checked}
                                value={line?.qty ?? 1}
                                onChange={(e) => setQty(item.itemcode, parseInt(e.target.value, 10) || 1)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selected.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium">ตำแหน่งรายการที่เลือก (Row / Rack / Shelf)</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        จากเมนูตำแหน่งจัดเก็บอุปกรณ์ (app_item_storage_locations)
                      </p>
                    </div>
                    {loadingLocations && (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>

                  {missingLocationCodes.length > 0 && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      รายการต่อไปนี้ยังไม่มีตำแหน่ง — ตั้งค่าที่เมนูตำแหน่งจัดเก็บอุปกรณ์:{' '}
                      <span className="font-mono">{missingLocationCodes.join(', ')}</span>
                    </p>
                  )}

                  {loadingLocations ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : locationLines.length === 0 ? (
                    <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                      ไม่พบตำแหน่ง — ตั้งค่า Row/Rack/Shelf ที่เมนูตำแหน่งจัดเก็บอุปกรณ์ก่อน
                    </p>
                  ) : (
                    <div className="overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>รหัส</TableHead>
                            <TableHead>ชื่อ</TableHead>
                            <TableHead className="w-20">จำนวนเบิก</TableHead>
                            <TableHead>Row</TableHead>
                            <TableHead>Rack</TableHead>
                            <TableHead>Shelf</TableHead>
                            <TableHead>ตู้</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {locationLines.map((line) => (
                            <TableRow key={line.itemcode}>
                              <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                              <TableCell>{line.itemname ?? '—'}</TableCell>
                              <TableCell>{line.dispense_qty}</TableCell>
                              <TableCell>{line.location_row ?? '—'}</TableCell>
                              <TableCell>{line.location_rack ?? '—'}</TableCell>
                              <TableCell>{line.location_shelf ?? '—'}</TableCell>
                              <TableCell className="text-xs">
                                {line.cabinet_name ?? line.cabinet_code ?? '—'}
                                {line.stock_id != null ? (
                                  <span className="text-muted-foreground"> ({line.stock_id})</span>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
                    <Textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="บันทึกเพิ่มเติมในเอกสารควบคุมการเบิก"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={submitting || loadingLocations || locationLines.length === 0}
                      onClick={() => void handleSubmit()}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังบันทึก…
                        </>
                      ) : (
                        'บันทึกเอกสารควบคุมการเบิก'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">เอกสารควบคุมการเบิกล่าสุด</CardTitle>
              <CardDescription>รายการที่บันทึกในระบบ</CardDescription>
            </div>
            {history.length > 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportLoading !== null}
                  onClick={() => void handleExportHistory('excel')}
                >
                  {exportLoading === 'excel' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportLoading !== null}
                  onClick={() => void handleExportHistory('pdf')}
                >
                  {exportLoading === 'pdf' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">ยังไม่มีเอกสาร</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>หน่วยงาน</TableHead>
                    <TableHead className="w-20">รายการ</TableHead>
                    <TableHead>วันที่</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">{doc.doc_no}</TableCell>
                      <TableCell>
                        {doc.department
                          ? deptLabel(doc.department as DepartmentOpt)
                          : doc.department_id}
                      </TableCell>
                      <TableCell>{doc._count?.lines ?? doc.lines?.length ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatThDate(doc.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
