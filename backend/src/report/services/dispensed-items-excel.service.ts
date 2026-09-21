import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';
import { formatQtyWithMainUnitForReport } from '../utils/format-item-qty';

export interface DispensedItemRow {
  RowID: number;
  itemcode: string;
  itemname: string;
  modifyDate: string;
  qty: number;
  itemCategory?: string;
  itemtypeID?: number;
  RfidCode?: string;
  StockID?: number;
  Istatus_rfid?: number;
  CabinetUserID?: number;
  cabinetUserName?: string;
  departmentName?: string;
  cabinetName?: string;
  cabinetCode?: string;
  unit?: { UnitName?: string | null };
  subUnit?: { UnitName?: string | null };
  SubUnitQty?: number | null;
  borrowDepartmentName?: string | null;
  isBorrow?: boolean;
  borrowRemark?: string | null;
}

function borrowRemarkCell(item: DispensedItemRow): string {
  if (item.isBorrow || (item.borrowRemark != null && String(item.borrowRemark).trim() !== '')) {
    const r = item.borrowRemark != null ? String(item.borrowRemark).trim() : '';
    return r || 'ยืม';
  }
  return '-';
}

/** filter วันที่เริ่ม/สิ้นสุด: ว่าง = ทั้งหมด, มีค่า = d/m/Y (พ.ศ.) */
function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

export interface DispensedItemsReportGroup {
  itemcode: string;
  itemname: string;
  dispenseTime: string;
  totalQty: number;
  items: DispensedItemRow[];
}

export interface DispensedItemsReportData {
  filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    departmentName?: string;
    cabinetName?: string;
  };
  summary: {
    total_records: number;
    total_qty: number;
  };
  data: DispensedItemRow[];
  /** กลุ่มตามรหัสอุปกรณ์และเวลาที่เบิก (±3 วินาที) สำหรับแสดงแถวสรุป + รายการย่อย */
  groups?: DispensedItemsReportGroup[];
}

@Injectable()
export class DispensedItemsExcelService {
  async generateReport(data: DispensedItemsReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานการเบิกอุปกรณ์', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = formatReportDateOnly(new Date());

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:I2',
      title: 'รายงานการเบิกอุปกรณ์\nDispensed Items Report',
      row1Height: 20,
      row2Height: 20,
    });

    // ---- แถว 3: วันที่รายงาน ----
    worksheet.mergeCells('A3:I3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // ---- แถว 4: Filter summary (แผนก | ตู้ | วันที่เริ่ม | วันที่สิ้นสุด) ----
    const filters = data.filters ?? {};
    const filterLabels = ['Division', 'ตู้ Cabinet', 'วันที่เริ่ม', 'วันที่สิ้นสุด'];
    const filterValues = [
      filters.departmentName ?? (filters.departmentId ? filters.departmentId : 'ทั้งหมด'),
      filters.cabinetName ?? (filters.cabinetId ? filters.cabinetId : 'ทั้งหมด'),
      formatFilterDateSlashBE(filters.startDate),
      formatFilterDateSlashBE(filters.endDate),
    ];
    // แถว 4: 4 กลุ่มครอบคลุม A–I
    const filterColMap: [string, string][] = [['A', 'C'], ['D', 'F'], ['G', 'H'], ['I', 'I']];
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
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 20;

    // ---- แถว 5: Table header (ตรงกับหน้าเว็บ) ----
    const tableStartRow = 5;
    const tableHeaders = [
      'ลำดับ',
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'จำนวน (หน่วยการเบิก)',
      'วันที่เบิก',
      'Division ที่ตั้งตู้',
      'Division ที่ยืม',
      'หมายเหตุ',
      'ชื่อผู้เบิก',
    ];
    const alignLeft = (colIndex: number) => [1, 2, 5, 6, 8].includes(colIndex);
    const headerRow = worksheet.getRow(tableStartRow);
    tableHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 26;

    // ---- แถวข้อมูล (จัดกลุ่มหรือแบน) ----
    let dataRowIndex = tableStartRow + 1;
    const useGroups = data.groups && data.groups.length > 0;

    if (useGroups && data.groups) {
      let rowNum = 1;
      for (const group of data.groups) {
        // แถวสรุปกลุ่ม (ตรงหน้าเว็บ: ลำดับ, รหัส, ชื่อ, จำนวนชิ้น, วันที่เบิก, แผนก, ชื่อผู้เบิก)
        const groupRow = worksheet.getRow(dataRowIndex);
        const qtyDisplay = formatQtyWithMainUnitForReport(group.totalQty, group.items[0] ?? {});
        const mainRowDispenser = (() => {
          const n = group.items[0]?.cabinetUserName?.trim();
          return n && n !== 'ไม่ระบุ' ? n : '-';
        })();
        const first = group.items[0];
        [
          rowNum,
          group.itemcode,
          group.itemname || '-',
          qtyDisplay,
          formatReportDateTimeUtc(group.dispenseTime),
          first?.departmentName ?? '-',
          first?.borrowDepartmentName?.trim() ? first.borrowDepartmentName : '-',
          borrowRemarkCell(first ?? {}),
          mainRowDispenser,
        ].forEach((val, colIndex) => {
          const cell = groupRow.getCell(colIndex + 1);
          cell.value = val as any;
          cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FF1A365D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
          cell.alignment = { horizontal: alignLeft(colIndex) ? 'left' : 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        groupRow.height = 24;
        dataRowIndex++;

        // แถวรายการในกลุ่ม
        group.items.forEach((item, subIdx) => {
          const excelRow = worksheet.getRow(dataRowIndex);
          const subLabel = '';
          [
            subLabel,
            item.itemcode,
            item.itemname ?? '-',
            formatQtyWithMainUnitForReport(item.qty ?? 1, item),
            formatReportDateTimeUtc(item.modifyDate),
            item.departmentName ?? '-',
            item.borrowDepartmentName?.trim() ? item.borrowDepartmentName : '-',
            borrowRemarkCell(item),
            item.cabinetUserName && item.cabinetUserName !== 'ไม่ระบุ' ? item.cabinetUserName : '-',
          ].forEach((val, colIndex) => {
            const cell = excelRow.getCell(colIndex + 1);
            cell.value = val as any;
            cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: alignLeft(colIndex) ? 'left' : 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });
          excelRow.height = 22;
          dataRowIndex++;
        });
        rowNum++;
      }
    } else {
      data.data.forEach((item, idx) => {
        const excelRow = worksheet.getRow(dataRowIndex);
        const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
        [
          idx + 1,
          item.itemcode,
          item.itemname ?? '-',
          formatQtyWithMainUnitForReport(item.qty ?? 1, item),
          formatReportDateTimeUtc(item.modifyDate),
          item.departmentName ?? '-',
          item.borrowDepartmentName?.trim() ? item.borrowDepartmentName : '-',
          borrowRemarkCell(item),
          item.cabinetUserName ?? 'ไม่ระบุ',
        ].forEach((val, colIndex) => {
          const cell = excelRow.getCell(colIndex + 1);
          cell.value = val as any;
          cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = {
            horizontal: alignLeft(colIndex) ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        excelRow.height = 24;
        dataRowIndex++;
      });
    }

    worksheet.addRow([]);

    // ---- Footer + หมายเหตุ ----
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
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    // ---- ความกว้างคอลัมน์ (9 คอลัมน์) ----
    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 36;
    worksheet.getColumn(4).width = 22;
    worksheet.getColumn(5).width = 22;
    worksheet.getColumn(6).width = 22;
    worksheet.getColumn(7).width = 22;
    worksheet.getColumn(8).width = 12;
    worksheet.getColumn(9).width = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
