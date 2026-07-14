import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDispenseDocumentDto } from './dto/create-department-dispense-document.dto';
import {
  DepartmentDispenseExportData,
  DepartmentDispenseExportExcelService,
} from './services/department-dispense-export-excel.service';
import { DepartmentDispenseExportPdfService } from './services/department-dispense-export-pdf.service';
function departmentLabel(dept: {
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
  ID?: number;
}): string {
  const name = (dept.DepName ?? dept.DepName2 ?? '').trim() || String(dept.ID ?? '');
  const ref = dept.RefDepID?.trim();
  return ref ? `${name} (${ref})` : name;
}

@Injectable()
export class DepartmentDispenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportExcelService: DepartmentDispenseExportExcelService,
    private readonly exportPdfService: DepartmentDispenseExportPdfService,
  ) {}

  private async generateDocNo(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `DISP-${y}${m}${d}-`;

    const last = await this.prisma.departmentDispenseDocument.findFirst({
      where: { doc_no: { startsWith: prefix } },
      orderBy: { doc_no: 'desc' },
      select: { doc_no: true },
    });

    const lastSeq = last ? parseInt(last.doc_no.slice(prefix.length), 10) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * รายการที่ mapping ตำแหน่งแล้ว (ไม่ต้องผูก Item กับหน่วยงาน)
   * departmentId ใช้ตรวจว่ามี Division และแนบกลับใน response
   */
  async listDepartmentItems(departmentId: number, keyword?: string) {
    const dept = await this.prisma.department.findUnique({
      where: { ID: departmentId },
      select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
    });
    if (!dept) throw new NotFoundException('ไม่พบ Division');

    const kw = keyword?.trim();
    const itemWhere: Prisma.ItemWhereInput = {
      item_status: 0,
      OR: [{ IsCancel: 0 }, { IsCancel: null }],
      itemStorageLocations: { some: {} },
      ...(kw
        ? {
            AND: [
              {
                OR: [
                  { itemcode: { contains: kw } },
                  { itemname: { contains: kw } },
                  { itemcode2: { contains: kw } },
                  { itemcode3: { contains: kw } },
                ],
              },
            ],
          }
        : {}),
    };

    const items = await this.prisma.item.findMany({
      where: itemWhere,
      select: {
        itemcode: true,
        itemname: true,
        Store: true,
      },
      orderBy: { itemcode: 'asc' },
    });

    return {
      success: true,
      data: {
        department: dept,
        items: items.map((i) => ({
          itemcode: i.itemcode,
          itemname: i.itemname,
          store: i.Store,
        })),
      },
    };
  }

  /**
   * คืนตำแหน่งที่ mapping แล้วทั้งหมดของ itemcodes ที่เลือก (1 item มีได้หลายแถว)
   */
  async resolveItemLocations(itemcodes: string[], _departmentId?: number) {
    const unique = [...new Set(itemcodes.map((c) => c.trim()).filter(Boolean))];
    if (unique.length === 0) {
      return { success: true, data: [], missing_itemcodes: [] as string[] };
    }

    const [items, storageRows] = await Promise.all([
      this.prisma.item.findMany({
        where: { itemcode: { in: unique } },
        select: { itemcode: true, itemname: true, Store: true, stock_max: true },
      }),
      this.prisma.itemStorageLocation.findMany({
        where: { itemcode: { in: unique } },
        select: {
          id: true,
          itemcode: true,
          location_row: true,
          location_rack: true,
          location_shelf: true,
          qty: true,
        },
        orderBy: [{ itemcode: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const mappedCodes = new Set(storageRows.map((r) => r.itemcode));
    const missingItemcodes = unique.filter((code) => !mappedCodes.has(code));
    const itemByCode = new Map(items.map((i) => [i.itemcode, i]));

    const data = storageRows.map((row) => {
      const item = itemByCode.get(row.itemcode);
      return {
        location_id: row.id,
        itemcode: row.itemcode,
        itemname: item?.itemname ?? null,
        location_row: row.location_row || null,
        location_rack: row.location_rack || null,
        location_shelf: row.location_shelf || null,
        qty: row.qty ?? 0,
        store_ref: item?.Store ?? null,
        location_source: 'item_storage' as const,
        stock_id: null as number | null,
        cabinet_name: null as string | null,
        cabinet_code: null as string | null,
        max_qty: item?.stock_max ?? null,
      };
    });

    return { success: true, data, missing_itemcodes: missingItemcodes };
  }

  async createDocument(dto: CreateDepartmentDispenseDocumentDto, userId?: number) {
    const dept = await this.prisma.department.findUnique({
      where: { ID: dto.department_id },
      select: { ID: true },
    });
    if (!dept) throw new NotFoundException('ไม่พบ Division');

    const lines = dto.lines ?? [];
    if (lines.length === 0) {
      throw new BadRequestException('กรุณาระบุรายการอย่างน้อย 1 รายการ');
    }

    const itemcodes = [...new Set(lines.map((l) => l.itemcode.trim()).filter(Boolean))];
    const locRes = await this.resolveItemLocations(itemcodes, dto.department_id);
    const mappedById = new Map((locRes.data ?? []).map((l) => [l.location_id, l]));
    const mappedByCode = new Map<string, (NonNullable<typeof locRes.data>)[number]>();
    for (const loc of locRes.data ?? []) {
      if (!mappedByCode.has(loc.itemcode)) mappedByCode.set(loc.itemcode, loc);
    }

    const missingLoc = itemcodes.filter((c) => !mappedByCode.has(c));
    if (missingLoc.length > 0) {
      throw new BadRequestException(
        `ไม่พบตำแหน่ง Row/Rack/Shelf สำหรับ: ${missingLoc.join(', ')} — กรุณาตั้งค่าที่เมนูตำแหน่งจัดเก็บอุปกรณ์`,
      );
    }

    const items = await this.prisma.item.findMany({
      where: { itemcode: { in: itemcodes } },
      select: { itemcode: true, itemname: true },
    });
    const nameByCode = new Map(items.map((i) => [i.itemcode, i.itemname]));

    const docNo = await this.generateDocNo();

    const created = await this.prisma.departmentDispenseDocument.create({
      data: {
        doc_no: docNo,
        department_id: dto.department_id,
        remark: dto.remark?.trim() || null,
        created_by_user_id: userId ?? null,
        lines: {
          create: lines.map((line, idx) => {
            const fromId =
              line.location_id != null ? mappedById.get(line.location_id) : undefined;
            const loc = fromId ?? mappedByCode.get(line.itemcode);
            return {
              line_order: idx,
              itemcode: line.itemcode,
              item_name: nameByCode.get(line.itemcode) ?? loc?.itemname ?? null,
              qty: line.qty,
              location_row: line.location_row ?? loc?.location_row ?? null,
              location_rack: line.location_rack ?? loc?.location_rack ?? null,
              location_shelf: line.location_shelf ?? loc?.location_shelf ?? null,
              store_ref: loc?.store_ref ?? null,
              slot_no: null,
              sensor: null,
            };
          }),
        },
      },
      include: {
        department: {
          select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
        },
        lines: { orderBy: { line_order: 'asc' } },
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });

    return { success: true, data: created };
  }

  async listDocuments(params: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const keyword = params.keyword?.trim();

    const where: Prisma.DepartmentDispenseDocumentWhereInput = {};
    if (params.department_id != null) {
      where.department_id = params.department_id;
    }
    if (keyword) {
      where.OR = [
        { doc_no: { contains: keyword } },
        { remark: { contains: keyword } },
        { department: { DepName: { contains: keyword } } },
        { department: { DepName2: { contains: keyword } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.departmentDispenseDocument.count({ where }),
      this.prisma.departmentDispenseDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          department: {
            select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
          },
          createdBy: {
            select: { id: true, fname: true, lname: true, email: true },
          },
          _count: { select: { lines: true } },
        },
      }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getDocument(id: number) {
    const doc = await this.prisma.departmentDispenseDocument.findUnique({
      where: { id },
      include: {
        department: {
          select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
        },
        lines: { orderBy: { line_order: 'asc' } },
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');
    return { success: true, data: doc };
  }

  private async buildExportData(params: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
    document_id?: number;
  }): Promise<DepartmentDispenseExportData> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(500, Math.max(1, params.limit ?? 100));
    const skip = (page - 1) * limit;
    const keyword = params.keyword?.trim();

    const where: Prisma.DepartmentDispenseDocumentWhereInput = {};
    if (params.document_id != null) {
      where.id = params.document_id;
    }
    if (params.department_id != null) {
      where.department_id = params.department_id;
    }
    if (keyword) {
      where.OR = [
        { doc_no: { contains: keyword } },
        { remark: { contains: keyword } },
        { department: { DepName: { contains: keyword } } },
        { department: { DepName2: { contains: keyword } } },
      ];
    }

    const documents = await this.prisma.departmentDispenseDocument.findMany({
      where,
      skip: params.document_id != null ? 0 : skip,
      take: params.document_id != null ? 1 : limit,
      orderBy: { created_at: 'desc' },
      include: {
        department: {
          select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
        },
        lines: { orderBy: { line_order: 'asc' } },
      },
    });

    const exportDocs = documents.map((doc) => ({
      doc_no: doc.doc_no,
      department_label: doc.department
        ? departmentLabel(doc.department)
        : String(doc.department_id),
      line_count: doc.lines.length,
      created_at: doc.created_at.toISOString(),
      remark: doc.remark,
      lines: doc.lines.map((line) => ({
        itemcode: line.itemcode,
        item_name: line.item_name,
        qty: line.qty,
      })),
    }));

    const totalLines = exportDocs.reduce((sum, d) => sum + d.lines.length, 0);

    return {
      summary: {
        total_documents: exportDocs.length,
        total_lines: totalLines,
      },
      documents: exportDocs,
    };
  }

  async exportDocumentsExcel(params: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.buildExportData(params);
    if (data.documents.length === 0) {
      throw new BadRequestException('ไม่มีเอกสารสำหรับส่งออก');
    }
    const buffer = await this.exportExcelService.generateReport(data);
    const date = new Date().toISOString().split('T')[0];
    return { buffer, filename: `department_dispense_documents_${date}.xlsx` };
  }

  async exportDocumentsPdf(params: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
    document_id?: number;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.buildExportData(params);
    if (data.documents.length === 0) {
      throw new BadRequestException('ไม่มีเอกสารสำหรับส่งออก');
    }
    const buffer = await this.exportPdfService.generateReport(data);
    if (params.document_id != null && data.documents.length === 1) {
      const docNo = data.documents[0].doc_no.replace(/[^\w.-]+/g, '_');
      return { buffer, filename: `department_dispense_${docNo}.pdf` };
    }
    const date = new Date().toISOString().split('T')[0];
    return { buffer, filename: `department_dispense_documents_${date}.pdf` };
  }
}
