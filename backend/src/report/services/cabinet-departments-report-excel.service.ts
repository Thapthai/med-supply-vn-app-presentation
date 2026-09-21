import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly } from '../utils/date-timeformat';

/** รายการอุปกรณ์ในตู้ (กลุ่มตามรหัสอุปกรณ์) */
export interface CabinetDepartmentsSubRow {
  seq: number;
  itemcode: string;
  itemname: string;
  inStockCount: number;
  dispensedCount: number;
  totalQty: number;
}

export interface CabinetDepartmentsReportRow {
  seq: number;
  cabinet_name: string;
  department_name: string;
  quantity_display: string; // "ถูกเบิก / ในตู้"
  status: string; // ใช้งาน | ไม่ใช้งาน
  description: string;
  /** รายการอุปกรณ์ในตู้ (กลุ่มตามรหัส) */
  subRows?: CabinetDepartmentsSubRow[];
}

export interface CabinetDepartmentsReportData {
  filters?: {
    cabinetName?: string;
    departmentName?: string;
    status?: string;
  };
  summary: { total_records: number };
  data: CabinetDepartmentsReportRow[];
}

/** รายงานรวมทุกตู้ → Excel: แยก sheet ต่อตู้ */
function shouldSplitSheetsByCabinet(data: CabinetDepartmentsReportData): boolean {
  const n = data.filters?.cabinetName;
  return n == null || String(n).trim() === '';
}

/** จัดกลุ่มแถวตามชื่อตู้ ตามลำดับที่ปรากฏใน data */
function groupRowsByCabinetInOrder(rows: CabinetDepartmentsReportRow[]): CabinetDepartmentsReportRow[][] {
  const groups: CabinetDepartmentsReportRow[][] = [];
  const keyToIndex = new Map<string, number>();
  for (const row of rows) {
    const key = row.cabinet_name ?? '-';
    if (!keyToIndex.has(key)) {
      keyToIndex.set(key, groups.length);
      groups.push([]);
    }
    groups[keyToIndex.get(key)!].push(row);
  }
  return groups;
}

function sanitizeExcelSheetName(name: string, fallbackIndex: number): string {
  const raw = (name || `ตู้_${fallbackIndex}`).replace(/[:\\/?*[\]]/g, '_').trim();
  return raw.length > 31 ? raw.slice(0, 31) : raw;
}

@Injectable()
export class CabinetDepartmentsReportExcelService {
  async generateReport(data: CabinetDepartmentsReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();

    const reportDate = formatReportDateOnly(new Date());

    const rows = data.data ?? [];
    const splitByCabinet = shouldSplitSheetsByCabinet(data) && rows.length > 0;
    const cabinetGroups = splitByCabinet ? groupRowsByCabinetInOrder(rows) : [rows];

    const usedSheetNames = new Set<string>();
    for (let gi = 0; gi < cabinetGroups.length; gi++) {
      const groupRows = cabinetGroups[gi];
      let sheetName = splitByCabinet
        ? sanitizeExcelSheetName(groupRows[0]?.cabinet_name ?? `ตู้_${gi + 1}`, gi + 1)
        : 'จัดการตู้ Cabinet - แผนก';
      if (splitByCabinet && usedSheetNames.has(sheetName)) {
        const suffix = `_${gi + 1}`;
        sheetName = sanitizeExcelSheetName(`${sheetName.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`, gi + 1);
      }
      usedSheetNames.add(sheetName);
      const worksheet = workbook.addWorksheet(sheetName, {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
        properties: { defaultRowHeight: 20 },
      });

      this.fillCabinetDepartmentsSheet(workbook, worksheet, data, groupRows, reportDate, splitByCabinet);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** เติมเนื้อหา 1 sheet (กลุ่มแถวของตู้เดียว หรือทั้งหมด) */
  private fillCabinetDepartmentsSheet(
    workbook: ExcelJS.Workbook,
    worksheet: ExcelJS.Worksheet,
    data: CabinetDepartmentsReportData,
    rows: CabinetDepartmentsReportRow[],
    reportDate: string,
    isPerCabinetSheet: boolean,
  ): void {
    const filters = data.filters ?? {};
    const filterCabinetDisplay = isPerCabinetSheet
      ? rows[0]?.cabinet_name ?? filters.cabinetName ?? 'ทั้งหมด'
      : filters.cabinetName ?? 'ทั้งหมด';

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:F2',
      title: 'รายงานจัดการตู้ Cabinet - แผนก\nCabinet Departments Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:F3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    const filterLabels = ['ตู้ Cabinet', 'แผนก', 'สถานะ'];
    const filterValues = [
      filterCabinetDisplay,
      filters.departmentName ?? 'ทั้งหมด',
      filters.status ?? 'ทั้งหมด',
    ];
    const filterColMap = [['A', 'B'], ['C', 'D'], ['E', 'F']];
    filterLabels.forEach((lbl, gi) => {
      const cols = filterColMap[gi];
      const range = `${cols[0]}4:${cols[cols.length - 1]}4`;
      worksheet.mergeCells(range);
      const cell = worksheet.getCell(`${cols[0]}4`);
      cell.value = `${lbl}: ${filterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    worksheet.getRow(4).height = 20;

    const tableStartRow = 5;
    const headers = ['ลำดับ', 'ชื่อตู้', 'แผนก', 'จำนวนอุปกรณ์ (ถูกเบิก/ในตู้)', 'สถานะ', 'หมายเหตุ'];
    const headerRow = worksheet.getRow(tableStartRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 26;

    let dataRowIndex = tableStartRow + 1;
    rows.forEach((row, idx) => {
      const seq = idx + 1;
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      [seq, row.cabinet_name, row.department_name, row.quantity_display, row.status, row.description].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val ?? '-';
        cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 5 ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      excelRow.height = 22;
      dataRowIndex++;

      // Subdata: รายการอุปกรณ์ในตู้ — แสดงทุกแถว (แม้ 0 รายการ)
      const subRows = row.subRows ?? [];
      const totalChips = subRows.reduce((sum, s) => sum + s.totalQty, 0);
      const labelRow = worksheet.getRow(dataRowIndex);
      worksheet.mergeCells(dataRowIndex, 1, dataRowIndex, 6);
      const labelCell = labelRow.getCell(1);
      labelCell.value = `  รายการอุปกรณ์ในตู้ (${subRows.length} รายการ, รวม ${totalChips} ชิ้น)`;
      labelCell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF000000' } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      labelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      labelRow.height = 20;
      dataRowIndex++;

      // Header ตารางย่อย: ลำดับ, รหัสอุปกรณ์, ชื่ออุปกรณ์, อยู่ในตู้, ถูกเบิก, จำนวนรวม
      const subHeaders = ['ลำดับ', 'รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'อยู่ในตู้', 'ถูกเบิก', 'จำนวนรวม'];
      const subHeaderRow = worksheet.getRow(dataRowIndex);
      subHeaders.forEach((h, colIndex) => {
        const cell = subHeaderRow.getCell(colIndex + 1);
        cell.value = h;
        cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
        cell.alignment = { horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      subHeaderRow.height = 20;
      dataRowIndex++;

      subRows.forEach((sub) => {
        const subExcelRow = worksheet.getRow(dataRowIndex);
        const subVals = [
          sub.seq,
          sub.itemcode,
          sub.itemname,
          sub.inStockCount,
          sub.dispensedCount,
          sub.totalQty,
        ];
        subVals.forEach((val, colIndex) => {
          const cell = subExcelRow.getCell(colIndex + 1);
          cell.value = val ?? '-';
          cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.alignment = {
            horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        subExcelRow.height = 20;
        dataRowIndex++;
      });
    });

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;
    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:F${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = isPerCabinetSheet
      ? `จำนวนรายการ (ตู้นี้): ${rows.length} รายการ | รวมทุกตู้: ${data.summary?.total_records ?? 0} รายการ`
      : `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 28;
    worksheet.getColumn(3).width = 38;
    worksheet.getColumn(4).width = 28;
    worksheet.getColumn(5).width = 14;
    worksheet.getColumn(6).width = 36;
  }
}
