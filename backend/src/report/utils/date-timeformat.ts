/**
 * แสดงวันเวลาในรายงานเป็น DD/MM/YYYY (ปี ค.ศ. ตรงกับค่าใน API/DB) เช่น
 * 2026-03-20T08:38:04.559Z → "20/03/2026 08:38:04"
 * - ISO ที่มี Z หรือ offset → แสดงตามเวลาใน ISO (UTC)
 * - สตริงวันเวลาไม่มี timezone → ถือเป็นเวลาไทย (+07:00)
 */
const DMY_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
};

function localeDateTime(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    ...DMY_DATETIME_OPTS,
    timeZone,
  }).formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}:${part('second')}`;
}

export function formatDate(v: string | Date | null | undefined): string {
  if (v == null || v === '') return '-';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '-';
    return localeDateTime(v, 'Asia/Bangkok');
  }
  const s = String(v).trim();
  if (!s) return '-';
  const hasExplicitTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  let d: Date;
  if (hasExplicitTz) {
    d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return localeDateTime(d, 'UTC');
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    d = new Date(`${normalized}+07:00`);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return s;
  return localeDateTime(d, 'Asia/Bangkok');
}

/** alias สำหรับรายงาน (ชื่อสื่อความหมายเดียวกับ formatDate) */
export const formatReportDateTime = formatDate;

function localeDateOnly(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')}`;
}

/** วันที่อย่างเดียว (ไม่มีเวลา) — สำหรับ filter วันที่เริ่ม/สิ้นสุด ฯลฯ */
export function formatReportDateOnly(value?: string | Date | null): string {
  if (value == null || value === '') return '-';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    return localeDateOnly(value, 'Asia/Bangkok');
  }
  const s = String(value).trim();
  if (!s) return '-';
  const hasExplicitTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  let d: Date;
  if (hasExplicitTz) {
    d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return localeDateOnly(d, 'UTC');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, da] = s.split('-').map(Number);
    d = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
    if (Number.isNaN(d.getTime())) return s;
    return localeDateOnly(d, 'Asia/Bangkok');
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    d = new Date(`${normalized}+07:00`);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return s;
  return localeDateOnly(d, 'Asia/Bangkok');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * วันที่แบบ DD/MM/YYYY (ค.ศ.) — ตรงกับ frontend formatCEToDMY
 * รองรับ YYYY-MM-DD จาก API และ Date object
 */
export function formatReportDateSlashDMY(value?: string | Date | null): string {
  if (value == null || value === '') return '-';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    const iso = value.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    return formatReportDateSlashDMY(iso);
  }
  const s = String(value).trim();
  if (!s) return '-';
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const yearCE = parseInt(y!, 10);
    const month = parseInt(m!, 10);
    const day = parseInt(d!, 10);
    if (Number.isNaN(yearCE) || Number.isNaN(month) || Number.isNaN(day)) return s;
    return `${pad2(day)}/${pad2(month)}/${yearCE}`;
  }
  const slashMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(s);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const day = parseInt(d!, 10);
    const month = parseInt(m!, 10);
    let year = parseInt(y!, 10);
    if (year <= 99) year = 2000 + year;
    else if (year >= 2400) year -= 543;
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return s;
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return formatReportDateSlashDMY(parsed);
  }
  return s;
}

/** @deprecated ชื่อเดิมสมัยแสดงปี พ.ศ. — ตอนนี้คืนค่า DD/MM/YYYY (ค.ศ.) */
export const formatReportDateSlashBE = formatReportDateSlashDMY;

// --- แยกจากของเดิม: ค่า `Date` / DB เก็บเป็น UTC ให้แสดงตาม UTC (ไม่เลื่อนเป็น Asia/Bangkok) ---

/** แปลง input เป็นจุดเวลา — สตริง ISO ไม่มี timezone (วันเวลา) ให้ parse เป็น UTC (ต่อ Z) */
function parseInputForUtcDisplay(v: string | Date): Date | null {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  const s = String(v).trim();
  if (!s) return null;
  const hasExplicitTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  if (hasExplicitTz) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    const d = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * เหมือน formatReportDateTime แต่ `Date` และข้อมูลจาก DB แสดงตาม **UTC** ตรงกับ ISO (ไม่ +7)
 * ใช้กับรายงานที่เก็บเวลาเป็น UTC ใน DB
 */
export function formatReportDateTimeUtc(
  v: string | Date | null | undefined,
): string {
  if (v == null || v === '') return '-';
  const d = parseInputForUtcDisplay(v as string | Date);
  if (d == null) return typeof v === 'string' ? v : '-';
  return localeDateTime(d, 'UTC');
}

/**
 * เหมือน formatReportDateOnly แต่ส่วนที่เป็น `Date` / ช่วงเวลา UTC แสดงตาม **UTC**
 */
export function formatReportDateOnlyUtc(value?: string | Date | null): string {
  if (value == null || value === '') return '-';
  const d = parseInputForUtcDisplay(value as string | Date);
  if (d == null) return typeof value === 'string' ? value : '-';
  return localeDateOnly(d, 'UTC');
}
