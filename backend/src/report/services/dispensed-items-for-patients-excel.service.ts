import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateSlashBE } from '../utils/date-timeformat';

const COL_LETTER = 'I';
const DETAIL_HEADERS = [
  'ลำดับ',
  'รหัสอุปกรณ์',
  'ชื่ออุปกรณ์',
  'จำนวน',
  'หน่วย',
  'Assession No',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'สถานะ',
] as const;

const STATUS_OK = 'FF16A34A';
const STATUS_ERR = 'FFDC2626';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

/** แถวในตาราง — ตรง MedicalSupplySelectedDetailSection (9 คอลัมน์) */
export interface DispensedUsageItemDetailRow {
  seq: number;
  itemcode: string;
  itemname: string;
  qty: number;
  uom: string;
  assession_no: string;
  created_at: string;
  updated_at: string;
  order_item_status_label: string;
}

/** กลุ่มต่อ 1 ครั้งเบิก (usage) */
export interface DispensedUsageDetailGroup {
  usage_seq: number;
  patient_hn: string;
  en: string;
  items: DispensedUsageItemDetailRow[];
  /** แสดงเมื่อไม่มีแถวใน groupedLatest */
  empty_message?: string;
}

export interface DispensedItemsForPatientsReportData {
  filters?: {
    keyword?: string;
    item_keyword?: string;
    patient_keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    departmentName?: string;
    usageType?: string;
  };
  summary: {
    total_usages: number;
    total_detail_lines: number;
  };
  usage_groups: DispensedUsageDetailGroup[];
}

@Injectable()
export class DispensedItemsForPatientsExcelService {
  async generateReport(data: DispensedItemsForPatientsReportData): Promise<Buffer> {
    if (!data?.usage_groups || !Array.isArray(data.usage_groups)) {
      throw new Error('Invalid data structure: usage_groups must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายการอุปกรณ์ที่เบิก', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = formatReportDateOnly(new Date());

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: `A1:${COL_LETTER}2`,
      title: 'บันทึกใช้อุปกรณ์กับคนไข้\nDispensed Items for Patients Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells(`A3:${COL_LETTER}3`);
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    const filterLabels = ['วันที่เริ่ม', 'วันที่สิ้นสุด', 'Division', 'แผนกย่อย'];
    const filterValues = [
      formatFilterDateSlashBE(filters.startDate),
      formatFilterDateSlashBE(filters.endDate),
      (filters as { departmentName?: string }).departmentName ?? filters.departmentCode ?? 'ทั้งหมด',
      filters.usageType?.trim() ? filters.usageType.trim() : 'ทั้งหมด',
    ];
    const filterColMap: [string, string][] = [
      ['A', 'B'],
      ['C', 'D'],
      ['E', 'F'],
      ['G', COL_LETTER],
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
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 20;

    const tableStartRow = 5;
    const headerRow = worksheet.getRow(tableStartRow);
    DETAIL_HEADERS.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = {
        horizontal: i === 2 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 28;

    let dataRowIndex = tableStartRow + 1;
    const groups = data.usage_groups;
    const alignLeft = (colIndex: number) => colIndex === 2;

    if (groups.length === 0) {
      const excelRow = worksheet.getRow(dataRowIndex);
      const cell = excelRow.getCell(1);
      cell.value = 'ไม่มีข้อมูล';
      cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`A${dataRowIndex}:${COL_LETTER}${dataRowIndex}`);
      excelRow.height = 22;
      dataRowIndex++;
    } else {
      let globalLineIdx = 0;
      for (const group of groups) {
        const groupRow = worksheet.getRow(dataRowIndex);
        worksheet.mergeCells(`A${dataRowIndex}:${COL_LETTER}${dataRowIndex}`);
        const groupCell = groupRow.getCell(1);
        groupCell.value = `รายการเบิกที่ ${group.usage_seq}  |  HN ${group.patient_hn}  |  EN ${group.en}`;
        groupCell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FF1A365D' } };
        groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
        groupCell.alignment = { horizontal: 'left', vertical: 'middle' };
        groupCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        groupRow.height = 24;
        dataRowIndex++;

        if (group.empty_message) {
          const emptyRow = worksheet.getRow(dataRowIndex);
          worksheet.mergeCells(`A${dataRowIndex}:${COL_LETTER}${dataRowIndex}`);
          const emptyCell = emptyRow.getCell(1);
          emptyCell.value = group.empty_message;
          emptyCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
          emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
          emptyCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          emptyRow.height = 22;
          dataRowIndex++;
          continue;
        }

        for (const item of group.items) {
          const bg = globalLineIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
          globalLineIdx++;
          const excelRow = worksheet.getRow(dataRowIndex);
          const statusLower = String(item.order_item_status_label).toLowerCase();
          const values: (string | number)[] = [
            item.seq,
            item.itemcode,
            item.itemname,
            item.qty,
            item.uom,
            item.assession_no,
            item.created_at,
            item.updated_at,
            item.order_item_status_label,
          ];
          values.forEach((val, colIndex) => {
            const cell = excelRow.getCell(colIndex + 1);
            cell.value = val;
            if (colIndex === 8) {
              if (statusLower === 'ยืนยันแล้ว') {
                cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: STATUS_OK } };
              } else if (statusLower === 'ยกเลิก') {
                cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: STATUS_ERR } };
              } else {
                cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
              }
            } else {
              cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
            }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.alignment = {
              horizontal:
                colIndex === 0 || colIndex === 3
                  ? 'center'
                  : alignLeft(colIndex)
                    ? 'left'
                    : 'center',
              vertical: 'middle',
              wrapText: colIndex === 2,
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
        }
      }
    }

    worksheet.addRow([]);

    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:${COL_LETTER}${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:${COL_LETTER}${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    const dateRangeNote =
      filters.startDate || filters.endDate
        ? `แสดงตามวันที่เลือก: ${filters.startDate || '–'} ถึง ${filters.endDate || '–'} | `
        : '';
    noteCell.value = `${dateRangeNote}จำนวนครั้งเบิก: ${data.summary?.total_usages ?? 0} รายการ | รายการอุปกรณ์รวม: ${data.summary?.total_detail_lines ?? 0} แถว`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 34;
    worksheet.getColumn(3).width = 40;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 16;
    worksheet.getColumn(7).width = 22;
    worksheet.getColumn(8).width = 22;
    worksheet.getColumn(9).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
