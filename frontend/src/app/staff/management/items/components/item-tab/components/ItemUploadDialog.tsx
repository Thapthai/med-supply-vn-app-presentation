'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import type { ItemMasterUploadResult } from '@/types/item';

interface ItemUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ItemUploadDialog({ open, onOpenChange, onSuccess }: ItemUploadDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ItemMasterUploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await staffItemsApi.downloadUploadTemplate();
      toast.success('ดาวน์โหลด template สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลด template ไม่สำเร็จ');
    } finally {
      setDownloading(false);
    }
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('กรุณาเลือกไฟล์ Excel ก่อน');
      return;
    }
    try {
      setUploading(true);
      const res = await staffItemsApi.bulkUpload(file);
      const data = res?.data;
      if (!res?.success || !data) {
        toast.error((res as { error?: string })?.error || res?.message || 'อัปโหลดไม่สำเร็จ');
        return;
      }
      setResult(data);
      const changed = data.created + data.updated;
      if (changed > 0) {
        toast.success(`บันทึกสำเร็จ — เพิ่ม ${data.created} / อัปเดต ${data.updated} รายการ`);
        onSuccess();
      }
      if (changed === 0 && data.failed > 0) {
        toast.error('ไม่สามารถบันทึกรายการได้ — ตรวจสอบข้อผิดพลาดด้านล่าง');
      }
    } catch (e) {
      console.error(e);
      toast.error('อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose} modal={false}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>อัปโหลด Item Master จาก Excel</DialogTitle>
          <DialogDescription>
            ดาวน์โหลด template กรอกข้อมูล แล้วอัปโหลดเพื่อเพิ่มหลายรายการพร้อมกัน
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
          {/* ขั้นตอนที่ 1: ดาวน์โหลด template */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">1. ดาวน์โหลด Template</p>
            <p className="mt-0.5 text-xs text-slate-500">
              ไฟล์มี dropdown หน่วย/แผนกตามข้อมูลล่าสุดในระบบ และคำแนะนำการกรอก
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 gap-2"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              ดาวน์โหลด Template (.xlsx)
            </Button>
          </div>

          {/* ขั้นตอนที่ 2: เลือกไฟล์ + อัปโหลด */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">2. เลือกไฟล์ที่กรอกแล้ว</p>
            <p className="mt-0.5 text-xs text-slate-500">รองรับไฟล์ .xlsx / .xls — รหัสที่มีอยู่แล้วจะอัปเดต ไม่มีจะเพิ่มใหม่</p>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handlePick}
              className="hidden"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => inputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4" />
                เลือกไฟล์
              </Button>
              {file ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                  {file.name}
                  <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <span className="text-xs text-slate-400">ยังไม่ได้เลือกไฟล์</span>
              )}
            </div>
          </div>

          {/* ผลลัพธ์ */}
          {result ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">ผลการอัปโหลด</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 font-medium text-green-800">
                  <CheckCircle2 className="h-3.5 w-3.5" /> เพิ่มใหม่ {result.created}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-medium text-blue-800">
                  <CheckCircle2 className="h-3.5 w-3.5" /> อัปเดต {result.updated}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-medium text-red-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> ล้มเหลว {result.failed}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-slate-600">
                  ทั้งหมด {result.total}
                </span>
              </div>
              {result.errors.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">แถว</th>
                        <th className="px-2 py-1.5 font-medium">รหัส Item</th>
                        <th className="px-2 py-1.5 font-medium">ข้อผิดพลาด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={`${err.row}-${i}`} className="border-t border-slate-100">
                          <td className="px-2 py-1.5 text-slate-500">{err.row}</td>
                          <td className="px-2 py-1.5 font-mono text-slate-700">{err.itemcode || '—'}</td>
                          <td className="px-2 py-1.5 text-red-700">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-2 shrink-0 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
            ปิด
          </Button>
          <Button type="button" className={cn('gap-2')} onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
