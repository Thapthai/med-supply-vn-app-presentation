/**
 * Date picker helpers — ค่าในระบบ/API เป็น YYYY-MM-DD (ค.ศ.)
 * การแสดงใน input ใช้ DD/MM/YYYY (ค.ศ.)
 * รองรับการพิมพ์ปี พ.ศ. (≥ 2400) แปลงเป็น ค.ศ. อัตโนมัติ
 * พิมพ์เฉพาะตัวเลขได้ เช่น 25092026 → 25/09/2026
 */

const BE_OFFSET = 543;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * แปลงตัวเลขที่พิมพ์ (ไม่ต้องใส่ /) เป็น DD/MM/YYYY ขณะกรอก
 * 25092026 → 25/09/2026
 */
export function maskDigitsToDMY(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * แปลง YYYY-MM-DD (ค.ศ.) เป็น DD/MM/YYYY (ค.ศ.) สำหรับแสดงใน input
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
  return `${pad2(day)}/${pad2(month)}/${yearCE}`;
}

/** @deprecated ใช้ formatCEToDMY */
export const formatCEToBEDMY = formatCEToDMY;

function ymdFromParts(day: number, month: number, yearRaw: number): string | null {
  let year = yearRaw;
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  if (year <= 99) year = 2000 + year;
  const yearCE = year >= 2400 ? year - BE_OFFSET : year;
  const date = new Date(yearCE, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null;
  const yy = date.getFullYear();
  return `${yy}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * แปลง d/m/YYYY เป็น YYYY-MM-DD (ค.ศ.)
 * ปี ≥ 2400 ถือเป็น พ.ศ.; นอกนั้นถือเป็น ค.ศ.
 * รองรับตัวเลขติดกัน DDMMYYYY (8 หลัก) หรือ DDMMYY (6 หลัก)
 */
export function parseDMYToCE(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/\s/g, '');
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length === 8) {
    return ymdFromParts(
      parseInt(digits.slice(0, 2), 10),
      parseInt(digits.slice(2, 4), 10),
      parseInt(digits.slice(4, 8), 10),
    );
  }
  if (digits.length === 6) {
    return ymdFromParts(
      parseInt(digits.slice(0, 2), 10),
      parseInt(digits.slice(2, 4), 10),
      parseInt(digits.slice(4, 6), 10),
    );
  }

  const parts = cleaned.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return ymdFromParts(parseInt(d!, 10), parseInt(m!, 10), parseInt(y!, 10));
}

/** @deprecated ใช้ parseDMYToCE */
export const parseBEDMYToCE = parseDMYToCE;

/**
 * ได้วันนี้ในรูปแบบ YYYY-MM-DD (ค.ศ.)
 */
export function getTodayCE(): string {
  const d = new Date();
  const y = d.getFullYear();
  return `${y}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
