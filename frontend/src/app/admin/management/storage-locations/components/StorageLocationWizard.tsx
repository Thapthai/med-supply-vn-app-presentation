'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
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
import Pagination from '@/components/Pagination';
import {
  cabinetSlotLocationApi,
  type ItemStorageLocationRow,
} from '@/lib/cabinetSlotLocationApi';
import StorageLocationSearchCard from './StorageLocationSearchCard';

const ITEMS_PER_PAGE = 10;

type MappingDraft = {
  location_row: string;
  location_rack: string;
  location_shelf: string;
  qty: string;
};

const EMPTY_DRAFT: MappingDraft = {
  location_row: '',
  location_rack: '',
  location_shelf: '',
  qty: '',
};

function itemKey(item: Pick<ItemStorageLocationRow, 'itemcode'>) {
  return item.itemcode;
}

function parseQty(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

function isDraftFilled(draft: MappingDraft): boolean {
  return !!(
    draft.location_row.trim() ||
    draft.location_rack.trim() ||
    draft.location_shelf.trim() ||
    draft.qty.trim()
  );
}

export default function StorageLocationWizard() {
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [items, setItems] = useState<ItemStorageLocationRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, MappingDraft>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const pageKeys = useMemo(() => items.map((item) => itemKey(item)), [items]);

  const allPageSelected = useMemo(
    () => pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.has(key)),
    [pageKeys, selectedKeys],
  );

  const filledSelectedCount = useMemo(() => {
    let n = 0;
    for (const key of selectedKeys) {
      const draft = drafts[key];
      if (draft && isDraftFilled(draft)) n += 1;
    }
    return n;
  }, [selectedKeys, drafts]);

  const loadItems = useCallback(async () => {
    try {
      setLoadingItems(true);
      const res = await cabinetSlotLocationApi.listItems({
        keyword: appliedKeyword || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setLastPage(res.data.lastPage);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const item of res.data!.items) {
            const key = itemKey(item);
            if (!next[key]) next[key] = { ...EMPTY_DRAFT };
          }
          return next;
        });
      } else {
        toast.error('โหลดรายการไม่สำเร็จ');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'โหลดรายการไม่สำเร็จ');
    } finally {
      setLoadingItems(false);
    }
  }, [appliedKeyword, page]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleSearch = (keyword: string) => {
    setPage(1);
    setDrafts({});
    setSelectedKeys(new Set());
    setAppliedKeyword(keyword);
  };

  const handleReset = () => {
    setPage(1);
    setDrafts({});
    setSelectedKeys(new Set());
    setAppliedKeyword('');
  };

  const toggleItem = (item: ItemStorageLocationRow, checked: boolean) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of pageKeys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const updateDraft = (key: string, field: keyof MappingDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { ...EMPTY_DRAFT }),
        [field]: value,
      },
    }));
  };

  const saveItems = async (keysToSave: string[]) => {
    if (keysToSave.length === 0) {
      toast.error('ไม่มีรายการที่จะบันทึก');
      return;
    }
    const locations = keysToSave
      .map((key) => {
        const draft = drafts[key] ?? EMPTY_DRAFT;
        if (!isDraftFilled(draft)) return null;
        return {
          itemcode: key,
          location_row: draft.location_row.trim() || null,
          location_rack: draft.location_rack.trim() || null,
          location_shelf: draft.location_shelf.trim() || null,
          qty: parseQty(draft.qty),
        };
      })
      .filter(Boolean);

    if (locations.length === 0) {
      toast.error('กรุณาระบุ Qty หรือ Row / Rack / Shelf ก่อนบันทึก');
      return;
    }

    try {
      setSaving(true);
      const res = await cabinetSlotLocationApi.bulkUpsert({
        locations: locations as NonNullable<(typeof locations)[number]>[],
      });
      if (res.success) {
        toast.success(`บันทึกตำแหน่ง ${res.count ?? locations.length} รายการสำเร็จ`);
        const savedKeys = new Set(
          (locations as NonNullable<(typeof locations)[number]>[]).map((l) => l.itemcode),
        );
        setDrafts((prev) => {
          const next = { ...prev };
          for (const key of savedKeys) next[key] = { ...EMPTY_DRAFT };
          return next;
        });
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          for (const key of savedKeys) next.delete(key);
          return next;
        });
        void loadItems();
      } else {
        toast.error('บันทึกไม่สำเร็จ');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSelected = () => {
    const keys = [...selectedKeys];
    if (keys.length === 0) {
      toast.error('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
      return;
    }
    void saveItems(keys);
  };

  return (
    <div className="space-y-4">
      <StorageLocationSearchCard
        description="ค้นจากรหัส/ชื่อ Item แล้วกดค้นหา เพื่อตั้งค่าตำแหน่ง"
        loading={loadingItems}
        onSearch={handleSearch}
        onReset={handleReset}
        onRefresh={() => void loadItems()}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>ตั้งค่าตำแหน่ง</CardTitle>
              <CardDescription>
                1 item ตั้งค่าตำแหน่งได้หลายแถว — ถ้า Item + Row + Rack + Shelf ซ้ำจะอัปเดต Qty ถ้าไม่ซ้ำจะสร้างใหม่
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={saving || selectedKeys.size === 0}
              onClick={handleSaveSelected}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              บันทึกที่เลือก ({filledSelectedCount}/{selectedKeys.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loadingItems && total > 0 && (
            <p className="text-sm text-muted-foreground">ทั้งหมด {total.toLocaleString()} รายการ</p>
          )}

          {loadingItems ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              {appliedKeyword
                ? 'ไม่พบรายการตามคำค้นหา'
                : 'ไม่พบรายการ item — ลองค้นหาด้วยรหัสหรือชื่อ'}
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 sticky left-0 bg-background">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={(v) => toggleAll(v === true)}
                      />
                    </TableHead>
                    <TableHead>รหัส Item</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="w-24">แม็พแล้ว</TableHead>
                    <TableHead className="min-w-[90px]">Qty</TableHead>
                    <TableHead className="min-w-[100px]">Row</TableHead>
                    <TableHead className="min-w-[100px]">Rack</TableHead>
                    <TableHead className="min-w-[100px]">Shelf</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const key = itemKey(item);
                    const checked = selectedKeys.has(key);
                    const draft = drafts[key] ?? EMPTY_DRAFT;
                    const mappedCount = item.mapped_count ?? 0;
                    return (
                      <TableRow key={key} className={checked ? 'bg-amber-50/40' : undefined}>
                        <TableCell className="sticky left-0 bg-inherit">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleItem(item, v === true)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.itemcode}</TableCell>
                        <TableCell>{item.itemname ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mappedCount > 0 ? `${mappedCount} ตำแหน่ง` : '—'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 min-w-[80px]"
                            value={draft.qty}
                            onChange={(e) => updateDraft(key, 'qty', e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 min-w-[88px]"
                            value={draft.location_row}
                            onChange={(e) => updateDraft(key, 'location_row', e.target.value)}
                            placeholder="Row"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 min-w-[88px]"
                            value={draft.location_rack}
                            onChange={(e) => updateDraft(key, 'location_rack', e.target.value)}
                            placeholder="Rack"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 min-w-[88px]"
                            value={draft.location_shelf}
                            onChange={(e) => updateDraft(key, 'location_shelf', e.target.value)}
                            placeholder="Shelf"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loadingItems && items.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                กรอกตำแหน่งใหม่แล้วเลือกแถวเพื่อบันทึก · ดูรายการที่สร้างแล้วได้ที่แท็บ &quot;ตำแหน่งที่
                mapping แล้ว&quot;
              </p>
              <Pagination
                currentPage={page}
                totalPages={lastPage}
                onPageChange={setPage}
                loading={loadingItems}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
