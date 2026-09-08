'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Loader2, Package, Plus } from 'lucide-react';
import { normalizeCabinetType } from './cabinetTypes';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
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
  onDelete: (cabinet: Cabinet) => void;
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
  onDelete,
  onPageChange,
  onCreateClick,
}: CabinetsTableProps) {
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
                <TableHead>ID</TableHead>
                <TableHead>ชื่อตู้</TableHead>
                <TableHead>รหัสตู้</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>Stock ID</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cabinets.map((cabinet) => (
                <TableRow key={cabinet.id}>
                  <TableCell className="font-medium">{cabinet.id}</TableCell>
                  <TableCell>{cabinet.cabinet_name || '-'}</TableCell>
                  <TableCell>{cabinet.cabinet_code || '-'}</TableCell>
                  <TableCell>{getTypeBadge(cabinet.cabinet_type)}</TableCell>
                  <TableCell>{cabinet.stock_id || '-'}</TableCell>
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
              ))}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
