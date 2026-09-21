import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ComparisonReportData } from '../types/comparison-report.types';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateTime } from '../utils/date-timeformat';

export type { ComparisonReportData };

@Injectable()
export class ComparisonReportExcelService {
  /**
   * Generate comparison report in Excel format
   */
  async generateReport(data: ComparisonReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานเปรียบเทียบ');

    // ========================================
    // SECTION 1: TITLE SECTION (หัวรายงาน)
    // ========================================
    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:I2',
      title:
        'รายงานเปรียบเทียบการเบิกอุปกรณ์และการบันทึกใช้กับคนไข้\nComparative Report on Medical Equipment Dispensing and Patient Usage Documentation',
      row1Height: 30,
      row2Height: 28,
    });

    // ========================================
    // SECTION 2: PATIENT INFORMATION (ข้อมูลผู้ป่วย)
    // ========================================
    worksheet.addRow([]); // Empty row

    const patientHeaderRow = worksheet.addRow(['ข้อมูลผู้ป่วย (Patient Information)']);
    worksheet.mergeCells(`A${patientHeaderRow.number}:I${patientHeaderRow.number}`);
    const patientHeaderCell = worksheet.getCell(`A${patientHeaderRow.number}`);
    patientHeaderCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF203864' } };
    patientHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    patientHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    patientHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF203864' } },
      left: { style: 'medium', color: { argb: 'FF203864' } },
      bottom: { style: 'medium', color: { argb: 'FF203864' } },
      right: { style: 'medium', color: { argb: 'FF203864' } },
    };
    patientHeaderRow.height = 28;

    // Patient details
    const patientDetails = [
      ['HN:', data.usage.patient_hn],
      ['ชื่อ-นามสกุล (Name):', `${data.usage.first_name} ${data.usage.lastname}`],
    ];
    
    if (data.usage.en) patientDetails.push(['EN:', data.usage.en]);
    if (data.usage.department_code) patientDetails.push(['แผนก (Department):', data.usage.department_code]);
    if (data.usage.usage_datetime) {
      patientDetails.push(['วันที่เบิก (Date):', formatReportDateTime(data.usage.usage_datetime)]);
    }

    patientDetails.forEach((detail) => {
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
      
      // Value cells (Columns B-I merged)
      worksheet.mergeCells(`B${row.number}:I${row.number}`);
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
      'รหัสอุปกรณ์\n(Code)',
      'ชื่ออุปกรณ์\n(Name)',
      'จำนวนเบิก\n(Qty)',
      'ใช้กับคนไข้\n(Used)',
      'คืนเข้าตู้\n(Return)',
      'ค้างนำกลับ\n(Pending)',
      'สถานะ\n(Status)',
      'ผลการตรวจสอบ\n(Result)',
    ]);
    
    headerRow.height = 40;
    for (let col = 1; col <= 9; col++) {
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
    let matchCount = 0;
    let notMatchCount = 0;

    data.items.forEach((item, index) => {
      const qtyPending = item.qty_pending ?? (item.qty - item.qty_used_with_patient - item.qty_returned_to_cabinet);
      const isMatch = qtyPending === 0;
      
      if (isMatch) matchCount++;
      else notMatchCount++;

      const row = worksheet.addRow([
        index + 1,
        item.order_item_code || item.supply_code || '-',
        item.order_item_description || item.supply_name || '-',
        item.qty,
        item.qty_used_with_patient,
        item.qty_returned_to_cabinet,
        qtyPending,
        item.item_status,
        isMatch ? '✓ Match' : '✗ Not Match',
      ]);

      row.height = 28;

      // Apply styles to each cell
      for (let col = 1; col <= 9; col++) {
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
        if (col === 1 || col >= 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      // Special styling for pending quantity
      if (qtyPending > 0) {
        const cell = row.getCell(7);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        cell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF856404' } };
      }

      // Special styling for match result
      const matchCell = row.getCell(9);
      if (isMatch) {
        matchCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        matchCell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF155724' } };
      } else {
        matchCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
        matchCell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF721C24' } };
      }
    });

    // ========================================
    // SECTION 4: SUMMARY (สรุป)
    // ========================================
    worksheet.addRow([]); // Empty row

    const summaryHeaderRow = worksheet.addRow(['สรุปผลการตรวจสอบ (Summary)']);
    worksheet.mergeCells(`A${summaryHeaderRow.number}:I${summaryHeaderRow.number}`);
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
      'ทั้งหมด:',
      `${data.items.length} รายการ`,
      '',
      'ถูกต้อง:',
      `${matchCount} รายการ`,
      '',
      'ไม่ถูกต้อง:',
      `${notMatchCount} รายการ`,
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
    
    // Column 3: Empty
    summaryRow.getCell(3).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    // Columns 4-5: Match
    summaryRow.getCell(4).font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF155724' } };
    summaryRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    summaryRow.getCell(4).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    summaryRow.getCell(5).font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF155724' } };
    summaryRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    summaryRow.getCell(5).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    // Column 6: Empty
    summaryRow.getCell(6).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    // Columns 7-8: Not Match
    summaryRow.getCell(7).font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF721C24' } };
    summaryRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
    summaryRow.getCell(7).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    summaryRow.getCell(8).font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FF721C24' } };
    summaryRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
    summaryRow.getCell(8).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    
    // Column 9: Empty
    summaryRow.getCell(9).border = {
      top: { style: 'thin', color: { argb: 'FF856404' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF856404' } },
      right: { style: 'thin', color: { argb: 'FF856404' } },
    };

    // ========================================
    // SECTION 5: FOOTER (วันที่สร้างรายงาน)
    // ========================================
    worksheet.addRow([]); // Empty row
    
    const footerRow = worksheet.addRow([
      `สร้างรายงานเมื่อ: ${formatReportDateTime(new Date())}`
    ]);
    worksheet.mergeCells(`A${footerRow.number}:I${footerRow.number}`);
    footerRow.height = 22;
    
    const footerCell = footerRow.getCell(1);
    footerCell.font = { name: 'Tahoma', size: 11, italic: true, color: { argb: 'FF666666' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ========================================
    // FINAL: SET COLUMN WIDTHS (หลังสร้าง content เสร็จแล้ว)
    // ========================================
    worksheet.getColumn(1).width = 10;   // ลำดับ
    worksheet.getColumn(2).width = 20;   // รหัสอุปกรณ์
    worksheet.getColumn(3).width = 35;   // ชื่ออุปกรณ์
    worksheet.getColumn(4).width = 15;   // จำนวนเบิก
    worksheet.getColumn(5).width = 15;   // ใช้กับคนไข้
    worksheet.getColumn(6).width = 15;   // คืนเข้าตู้
    worksheet.getColumn(7).width = 15;   // ค้างนำกลับ
    worksheet.getColumn(8).width = 15;   // สถานะ
    worksheet.getColumn(9).width = 15;   // ผลการตรวจสอบ

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
