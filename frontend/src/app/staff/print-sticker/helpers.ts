import type { Item } from '@/types/item';
import { MAX_COPIES_WHEN_NO_REFILL } from '@/app/staff/print-sticker/constants';

/** เพดานจำนวนที่พิมพ์ได้ต่อรายการ — ใช้ refill_qty ถ้ามี (รวม 0 หลังพิมพ์ครบ) */
export function printableCapForRow(row: Item): number {
  if (typeof row.refill_qty === 'number' && Number.isFinite(row.refill_qty)) {
    return Math.max(0, Math.floor(row.refill_qty));
  }
  return MAX_COPIES_WHEN_NO_REFILL;
}

export function applyPrintedCopiesToItems(
  items: Item[],
  printedByCode: Map<string, number>,
): Item[] {
  return items.map((item) => {
    const printed = printedByCode.get(item.itemcode) ?? 0;
    if (printed <= 0) return item;
    const prevCap = printableCapForRow(item);
    const prevIn = typeof item.count_itemstock === 'number' ? item.count_itemstock : 0;
    return {
      ...item,
      refill_qty: Math.max(0, prevCap - printed),
      count_itemstock: prevIn + printed,
    };
  });
}

export function mergeRemainingPrintCap(
  items: Item[],
  remainingByCode: Map<string, number>,
): Item[] {
  return items.map((item) => {
    const rem = remainingByCode.get(item.itemcode);
    if (rem == null) return item;
    const apiCap = printableCapForRow(item);
    return { ...item, refill_qty: Math.min(apiCap, rem) };
  });
}
