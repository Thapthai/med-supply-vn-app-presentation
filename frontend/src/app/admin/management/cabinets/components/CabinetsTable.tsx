'use client';

import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit,
  FileSpreadsheet,
  Loader2,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { formatClimateRange, normalizeCabinetType, divisionLinkLabel, type CabinetRow } from './cabinetTypes';

const COLUMN_COUNT = 10;

interface CabinetsTableProps {
  cabinets: CabinetRow[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onEdit: (cabinet: CabinetRow) => void;
  onDelete: (cabinet: CabinetRow) => void;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
  onManageDivisions?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

export default function CabinetsTable({
  cabinets,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onEdit,
  onDelete,
  onPageChange,
  onCreateClick,
  onManageDivisions,
  onExportExcel,
  onExportPdf,
}: CabinetsTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getTypeBadge = (type?: string) => {
    const code = normalizeCabinetType(type);
    if (code === 'RFID') {
      return <Badge className="border-violet-200 bg-violet-100 text-violet-900 hover:bg-violet-100">RFID</Badge>;
    }
    if (code === 'WEIGHING') {
      return <Badge className="border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-100">WEIGHING</Badge>;
    }
    return <span className="text-muted-foreground">{type || '-'}</span>;
  };

  const getStatusBadge = (status?: string) => {
    const u = (status ?? '').toUpperCase();
    if (u === 'INACTIVE') {
      return <Badge className="bg-slate-500 hover:bg-slate-600">ปิดการใช้งาน</Badge>;
    }
    if (u === 'ACTIVE') {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700">เปิดการใช้งาน</Badge>;
    }
    switch (status) {
      case 'AVAILIABLE':
        return <Badge className="bg-green-500 hover:bg-green-600">ใช้งานได้</Badge>;
      case 'USED':
        return <Badge className="bg-blue-500 hover:bg-blue-600">ใช้งานอยู่</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">ซ่อมบำรุง</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <CardTitle>รายการตู้ทั้งหมด ({totalItems})</CardTitle>
        <div className="flex flex-wrap justify-end gap-2">
          {onManageDivisions ? (
            <Button type="button" variant="outline" className="gap-2" onClick={onManageDivisions}>
              <Building2 className="h-4 w-4" />
              จัดการ Division
            </Button>
          ) : null}
          {onExportExcel ? (
            <Button type="button" variant="outline" className="gap-2" onClick={onExportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          ) : null}
          {onExportPdf ? (
            <Button type="button" variant="outline" className="gap-2" onClick={onExportPdf}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onCreateClick}
            className="shrink-0 gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4" />
            เพิ่มตู้ใหม่
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : cabinets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลตู้</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>ชื่อตู้</TableHead>
                    <TableHead>รหัสตู้</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>IP เครื่อง</TableHead>
                    <TableHead className="whitespace-nowrap">อุณหภูมิ (°C)</TableHead>
                    <TableHead className="whitespace-nowrap">ความชื้น (%)</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cabinets.map((cabinet) => {
                    const links = cabinet.cabinetDepartments ?? [];
                    const expanded = expandedId === cabinet.id;
                    return (
                      <Fragment key={cabinet.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => setExpandedId(expanded ? null : cabinet.id)}
                        >
                          <TableCell className="w-10">
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{cabinet.cabinet_name || '-'}</TableCell>
                          <TableCell>{cabinet.cabinet_code || '-'}</TableCell>
                          <TableCell>{getTypeBadge(cabinet.cabinet_type)}</TableCell>
                          <TableCell>
                            {links.length === 0 ? (
                              <span className="text-xs text-muted-foreground">ยังไม่เชื่อมโยง</span>
                            ) : (
                              <div className="flex max-w-[220px] flex-wrap gap-1">
                                {links.map((link) => (
                                  <Badge
                                    key={link.id}
                                    variant="outline"
                                    className={
                                      (link.status ?? '').toUpperCase() === 'ACTIVE'
                                        ? 'border-cyan-200 bg-cyan-50 text-cyan-900'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }
                                  >
                                    {divisionLinkLabel(link)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{cabinet.machine_ip || '-'}</TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatClimateRange(cabinet.temp_min, cabinet.temp_max)}
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatClimateRange(cabinet.hum_min, cabinet.hum_max)}
                          </TableCell>
                          <TableCell>{getStatusBadge(cabinet.cabinet_status)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => onEdit(cabinet)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => onDelete(cabinet)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded ? (
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableCell colSpan={COLUMN_COUNT} className="p-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-800">
                                    Division ที่เชื่อมกับ {cabinet.cabinet_name || cabinet.cabinet_code || `ตู้ #${cabinet.id}`}
                                  </p>
                                  <Button size="sm" variant="outline" onClick={() => onEdit(cabinet)}>
                                    แก้ไขการเชื่อมโยง
                                  </Button>
                                </div>
                                {links.length === 0 ? (
                                  <p className="text-sm text-slate-500">ยังไม่มี Division บนตู้นี้ — กดแก้ไขตู้เพื่อเลือกแผนก</p>
                                ) : (
                                  <div className="space-y-2">
                                    {links.map((link) => (
                                      <div
                                        key={link.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-slate-900">{divisionLinkLabel(link)}</p>
                                          {link.description ? (
                                            <p className="text-xs text-slate-500">{link.description}</p>
                                          ) : null}
                                        </div>
                                        {getStatusBadge(link.status)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} จาก{' '}
                  {totalItems} รายการ
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    หน้า {currentPage} จาก {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
