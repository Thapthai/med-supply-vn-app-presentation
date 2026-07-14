'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  cabinetSlotLocationApi,
  type ItemStorageLocationRow,
} from '@/lib/cabinetSlotLocationApi';
import StorageLocationSearchCard from './StorageLocationSearchCard';

const ITEMS_PER_PAGE = 10;

export default function MappedStorageLocationsTab() {
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [items, setItems] = useState<ItemStorageLocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const loadMapped = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cabinetSlotLocationApi.listMapped({
        keyword: appliedKeyword || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setLastPage(res.data.lastPage);
      } else {
        toast.error('โหลดรายการที่ mapping ไม่สำเร็จ');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'โหลดรายการที่ mapping ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page]);

  useEffect(() => {
    void loadMapped();
  }, [loadMapped]);

  const handleSearch = (keyword: string) => {
    setPage(1);
    setAppliedKeyword(keyword);
  };

  const handleReset = () => {
    setPage(1);
    setAppliedKeyword('');
  };

  return (
    <div className="space-y-4">
      <StorageLocationSearchCard
        description="ค้นจากรหัส/ชื่อ Item ที่ mapping ตำแหน่งแล้ว แล้วกดค้นหา"
        loading={loading}
        onSearch={handleSearch}
        onReset={handleReset}
        onRefresh={() => void loadMapped()}
      />

      <Card>
        <CardHeader>
          <CardTitle>ตำแหน่งที่ mapping แล้ว</CardTitle>
          <CardDescription>ดูรายการ Item ที่มีการตั้งค่าตำแหน่งจัดเก็บเรียบร้อย</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && total > 0 && (
            <p className="text-sm text-muted-foreground">ทั้งหมด {total.toLocaleString()} รายการ</p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              {appliedKeyword
                ? 'ไม่พบรายการตามคำค้นหา'
                : 'ยังไม่มีรายการที่ mapping ตำแหน่ง'}
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส Item</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead>Shelf</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={
                        item.location_id ??
                        `${item.itemcode}-${item.location_row}-${item.location_rack}-${item.location_shelf}`
                      }
                      className="bg-green-50/40"
                    >
                      <TableCell className="font-mono text-xs">{item.itemcode}</TableCell>
                      <TableCell>{item.itemname ?? '—'}</TableCell>
                      <TableCell>{item.qty ?? '—'}</TableCell>
                      <TableCell>{item.location_row ?? '—'}</TableCell>
                      <TableCell>{item.location_rack ?? '—'}</TableCell>
                      <TableCell>{item.location_shelf ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && items.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={lastPage}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
