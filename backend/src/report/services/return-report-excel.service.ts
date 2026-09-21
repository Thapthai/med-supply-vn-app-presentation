import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

function formatReturnByUserName(name?: string | null): string {
  const n = name?.trim();
  return n && n !== 'ไม่ระบุ' ? n : '-';
}

export function getReturnReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    OTHER: 'อื่นๆ',
    UNWRAPPED_UNUSED: 'อื่นๆ (ข้อมูลเก่า)',
    EXPIRED: 'อุปกรณ์หมดอายุ',
    CONTAMINATED: 'อุปกรณ์มีการปนเปื้อน',
    DAMAGED: 'อุปกรณ์ชำรุด',
  };
  return labels[reason] || reason;
}

function formatReturnDateTime(value?: Date | string | null): string {
  if (value == null || value === '') return '-';
  if (value instanceof Date) {
    return formatReportDateTimeUtc(value.toISOString());
  }
  return formatReportDateTimeUtc(value);
}

function formatCabinetDisplay(record: {
  cabinet_name?: string;
  cabinet_code?: string;
  department_name?: string;
}): string {
  return [record.cabinet_name || record.cabinet_code, record.department_name].filter(Boolean).join(' / ') || '-';
}

export interface ReturnReportData {
  filters?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  };
  summary: {
    total_records: number;
    total_qty_returned: number;
  };
  data: Array<{
    id: number;
    qty_returned: number;
    return_reason: string;
    return_datetime: Date | string;
    return_by_user_id?: string;
    return_by_user_name?: string;
    return_note?: string;
    cabinet_name?: string;
    cabinet_code?: string;
    department_name?: string;
    supply_item?: {
      order_item_code?: string;
      order_item_description?: string;
      supply_code?: string;
      supply_name?: string;
      usage?: {
        patient_hn?: string;
        en?: string;
        first_name?: string;
        lastname?: string;
        department_code?: string;
      };
    };
  }>;
}

@Injectable()
export class ReturnReportExcelService {
  async generateReport(data: ReturnReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานอุปกรณ์ที่ไม่ถูกใช้งาน', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = formatReportDateOnly(new Date());

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:I2',
      title: 'รายงานอุปกรณ์ที่ไม่ถูกใช้งาน\nReturn Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:I3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    const filterLabels = ['วันที่เริ่ม', 'วันที่สิ้นสุด', 'สาเหตุ'];
    const filterValues = [
      formatFilterDateSlashBE(filters.date_from),
      formatFilterDateSlashBE(filters.date_to),
      filters.return_reason ? getReturnReasonLabel(filters.return_reason) : 'ทั้งหมด',
    ];
    const filterColMap: [string, string][] = [
      ['A', 'C'],
      ['D', 'F'],
      ['G', 'I'],
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
      'ตู้',
      'ชื่อผู้เติม',
      'จำนวน',
      'สาเหตุ',
      'วันที่',
      'หมายเหตุ',
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
    data.data.forEach((record, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const itemCode = record.supply_item?.order_item_code || record.supply_item?.supply_code || '-';
      const itemName = record.supply_item?.order_item_description || record.supply_item?.supply_name || '-';

      [
        idx + 1,
        itemCode,
        itemName,
        formatCabinetDisplay(record),
        formatReturnByUserName(record.return_by_user_name),
        record.qty_returned,
        getReturnReasonLabel(record.return_reason),
        formatReturnDateTime(record.return_datetime),
        record.return_note || '-',
      ].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val as ExcelJS.CellValue;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal:
            colIndex === 2 || colIndex === 3 || colIndex === 4 || colIndex === 6 || colIndex === 8
              ? 'left'
              : 'center',
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

    worksheet.addRow([]);

    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:I${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:I${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ | จำนวนชิ้น: ${data.summary?.total_qty_returned ?? 0} ชิ้น`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 40;
    worksheet.getColumn(4).width = 22;
    worksheet.getColumn(5).width = 18;
    worksheet.getColumn(6).width = 10;
    worksheet.getColumn(7).width = 30;
    worksheet.getColumn(8).width = 28;
    worksheet.getColumn(9).width = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
