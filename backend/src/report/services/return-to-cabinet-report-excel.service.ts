import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';
import { formatQtyWithMainUnitForReport } from '../utils/format-item-qty';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

function formatCabinetUserName(name?: string | null): string {
  const n = name?.trim();
  return n && n !== 'ไม่ระบุ' ? n : '-';
}

export interface ReturnToCabinetItemRow {
  RowID: number;
  itemcode: string;
  itemname: string;
  modifyDate: string;
  qty: number;
  itemType?: string;
  itemCategory?: string;
  itemtypeID?: number;
  RfidCode?: string;
  StockID?: number;
  Istatus_rfid?: number;
  IsStock?: boolean | number;
  cabinetUserName?: string;
  departmentName?: string;
  cabinetName?: string;
  unit?: { UnitName?: string | null };
  subUnit?: { UnitName?: string | null };
  SubUnitQty?: number | null;
}

export interface ReturnToCabinetReportGroup {
  itemcode: string;
  itemname: string;
  returnTime: string;
  totalQty: number;
  items: ReturnToCabinetItemRow[];
}

export interface ReturnToCabinetReportData {
  filters?: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    departmentName?: string;
    cabinetName?: string;
  };
  summary: {
    total_records: number;
    total_qty: number;
  };
  data: ReturnToCabinetItemRow[];
  groups?: ReturnToCabinetReportGroup[];
}

@Injectable()
export class ReturnToCabinetReportExcelService {
  async generateReport(data: ReturnToCabinetReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานเติมอุปกรณ์เข้าตู้', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = formatReportDateOnly(new Date());

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:H2',
      title: 'รายงานเติมอุปกรณ์เข้าตู้\nReturn To Cabinet Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:H3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    const filterLabels = ['Division', 'ตู้ Cabinet', 'วันที่เริ่ม', 'วันที่สิ้นสุด'];
    const filterValues = [
      filters.departmentName ?? (filters.departmentId ? filters.departmentId : 'ทั้งหมด'),
      filters.cabinetName ?? (filters.cabinetId ? filters.cabinetId : 'ทั้งหมด'),
      formatFilterDateSlashBE(filters.startDate),
      formatFilterDateSlashBE(filters.endDate),
    ];
    const filterColMap: [string, string][] = [
      ['A', 'B'],
      ['C', 'D'],
      ['E', 'F'],
      ['G', 'H'],
    ];
    filterLabels.forEach((lbl, gi) => {
      const [colStart, colEnd] = filterColMap[gi];
      if (colStart !== colEnd) {
        worksheet.mergeCells(`${colStart}4:${colEnd}4`);
      }
      const cell = worksheet.getCell(`${colStart}4`);
      cell.value = `${lbl}: ${filterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 20;

    const tableStartRow = 5;
    const tableHeaders = [
      'ลำดับ',
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'จำนวน (หน่วย)',
      'วันที่เติม',
      'ตู้',
      'Division',
      'ชื่อผู้เติม',
    ];
    const headerRow = worksheet.getRow(tableStartRow);
    tableHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 26;

    let dataRowIndex = tableStartRow + 1;
    const useGroups = data.groups && data.groups.length > 0;

    if (useGroups && data.groups) {
      let rowNum = 1;
      for (const group of data.groups) {
        const g0 = group.items[0];
        const groupRow = worksheet.getRow(dataRowIndex);
        [
          rowNum,
          group.itemcode,
          group.itemname || '-',
          formatQtyWithMainUnitForReport(group.totalQty, g0 ?? {}),
          formatReportDateTimeUtc(group.returnTime),
          g0?.cabinetName ?? '-',
          g0?.departmentName ?? '-',
          formatCabinetUserName(g0?.cabinetUserName),
        ].forEach((val, colIndex) => {
          const cell = groupRow.getCell(colIndex + 1);
          cell.value = val as ExcelJS.CellValue;
          cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FF1A365D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
          cell.alignment = {
            horizontal: colIndex === 1 || colIndex === 2 || colIndex === 5 || colIndex === 7 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        groupRow.height = 24;
        dataRowIndex++;

        group.items.forEach((item) => {
          const excelRow = worksheet.getRow(dataRowIndex);
          [
            '',
            item.itemcode ?? '-',
            item.itemname ?? '-',
            formatQtyWithMainUnitForReport(item.qty ?? 1, item),
            formatReportDateTimeUtc(item.modifyDate),
            '',
            item.departmentName ?? '-',
            '',
          ].forEach((val, colIndex) => {
            const cell = excelRow.getCell(colIndex + 1);
            cell.value = val as ExcelJS.CellValue;
            cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            cell.alignment = {
              horizontal: colIndex === 1 || colIndex === 2 || colIndex === 6 ? 'left' : 'center',
              vertical: 'middle',
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
          excelRow.height = 22;
          dataRowIndex++;
        });
        rowNum++;
      }
    } else {
      data.data.forEach((item, idx) => {
        const excelRow = worksheet.getRow(dataRowIndex);
        const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
        [
          idx + 1,
          item.itemcode ?? '-',
          item.itemname ?? '-',
          formatQtyWithMainUnitForReport(item.qty ?? 1, item),
          formatReportDateTimeUtc(item.modifyDate),
          item.cabinetName ?? '-',
          item.departmentName ?? '-',
          formatCabinetUserName(item.cabinetUserName),
        ].forEach((val, colIndex) => {
          const cell = excelRow.getCell(colIndex + 1);
          cell.value = val as ExcelJS.CellValue;
          cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = {
            horizontal: colIndex === 1 || colIndex === 2 || colIndex === 5 || colIndex === 7 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        excelRow.height = 24;
        dataRowIndex++;
      });
    }

    worksheet.addRow([]);

    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:H${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:H${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 14;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 46;
    worksheet.getColumn(4).width = 22;
    worksheet.getColumn(5).width = 28;
    worksheet.getColumn(6).width = 22;
    worksheet.getColumn(7).width = 22;
    worksheet.getColumn(8).width = 24;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
