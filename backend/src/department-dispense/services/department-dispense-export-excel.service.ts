import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../../report/utils/excel-report-header.util';

export interface DepartmentDispenseExportDocument {
  doc_no: string;
  department_label: string;
  line_count: number;
  created_at: string;
  remark?: string | null;
  lines: Array<{
    itemcode: string;
    item_name?: string | null;
    qty: number;
  }>;
}

export interface DepartmentDispenseExportData {
  summary: { total_documents: number; total_lines: number };
  documents: DepartmentDispenseExportDocument[];
}

function formatThDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return iso;
  }
}

@Injectable()
export class DepartmentDispenseExportExcelService {
  async generateReport(data: DepartmentDispenseExportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Cabinet';
    workbook.created = new Date();

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    this.fillSummarySheet(workbook, data, reportDate);
    this.fillDetailSheet(workbook, data, reportDate);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private fillSummarySheet(
    workbook: ExcelJS.Workbook,
    data: DepartmentDispenseExportData,
    reportDate: string,
  ): void {
    const worksheet = workbook.addWorksheet('สรุปเอกสาร', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:F2',
      title: 'เอกสารควบคุมการเบิกอุปกรณ์ให้หน่วยงาน\nDepartment Dispense Documents',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:F3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const headers = ['ลำดับ', 'เลขที่เอกสาร', 'หน่วยงาน', 'จำนวนรายการ', 'วันที่บันทึก', 'หมายเหตุ'];
    const headerRow = worksheet.getRow(5);
    headers.forEach((h, i) => {
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

    let rowIndex = 6;
    data.documents.forEach((doc, idx) => {
      const row = worksheet.getRow(rowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      [
        idx + 1,
        doc.doc_no,
        doc.department_label,
        doc.line_count,
        formatThDateTime(doc.created_at),
        doc.remark?.trim() || '—',
      ].forEach((val, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = val as ExcelJS.CellValue;
        cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 5 ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      rowIndex++;
    });

    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 36;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 24;
    worksheet.getColumn(6).width = 32;
  }

  private fillDetailSheet(
    workbook: ExcelJS.Workbook,
    data: DepartmentDispenseExportData,
    reportDate: string,
  ): void {
    const worksheet = workbook.addWorksheet('รายละเอียดรายการ', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:E2',
      title: 'รายละเอียดรายการเบิกอุปกรณ์\nDepartment Dispense Lines',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:E3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const headers = [
      'เลขที่เอกสาร',
      'หน่วยงาน',
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'จำนวนเบิก',
    ];
    const headerRow = worksheet.getRow(5);
    headers.forEach((h, i) => {
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

    let rowIndex = 6;
    let lineIdx = 0;
    for (const doc of data.documents) {
      for (const line of doc.lines) {
        const row = worksheet.getRow(rowIndex);
        const bg = lineIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
        [
          doc.doc_no,
          doc.department_label,
          line.itemcode,
          line.item_name ?? '—',
          line.qty,
        ].forEach((val, colIndex) => {
          const cell = row.getCell(colIndex + 1);
          cell.value = val as ExcelJS.CellValue;
          cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = {
            horizontal: colIndex >= 2 && colIndex <= 3 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        rowIndex++;
        lineIdx++;
      }
    }

    worksheet.getColumn(1).width = 22;
    worksheet.getColumn(2).width = 36;
    worksheet.getColumn(3).width = 18;
    worksheet.getColumn(4).width = 40;
    worksheet.getColumn(5).width = 12;
  }
}
