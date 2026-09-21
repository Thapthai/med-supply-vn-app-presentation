import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly } from '../utils/date-timeformat';

export interface CancelBillReportData {
  filters?: {
    startDate?: string;
    endDate?: string;
  };
  summary: {
    total_cancelled_bills: number;
    total_cancelled_items: number;
  };
  data: Array<{
    id: number;
    en: string;
    patient_hn: string;
    patient_name: string;
    print_date?: string;
    created_at: Date;
    billing_status: string;
    cancelled_items: Array<{
      item_code: string;
      item_name: string;
      assession_no?: string;
      qty: number;
      qty_used_with_patient: number;
      order_item_status: string;
    }>;
  }>;
}

@Injectable()
export class CancelBillReportExcelService {
  async generateReport(data: CancelBillReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานยกเลิก Bill');

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:J2',
      title: 'รายงานยกเลิก Bill',
      row1Height: 28,
      row2Height: 28,
    });

    // Filters
    worksheet.addRow([]);
    if (data.filters) {
      worksheet.addRow(['เงื่อนไขการค้นหา']);
      if (data.filters.startDate || data.filters.endDate) {
        worksheet.addRow(['วันที่', `${data.filters.startDate || ''} ถึง ${data.filters.endDate || ''}`]);
      }
      worksheet.addRow([]);
    }

    // Summary
    worksheet.addRow(['สรุปผล (Summary)']);
    worksheet.addRow(['จำนวน Bill ที่ยกเลิก', data.summary.total_cancelled_bills]);
    worksheet.addRow(['จำนวนรายการที่ยกเลิก', data.summary.total_cancelled_items]);
    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow([
      'ลำดับ',
      'EN',
      'HN',
      'ชื่อคนไข้',
      'วันที่ Print',
      'วันที่ยกเลิก',
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'จำนวน',
      'สถานะ',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 25;

    // Data rows - Flatten cancelled_items
    let rowIndex = 0;
    data.data.forEach((record) => {
      if (record.cancelled_items && record.cancelled_items.length > 0) {
        record.cancelled_items.forEach((item, itemIndex) => {
          const isFirstItem = itemIndex === 0;
          const row = worksheet.addRow([
            isFirstItem ? rowIndex + 1 : '',
            isFirstItem ? record.en : '',
            isFirstItem ? record.patient_hn : '',
            isFirstItem ? record.patient_name : '',
            isFirstItem ? (record.print_date ? formatReportDateOnly(record.print_date) : '-') : '',
            isFirstItem ? formatReportDateOnly(record.created_at) : '',
            item.item_code,
            item.item_name,
            item.qty,
            'ยกเลิก',
          ]);
          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Tahoma', size: 11 };
            cell.alignment = { 
              horizontal: colNumber === 1 || colNumber === 7 || colNumber === 8 || colNumber === 10 ? 'left' : 'center', 
              vertical: 'middle' 
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
      } else {
        // If no cancelled items, still show the record
        const row = worksheet.addRow([
          rowIndex + 1,
          record.en,
          record.patient_hn,
          record.patient_name,
          record.print_date ? formatReportDateOnly(record.print_date) : '-',
          formatReportDateOnly(record.created_at),
          '-',
          '-',
          0,
          'ยกเลิก',
        ]);
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Tahoma', size: 11 };
          cell.alignment = { 
            horizontal: colNumber === 1 || colNumber === 7 || colNumber === 8 || colNumber === 10 ? 'left' : 'center', 
            vertical: 'middle' 
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        rowIndex++;
      }
    });

    // Set column widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 18;
    worksheet.getColumn(6).width = 18;
    worksheet.getColumn(7).width = 18;
    worksheet.getColumn(8).width = 35;
    worksheet.getColumn(9).width = 12;
    worksheet.getColumn(10).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

