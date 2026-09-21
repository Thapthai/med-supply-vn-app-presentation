import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import type { WeighingDispenseReportData } from './weighing-dispense-report-excel.service';
import { formatReportDateOnly } from '../utils/date-timeformat';

@Injectable()
export class WeighingRefillReportExcelService {
  async generateReport(data: WeighingDispenseReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายการเติม Weighing', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = formatReportDateOnly(new Date());

    const thinBorder = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };
    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:E2',
      title: 'รายการเติมอุปกรณ์เข้าตู้ Weighing\nWeighing Refill Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:E3');
    worksheet.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
    worksheet.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell('A3').border = thinBorder;
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    const filterValues = [
      filters.stockId != null ? String(filters.stockId) : 'ทั้งหมด',
      filters.itemcode ?? 'ทั้งหมด',
      `${data.summary?.total_rows ?? 0} รายการ`,
    ];
    // const filterLabels = ['ตู้ (StockID)', 'รหัสสินค้า', 'จำนวนรายการ'];
    // worksheet.mergeCells('A4:B4');
    // worksheet.getCell('A4').value = `${filterLabels[0]}: ${filterValues[0]}`;
    // worksheet.getCell('A4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.mergeCells('C4:D4');
    // worksheet.getCell('C4').value = `${filterLabels[1]}: ${filterValues[1]}`;
    // worksheet.getCell('C4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.mergeCells('E4:E4');
    // worksheet.getCell('E4').value = `${filterLabels[2]}: ${filterValues[2]}`;
    // worksheet.getCell('E4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('E4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('E4').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.getRow(4).height = 20;

    // worksheet.mergeCells('A5:C5');
    // worksheet.getCell('A5').value = `วันที่เริ่มต้น: ${filters.dateFrom ?? '-'}`;
    // worksheet.getCell('A5').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.mergeCells('D5:E5');
    // worksheet.getCell('D5').value = `วันที่สิ้นสุด: ${filters.dateTo ?? '-'}`;
    // worksheet.getCell('D5').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.getRow(5).height = 20;

    // const tableStartRow = 6;
    const tableStartRow = 4;
    const headers = ['ลำดับ', 'ชื่ออุปกรณ์', 'ผู้ดำเนินการ', 'จำนวน', 'วันที่แก้ไข'];
    const headerRow = worksheet.getRow(tableStartRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    headerRow.height = 26;

    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const rowValues = [row.seq, row.item_name, row.operator_name, row.qty, row.modify_date];
      rowValues.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = thinBorder;
      });
      excelRow.height = 22;
      dataRowIndex++;
    });

    if (data.data.length > 0) {
      worksheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: dataRowIndex - 1, column: 5 },
      };
    }

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:E${footerRow}`);
    worksheet.getCell(`A${footerRow}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    worksheet.getCell(`A${footerRow}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.getCell(`A${footerRow}`).border = thinBorder;
    worksheet.getRow(footerRow).height = 18;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 55;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
