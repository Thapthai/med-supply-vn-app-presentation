/** เอา record ล่าสุดต่อ itemcode จาก itemslotincabinet_detail */
export function pickLatestDetailByItemcode<
  T extends { itemcode: string; StockID: number; SlotNo: number; Sensor: number },
>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.itemcode)) map.set(row.itemcode, row);
  }
  return map;
}

export function itemStorageKey(stockId: number, itemcode: string): string {
  return `${stockId}:${itemcode}`;
}

export type StorageLocationMapping = {
  location_row: string | null;
  location_rack: string | null;
  location_shelf: string | null;
};

/** SlotNo / Sensor fallback เมื่อยังไม่มี mapping ใน app_item_storage_locations */
export function locationFromDetail(detail: { SlotNo: number; Sensor: number }) {
  return {
    location_row: String(detail.SlotNo),
    location_rack: null as string | null,
    location_shelf: String(detail.Sensor),
  };
}

/** ใช้ app_item_storage_locations ก่อน ไม่มีค่อย fallback detail */
export function resolveLocationFromMapping(
  mapped: StorageLocationMapping | undefined,
  detail?: { SlotNo: number; Sensor: number } | null,
): StorageLocationMapping & { location_source: 'item_storage' | 'detail_slot' | 'none' } {
  if (mapped && (mapped.location_row || mapped.location_rack || mapped.location_shelf)) {
    return {
      location_row: mapped.location_row,
      location_rack: mapped.location_rack,
      location_shelf: mapped.location_shelf,
      location_source: 'item_storage',
    };
  }
  if (detail) {
    return { ...locationFromDetail(detail), location_source: 'detail_slot' };
  }
  return {
    location_row: null,
    location_rack: null,
    location_shelf: null,
    location_source: 'none',
  };
}

export function effectiveStockMax(
  itemStockMax: number | null | undefined,
  cabinetOverride: number | null | undefined,
): number {
  if (cabinetOverride != null) return cabinetOverride;
  return itemStockMax ?? 0;
}
