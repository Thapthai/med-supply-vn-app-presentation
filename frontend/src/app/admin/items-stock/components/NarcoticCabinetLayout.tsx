'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, PackageSearch } from 'lucide-react';
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

export default function NarcoticCabinetLayout({
  trolleyId,
  stockId,
  refetchSignal,
  onLoadingChange,
  onStatsChange,
  keywordDraft,
}: Props) {
  const [slots, setSlots] = useState<NarcoticSlot[]>([]);
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
        const nextSlots = (layoutRes?.data?.drawers ?? []).flatMap((drawer) => drawer.boxes ?? []);
        setSlots(nextSlots);
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
        boxes: [...boxes].sort((a, b) => a.box - b.box),
      }));
  }, [slots]);

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
        <div className="grid w-full grid-cols-1 gap-3 p-3 xl:grid-cols-2">
          <section className="min-w-0 rounded-[14px] border border-[#e1e6ee] bg-white p-4">
            <h4 className="mb-1 text-[15px] font-semibold">แผนผังชั้นวาง</h4>
            <p className="mb-2.5 text-[12.5px] text-[#6b7686]">
              แตะช่องเพื่อกรองรายการของอุปกรณ์นั้น · แตะ &quot;ชั้น&quot; เพื่อดูทั้งชั้น
            </p>
            <div className="space-y-1.5">
              {drawers.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6b7686]">ไม่พบช่องในตู้นี้</p>
              ) : (
                drawers.map((row) => (
                  <div key={row.drawer} className="grid grid-cols-[48px_1fr] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (shelf === row.drawer && slotNo == null) {
                          setShelf(null);
                        } else {
                          setShelf(row.drawer);
                          setSlotNo(null);
                        }
                      }}
                      className={cn(
                        'rounded-lg border px-0 py-2 text-center text-[13px] font-bold',
                        shelf === row.drawer && slotNo == null
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-[#e1e6ee] bg-[#f4f6f9] text-[#1b2430]',
                      )}
                    >
                      ชั้น {row.drawer}
                    </button>
                    <div className="grid grid-cols-9 gap-1.5">
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
                              'min-h-12 rounded-lg border-2 px-0 py-1.5 text-center leading-tight',
                              lv === 'ok' && 'border-transparent bg-[#dcfce7] text-[#166534]',
                              lv === 'low' && 'border-transparent bg-[#fef3c7] text-[#92400e]',
                              lv === 'out' && 'border-transparent bg-[#fee2e2] text-[#991b1b]',
                              selected && 'border-blue-600 shadow-[0_0_0_2px_#dbeafe]',
                              dim && 'opacity-25',
                            )}
                          >
                            <small className="block text-[10px] opacity-70">{box.box}</small>
                            <b className="text-sm">{box.qty}</b>
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
            </div>
          </section>

          <section className="min-w-0 rounded-[14px] border border-[#e1e6ee] bg-white p-4">
            {shelf != null ? (
              <div className="mb-2.5 flex items-center gap-2 rounded-[10px] bg-[#dbeafe] px-3 py-2 text-[13px]">
                <span>
                  กำลังดู: ชั้น {shelf}
                  {slotNo != null ? ` · ช่อง ${slotNo}` : ' (ทั้งชั้น)'}
                </span>
                <button
                  type="button"
                  className="ml-auto rounded-full border border-[#e1e6ee] bg-white px-3 py-1 text-[13px]"
                  onClick={() => {
                    setShelf(null);
                    setSlotNo(null);
                  }}
                >
                  ล้างตัวกรอง ✕
                </button>
              </div>
            ) : null}

            <div className="mb-2.5 flex flex-wrap gap-2">
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
            </div>

            <div className="max-h-[75vh] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {['รหัส', 'ชื่ออุปกรณ์', 'คงเหลือ', 'ตำแหน่ง'].map((head) => (
                      <th
                        key={head}
                        className="sticky top-0 whitespace-nowrap border-b border-[#e1e6ee] bg-white px-2 py-2 text-left text-[12.5px] font-medium text-[#6b7686]"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-8 text-center text-[#6b7686]">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    stockRows.map((row) => {
                      const lv = stockLevel(row);
                      return (
                        <tr key={`${row.id}-${row.drawer}-${row.box}`}>
                          <td className="whitespace-nowrap border-b border-[#e1e6ee] px-2 py-2 text-xs text-[#6b7686]">
                            {row.itemcode || '—'}
                          </td>
                          <td className="min-w-[130px] whitespace-normal border-b border-[#e1e6ee] px-2 py-2">
                            {row.itemname || '—'}
                          </td>
                          <td className="whitespace-nowrap border-b border-[#e1e6ee] px-2 py-2">
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
                          <td className="whitespace-nowrap border-b border-[#e1e6ee] px-2 py-2">
                            <span className="rounded-md border border-[#e1e6ee] bg-[#f4f6f9] px-2 py-0.5 text-[13px]">
                              ชั้น {row.drawer} · ช่อง {row.box}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
