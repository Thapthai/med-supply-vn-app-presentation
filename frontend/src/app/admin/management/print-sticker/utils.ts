import type { Item } from '@/types/item';
import { MAX_COPIES_PER_ITEM, MAX_COPIES_WHEN_NO_REFILL } from './constants';

export function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function tomorrowLocalYmd(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return localYmd(d);
}

/** จำกัดจำนวนแผ่นให้อยู่ใน 0..maxCap (ว่าง/ไม่ใช่ตัวเลข = 0) */
export function clampCopies(raw: number | null | undefined, maxCap: number): number {
  const cap = Math.max(0, Math.floor(maxCap));
  if (cap <= 0) return 0;
  if (raw == null || !Number.isFinite(raw)) return 0;
  return Math.min(cap, Math.max(0, Math.floor(raw)));
}

/**
 * เพดานต่อรายการ: มี refill_qty > 0 → min(เพดานระบบ, refill)
 * ไม่มีรายการ / refill เป็น 0 → 10
 */
export function maxCopiesFromRefillLookup(row: Item | undefined): number {
  if (!row) return MAX_COPIES_WHEN_NO_REFILL;
  const r = Math.max(0, Math.floor(Number(row.refill_qty) || 0));
  if (r > 0) return Math.min(MAX_COPIES_PER_ITEM, r);
  return MAX_COPIES_WHEN_NO_REFILL;
}

export function getItemDepartmentDisplay(item: Item): string {
  if (item.department?.DepName || item.department?.DepName2) {
    return item.department.DepName || item.department.DepName2 || '-';
  }
  const itemStocks = item.itemStocks ?? [];
  const names = new Set<string>();
  itemStocks.forEach((stock) => {
    stock.cabinet?.cabinetDepartments?.forEach((cd) => {
      const name = cd.department?.DepName || cd.department?.DepName2;
      if (name) names.add(name);
    });
  });
  return names.size > 0 ? [...names].join(', ') : '-';
}

export function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}
