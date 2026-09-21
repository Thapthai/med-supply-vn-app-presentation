import { formatReportDateTime } from './date-timeformat';

/** แถว supply item จาก medicalSupplyUsage.findAll */
export type SupplyUsageItemRow = {
  order_item_code?: string | null;
  supply_code?: string | null;
  order_item_description?: string | null;
  supply_name?: string | null;
  qty?: number | null;
  quantity?: number | null;
  uom?: string | null;
  unit?: string | null;
  assession_no?: string | null;
  order_item_status?: string | null;
  qty_used_with_patient?: number | null;
  qty_returned_to_cabinet?: number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

function toUtcYyyyMmDd(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

function inDateRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  if (!startDate && !endDate) return true;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

function toMillis(v: unknown): number {
  if (!v) return 0;
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** จัดกลุ่มตาม assession + รหัสอุปกรณ์ เลือกแถวล่าสุด — ตรง frontend groupSupplyItemsLatest */
export function groupSupplyItemsLatest(
  items: SupplyUsageItemRow[],
  filters?: { startDate?: string; endDate?: string },
): SupplyUsageItemRow[] {
  const startDate = filters?.startDate?.trim() ?? '';
  const endDate = filters?.endDate?.trim() ?? '';

  const filteredByDate = items.filter((item) => {
    const createdStr = toUtcYyyyMmDd(item.updated_at ?? item.created_at);
    return inDateRange(createdStr, startDate, endDate);
  });

  const byKey = new Map<string, SupplyUsageItemRow>();
  for (const item of filteredByDate) {
    const assessionNo = String(item.assession_no ?? '').trim();
    const itemCode = String(item.order_item_code ?? item.supply_code ?? '').trim();
    const key = `${assessionNo}|${itemCode}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const prevTs = Math.max(toMillis(prev.updated_at), toMillis(prev.created_at));
    const currTs = Math.max(toMillis(item.updated_at), toMillis(item.created_at));
    if (currTs >= prevTs) byKey.set(key, item);
  }

  return [...byKey.values()].sort((a, b) => {
    const ta = Math.max(toMillis(a.updated_at), toMillis(a.created_at));
    const tb = Math.max(toMillis(b.updated_at), toMillis(b.created_at));
    return tb - ta;
  });
}

export function isDiscontinuedItemStatus(status?: string | null): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'discontinue' || s === 'discontinued';
}

/** สถานะ billing — ตรง MedicalSuppliesTable.getBillingStatusBadge */
export function getBillingStatusLabel(status?: string | null): string {
  if (!status) return 'ไม่ระบุ';
  const lower = status.toLowerCase();
  const map: Record<string, string> = {
    cancelled: 'ยกเลิก',
    paid: 'ชำระแล้ว',
    pending: 'รอชำระ',
    verified: 'ยืนยันแล้ว',
  };
  return map[lower] ?? status;
}

/** สถานะรายการอุปกรณ์ — ตรง OrderItemStatusCell */
export function getOrderItemStatusLabel(status?: string | null): string {
  if (status == null || status === '') return '-';
  const lower = status.toLowerCase();
  if (lower === 'discontinue' || lower === 'discontinued') return 'ยกเลิก';
  if (lower === 'verified') return 'ยืนยันแล้ว';
  return status;
}

/** วันที่/เวลาพิมพ์บิล — ตรง formatPrintDateTime บนเว็บ */
export function formatPrintDateTimeForReport(
  printDate?: string | null,
  timePrintDate?: string | null,
): string {
  const datePart = printDate?.trim();
  const timePart = timePrintDate?.trim();
  if (!datePart && !timePart) return '-';
  const parts: string[] = [];
  if (datePart) {
    if (/^\d{4}-\d{2}-\d{2}/.test(datePart)) {
      const [y, m, day] = datePart.slice(0, 10).split('-');
      parts.push(y && m && day ? `${day}/${m}/${y}` : datePart);
    } else {
      parts.push(datePart);
    }
  }
  if (timePart) {
    parts.push(timePart.length > 8 ? timePart.slice(0, 8) : timePart);
  }
  return parts.join(' ') || '-';
}

export function computeUsageListMetrics(
  usage: { updated_at?: string | Date | null; created_at?: string | Date | null; usage_datetime?: string | Date | null },
  supplyItems: SupplyUsageItemRow[],
): { item_count: number; qty_in_use: number; latest_datetime: string | Date | null } {
  const activeItems = supplyItems.filter((item) => !isDiscontinuedItemStatus(item.order_item_status));

  const item_count = activeItems.length;
  const qty_in_use = activeItems.reduce((sum, item) => {
    const qty = Number(item.qty ?? item.quantity ?? 0);
    const qtyUsed = Number(item.qty_used_with_patient ?? 0);
    const qtyReturned = Number(item.qty_returned_to_cabinet ?? 0);
    const pending = qty - qtyUsed - qtyReturned;
    return sum + (pending > 0 ? pending : 0);
  }, 0);

  const usageUpdated = usage.updated_at;
  const itemUpdatedDates = supplyItems.map((i) => i.updated_at).filter(Boolean);
  const allDates = [usageUpdated, ...itemUpdatedDates].filter(Boolean) as Array<string | Date>;
  const latest_datetime =
    allDates.length > 0
      ? allDates.reduce((a, b) => (new Date(String(a)).getTime() > new Date(String(b)).getTime() ? a : b))
      : null;

  return { item_count, qty_in_use, latest_datetime };
}

export function formatUsageDispensedAt(usage: {
  created_at?: string | Date | null;
  usage_datetime?: string | Date | null;
}): string {
  return formatReportDateTime(usage.created_at ?? usage.usage_datetime);
}

export function formatUsageLatestAt(latest: string | Date | null | undefined): string {
  if (!latest) return '-';
  return formatReportDateTime(latest);
}
