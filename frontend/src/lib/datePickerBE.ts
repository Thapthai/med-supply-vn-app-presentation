/**
 * Date picker helpers — ค่าในระบบ/API เป็น YYYY-MM-DD (ค.ศ.)
 * การแสดงใน input ใช้ d/m/YYYY (ค.ศ.)
 * รองรับการพิมพ์ปี พ.ศ. (≥ 2400) แปลงเป็น ค.ศ. อัตโนมัติ
 */

const BE_OFFSET = 543;

/**
 * แปลง YYYY-MM-DD (ค.ศ.) เป็น d/m/YYYY (ค.ศ.) สำหรับแสดงใน input
 */
export function formatCEToDMY(isoDate: string | null | undefined): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const trimmed = isoDate.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (!match) return trimmed;
  const [, y, m, d] = match;
  const yearCE = parseInt(y!, 10);
  const month = parseInt(m!, 10);
  const day = parseInt(d!, 10);
  if (Number.isNaN(yearCE) || Number.isNaN(month) || Number.isNaN(day)) return trimmed;
  return `${day}/${month}/${yearCE}`;
}

/** @deprecated ใช้ formatCEToDMY */
export const formatCEToBEDMY = formatCEToDMY;

/**
 * แปลง d/m/YYYY เป็น YYYY-MM-DD (ค.ศ.)
 * ปี ≥ 2400 ถือเป็น พ.ศ.; นอกนั้นถือเป็น ค.ศ.
 */
export function parseDMYToCE(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/\s/g, '');
  const parts = cleaned.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const day = parseInt(d!, 10);
  const month = parseInt(m!, 10);
  let year = parseInt(y!, 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  if (year <= 99) year = 2000 + year;
  const yearCE = year >= 2400 ? year - BE_OFFSET : year;
  const date = new Date(yearCE, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null;
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** @deprecated ใช้ parseDMYToCE */
export const parseBEDMYToCE = parseDMYToCE;

/**
 * ได้วันนี้ในรูปแบบ YYYY-MM-DD (ค.ศ.)
 */
export function getTodayCE(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
