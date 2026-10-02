export const CABINET_TYPES = ['WEIGHING', 'RFID', 'NARCOTIC'] as const;

export type CabinetTypeCode = (typeof CABINET_TYPES)[number];

export const CABINET_TYPE_OPTIONS: { value: CabinetTypeCode; label: string }[] = [
  { value: 'WEIGHING', label: 'WEIGHING' },
  { value: 'RFID', label: 'RFID' },
  { value: 'NARCOTIC', label: 'ตู้นาโคติก (Narcotic Cabinet)' },
];

export function normalizeCabinetType(value?: string | null): CabinetTypeCode | '' {
  const code = (value ?? '').trim().toUpperCase();
  return CABINET_TYPES.includes(code as CabinetTypeCode) ? (code as CabinetTypeCode) : '';
}

export type CabinetDivisionLink = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  description?: string;
  department?: {
    ID?: number;
    DepName?: string;
    DepName2?: string;
  };
};

export type CabinetRow = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  trolley_id?: number | null;
  machine_ip?: string | null;
  cabinet_status?: string;
  temp_min?: number | string | null;
  temp_max?: number | string | null;
  hum_min?: number | string | null;
  hum_max?: number | string | null;
  cabinetDepartments?: CabinetDivisionLink[];
  created_at?: string;
  updated_at?: string;
};

export function divisionLinkLabel(link: CabinetDivisionLink): string {
  return (
    link.department?.DepName?.trim() ||
    link.department?.DepName2?.trim() ||
    `แผนก #${link.department_id}`
  );
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

export function isNarcoticCabinetType(value?: string | null): boolean {
  return (value ?? '').toUpperCase().includes('NARCOTIC');
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

/** IPv4 ของเครื่องตู้ — stock_id = เลขท้าย + 1 เช่น .0 → 1, .2 → 3 */
const IPV4_OCTET = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export const MACHINE_IP_PLACEHOLDER = 'เช่น 192.168.1.2';

export function stockIdFromMachineIp(raw?: string): number | null {
  const ip = raw?.trim() ?? '';
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some((part) => !IPV4_OCTET.test(part))) return null;
  return Number(parts[3]) + 1;
}

export function machineIpHint(
  ip?: string,
  currentStockId?: number | null,
  cabinetType?: string | null,
  currentTrolleyId?: number | null,
): string {
  const typed = ip?.trim() ?? '';
  const derived = stockIdFromMachineIp(typed);
  const narcotic = isNarcoticCabinetType(cabinetType);
  const idLabel = narcotic ? 'Trolley ID' : 'Stock ID';
  const currentId = narcotic ? (currentTrolleyId ?? currentStockId) : currentStockId;
  if (derived != null) return `${idLabel} ที่จะใช้: ${derived}`;
  if (typed) return 'รูปแบบ IP ไม่ถูกต้อง เช่น 192.168.1.2';
  if (currentId != null && currentId > 0) {
    return `${idLabel} ปัจจุบัน: ${currentId} — กรอก IP เพื่อเปลี่ยน (ท้าย .0 = 1, ท้าย .2 = 3)`;
  }
  return `ไม่กรอกระบบจะสร้าง ${idLabel} ให้อัตโนมัติ (ท้าย .0 = 1, ท้าย .2 = 3)`;
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
