import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

/** รายการอ้างอิงสำหรับ dropdown (หน่วย / แผนก) */
interface RefRow {
  id: number;
  name: string;
}

/** ข้อมูล Item ที่ดึงมาเติมในไฟล์ template (1 แถวต่อ 1 Item) */
interface ItemRow {
  itemcode: string;
  itemname: string;
  barcode: string;
  unit: string;
  subUnit: string;
  subUnitQty: string;
  /** ชื่อแผนกที่ใช้ Item นี้ สูงสุด 3 แผนก */
  departments: string[];
  status: string;
}

/** นิยามคอลัมน์ในชีตกรอกข้อมูล */
interface TemplateColumn {
  /** คีย์ภายใน (ใช้กับ logic ฝั่ง upload) */
  key: string;
  /** ป้ายหัวคอลัมน์ (ภาษาไทย) */
  header: string;
  /** ความกว้างคอลัมน์ */
  width: number;
  /** เป็นช่องบังคับกรอกหรือไม่ */
  required?: boolean;
  /** คำอธิบายเพิ่มเติม (แสดงเป็น note บนหัวคอลัมน์) */
  note?: string;
  /** ชนิด dropdown */
  dropdown?: 'unit' | 'department' | 'status';
}

const SHEET_DATA = 'Item Master';

/** จำนวนแถวที่เปิดให้กรอก (ใส่ data validation ครอบไว้ล่วงหน้า) */
const DATA_ROWS = 1000;

/** จำนวนแถวว่างที่เพิ่มต่อท้ายรายการ Item เดิม เพื่อให้เพิ่ม Item ใหม่ได้ */
const EXTRA_BLANK_ROWS = 200;

/** คอลัมน์ helper (ซ่อนไว้) สำหรับเก็บค่า dropdown หน่วย/แผนก บนชีตเดียวกัน */
const HELPER_UNIT_COL = 20; // คอลัมน์ T
const HELPER_DEPT_COL = 21; // คอลัมน์ U

const STATUS_OPTIONS = ['ใช้งาน', 'ปิดการใช้งาน'];

const COLUMNS: TemplateColumn[] = [
  {
    key: 'itemcode',
    header: 'รหัส Item *',
    width: 30,
    required: true,
    note: 'รหัสเวชภัณฑ์ — บังคับกรอก เช่น MED2024001 (ถ้ามีอยู่แล้วจะอัปเดต ถ้าไม่มีจะเพิ่มใหม่)',
  },
  {
    key: 'itemname',
    header: 'ชื่ออุปกรณ์ *',
    width: 70,
    required: true,
    note: 'ชื่อเวชภัณฑ์/อุปกรณ์ — บังคับกรอก',
  },
  {
    key: 'department1',
    header: 'แผนกที่ใช้ 1',
    width: 24,
    dropdown: 'department',
    note: 'แผนกที่ใช้ Item นี้ — เลือกจากรายการ (เว้นว่าง = ทุกแผนก)',
  },
  {
    key: 'department2',
    header: 'แผนกที่ใช้ 2',
    width: 24,
    dropdown: 'department',
    note: 'แผนกเพิ่มเติม (ไม่บังคับ)',
  },
  {
    key: 'department3',
    header: 'แผนกที่ใช้ 3',
    width: 24,
    dropdown: 'department',
    note: 'แผนกเพิ่มเติม (ไม่บังคับ) — สูงสุด 3 แผนกต่อ Item',
  },
];

const COLOR = {
  headerBg: 'FF1A365D',
  headerText: 'FFFFFFFF',
  requiredBg: 'FFB7791F',
  exampleBg: 'FFF1F5F9',
  exampleText: 'FF94A3B8',
  border: 'FFB0B7C3',
};

/**
 * สร้างไฟล์ Excel template สำหรับเพิ่ม/อัปเดต Item Master (ส่วนของ report)
 * — การอ่านไฟล์ที่อัปโหลด (parse + upsert) อยู่ที่ item module
 */
@Injectable()
export class ItemMasterUploadService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * ดึง units + departments + items ทั้งหมดจาก DB แล้วสร้างไฟล์ template (เติมรายการเดิมมาด้วย)
   * @param opts.departmentScope รายการ DepartmentID ที่ผู้ใช้เข้าถึงได้ (ฝั่ง staff)
   *   - ถ้ากำหนด: แสดงเฉพาะ Item ที่ "ทุกแผนก" หรือมีแผนกอยู่ใน scope และจำกัดคอลัมน์แผนกเฉพาะที่อยู่ใน scope
   *     (ให้ตรงกับที่แสดงในหน้าเว็บ staff)
   *   - ถ้าไม่กำหนด (admin): แสดงทุก Item และทุกแผนก
   */
  async buildTemplate(opts?: {
    departmentScope?: number[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    // หมายเหตุ: ไม่ select คอลัมน์ IsCancel ของ unit/department ออกมา
    // เพราะค่าจริงใน DB ไม่ตรงชนิดที่ schema ประกาศ (Prisma แปลงไม่ได้) — ใช้ where กรองแทน
    const [unitsAll, deptsAll, unitsActive, deptsActive, items, itemDepts] = await Promise.all([
      // ทั้งหมด (รวมที่ยกเลิก) สำหรับแปลง id → ชื่อ ของ Item เดิมให้ครบ
      this.prisma.unit.findMany({
        orderBy: { UnitName: 'asc' },
        select: { ID: true, UnitName: true },
      }),
      this.prisma.department.findMany({
        orderBy: { DepName: 'asc' },
        select: { ID: true, DepName: true, DepName2: true },
      }),
      // เฉพาะที่ active สำหรับเป็นตัวเลือก dropdown
      this.prisma.unit.findMany({
        where: { OR: [{ IsCancel: false }, { IsCancel: null }] },
        orderBy: { UnitName: 'asc' },
        select: { ID: true, UnitName: true },
      }),
      this.prisma.department.findMany({
        where: { OR: [{ IsCancel: 0 }, { IsCancel: null }] },
        orderBy: { DepName: 'asc' },
        select: { ID: true, DepName: true, DepName2: true },
      }),
      this.prisma.item.findMany({
        orderBy: { itemcode: 'asc' },
        select: {
          itemcode: true,
          itemname: true,
          Barcode: true,
          UnitID: true,
          SubUnitID: true,
          SubUnitQty: true,
          IsCancel: true,
        },
      }),
      this.prisma.itemDepartments.findMany({
        where: { NOT: { IsCancel: 1 } },
        orderBy: { ID: 'asc' },
        select: { itemcode: true, DeptID: true },
      }),
    ]);

    // map id → ชื่อ (ครบทุกตัว เพื่อแสดงค่าของ Item เดิมที่อาจอ้างถึงหน่วย/แผนกที่ถูกยกเลิก)
    const unitNameById = new Map<number, string>();
    unitsAll.forEach((u) => {
      const name = (u.UnitName ?? '').trim();
      if (name) unitNameById.set(u.ID, name);
    });
    const deptNameById = new Map<number, string>();
    deptsAll.forEach((d) => {
      const name = (d.DepName || d.DepName2 || '').trim();
      if (name) deptNameById.set(d.ID, name);
    });

    // รายการ dropdown ใช้เฉพาะที่ยัง active
    const unitRows: RefRow[] = unitsActive
      .filter((u) => (u.UnitName ?? '').trim() !== '')
      .map((u) => ({ id: u.ID, name: (u.UnitName ?? '').trim() }));
    const deptRows: RefRow[] = deptsActive
      .map((d) => ({ id: d.ID, name: (d.DepName || d.DepName2 || '').trim() }))
      .filter((d) => d.name !== '');

    // รวม DepartmentID ของแต่ละ Item (สูงสุด 3 แผนก ไม่ซ้ำ)
    const deptIdsByItem = new Map<string, number[]>();
    itemDepts.forEach((r) => {
      if (r.DeptID == null) return;
      const arr = deptIdsByItem.get(r.itemcode) ?? [];
      if (arr.length < 3 && !arr.includes(r.DeptID)) arr.push(r.DeptID);
      deptIdsByItem.set(r.itemcode, arr);
    });

    // scope แผนกของผู้ใช้ (ฝั่ง staff) — ถ้ากำหนดมาให้กรองตามที่หน้าเว็บแสดง
    const scope = opts?.departmentScope;
    const hasScope = Array.isArray(scope);
    const scopeSet = hasScope
      ? new Set(scope.filter((n) => n != null && n > 0))
      : null;

    const itemRows: ItemRow[] = [];
    for (const it of items) {
      const ids = deptIdsByItem.get(it.itemcode) ?? [];

      // กรองแถวตาม scope (เหมือนหน้าเว็บ): แสดงเฉพาะ "ทุกแผนก" หรือมีแผนกอยู่ใน scope
      if (hasScope && scopeSet && ids.length > 0) {
        const inScope = ids.some((id) => scopeSet.has(id));
        if (!inScope) continue;
      }

      // แสดงทุกแผนกที่ item นั้นสังกัด (ให้ตรงกับคอลัมน์ แผนก บนหน้าเว็บ)
      const departments = ids
        .map((id) => deptNameById.get(id))
        .filter((n): n is string => !!n)
        .slice(0, 3);

      itemRows.push({
        itemcode: it.itemcode,
        itemname: (it.itemname ?? '').trim(),
        barcode: (it.Barcode ?? '').trim(),
        unit: it.UnitID && it.UnitID > 0 ? (unitNameById.get(it.UnitID) ?? '') : '',
        subUnit: it.SubUnitID && it.SubUnitID > 0 ? (unitNameById.get(it.SubUnitID) ?? '') : '',
        subUnitQty: it.SubUnitQty && it.SubUnitQty > 0 ? String(it.SubUnitQty) : '',
        departments,
        status: it.IsCancel === 1 ? 'ปิดการใช้งาน' : 'ใช้งาน',
      });
    }

    const buffer = await this.generateTemplate(unitRows, deptRows, itemRows);
    const date = new Date().toISOString().split('T')[0];
    return { buffer, filename: `item_master_${date}.xlsx` };
  }

  /** ค่าในแต่ละคอลัมน์ของแถว Item ตาม key */
  private valueForColumn(row: ItemRow, key: string): string {
    switch (key) {
      case 'itemcode':
        return row.itemcode;
      case 'itemname':
        return row.itemname;
      case 'barcode':
        return row.barcode;
      case 'unit':
        return row.unit;
      case 'subUnit':
        return row.subUnit;
      case 'subUnitQty':
        return row.subUnitQty;
      case 'department1':
        return row.departments[0] ?? '';
      case 'department2':
        return row.departments[1] ?? '';
      case 'department3':
        return row.departments[2] ?? '';
      case 'status':
        return row.status;
      default:
        return '';
    }
  }

  /** สร้างไฟล์ Excel template (ชีตเดียว) พร้อมเติมรายการ Item เดิม */
  private async generateTemplate(
    units: RefRow[],
    departments: RefRow[],
    itemRows: ItemRow[] = [],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Samart Cabinet';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(SHEET_DATA, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // หัวคอลัมน์
    const headerRow = sheet.getRow(1);
    COLUMNS.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: COLOR.headerText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col.required ? COLOR.requiredBg : COLOR.headerBg },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR.border } },
        left: { style: 'thin', color: { argb: COLOR.border } },
        bottom: { style: 'thin', color: { argb: COLOR.border } },
        right: { style: 'thin', color: { argb: COLOR.border } },
      };
      if (col.note) {
        cell.note = {
          texts: [{ text: col.note }],
          margins: { insetmode: 'auto' },
        } as ExcelJS.Comment;
      }
      sheet.getColumn(idx + 1).width = col.width;
    });
    headerRow.height = 32;

    const firstDataRow = 2;

    // เติมรายการ Item เดิมลงในแต่ละแถว
    itemRows.forEach((row, i) => {
      const excelRow = sheet.getRow(firstDataRow + i);
      COLUMNS.forEach((col, idx) => {
        const cell = excelRow.getCell(idx + 1);
        const v = this.valueForColumn(row, col.key);
        if (v !== '') cell.value = v;
        cell.font = { name: 'Tahoma', size: 11 };
        cell.alignment = { vertical: 'middle', wrapText: false };
        cell.border = {
          top: { style: 'thin', color: { argb: COLOR.border } },
          left: { style: 'thin', color: { argb: COLOR.border } },
          bottom: { style: 'thin', color: { argb: COLOR.border } },
          right: { style: 'thin', color: { argb: COLOR.border } },
        };
      });
    });

    // เก็บค่า dropdown (หน่วย/แผนก) ไว้ในคอลัมน์ helper ที่ซ่อนไว้บนชีตเดียวกัน
    units.forEach((u, i) => {
      sheet.getCell(i + 1, HELPER_UNIT_COL).value = u.name;
    });
    departments.forEach((d, i) => {
      sheet.getCell(i + 1, HELPER_DEPT_COL).value = d.name;
    });
    sheet.getColumn(HELPER_UNIT_COL).hidden = true;
    sheet.getColumn(HELPER_DEPT_COL).hidden = true;

    // ใส่ data validation (dropdown) ครอบทั้งรายการเดิม + แถวว่างสำหรับเพิ่มใหม่
    const dataRowCount = Math.max(DATA_ROWS, itemRows.length + EXTRA_BLANK_ROWS);
    const lastDataRow = firstDataRow + dataRowCount - 1;
    const unitColLetter = sheet.getColumn(HELPER_UNIT_COL).letter;
    const deptColLetter = sheet.getColumn(HELPER_DEPT_COL).letter;
    const unitRange =
      units.length > 0 ? `$${unitColLetter}$1:$${unitColLetter}$${units.length}` : null;
    const deptRange =
      departments.length > 0 ? `$${deptColLetter}$1:$${deptColLetter}$${departments.length}` : null;

    COLUMNS.forEach((col, idx) => {
      if (!col.dropdown) return;
      let formulae: string[] | null = null;
      if (col.dropdown === 'status') {
        formulae = [`"${STATUS_OPTIONS.join(',')}"`];
      } else if (col.dropdown === 'unit' && unitRange) {
        formulae = [unitRange];
      } else if (col.dropdown === 'department' && deptRange) {
        formulae = [deptRange];
      }
      if (!formulae) return;

      const colLetter = sheet.getColumn(idx + 1).letter;
      for (let r = firstDataRow; r <= lastDataRow; r++) {
        sheet.getCell(`${colLetter}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae,
          showErrorMessage: col.dropdown === 'status',
          errorStyle: 'warning',
          errorTitle: 'ค่าไม่ถูกต้อง',
          error: 'กรุณาเลือกจากรายการที่กำหนด',
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
