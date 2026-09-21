import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { EquipmentDisbursementReportData } from '../types/equipment-disbursement-report.types';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

export type { EquipmentDisbursementReportData };

@Injectable()
export class EquipmentDisbursementExcelService {
  /**
   * Generate equipment disbursement report in Excel format
   */
  async generateReport(data: EquipmentDisbursementReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานการบันทึกตัดจ่ายอุปกรณ์');

    // ========================================
    // SECTION 1: TITLE SECTION (หัวรายงาน)
    // ========================================
    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:E2',
      title: 'รายงานการรับบันทึกตัดจ่ายอุปกรณ์',
      row1Height: 28,
      row2Height: 26,
    });

    // ========================================
    // SECTION 2: HOSPITAL INFORMATION (ข้อมูลโรงพยาบาล)
    // ========================================
    worksheet.addRow([]); // Empty row

    const hospitalDetails: string[][] = [];
    if (data.hospital) hospitalDetails.push(['โรงพยาบาล:', data.hospital]);
    if (data.department) hospitalDetails.push(['หน่วยงาน/แผนก:', data.department]);
    if (data.dateFrom || data.dateTo) {
      const dateRange = data.dateFrom && data.dateTo 
        ? `${formatReportDateOnly(data.dateFrom)} ถึง ${formatReportDateOnly(data.dateTo)}`
        : data.dateFrom 
          ? `ตั้งแต่วันที่ ${formatReportDateOnly(data.dateFrom)}`
          : data.dateTo 
            ? `จนถึงวันที่ ${formatReportDateOnly(data.dateTo)}`
            : 'ทุกช่วงเวลา';
      hospitalDetails.push(['วันที่:', dateRange]);
    }

    hospitalDetails.forEach((detail) => {
      const row = worksheet.addRow(detail);
      worksheet.mergeCells(`B${row.number}:E${row.number}`);
      row.getCell(1).font = { name: 'Tahoma', size: 12, bold: true };
      row.getCell(2).font = { name: 'Tahoma', size: 12 };
      row.height = 22;
    });

    // ========================================
    // SECTION 3: MAIN DATA TABLE (ตารางข้อมูลหลัก)
    // ========================================
    worksheet.addRow([]); // Empty row

    const headerRow = worksheet.addRow([
      'รหัสอุปกรณ์',
      'อุปกรณ์',
      'วันที่',
      'เวลา',
      'ผู้บันทึก',
    ]);
    
    headerRow.height = 30;
    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF203864' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'medium', color: { argb: 'FF203864' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    }

    // Data rows
    data.records.forEach((record, index) => {
      const row = worksheet.addRow([
        record.code,
        record.description,
        record.date,
        record.time,
        record.recordedBy || '-',
      ]);

      row.height = 25;

      // Apply styles to each cell
      for (let col = 1; col <= 5; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Tahoma', size: 11 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };

        // Base color (zebra striping)
        const baseColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseColor } };

        // Alignment
        if (col === 1 || col === 3 || col === 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    // ========================================
    // SECTION 4: SUMMARY TABLE (ตารางสรุปผลรวม)
    // ========================================
    worksheet.addRow([]); // Empty row
    worksheet.addRow([]); // Empty row

    const summaryTitleRow = worksheet.addRow(['ผลรวม']);
    worksheet.mergeCells(`A${summaryTitleRow.number}:E${summaryTitleRow.number}`);
    const summaryTitleCell = worksheet.getCell(`A${summaryTitleRow.number}`);
    summaryTitleCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF203864' } };
    summaryTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    summaryTitleRow.height = 25;

    const summaryHeaderRow = worksheet.addRow([
      'รหัสอุปกรณ์',
      'อุปกรณ์',
      'ผลรวม',
    ]);
    
    summaryHeaderRow.height = 30;
    for (let col = 1; col <= 3; col++) {
      const cell = summaryHeaderRow.getCell(col);
      cell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF203864' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'medium', color: { argb: 'FF203864' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    }

    // Summary data rows
    data.summary.forEach((item, index) => {
      const row = worksheet.addRow([
        item.code,
        item.description,
        item.totalQty,
      ]);

      row.height = 25;

      // Apply styles to each cell
      for (let col = 1; col <= 3; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Tahoma', size: 11 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };

        // Base color (zebra striping)
        const baseColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseColor } };

        // Alignment
        if (col === 1 || col === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    // ========================================
    // SECTION 5: FOOTER (วันที่สร้างรายงาน)
    // ========================================
    worksheet.addRow([]); // Empty row
    
    const footerRow = worksheet.addRow([
      `สร้างรายงานเมื่อ: ${formatReportDateTime(new Date())}`
    ]);
    worksheet.mergeCells(`A${footerRow.number}:E${footerRow.number}`);
    footerRow.height = 22;
    
    const footerCell = footerRow.getCell(1);
    footerCell.font = { name: 'Tahoma', size: 11, italic: true, color: { argb: 'FF666666' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ========================================
    // FINAL: SET COLUMN WIDTHS
    // ========================================
    worksheet.getColumn(1).width = 25;   // รหัสอุปกรณ์
    worksheet.getColumn(2).width = 50;   // อุปกรณ์
    worksheet.getColumn(3).width = 15;   // วันที่
    worksheet.getColumn(4).width = 15;   // เวลา
    worksheet.getColumn(5).width = 20;   // ผู้บันทึก

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

