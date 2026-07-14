'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileDown, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import { cn } from '@/lib/utils';
import {
  departmentDispenseApi,
  type DepartmentDispenseDocument,
} from '@/lib/departmentDispenseApi';

const ITEMS_PER_PAGE = 10;

type DepartmentOpt = {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
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

export default function DepartmentDispenseHistoryTab() {
  const [history, setHistory] = useState<DepartmentDispenseDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [rowPdfLoadingId, setRowPdfLoadingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DepartmentDispenseDocument | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await departmentDispenseApi.listDocuments({
        page,
        limit: ITEMS_PER_PAGE,
      });
      if (res.success) {
        setHistory(res.data ?? []);
        setTotal(res.total ?? 0);
        setLastPage(res.lastPage ?? 1);
      }
    } catch {
      toast.error('โหลดประวัติการเบิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setSelectedId(null);
    setDetail(null);
  }, [page]);

  const handleSelectRow = async (doc: DepartmentDispenseDocument) => {
    if (selectedId === doc.id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(doc.id);
    setDetail(null);
    try {
      setDetailLoading(true);
      const res = await departmentDispenseApi.getDocument(doc.id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        toast.error(res.message || 'โหลดรายละเอียดไม่สำเร็จ');
        setSelectedId(null);
      }
    } catch {
      toast.error('โหลดรายละเอียดไม่สำเร็จ');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (history.length === 0) {
      toast.error('ไม่มีเอกสารสำหรับส่งออก');
      return;
    }
    try {
      setExportLoading(format);
      toast.info(`กำลังสร้างไฟล์ ${format.toUpperCase()}...`);
      const params = { page: 1, limit: Math.max(total, ITEMS_PER_PAGE) };
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

  const handleDownloadRowPdf = async (doc: DepartmentDispenseDocument) => {
    try {
      setRowPdfLoadingId(doc.id);
      await departmentDispenseApi.downloadDocumentPdf(doc.id);
      toast.success(`ดาวน์โหลด PDF ${doc.doc_no} สำเร็จ`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ดาวน์โหลด PDF ไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setRowPdfLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>ประวัติการเบิก</CardTitle>
              <CardDescription>
                ตารางเอกสารควบคุมการเบิกที่เคยบันทึกไว้ — คลิกแถวเพื่อดูรายละเอียด
              </CardDescription>
            </div>
            {history.length > 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportLoading !== null || loading}
                  onClick={() => void handleExport('excel')}
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
                  disabled={exportLoading !== null || loading}
                  onClick={() => void handleExport('pdf')}
                >
                  {exportLoading === 'pdf' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => void loadHistory()}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'รีเฟรช'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && total > 0 && (
            <p className="text-sm text-muted-foreground">ทั้งหมด {total.toLocaleString()} เอกสาร</p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีเอกสารการเบิก
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>หน่วยงาน</TableHead>
                    <TableHead className="w-20">รายการ</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead className="w-36 text-right">ดาวน์โหลด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className={cn(
                        'cursor-pointer',
                        selectedId === doc.id && 'bg-amber-50 hover:bg-amber-50',
                      )}
                      onClick={() => void handleSelectRow(doc)}
                    >
                      <TableCell className="font-mono text-xs">{doc.doc_no}</TableCell>
                      <TableCell>
                        {doc.department
                          ? deptLabel(doc.department as DepartmentOpt)
                          : doc.department_id}
                      </TableCell>
                      <TableCell>{doc._count?.lines ?? doc.lines?.length ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatThDate(doc.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={rowPdfLoadingId !== null || exportLoading !== null}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadRowPdf(doc);
                          }}
                        >
                          {rowPdfLoadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && history.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={lastPage}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>

      {(selectedId != null || detailLoading) && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>รายละเอียดเอกสาร</CardTitle>
              <CardDescription>
                {detail
                  ? `เลขที่ ${detail.doc_no}`
                  : detailLoading
                    ? 'กำลังโหลด...'
                    : '—'}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {detail ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={rowPdfLoadingId !== null || exportLoading !== null}
                  onClick={() => void handleDownloadRowPdf(detail)}
                >
                  {rowPdfLoadingId === detail.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setSelectedId(null);
                  setDetail(null);
                }}
              >
                <X className="h-4 w-4" />
                ปิด
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>เลขที่เอกสาร:</strong> {detail.doc_no}
                  </p>
                  <p>
                    <strong>หน่วยงาน:</strong>{' '}
                    {detail.department
                      ? deptLabel(detail.department as DepartmentOpt)
                      : detail.department_id}
                  </p>
                  <p>
                    <strong>วันที่บันทึก:</strong> {formatThDate(detail.created_at)}
                  </p>
                  {detail.remark ? (
                    <p>
                      <strong>หมายเหตุ:</strong> {detail.remark}
                    </p>
                  ) : null}
                  {detail.createdBy ? (
                    <p>
                      <strong>ผู้บันทึก:</strong>{' '}
                      {[detail.createdBy.fname, detail.createdBy.lname].filter(Boolean).join(' ') ||
                        detail.createdBy.email}
                    </p>
                  ) : null}
                </div>

                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>จำนวนเบิก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.lines ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            ไม่มีรายการในเอกสาร
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detail.lines ?? []).map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                            <TableCell>{line.item_name ?? '—'}</TableCell>
                            <TableCell>{line.qty}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
