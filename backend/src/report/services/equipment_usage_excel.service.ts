import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { EquipmentUsageReportData } from '../types/equipment-usage-report.types';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

export type { EquipmentUsageReportData };

@Injectable()
export class EquipmentUsageExcelService {
  /**
   * Generate equipment usage report in Excel format
   */
  async generateReport(data: EquipmentUsageReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานการใช้อุปกรณ์');

    // ========================================
    // SECTION 1: TITLE SECTION (หัวรายงาน)
    // ========================================
    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:H2',
      title: 'รายงานการใช้อุปกรณ์กับคนไข้\nMedical Equipment Usage Report',
      row1Height: 30,
      row2Height: 28,
    });

    // ========================================
    // SECTION 2: HOSPITAL INFORMATION (ข้อมูลโรงพยาบาล)
    // ========================================
    worksheet.addRow([]); // Empty row

    const hospitalHeaderRow = worksheet.addRow(['ข้อมูลโรงพยาบาล (Hospital Information)']);
    worksheet.mergeCells(`A${hospitalHeaderRow.number}:H${hospitalHeaderRow.number}`);
    const hospitalHeaderCell = worksheet.getCell(`A${hospitalHeaderRow.number}`);
    hospitalHeaderCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF203864' } };
    hospitalHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    hospitalHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    hospitalHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF203864' } },
      left: { style: 'medium', color: { argb: 'FF203864' } },
      bottom: { style: 'medium', color: { argb: 'FF203864' } },
      right: { style: 'medium', color: { argb: 'FF203864' } },
    };
    hospitalHeaderRow.height = 28;

    // Hospital details
    const hospitalDetails: string[][] = [];
    if (data.hospital) hospitalDetails.push(['โรงพยาบาล (Hospital):', data.hospital]);
    if (data.department) hospitalDetails.push(['แผนก (Department):', data.department]);
    if (data.dateFrom || data.dateTo) {
      const dateRange = data.dateFrom && data.dateTo 
        ? `${formatReportDateOnly(data.dateFrom)} ถึง ${formatReportDateOnly(data.dateTo)}`
        : data.dateFrom 
          ? `ตั้งแต่วันที่ ${formatReportDateOnly(data.dateFrom)}`
          : data.dateTo 
            ? `จนถึงวันที่ ${formatReportDateOnly(data.dateTo)}`
            : 'ทุกช่วงเวลา';
      hospitalDetails.push(['ช่วงเวลา (Date Range):', dateRange]);
    }

    hospitalDetails.forEach((detail) => {
      const row = worksheet.addRow(detail);
      row.height = 24;
      
      // Label cell (Column A)
      const labelCell = row.getCell(1);
      labelCell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF203864' } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F0FF' } };
      labelCell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FF203864' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      
      // Value cells (Columns B-H merged)
      worksheet.mergeCells(`B${row.number}:H${row.number}`);
      const valueCell = row.getCell(2);
      valueCell.font = { name: 'Tahoma', size: 13 };
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      valueCell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FF203864' } },
      };
    });

    // ========================================
    // SECTION 3: DATA TABLE (ตารางข้อมูล)
    // ========================================
    worksheet.addRow([]); // Empty row

    const headerRow = worksheet.addRow([
      'ลำดับ\n(No.)',
      'EN',
      'HN',
      'รหัสอุปกรณ์\n(Code)',
      'ชื่ออุปกรณ์\n(Name)',
      'Assession No.',
      'สถานะ\n(Status)',
      'จำนวน\n(Qty)',
    ]);
    
    headerRow.height = 40;
    for (let col = 1; col <= 8; col++) {
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
    data.items.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.en || '-',
        item.hn,
        item.code,
        item.description,
        item.assessionNo || '-',
        item.status || '-',
        item.qty,
      ]);

      row.height = 28;

      // Apply styles to each cell
      for (let col = 1; col <= 8; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Tahoma', size: 13 };
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
        if (col === 1 || col === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    // ========================================
    // SECTION 4: SUMMARY (สรุป)
    // ========================================
    worksheet.addRow([]); // Empty row

    const summaryHeaderRow = worksheet.addRow(['สรุปผล (Summary)']);
    worksheet.mergeCells(`A${summaryHeaderRow.number}:H${summaryHeaderRow.number}`);
    summaryHeaderRow.height = 30;
    const summaryHeaderCell = worksheet.getCell(`A${summaryHeaderRow.number}`);
    summaryHeaderCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF856404' } };
    summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    summaryHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF856404' } },
      left: { style: 'medium', color: { argb: 'FF856404' } },
      bottom: { style: 'thin', color: { argb: 'FF856404' } },
      right: { style: 'medium', color: { argb: 'FF856404' } },
    };

    const summaryRow = worksheet.addRow([
      'รวมทั้งหมด:',
      `${data.items.length} รายการ`,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    
    summaryRow.height = 28;
    
    // Column 1: Total label
    summaryRow.getCell(1).font = { name: 'Tahoma', size: 13, bold: true };
    summaryRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } };
    summaryRow.getCell(1).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FF856404' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    // Column 2: Total value
    summaryRow.getCell(2).font = { name: 'Tahoma', size: 13, bold: true };
    summaryRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    summaryRow.getCell(2).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    // Columns 3-8: Empty
    for (let col = 3; col <= 8; col++) {
      summaryRow.getCell(col).border = {
        top: { style: 'thin', color: { argb: 'FF856404' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FF856404' } },
        right: col === 8 ? { style: 'thin', color: { argb: 'FF856404' } } : { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    // ========================================
    // SECTION 5: FOOTER (วันที่สร้างรายงาน)
    // ========================================
    worksheet.addRow([]); // Empty row
    
    const footerRow = worksheet.addRow([
      `สร้างรายงานเมื่อ: ${formatReportDateTime(new Date())}`
    ]);
    worksheet.mergeCells(`A${footerRow.number}:H${footerRow.number}`);
    footerRow.height = 22;
    
    const footerCell = footerRow.getCell(1);
    footerCell.font = { name: 'Tahoma', size: 11, italic: true, color: { argb: 'FF666666' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ========================================
    // FINAL: SET COLUMN WIDTHS (หลังสร้าง content เสร็จแล้ว)
    // ========================================
    worksheet.getColumn(1).width = 10;   // ลำดับ
    worksheet.getColumn(2).width = 15;   // EN
    worksheet.getColumn(3).width = 15;   // HN
    worksheet.getColumn(4).width = 20;   // รหัสอุปกรณ์
    worksheet.getColumn(5).width = 35;   // ชื่ออุปกรณ์
    worksheet.getColumn(6).width = 20;   // Assession No.
    worksheet.getColumn(7).width = 15;   // สถานะ
    worksheet.getColumn(8).width = 12;   // จำนวน

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
