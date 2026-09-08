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
