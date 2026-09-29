export const CABINET_TYPES = ['WEIGHING', 'RFID'] as const;

export type CabinetTypeCode = (typeof CABINET_TYPES)[number];

export const CABINET_TYPE_OPTIONS: { value: CabinetTypeCode; label: string }[] = [
  { value: 'WEIGHING', label: 'WEIGHING' },
  { value: 'RFID', label: 'RFID' },
];

export function normalizeCabinetType(value?: string | null): CabinetTypeCode | '' {
  const code = (value ?? '').trim().toUpperCase();
  return CABINET_TYPES.includes(code as CabinetTypeCode) ? (code as CabinetTypeCode) : '';
}

export type CabinetClimateFields = {
  temp_min?: number | string | null;
  temp_max?: number | string | null;
  hum_min?: number | string | null;
  hum_max?: number | string | null;
};

export function climateInputValue(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

export function climatePayload(raw?: string): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

export function formatClimateRange(
  min?: number | string | null,
  max?: number | string | null,
): string {
  const a = climateInputValue(min);
  const b = climateInputValue(max);
  if (!a && !b) return '—';
  return `${a || '—'} – ${b || '—'}`;
}
