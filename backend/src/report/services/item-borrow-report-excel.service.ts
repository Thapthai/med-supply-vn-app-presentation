import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

export interface ItemBorrowReportRow {
  rowId: number;
  itemCode: string | null;
  itemName: string | null;
  qty: number | null;
  borrowDepartmentLabel: string;
  cabinetName: string;
  modifyDate: string | null;
}

export interface ItemBorrowReportData {
  filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    borrowDepartmentId?: string;
    departmentName?: string;
    cabinetName?: string;
    borrowDepartmentName?: string;
  };
  summary: {
    total_records: number;
    total_qty: number;
  };
  data: ItemBorrowReportRow[];
}

@Injectable()
export class ItemBorrowReportExcelService {
  async generateReport(data: ItemBorrowReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานอุปกรณ์ยืม', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = formatReportDateOnly(new Date());

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:G2',
      title: 'รายงานอุปกรณ์ยืม\nItem Borrow Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:G3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    const filterRow1Labels = ['ค้นหา', 'แผนก (ที่ตั้งตู้)', 'ตู้ Cabinet'];
    const filterRow1Values = [
      filters.keyword?.trim() ? filters.keyword.trim() : 'ทั้งหมด',
      filters.departmentName ?? (filters.departmentId ? filters.departmentId : 'ทั้งหมด'),
      filters.cabinetName ?? (filters.cabinetId ? filters.cabinetId : 'ทั้งหมด'),
    ];
    const filterRow1ColMap: [string, string][] = [
      ['A', 'C'],
      ['D', 'E'],
      ['F', 'G'],
    ];
    filterRow1Labels.forEach((lbl, gi) => {
      const [colStart, colEnd] = filterRow1ColMap[gi];
      if (colStart !== colEnd) {
        worksheet.mergeCells(`${colStart}4:${colEnd}4`);
      }
      const cell = worksheet.getCell(`${colStart}4`);
      cell.value = `${lbl}: ${filterRow1Values[gi]}`;
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

    const filterRow2Labels = ['แผนกที่ยืม', 'วันที่เริ่ม', 'วันที่สิ้นสุด'];
    const filterRow2Values = [
      filters.borrowDepartmentName ??
        (filters.borrowDepartmentId ? filters.borrowDepartmentId : 'ทั้งหมด'),
      formatFilterDateSlashBE(filters.startDate),
      formatFilterDateSlashBE(filters.endDate),
    ];
    const filterRow2ColMap: [string, string][] = [
      ['A', 'C'],
      ['D', 'E'],
      ['F', 'G'],
    ];
    filterRow2Labels.forEach((lbl, gi) => {
      const [colStart, colEnd] = filterRow2ColMap[gi];
      if (colStart !== colEnd) {
        worksheet.mergeCells(`${colStart}5:${colEnd}5`);
      }
      const cell = worksheet.getCell(`${colStart}5`);
      cell.value = `${lbl}: ${filterRow2Values[gi]}`;
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
    worksheet.getRow(5).height = 20;

    const tableStartRow = 6;
    const tableHeaders = [
      'ลำดับ',
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'จำนวน',
      'แผนกที่ยืม',
      'ตู้',
      'แก้ไขล่าสุด',
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
    data.data.forEach((item, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      [
        idx + 1,
        item.itemCode ?? '-',
        item.itemName ?? '-',
        item.qty ?? '-',
        item.borrowDepartmentLabel ?? '-',
        item.cabinetName ?? '-',
        item.modifyDate ? formatReportDateTimeUtc(item.modifyDate) : '-',
      ].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val as ExcelJS.CellValue;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 4 || colIndex === 5 ? 'left' : 'center',
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

    worksheet.addRow([]);

    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:G${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:G${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ · รวมจำนวน ${data.summary?.total_qty ?? 0} ชิ้น`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 46;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 28;
    worksheet.getColumn(6).width = 22;
    worksheet.getColumn(7).width = 28;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
