'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Loader2, Package, Plus } from 'lucide-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatClimateRange } from '@/app/admin/management/cabinets/components/cabinetTypes';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
  temp_min?: number | string | null;
  temp_max?: number | string | null;
  hum_min?: number | string | null;
  hum_max?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

interface CabinetsTableProps {
  cabinets: Cabinet[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onEdit: (cabinet: Cabinet) => void;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
}

export default function CabinetsTable({
  cabinets,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onEdit,
  onPageChange,
  onCreateClick,
}: CabinetsTableProps) {
  const getStatusBadge = (status?: string) => {
    const u = (status ?? '').toUpperCase();
    if (u === 'INACTIVE') {
      return <Badge className="bg-slate-500 hover:bg-slate-600">ปิดใช้งาน</Badge>;
    }
    if (u === 'ACTIVE') {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700">ACTIVE</Badge>;
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

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
          <CardTitle>รายการตู้ทั้งหมด ({totalItems})</CardTitle>
          <Button
            type="button"
            onClick={onCreateClick}
            className="shrink-0 gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4" />
            เพิ่มตู้ใหม่
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cabinets.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
          <CardTitle>รายการตู้ทั้งหมด ({totalItems})</CardTitle>
          <Button
            type="button"
            onClick={onCreateClick}
            className="shrink-0 gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4" />
            เพิ่มตู้ใหม่
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลตู้</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <CardTitle>รายการตู้ทั้งหมด ({totalItems})</CardTitle>
        <Button
          type="button"
          onClick={onCreateClick}
          className="shrink-0 gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="h-4 w-4" />
          เพิ่มตู้ใหม่
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ชื่อตู้</TableHead>
                <TableHead>รหัสตู้</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>Stock ID</TableHead>
                <TableHead className="whitespace-nowrap">อุณหภูมิ (°C)</TableHead>
                <TableHead className="whitespace-nowrap">ความชื้น (%)</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cabinets.map((cabinet) => {
                return (
                  <TableRow key={cabinet.id}>
                    <TableCell className="font-medium">{cabinet.id}</TableCell>
                    <TableCell>{cabinet.cabinet_name || '-'}</TableCell>
                    <TableCell>{cabinet.cabinet_code || '-'}</TableCell>
                    <TableCell>{cabinet.cabinet_type || '-'}</TableCell>
                    <TableCell>{cabinet.stock_id || '-'}</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatClimateRange(cabinet.temp_min, cabinet.temp_max)}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatClimateRange(cabinet.hum_min, cabinet.hum_max)}
                    </TableCell>
                    <TableCell>{getStatusBadge(cabinet.cabinet_status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(cabinet)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
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
      </CardContent>
    </Card>
  );
}
