'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, PackageSearch, Weight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { narcoticApi, type NarcoticSlot } from '@/lib/api';

type LevelFilter = 'all' | 'low' | 'out';
type StockLevel = 'ok' | 'low' | 'out';

type Props = {
  trolleyId?: number | null;
  stockId?: number | null;
  appliedItemName: string;
  refetchSignal: number;
  onLoadingChange?: (loading: boolean) => void;
  onStatsChange?: (stats: { systemTotal: number; rawOnPage: number; visibleCount: number }) => void;
  keywordDraft: string;
  onKeywordDraftChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  listLoading: boolean;
};

function stockLevel(slot: NarcoticSlot): StockLevel {
  if (slot.qty <= 0) return 'out';
  if (slot.item_min > 0 ? slot.qty < slot.item_min : slot.qty <= 5) return 'low';
  return 'ok';
}

function matchesQuery(slot: Pick<NarcoticSlot, 'itemcode' | 'itemname'>, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return `${slot.itemcode} ${slot.itemname ?? ''}`.toLowerCase().includes(needle);
}

function LocationFilterBar({
  shelf,
  slotNo,
  onClear,
}: {
  shelf: number | null;
  slotNo: number | null;
  onClear: () => void;
}) {
  if (shelf == null) return null;
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 rounded-[10px] bg-[#dbeafe] px-3 py-1.5 text-[13px]">
      <span className="truncate">
        กำลังดู: ชั้น {shelf}
        {slotNo != null ? ` · ช่อง ${slotNo}` : ' (ทั้งชั้น)'}
      </span>
      <button
        type="button"
        className="shrink-0 rounded-full border border-[#e1e6ee] bg-white px-3 py-1 text-[13px]"
        onClick={onClear}
      >
        ล้างตัวกรอง ✕
      </button>
    </div>
  );
}

export default function NarcoticCabinetLayout({
  trolleyId,
  stockId,
  refetchSignal,
  onLoadingChange,
  onStatsChange,
  keywordDraft,
}: Props) {
  const [slots, setSlots] = useState<NarcoticSlot[]>([]);
  const [weighingDrawers, setWeighingDrawers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<LevelFilter>('all');
  const [shelf, setShelf] = useState<number | null>(null);
  const [slotNo, setSlotNo] = useState<number | null>(null);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onStatsChangeRef = useRef(onStatsChange);
  onLoadingChangeRef.current = onLoadingChange;
  onStatsChangeRef.current = onStatsChange;
  const resolvedTrolleyId = trolleyId ?? stockId ?? null;

  useEffect(() => {
    if (resolvedTrolleyId == null || resolvedTrolleyId <= 0) {
      setSlots([]);
      setWeighingDrawers(new Set());
      onLoadingChangeRef.current?.(false);
      onStatsChangeRef.current?.({ systemTotal: 0, rawOnPage: 0, visibleCount: 0 });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        onLoadingChangeRef.current?.(true);
        const layoutRes = await narcoticApi.getLayout(resolvedTrolleyId);
        if (cancelled) return;
        const nextDrawers = layoutRes?.data?.drawers ?? [];
        const nextSlots = nextDrawers.flatMap((drawer) => drawer.boxes ?? []);
        setSlots(nextSlots);
        setWeighingDrawers(new Set(nextDrawers.filter((drawer) => drawer.is_weighing).map((drawer) => drawer.drawer)));
        onStatsChangeRef.current?.({
          systemTotal: nextSlots.length,
          rawOnPage: nextSlots.length,
          visibleCount: nextSlots.length,
        });
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error('โหลดผังตู้นาโคติกไม่สำเร็จ');
          setSlots([]);
          setWeighingDrawers(new Set());
          onStatsChangeRef.current?.({ systemTotal: 0, rawOnPage: 0, visibleCount: 0 });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          onLoadingChangeRef.current?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedTrolleyId, refetchSignal]);

  useEffect(() => {
    setShelf(null);
    setSlotNo(null);
    setLevel('all');
  }, [resolvedTrolleyId]);

  const q = keywordDraft;
  const locationMatch = (drawer: number, box: number) =>
    (shelf == null || drawer === shelf) && (slotNo == null || box === slotNo);

  const filteredStock = useMemo(
    () => slots.filter((row) => matchesQuery(row, q) && locationMatch(row.drawer, row.box)),
    [slots, q, shelf, slotNo],
  );

  const stockRows = useMemo(() => {
    return filteredStock.filter((row) => {
      const lv = stockLevel(row);
      if (level === 'low') return lv === 'low';
      if (level === 'out') return lv === 'out';
      return true;
    });
  }, [filteredStock, level]);

  const stockByShelf = useMemo(() => {
    const map = new Map<number, NarcoticSlot[]>();
    for (const row of stockRows) {
      const list = map.get(row.drawer) ?? [];
      list.push(row);
      map.set(row.drawer, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([drawer, items]) => ({
        drawer,
        is_weighing: weighingDrawers.has(drawer),
        items: [...items].sort((a, b) => a.box - b.box),
      }));
  }, [stockRows, weighingDrawers]);

  const clearLocationFilter = () => {
    setShelf(null);
    setSlotNo(null);
  };

  const drawers = useMemo(() => {
    const map = new Map<number, NarcoticSlot[]>();
    for (const row of slots) {
      const list = map.get(row.drawer) ?? [];
      list.push(row);
      map.set(row.drawer, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([drawer, boxes]) => ({
        drawer,
        is_weighing: weighingDrawers.has(drawer),
        boxes: [...boxes].sort((a, b) => a.box - b.box),
      }));
  }, [slots, weighingDrawers]);

  if (resolvedTrolleyId == null || resolvedTrolleyId <= 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
        <PackageSearch className="h-10 w-10 opacity-35" />
        <p>เลือกตู้นาโคติกเพื่อแสดงตำแหน่งลิ้นชักและช่อง</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f6f9] text-[#1b2430]">
      {loading && slots.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดผังตู้...
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-3 p-3 lg:grid-cols-3">
          <section className="min-w-0 rounded-[14px] border border-[#e1e6ee] bg-white p-4 lg:col-span-2">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">แผนผังชั้นวาง</h2>
              <LocationFilterBar shelf={shelf} slotNo={slotNo} onClear={clearLocationFilter} />
            </div>


            <div className="space-y-2">
              {drawers.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6b7686]">ไม่พบช่องในตู้นี้</p>
              ) : (
                drawers.map((row) => (
                  <div
                    key={row.drawer}
                    className={cn(
                      'grid grid-cols-[72px_1fr] items-stretch gap-2.5 rounded-[10px]',
                      row.is_weighing && 'bg-[#dbeafe] p-1.5',
                    )}
                  >
                    <button
                      type="button"
                      title={row.is_weighing ? `ชั้น ${row.drawer} · ชั่งน้ำหนัก` : `ชั้น ${row.drawer}`}
                      onClick={() => {
                        if (shelf === row.drawer && slotNo == null) {
                          setShelf(null);
                        } else {
                          setShelf(row.drawer);
                          setSlotNo(null);
                        }
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center gap-0.5 rounded-lg border px-0 text-center text-base font-bold',
                        shelf === row.drawer && slotNo == null
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : row.is_weighing
                            ? 'border-[#93c5fd] bg-[#bfdbfe] text-[#1e40af]'
                            : 'border-[#e1e6ee] bg-[#f4f6f9] text-[#1b2430]',
                      )}
                    >
                      <span>ชั้น {row.drawer}</span>
                      {row.is_weighing ? <Weight className="h-4 w-4" /> : null}
                    </button>
                    <div className="grid grid-cols-9 gap-2">
                      {row.boxes.map((box) => {
                        const lv = stockLevel(box);
                        const selected = shelf === box.drawer && slotNo === box.box;
                        const dim = Boolean(q.trim()) && !matchesQuery(box, q);
                        return (
                          <button
                            key={`${box.drawer}-${box.box}`}
                            type="button"
                            title={`${box.itemcode} ${box.itemname ?? ''}`.trim()}
                            onClick={() => {
                              if (selected) {
                                setShelf(null);
                                setSlotNo(null);
                              } else {
                                setShelf(box.drawer);
                                setSlotNo(box.box);
                              }
                            }}
                            className={cn(
                              'min-h-20 rounded-xl border-2 px-0 py-2 text-center leading-tight',
                              lv === 'ok' && 'border-transparent bg-[#dcfce7] text-[#166534]',
                              lv === 'low' && 'border-transparent bg-[#fef3c7] text-[#92400e]',
                              lv === 'out' && 'border-transparent bg-[#fee2e2] text-[#991b1b]',
                              selected && 'border-blue-600 shadow-[0_0_0_2px_#dbeafe]',
                              dim && 'opacity-25',
                            )}
                          >
                            <b className="block text-xl font-medium opacity-70">{box.box}</b>
                            <br />
                            <b className="text-2xl leading-none">{box.qty}</b>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2.5 text-xs text-[#6b7686]">
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#dcfce7]" />
                ปกติ
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#fef3c7]" />
                ใกล้หมด
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#fee2e2]" />
                หมด
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#dbeafe]" />
                ชั้นชั่งน้ำหนัก
              </span>
            </div>
          </section>

          <section className="min-w-0 rounded-[14px] border border-[#e1e6ee] bg-white p-4">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {(
                [
                  ['all', 'ทั้งหมด'],
                  ['low', 'ใกล้หมด'],
                  ['out', 'หมด'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLevel(key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[13px]',
                    level === key
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-[#e1e6ee] bg-white text-[#1b2430]',
                  )}
                >
                  {label}
                </button>
              ))}
              <LocationFilterBar shelf={shelf} slotNo={slotNo} onClear={clearLocationFilter} />
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-auto">
              {stockByShelf.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-[#6b7686]">ไม่พบข้อมูล</p>
              ) : (
                stockByShelf.map(({ drawer, is_weighing, items }) => (
                  <article
                    key={drawer}
                    className={cn(
                      'overflow-hidden rounded-[12px] border',
                      is_weighing ? 'border-[#93c5fd] bg-[#eff6ff]' : 'border-[#e1e6ee] bg-[#f8fafc]',
                    )}
                  >
                    <header
                      className={cn(
                        'flex items-center justify-between border-b px-3 py-2',
                        is_weighing ? 'border-[#bfdbfe] bg-[#dbeafe]' : 'border-[#e1e6ee] bg-white',
                      )}
                    >
                      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        ชั้น {drawer}
                        {is_weighing ? <Weight className="h-3.5 w-3.5 text-[#1e40af]" /> : null}
                      </h3>
                      <span className="text-[12px] text-[#6b7686]">{items.length} รายการ</span>
                    </header>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          {['ชื่ออุปกรณ์', 'คงเหลือ', 'ตำแหน่ง'].map((head) => (
                            <th
                              key={head}
                              className="whitespace-nowrap border-b border-[#e1e6ee] bg-[#f8fafc] px-2 py-2 text-left text-[12.5px] font-medium text-[#6b7686]"
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => {
                          const lv = stockLevel(row);
                          return (
                            <tr key={`${row.id}-${row.drawer}-${row.box}`}>
                              <td className="min-w-[130px] whitespace-normal border-b border-[#e1e6ee] bg-white px-2 py-2">
                                {row.itemname || '—'}
                              </td>
                              <td className="whitespace-nowrap border-b border-[#e1e6ee] bg-white px-2 py-2">
                                <span
                                  className={cn(
                                    'inline-block min-w-[34px] rounded-full px-2.5 py-0.5 text-center text-sm font-bold',
                                    lv === 'ok' && 'bg-[#dcfce7] text-[#166534]',
                                    lv === 'low' && 'bg-[#fef3c7] text-[#92400e]',
                                    lv === 'out' && 'bg-[#fee2e2] text-[#991b1b]',
                                  )}
                                >
                                  {row.qty}
                                </span>
                              </td>
                              <td className="whitespace-nowrap border-b border-[#e1e6ee] bg-white px-2 py-2">
                                <span className="rounded-md border border-[#e1e6ee] bg-[#f4f6f9] px-2 py-0.5 text-[13px]">
                                  ช่อง {row.box}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
