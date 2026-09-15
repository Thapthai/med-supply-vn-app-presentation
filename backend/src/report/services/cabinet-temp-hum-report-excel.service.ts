import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';

export interface CabinetTempHumReportSubRow {
  seq: number;
  day?: number;
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

function colLetter(col: number): string {
  let n = col;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function collectTimes(rows: CabinetTempHumReportRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const sub of row.subRows ?? []) {
      const time = (sub.log_time ?? '').trim();
      if (time && time !== '-') set.add(time);
    }
  }
  return [...set].sort();
}

function readingAt(row: CabinetTempHumReportRow, day: number, time: string) {
  return (row.subRows ?? []).find((sub) => sub.day === day && sub.log_time === time);
}

function toExcelNumber(value: string | undefined) {
  if (value == null || value === '' || value === '-') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

@Injectable()
export class CabinetTempHumReportExcelService {
  async generateReport(data: CabinetTempHumReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();

    const filters = data.filters ?? {};
    const year = filters.year ?? new Date().getFullYear();
    const month = filters.month ?? new Date().getMonth() + 1;
    const times = collectTimes(data.data);
    const timeSlots = times.length > 0 ? times : ['-'];
    const lastCol = 1 + timeSlots.length * 2;
    const lastColLetter = colLetter(lastCol);
    const dayCount = daysInMonth(year, month);
    const tempStart = 2;
    const tempEnd = 1 + timeSlots.length;
    const humStart = tempEnd + 1;
    const humEnd = lastCol;

    const worksheet = workbook.addWorksheet('อุณหภูมิตู้', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
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
    const applyRangeBorder = (row: number, fromCol: number, toCol: number) => {
      for (let c = fromCol; c <= toCol; c++) {
        worksheet.getCell(row, c).border = thinBorder;
      }
    };
    const styleHeaderCell = (
      cell: ExcelJS.Cell,
      fill: string,
      fontColor = 'FF1A365D',
    ) => {
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: fontColor } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    };

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: `A1:${lastColLetter}2`,
      title: 'รายงานอุณหภูมิและความชื้นในตู้\nCabinet Temperature & Humidity Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells(`A3:${lastColLetter}3`);
    worksheet.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
    worksheet.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
    applyRangeBorder(3, 1, lastCol);
    worksheet.getRow(3).height = 20;

    const midCol = Math.max(2, Math.ceil(lastCol / 2));
    worksheet.mergeCells(4, 1, 4, midCol);
    worksheet.getCell('A4').value = `เดือน: ${filters.month_label ?? 'ทั้งหมด'}`;
    worksheet.getCell('A4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    if (midCol < lastCol) {
      worksheet.mergeCells(4, midCol + 1, 4, lastCol);
      const countCell = worksheet.getCell(4, midCol + 1);
      countCell.value = `จำนวนตู้: ${data.summary?.total_rows ?? 0} | บันทึก: ${data.summary?.total_logs ?? 0}`;
      countCell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      countCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      countCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyRangeBorder(4, 1, lastCol);
    worksheet.getRow(4).height = 20;

    let dataRowIndex = 6;

    const writeCabinetTable = (row: CabinetTempHumReportRow) => {
      worksheet.mergeCells(dataRowIndex, 1, dataRowIndex, lastCol);
      const titleCell = worksheet.getCell(dataRowIndex, 1);
      titleCell.value = `ตู้ที่ ${row.seq}: ${row.cabinet_name}`;
      titleCell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      applyRangeBorder(dataRowIndex, 1, lastCol);
      worksheet.getRow(dataRowIndex).height = 24;
      dataRowIndex++;

      const groupRow = dataRowIndex;
      const timeRow = dataRowIndex + 1;
      worksheet.mergeCells(groupRow, 1, timeRow, 1);
      const corner = worksheet.getCell(groupRow, 1);
      corner.value = 'วันที่';
      styleHeaderCell(corner, 'FF1A365D', 'FFFFFFFF');

      worksheet.mergeCells(groupRow, tempStart, groupRow, tempEnd);
      const tempHeader = worksheet.getCell(groupRow, tempStart);
      tempHeader.value = 'อุณหภูมิ';
      styleHeaderCell(tempHeader, 'FFFDBA74', 'FF9A3412');

      worksheet.mergeCells(groupRow, humStart, groupRow, humEnd);
      const humHeader = worksheet.getCell(groupRow, humStart);
      humHeader.value = 'ความชื้น';
      styleHeaderCell(humHeader, 'FF7DD3FC', 'FF075985');
      applyRangeBorder(groupRow, 1, lastCol);
      worksheet.getRow(groupRow).height = 22;

      timeSlots.forEach((time, i) => {
        const tempCell = worksheet.getCell(timeRow, tempStart + i);
        tempCell.value = time;
        styleHeaderCell(tempCell, 'FFFED7AA', 'FF9A3412');
        const humCell = worksheet.getCell(timeRow, humStart + i);
        humCell.value = time;
        styleHeaderCell(humCell, 'FFBAE6FD', 'FF075985');
      });
      worksheet.getRow(timeRow).height = 20;
      dataRowIndex += 2;

      for (let day = 1; day <= dayCount; day++) {
        const excelRow = worksheet.getRow(dataRowIndex);
        const bg = day % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
        const dayCell = excelRow.getCell(1);
        dayCell.value = day === 1 ? `${day} (วันที่)` : day;
        dayCell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF212529' } };
        dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dayCell.border = thinBorder;

        timeSlots.forEach((time, i) => {
          const log = readingAt(row, day, time);
          const tempCell = excelRow.getCell(tempStart + i);
          tempCell.value = toExcelNumber(log?.temp);
          tempCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFC2410C' } };
          tempCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          tempCell.alignment = { horizontal: 'center', vertical: 'middle' };
          tempCell.border = thinBorder;
          if (typeof tempCell.value === 'number') tempCell.numFmt = '0.0';

          const humCell = excelRow.getCell(humStart + i);
          humCell.value = toExcelNumber(log?.hum);
          humCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF0369A1' } };
          humCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          humCell.alignment = { horizontal: 'center', vertical: 'middle' };
          humCell.border = thinBorder;
          if (typeof humCell.value === 'number') humCell.numFmt = '0.0';
        });
        excelRow.height = 20;
        dataRowIndex++;
      }
      dataRowIndex += 1;
    };

    if (data.data.length === 0) {
      worksheet.mergeCells(dataRowIndex, 1, dataRowIndex, lastCol);
      const empty = worksheet.getCell(dataRowIndex, 1);
      empty.value = 'ไม่มีข้อมูล';
      empty.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
      empty.alignment = { horizontal: 'center', vertical: 'middle' };
      applyRangeBorder(dataRowIndex, 1, lastCol);
      dataRowIndex++;
    } else {
      data.data.forEach((row) => writeCabinetTable(row));
    }

    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(footerRow, 1, footerRow, lastCol);
    worksheet.getCell(footerRow, 1).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    worksheet.getCell(footerRow, 1).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    worksheet.getCell(footerRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    worksheet.getColumn(1).width = 14;
    for (let c = 2; c <= lastCol; c++) {
      worksheet.getColumn(c).width = 11;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
