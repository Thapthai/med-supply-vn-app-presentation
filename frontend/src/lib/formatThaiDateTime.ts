/**
 * วันเวลาในระบบ
 *
 * - **แสดงผลแบบ UTC (ไม่ +7 / ไม่ใช้ Asia/Bangkok):** `formatUtcDateTime`, `todayYyyyMmDdUtc`,
 *   `toUtcYyyyMmDd`, `formatYyyyMmDdThaiUtc`, และ **`formatThaiDateTime`** (alias ของ UTC)
 * - **ยังใช้ Asia/Bangkok (+7) เฉพาะเมื่อเรียกชัด:** `formatBangkokDateTime`, `todayYyyyMmDdBangkok`,
 *   `toBangkokYyyyMmDd` (เลิกใช้แนะนำให้ใช้คู่ UTC แทน)
 *
 * Parse ค่าวันเวลาจาก API (รองรับ `...+07:00` ที่มีช่องว่างคั่นวัน–เวลา)
 */
export function parseApiDateTime(value: string): Date {
    let s = value.trim();
    if (/^\d{4}-\d{2}-\d{2} \d/.test(s) && /[+-]\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T');
    }
    return new Date(s);
}

/** @deprecated ใช้ `todayYyyyMmDdUtc()` แทน — ยังคืนค่าแบบ Asia/Bangkok (+7) เพื่อไม่ทำลายโค้ดเก่า */
export function todayYyyyMmDdBangkok(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/** วันนี้ใน UTC เป็น YYYY-MM-DD (ใช้กับ filter/API ที่อิง UTC ไม่บวก +7) */
export function todayYyyyMmDdUtc(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

/** @deprecated ใช้ `toUtcYyyyMmDd()` แทน — แปลงเป็น YYYY-MM-DD ตาม Asia/Bangkok (+7) */
export function toBangkokYyyyMmDd(value: string): string | null {
    const d = parseApiDateTime(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/** แปลงค่า API → วันที่ปฏิทิน UTC เป็น YYYY-MM-DD */
export function toUtcYyyyMmDd(value: string | Date): string | null {
    const d = typeof value === 'string' ? parseApiDateTime(value) : value;
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

/**
 * จัดรูปแบบวันเวลาเป็น DD/MM/YYYY HH:mm (ปี ค.ศ. ตรงกับค่าใน API)
 * เลือกซ่อนบางส่วนได้ด้วย options เช่น `{ year: undefined, month: undefined, day: undefined }` = เวลาอย่างเดียว
 */
function formatDmy(
    d: Date,
    timeZone: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    const opts: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    };
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: opts.timeZone ?? timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(d);
    const part = (type: Intl.DateTimeFormatPartTypes): string =>
        parts.find((p) => p.type === type)?.value ?? '';

    const datePieces: string[] = [];
    if (opts.day != null) datePieces.push(part('day'));
    if (opts.month != null) datePieces.push(part('month'));
    if (opts.year != null) datePieces.push(part('year'));

    const timePieces: string[] = [];
    if (opts.hour != null) timePieces.push(part('hour'));
    if (opts.minute != null) timePieces.push(part('minute'));
    if (opts.second != null) timePieces.push(part('second'));

    return [datePieces.join('/'), timePieces.join(':')].filter(Boolean).join(' ');
}

/**
 * แสดงสตริง YYYY-MM-DD (นับเป็นวันใน UTC) เป็น DD/MM/YYYY โดยไม่เลื่อนไป Asia/Bangkok
 */
export function formatYyyyMmDdThaiUtc(ymd: string): string {
    const s = ymd?.trim();
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s ?? '';
    const d = parseApiDateTime(s.includes('T') ? s : `${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return s;
    return formatDmy(d, 'UTC', { hour: undefined, minute: undefined });
}

/**
 * แสดงวันเวลาตาม UTC ของ instant (เช่น `2026-03-19T15:49:18.168Z` → `19/03/2026 15:49` ใน UTC)
 * ไม่แปลงเป็น Asia/Bangkok
 */
export function formatUtcDateTime(
    value?: string | null,
    options?: Intl.DateTimeFormatOptions,
): string {
    if (value == null || value === '') return '-';
    const d = parseApiDateTime(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return formatDmy(d, 'UTC', options);
}

/**
 * แสดงวันเวลาใน Asia/Bangkok (+7) — ใช้เฉพาะเมื่อต้องการเวลาไทยจริงๆ
 */
export function formatBangkokDateTime(
    value?: string | null,
    options?: Intl.DateTimeFormatOptions,
): string {
    if (value == null || value === '') return '-';
    const d = parseApiDateTime(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return formatDmy(d, 'Asia/Bangkok', options);
}

/** ชื่อเดิมว่า “ไทย” แต่ให้ตรงกับ API/DB เป็น UTC — ไม่แปลง +7 (เหมือน `formatUtcDateTime`) */
export function formatThaiDateTime(value?: string) {
    return formatUtcDateTime(value, undefined);
}

/**
 * วันที่/เวลาที่พิมพ์บิล — `print_date` (YYYY-MM-DD) + `time_print_date` (HH:mm:ss)
 * ไม่บังคับ Asia/Bangkok / +07:00 แยกจากฟิลด์ API อื่น
 */
export function formatPrintDateTime(
    printDate: string | null | undefined,
    timePrintDate: string | null | undefined,
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
