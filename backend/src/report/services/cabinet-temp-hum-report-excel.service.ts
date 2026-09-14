import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';

export interface CabinetTempHumReportSubRow {
  seq: number;
  log_date: string;
  log_time: string;
  temp: string;
  hum: string;
}

export interface CabinetTempHumReportRow {
  seq: number;
  cabinet_name: string;
  log_date: string;
  log_time: string;
  temp: string;
  hum: string;
  subRows?: CabinetTempHumReportSubRow[];
}

export interface CabinetTempHumReportData {
  filters?: { year?: number; month?: number; month_label?: string };
  summary: { total_rows: number; total_logs?: number };
  data: CabinetTempHumReportRow[];
}

@Injectable()
export class CabinetTempHumReportExcelService {
  async generateReport(data: CabinetTempHumReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('อุณหภูมิตู้', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    const thinBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    };
    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:F2',
      title: 'รายงานอุณหภูมิและความชื้นในตู้\nCabinet Temperature & Humidity Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
    worksheet.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell('A3').border = thinBorder;
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    worksheet.mergeCells('A4:C4');
    worksheet.getCell('A4').value = `เดือน: ${filters.month_label ?? 'ทั้งหมด'}`;
    worksheet.getCell('A4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A4').border = thinBorder;
    worksheet.mergeCells('D4:F4');
    worksheet.getCell('D4').value = `จำนวนตู้: ${data.summary?.total_rows ?? 0} | บันทึก: ${data.summary?.total_logs ?? 0}`;
    worksheet.getCell('D4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    worksheet.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    worksheet.getCell('D4').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('D4').border = thinBorder;
    worksheet.getRow(4).height = 20;

    const tableStartRow = 5;
    const headers = ['ลำดับ', 'ตู้', 'วันที่', 'เวลา', 'อุณหภูมิ (°C)', 'ความชื้น (%)'];
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
      [row.seq, row.cabinet_name, row.log_date, row.log_time, row.temp, row.hum].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = thinBorder;
      });
      excelRow.height = 22;
      dataRowIndex++;

      const subRows = row.subRows ?? [];
      const labelRow = worksheet.getRow(dataRowIndex);
      worksheet.mergeCells(dataRowIndex, 1, dataRowIndex, 6);
      const labelCell = labelRow.getCell(1);
      labelCell.value = `  รายการอุณหภูมิและความชื้นแต่ละวันเวลา (${subRows.length} รายการ)`;
      labelCell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF000000' } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      labelCell.border = thinBorder;
      labelRow.height = 20;
      dataRowIndex++;

      const subHeaders = ['ลำดับ', 'รายการ', 'วันที่', 'เวลา', 'อุณหภูมิ (°C)', 'ความชื้น (%)'];
      const subHeaderRow = worksheet.getRow(dataRowIndex);
      subHeaders.forEach((h, colIndex) => {
        const cell = subHeaderRow.getCell(colIndex + 1);
        cell.value = h;
        cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
        cell.alignment = { horizontal: colIndex === 1 ? 'left' : 'center', vertical: 'middle' };
        cell.border = thinBorder;
      });
      subHeaderRow.height = 20;
      dataRowIndex++;

      subRows.forEach((sub) => {
        const subExcelRow = worksheet.getRow(dataRowIndex);
        [sub.seq, 'บันทึก', sub.log_date, sub.log_time, sub.temp, sub.hum].forEach((val, colIndex) => {
          const cell = subExcelRow.getCell(colIndex + 1);
          cell.value = val ?? '-';
          cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.alignment = {
            horizontal: colIndex === 1 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = thinBorder;
        });
        subExcelRow.height = 20;
        dataRowIndex++;
      });
    });

    if (data.data.length > 0) {
      worksheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: dataRowIndex - 1, column: 6 },
      };
    }

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
    worksheet.getCell(`A${footerRow}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    worksheet.getCell(`A${footerRow}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 32;
    worksheet.getColumn(3).width = 22;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 16;
    worksheet.getColumn(6).width = 16;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
