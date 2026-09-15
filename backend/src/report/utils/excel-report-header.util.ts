import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { resolveReportLogoPath } from '../config/report.config';

export const EXCEL_REPORT_HEADER_NAVY = 'FF1A365D';
export const EXCEL_REPORT_HEADER_PAGE_BG = 'FFF8F9FA';

export function cmToExcelPx(cm: number): number {
  return Math.round((cm * 96) / 2.54);
}

/** นามสกุลรูปสำหรับ workbook.addImage */
export function imageExtensionFromPath(logoPath: string): 'png' | 'jpeg' | 'gif' {
  const ext = path.extname(logoPath).toLowerCase().replace('.', '');
  if (ext === 'jpg') return 'jpeg';
  if (ext === 'jpeg' || ext === 'gif' || ext === 'png') return ext as 'png' | 'jpeg' | 'gif';
  return 'png';
}

/** โลโก้มุมซ้ายบน ลอยเหนือเซลล์ ไม่ยืดตาม merge */
export function addFloatingReportLogo(
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  logoPath: string | null | undefined,
): void {
  if (!logoPath || !fs.existsSync(logoPath)) return;
  try {
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: imageExtensionFromPath(logoPath),
    });
    addFloatingReportLogoByImageId(worksheet, imageId, logoPath);
  } catch {
    /* skip */
  }
}

/** กรอบสูงสุดของโลโก้ในหัวรายงาน — สเกลให้พอดีโดยคงสัดส่วนรูป */
const REPORT_LOGO_MAX_HEIGHT_CM = 1.35;
const REPORT_LOGO_MAX_WIDTH_CM = 4.2;

function readPngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width < 1 || height < 1) return null;
  return { width, height };
}

function readJpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function readImageSize(filePath: string): { width: number; height: number } | null {
  try {
    const buf = fs.readFileSync(filePath);
    return readPngSize(buf) ?? readJpegSize(buf);
  } catch {
    return null;
  }
}

function fitLogoPx(logoPath?: string | null): { widthPx: number; heightPx: number } {
  const size = logoPath && fs.existsSync(logoPath) ? readImageSize(logoPath) : null;
  const aspect =
    size && size.height > 0 ? size.width / size.height : 996 / 476;
  let heightCm = REPORT_LOGO_MAX_HEIGHT_CM;
  let widthCm = heightCm * aspect;
  if (widthCm > REPORT_LOGO_MAX_WIDTH_CM) {
    widthCm = REPORT_LOGO_MAX_WIDTH_CM;
    heightCm = widthCm / aspect;
  }
  return {
    widthPx: cmToExcelPx(widthCm),
    heightPx: cmToExcelPx(heightCm),
  };
}

export function addFloatingReportLogoByImageId(
  worksheet: ExcelJS.Worksheet,
  logoImageId: number,
  logoPath?: string | null,
): void {
  try {
    const { widthPx, heightPx } = fitLogoPx(logoPath ?? resolveReportLogoPath());
    worksheet.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: widthPx, height: heightPx },
    });
  } catch {
    /* skip */
  }
}

export interface ExcelMergedTitlePaintOptions {
  /** เช่น 'A1:J2' — เซลล์หลักต้องเป็น A1 */
  mergeRange: string;
  title: string;
  navyArgb?: string;
  pageBgArgb?: string;
  row1Height?: number;
  row2Height?: number;
  colAWidth?: number;
}

/** merge + สไตล์หัวรายงานมาตรฐาน (ยังไม่แนบโลโก้) */
export function paintExcelMergedTitleHeader(
  worksheet: ExcelJS.Worksheet,
  options: ExcelMergedTitlePaintOptions,
): void {
  const {
    mergeRange,
    title,
    navyArgb = EXCEL_REPORT_HEADER_NAVY,
    pageBgArgb = EXCEL_REPORT_HEADER_PAGE_BG,
    row1Height = 25,
    row2Height = 25,
    colAWidth = 12,
  } = options;

  worksheet.mergeCells(mergeRange);
  const headerCell = worksheet.getCell('A1');
  headerCell.value = title;
  headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: navyArgb } };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pageBgArgb } };
  headerCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  worksheet.getRow(1).height = row1Height;
  worksheet.getRow(2).height = row2Height;
  worksheet.getColumn(1).width = colAWidth;
}

/** หัวรายงานมาตรฐาน + โลโก้จากไฟล์ (resolveReportLogoPath) */
export function applyExcelStandardTitleHeader(
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  options: ExcelMergedTitlePaintOptions,
): void {
  paintExcelMergedTitleHeader(worksheet, options);
  addFloatingReportLogo(worksheet, workbook, resolveReportLogoPath());
}
