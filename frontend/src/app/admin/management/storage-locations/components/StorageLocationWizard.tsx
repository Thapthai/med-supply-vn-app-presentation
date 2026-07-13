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
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import { cabinetApi } from '@/lib/api';
import {
  cabinetSlotLocationApi,
  type ItemStorageLocationRow,
} from '@/lib/cabinetSlotLocationApi';

type CabinetOpt = {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
};

type MappingDraft = {
  location_row: string;
  location_rack: string;
  location_shelf: string;
};

function cabinetLabel(c: CabinetOpt): string {
  const name = (c.cabinet_name ?? c.cabinet_code ?? '').trim() || `ตู้ #${c.id}`;
  const code = c.cabinet_code?.trim();
  const stock = c.stock_id != null ? `StockID ${c.stock_id}` : 'ไม่มี stock_id';
  return code ? `${name} (${code}) — ${stock}` : `${name} — ${stock}`;
}

function itemKey(item: Pick<ItemStorageLocationRow, 'stock_id' | 'itemcode'>) {
  return `${item.itemcode}:${item.stock_id}`;
}

function draftFromItem(item: ItemStorageLocationRow): MappingDraft {
  return {
    location_row: item.location_row ?? '',
    location_rack: item.location_rack ?? '',
    location_shelf: item.location_shelf ?? '',
  };
}

function isDraftDirty(item: ItemStorageLocationRow, draft: MappingDraft): boolean {
  const orig = draftFromItem(item);
  return (
    draft.location_row !== orig.location_row ||
    draft.location_rack !== orig.location_rack ||
    draft.location_shelf !== orig.location_shelf
  );
}

export default function StorageLocationWizard() {
  const [cabinets, setCabinets] = useState<CabinetOpt[]>([]);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const [cabinetId, setCabinetId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<ItemStorageLocationRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, MappingDraft>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const limit = 100;

  const selectedCabinet = useMemo(
    () => cabinets.find((c) => String(c.id) === cabinetId) ?? null,
    [cabinets, cabinetId],
  );

  const dirtyKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) {
      const key = itemKey(item);
      const draft = drafts[key];
      if (draft && isDraftDirty(item, draft)) keys.add(key);
    }
    return keys;
  }, [items, drafts]);

  const loadCabinets = useCallback(async (kw?: string) => {
    try {
      setLoadingCabinets(true);
      const res = await cabinetApi.getAll({ limit: 100, keyword: kw });
      if (res.success && res.data) {
        setCabinets((res.data as CabinetOpt[]).filter((c) => c.stock_id != null));
      }
    } catch {
      toast.error('โหลดรายการตู้ไม่สำเร็จ');
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!cabinetId) {
      setItems([]);
      return;
    }
    try {
      setLoadingItems(true);
      const res = await cabinetSlotLocationApi.listCabinetItems(Number(cabinetId), {
        keyword,
        page,
        limit,
      });
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setLastPage(res.data.lastPage);
        const nextDrafts: Record<string, MappingDraft> = {};
        const nextSelected = new Set<string>();
        for (const item of res.data.items) {
          const key = itemKey(item);
          nextDrafts[key] = draftFromItem(item);
          nextSelected.add(key);
        }
        setDrafts(nextDrafts);
        setSelectedKeys(nextSelected);
      } else {
        toast.error('โหลดรายการไม่สำเร็จ');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'โหลดรายการไม่สำเร็จ');
    } finally {
      setLoadingItems(false);
    }
  }, [cabinetId, keyword, page, limit]);

  useEffect(() => {
    void loadCabinets();
  }, [loadCabinets]);

  useEffect(() => {
    setPage(1);
  }, [cabinetId, keyword]);

  useEffect(() => {
    if (!cabinetId) {
      setItems([]);
      setSelectedKeys(new Set());
      setTotal(0);
      return;
    }
    const timer = setTimeout(() => void loadItems(), 300);
    return () => clearTimeout(timer);
  }, [cabinetId, keyword, page, loadItems]);

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
    if (!checked) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(items.map((item) => itemKey(item))));
  };

  const updateDraft = (key: string, field: keyof MappingDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { location_row: '', location_rack: '', location_shelf: '' }), [field]: value },
    }));
  };

  const saveItems = async (keysToSave: string[]) => {
    if (keysToSave.length === 0) {
      toast.error('ไม่มีรายการที่จะบันทึก');
      return;
    }
    const itemByKey = new Map(items.map((item) => [itemKey(item), item]));
    const locations = keysToSave
      .map((key) => {
        const item = itemByKey.get(key);
        if (!item) return null;
        const draft = drafts[key] ?? draftFromItem(item);
        return {
          stock_id: item.stock_id,
          itemcode: item.itemcode,
          location_row: draft.location_row.trim() || null,
          location_rack: draft.location_rack.trim() || null,
          location_shelf: draft.location_shelf.trim() || null,
        };
      })
      .filter(Boolean);

    try {
      setSaving(true);
      const res = await cabinetSlotLocationApi.bulkUpsert({
        locations: locations as NonNullable<(typeof locations)[number]>[],
      });
      if (res.success) {
        toast.success(`บันทึกตำแหน่ง ${res.count ?? locations.length} รายการสำเร็จ`);
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

  const handleSaveDirty = () => {
    const keys = [...dirtyKeys].filter((k) => selectedKeys.has(k));
    if (keys.length === 0) {
      toast.error('ไม่มีรายการที่แก้ไขในชุดที่เลือก');
      return;
    }
    void saveItems(keys);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ตำแหน่งจัดเก็บอุปกรณ์</CardTitle>
          <CardDescription>
            เลือกตู้ → แสดงรายการ item → บันทึกตำแหน่งใน app_item_storage_locations (แยกจาก itemstock / slot)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder="เลือกตู้"
            value={cabinetId}
            onValueChange={setCabinetId}
            options={cabinets.map((c) => ({
              value: String(c.id),
              label: cabinetLabel(c),
            }))}
            loading={loadingCabinets}
            onSearch={(kw) => void loadCabinets(kw)}
            searchPlaceholder="ค้นหาชื่อตู้..."
          />

          {cabinetId && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="ค้นหารหัส / ชื่อ Item"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="max-w-xs"
                  />
                  {selectedCabinet && (
                    <span className="text-sm text-muted-foreground">
                      ตู้: <strong>{cabinetLabel(selectedCabinet)}</strong>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || dirtyKeys.size === 0}
                    onClick={handleSaveDirty}
                  >
                    บันทึกที่แก้ไข ({dirtyKeys.size})
                  </Button>
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
                    บันทึกที่เลือก ({selectedKeys.size})
                  </Button>
                </div>
              </div>

              {loadingItems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : items.length === 0 ? (
                <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                  ไม่พบรายการ item — ลองค้นหาด้วยรหัสหรือชื่อ
                </p>
              ) : (
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 sticky left-0 bg-background">
                          <Checkbox
                            checked={items.length > 0 && selectedKeys.size === items.length}
                            onCheckedChange={(v) => toggleAll(v === true)}
                          />
                        </TableHead>
                        <TableHead>รหัส Item</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead className="w-20">ใส่ได้สูงสุด</TableHead>
                        <TableHead className="min-w-[100px]">Row</TableHead>
                        <TableHead className="min-w-[100px]">Rack</TableHead>
                        <TableHead className="min-w-[100px]">Shelf</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const key = itemKey(item);
                        const checked = selectedKeys.has(key);
                        const draft = drafts[key] ?? draftFromItem(item);
                        const dirty = isDraftDirty(item, draft);
                        const hasMapping = !!(item.location_row || item.location_rack || item.location_shelf);
                        return (
                          <TableRow
                            key={key}
                            className={dirty ? 'bg-amber-50/60' : hasMapping ? 'bg-green-50/40' : undefined}
                          >
                            <TableCell className="sticky left-0 bg-inherit">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => toggleItem(item, v === true)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.itemcode}</TableCell>
                            <TableCell>{item.itemname ?? '—'}</TableCell>
                            <TableCell>{item.stock_max ?? '—'}</TableCell>
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

              {items.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    แถวสีเขียว = มีตำแหน่งบันทึกแล้ว · แถวสีเหลือง = แก้ไขแล้วยังไม่บันทึก
                    {total > 0 ? ` · ทั้งหมด ${total.toLocaleString()} รายการ` : ''}
                  </p>
                  {lastPage > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || loadingItems}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        ก่อนหน้า
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        หน้า {page} / {lastPage}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= lastPage || loadingItems}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        ถัดไป
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
