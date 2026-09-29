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

export function climateFormError(values: {
  temp_min?: string;
  temp_max?: string;
  hum_min?: string;
  hum_max?: string;
}): string | null {
  const rangeError = (raw: string | undefined, min: number, max: number, label: string) => {
    if (!raw?.trim()) return null;
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n < min || n > max) {
      return `${label}ต้องอยู่ระหว่าง ${min} ถึง ${max}`;
    }
    return null;
  };
  const errors = [
    rangeError(values.temp_min, -50, 80, 'อุณหภูมิต่ำสุด'),
    rangeError(values.temp_max, -50, 80, 'อุณหภูมิสูงสุด'),
    rangeError(values.hum_min, 0, 100, 'ความชื้นต่ำสุด'),
    rangeError(values.hum_max, 0, 100, 'ความชื้นสูงสุด'),
  ];
  const invalid = errors.find((message) => message);
  if (invalid) return invalid;
  const tempMin = climatePayload(values.temp_min);
  const tempMax = climatePayload(values.temp_max);
  if (tempMin != null && tempMax != null && tempMin > tempMax) {
    return 'อุณหภูมิต่ำสุดต้องไม่มากกว่าอุณหภูมิสูงสุด';
  }
  const humMin = climatePayload(values.hum_min);
  const humMax = climatePayload(values.hum_max);
  if (humMin != null && humMax != null && humMin > humMax) {
    return 'ความชื้นต่ำสุดต้องไม่มากกว่าความชื้นสูงสุด';
  }
  return null;
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
