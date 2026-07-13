export type ParsedItemLocation = {
  location_row: string | null;
  location_rack: string | null;
  location_shelf: string | null;
  store_ref: string | null;
};

/** แยก Item.Store เป็น Row / Rack / Shelf (รองรับคั่นด้วย / | -) */
export function parseItemStoreLocation(store: string | null | undefined): ParsedItemLocation {
  const raw = (store ?? '').trim();
  if (!raw) {
    return { location_row: null, location_rack: null, location_shelf: null, store_ref: null };
  }

  const parts = raw
    .split(/[/|,-]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return {
      location_row: parts[0],
      location_rack: parts[1],
      location_shelf: parts.slice(2).join('-'),
      store_ref: raw,
    };
  }
  if (parts.length === 2) {
    return {
      location_row: parts[0],
      location_rack: parts[1],
      location_shelf: null,
      store_ref: raw,
    };
  }

  return {
    location_row: null,
    location_rack: null,
    location_shelf: parts[0] ?? raw,
    store_ref: raw,
  };
}
