import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { resolveCabinetStockShowRowHighlight, CABINET_STOCK_NEUTRAL_ROW_BG } from '../utils/cabinet-stock-row-highlight.util';
import { formatReportDateOnly } from '../utils/date-timeformat';
import {
  formatQtyWithMainUnitForReport,
  formatQtyPlainForReport,
  formatCabinetStockMinMaxForReport,
  formatCabinetStockRemark,
  type ReportItemUnitFields,
} from '../utils/format-item-qty';

/** แถวรายงานสต๊อกอุปกรณ์ในตู้ */
export interface CabinetStockRow {
  seq: number;
  department_name: string;
  item_code: string;
  item_name: string;
  balance_qty: number;
  qty_in_use: number;
  damaged_qty: number;
  stock_max: number | null;
  stock_min: number | null;
  refill_qty: number;
  /** มีชิ้น IsStock=1 ที่หมดอายุแล้ว — ใช้ highlight สีส้ม */
  has_expired?: boolean;
  /** ใกล้หมดอายุภายใน 30 วัน (ไม่รวมที่หมดอายุแล้ว) — สีเหลือง amber */
  has_near_expiry?: boolean;
  unit?: { UnitName?: string | null };
  subUnit?: { UnitName?: string | null };
  SubUnitQty?: number | null;
}

export interface CabinetStockReportData {
  /** วันที่อ้างอิงรายงาน (แสดงใน Excel/PDF) */
  reportDateDisplay?: string;
  /** YYYY-MM-DD ตามปฏิทินที่ใช้ในรายงาน (Asia/Bangkok) */
  reportDateISO?: string;
  filters?: {
    cabinetId?: number;
    cabinetCode?: string;
    cabinetName?: string;
    departmentId?: number;
    departmentName?: string;
  };
  /** แสดงสี highlight แถว — เฉพาะเมื่อเลือกตู้ (ตรงกับ showCabinetMinMax หน้าเว็บ) */
  showRowHighlight?: boolean;
  summary: { total_rows: number; total_qty: number; total_refill_qty: number };
  data: CabinetStockRow[];
}

@Injectable()
export class CabinetStockReportExcelService {
  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานสต๊อกอุปกรณ์ในตู้', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate =
      data.reportDateDisplay ??
      formatReportDateOnly(new Date());

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:J2',
      title: 'รายงานสต๊อกอุปกรณ์ในตู้\nCabinet Stock Report',
      row1Height: 20,
      row2Height: 20,
    });

    // แถว 3: วันที่รายงาน
    worksheet.mergeCells('A3:J3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // แถว 4: Filter summary (ตู้ | แผนก | สรุป)
    const filters = data.filters ?? {};
    const filterLabels = ['ตู้ Cabinet', 'แผนก', 'จำนวนรายการ'];
    const filterValues = [
      filters.cabinetName ?? filters.cabinetCode ?? 'ทั้งหมด',
      filters.departmentName ?? (filters.departmentId != null ? `แผนก ${filters.departmentId}` : 'ทั้งหมด'),
      `${data.summary?.total_rows ?? 0} รายการ`,
    ];

    // 10 columns → แบ่ง 3 กลุ่ม 3+3+4
    const filterColMap = [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I', 'J']];
    filterLabels.forEach((lbl, gi) => {
      const cols = filterColMap[gi];
      const rangeLabel = `${cols[0]}4:${cols[cols.length - 1]}4`;
      worksheet.mergeCells(rangeLabel);
      const cell = worksheet.getCell(`${cols[0]}4`);
      cell.value = `${lbl}: ${filterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 20;

    // ---- ตารางข้อมูล (แสดงก่อน สรุปผล/เงื่อนไข) ----
    const tableStartRow = 5;
    const headers = [
      'ลำดับ',
      'แผนก',
      'รหัสอุปกรณ์',
      'อุปกรณ์',
      'จำนวนในตู้ (หน่วย)',
      'ถูกใช้งาน',
      'ไม่ถูกใช้งาน',
      'Min / Max',
      'จำนวนที่ต้องเติม',
      'หมายเหตุ',
    ];
    const headerRow = worksheet.getRow(tableStartRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 28;

    /** ตรงกับหน้าเว็บ bg-red-100 — ต่ำกว่า Min */
    const LIGHT_RED = 'FFFEE2E2';
    /** ตรงกับหน้าเว็บ bg-orange-100 — หมดอายุ */
    const LIGHT_ORANGE = 'FFFFEDD5';
    /** ตรงกับหน้าเว็บ bg-amber-100 — ใกล้หมดอายุ */
    const LIGHT_AMBER = 'FFFEF3C7';
    const showRowHighlight = resolveCabinetStockShowRowHighlight(data);
    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const stockMin = row.stock_min ?? 0;
      const isLowStock = stockMin > 0 && (row.balance_qty ?? 0) < stockMin;
      const bg = !showRowHighlight
        ? CABINET_STOCK_NEUTRAL_ROW_BG.argb
        : row.has_expired
          ? LIGHT_ORANGE
          : row.has_near_expiry
            ? LIGHT_AMBER
            : isLowStock
              ? LIGHT_RED
              : idx % 2 === 0
                ? 'FFFFFFFF'
                : 'FFF8F9FA';
      const u: ReportItemUnitFields = {
        unit: row.unit,
        subUnit: row.subUnit,
        SubUnitQty: row.SubUnitQty,
      };
      const minMaxStr = formatCabinetStockMinMaxForReport(
        row.stock_min,
        row.stock_max,
        showRowHighlight,
      );
      [
        row.seq,
        row.department_name ?? '-',
        row.item_code,
        row.item_name ?? '-',
        formatQtyWithMainUnitForReport(row.balance_qty, u),
        formatQtyPlainForReport(row.qty_in_use ?? 0),
        formatQtyPlainForReport(row.damaged_qty ?? 0),
        minMaxStr,
        formatQtyPlainForReport(row.refill_qty),
        formatCabinetStockRemark(row, { showRowHighlight }),
      ].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 3 ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      excelRow.height = 22;
      dataRowIndex++;
    });

    worksheet.addRow([]);
    // Footer + หมายเหตุ
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:J${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;
    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:J${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = showRowHighlight
      ? 'หมายเหตุ: จำนวนในตู้ = ชิ้นในตู้ (IsStock=1) | ถูกใช้งาน = supply_usage_items ตามวันที่รายงาน | จำนวนที่ต้องเติม = Stock Max − จำนวนในตู้ | สีแดง = ต่ำกว่า Min | สีเหลือง = ใกล้หมดอายุ | สีส้ม = หมดอายุ'
      : 'หมายเหตุ: จำนวนในตู้ = ชิ้นในตู้ (IsStock=1) | ถูกใช้งาน = supply_usage_items ตามวันที่รายงาน | จำนวนที่ต้องเติม = Stock Max − จำนวนในตู้ | ไม่แสดงสี highlight เมื่อกรองตู้ = ทั้งหมด';
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 25;
    worksheet.getColumn(4).width = 52;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 20;
    worksheet.getColumn(7).width = 20;
    worksheet.getColumn(8).width = 24;
    worksheet.getColumn(9).width = 26;
    worksheet.getColumn(10).width = 32;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
