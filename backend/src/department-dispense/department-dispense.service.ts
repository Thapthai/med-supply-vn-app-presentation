import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDispenseDocumentDto } from './dto/create-department-dispense-document.dto';
import {
  DepartmentDispenseExportData,
  DepartmentDispenseExportExcelService,
} from './services/department-dispense-export-excel.service';
import { DepartmentDispenseExportPdfService } from './services/department-dispense-export-pdf.service';
import { itemStorageKey } from './utils/resolve-item-location';

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

  /** stock_id ของตู้ที่ผูก ACTIVE กับ Division ผ่าน app_cabinet_departments */
  private async getStockIdsForDepartment(departmentId: number) {
    const links = await this.prisma.cabinetDepartment.findMany({
      where: {
        department_id: departmentId,
        status: 'ACTIVE',
        cabinet_id: { not: null },
      },
      select: { cabinet_id: true },
    });
    const cabinetIds = links
      .map((l) => l.cabinet_id)
      .filter((id): id is number => id != null);
    if (cabinetIds.length === 0) return [];

    const cabinets = await this.prisma.cabinet.findMany({
      where: { id: { in: cabinetIds }, stock_id: { not: null } },
      select: { stock_id: true, cabinet_name: true, cabinet_code: true },
    });
    return cabinets;
  }

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

  async listDepartmentItems(departmentId: number, keyword?: string) {
    const dept = await this.prisma.department.findUnique({
      where: { ID: departmentId },
      select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
    });
    if (!dept) throw new NotFoundException('ไม่พบ Division');

    const kw = keyword?.trim();
    const links = await this.prisma.itemDepartments.findMany({
      where: {
        DeptID: departmentId,
        OR: [{ IsCancel: 0 }, { IsCancel: null }],
        ...(kw
          ? {
              item: {
                OR: [
                  { itemcode: { contains: kw } },
                  { itemname: { contains: kw } },
                ],
              },
            }
          : {}),
      },
      include: {
        item: {
          select: {
            itemcode: true,
            itemname: true,
            Store: true,
            item_status: true,
            IsCancel: true,
          },
        },
      },
      orderBy: { itemcode: 'asc' },
    });

    const seen = new Set<string>();
    const items = links
      .filter((l) => l.item && l.item.IsCancel !== 1 && (l.item.item_status ?? 0) === 0)
      .filter((l) => {
        if (seen.has(l.itemcode)) return false;
        seen.add(l.itemcode);
        return true;
      })
      .map((l) => ({
        itemcode: l.item!.itemcode,
        itemname: l.item!.itemname,
        store: l.item!.Store,
      }));

    return { success: true, data: { department: dept, items } };
  }

  async resolveItemLocations(itemcodes: string[], departmentId?: number) {
    const unique = [...new Set(itemcodes.map((c) => c.trim()).filter(Boolean))];
    if (unique.length === 0) {
      return { success: true, data: [], missing_itemcodes: [] as string[] };
    }

    const divisionCabinets =
      departmentId != null ? await this.getStockIdsForDepartment(departmentId) : [];
    const allowedStockIds =
      departmentId != null
        ? divisionCabinets
            .map((c) => c.stock_id)
            .filter((id): id is number => id != null)
        : [];

    if (departmentId != null && allowedStockIds.length === 0) {
      return { success: true, data: [], missing_itemcodes: unique };
    }

    const [items, storageRows] = await Promise.all([
      this.prisma.item.findMany({
        where: { itemcode: { in: unique } },
        select: { itemcode: true, itemname: true, Store: true, stock_max: true },
      }),
      allowedStockIds.length > 0
        ? this.prisma.itemStorageLocation.findMany({
            where: {
              itemcode: { in: unique },
              stock_id: { in: allowedStockIds },
            },
            select: {
              stock_id: true,
              itemcode: true,
              location_row: true,
              location_rack: true,
              location_shelf: true,
            },
          })
        : Promise.resolve(
            [] as Array<{
              stock_id: number;
              itemcode: string;
              location_row: string | null;
              location_rack: string | null;
              location_shelf: string | null;
            }>,
          ),
    ]);

    const cabinetLookup = new Map(
      divisionCabinets
        .filter((c) => c.stock_id != null)
        .map((c) => [c.stock_id as number, c]),
    );
    const storageByKey = new Map(
      storageRows.map((row) => [itemStorageKey(row.stock_id, row.itemcode), row]),
    );

    const data: Array<{
      itemcode: string;
      itemname: string | null;
      location_row: string | null;
      location_rack: string | null;
      location_shelf: string | null;
      store_ref: string | null;
      location_source: 'item_storage';
      stock_id: number;
      cabinet_name: string | null;
      cabinet_code: string | null;
      max_qty: number | null;
    }> = [];
    const missingItemcodes: string[] = [];

    for (const code of unique) {
      let picked: (typeof storageRows)[number] | null = null;
      for (const stockId of allowedStockIds) {
        const loc = storageByKey.get(itemStorageKey(stockId, code));
        if (loc && (loc.location_row || loc.location_rack || loc.location_shelf)) {
          picked = loc;
          break;
        }
      }
      if (!picked) {
        missingItemcodes.push(code);
        continue;
      }

      const item = items.find((i) => i.itemcode === code);
      const cabinet = cabinetLookup.get(picked.stock_id);
      data.push({
        itemcode: code,
        itemname: item?.itemname ?? null,
        location_row: picked.location_row,
        location_rack: picked.location_rack,
        location_shelf: picked.location_shelf,
        store_ref: item?.Store ?? null,
        location_source: 'item_storage',
        stock_id: picked.stock_id,
        cabinet_name: cabinet?.cabinet_name ?? null,
        cabinet_code: cabinet?.cabinet_code ?? null,
        max_qty: item?.stock_max ?? null,
      });
    }

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
    const locByCode = new Map((locRes.data ?? []).map((l) => [l.itemcode, l]));
    const missingLoc = itemcodes.filter((c) => !locByCode.has(c));
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
            const loc = locByCode.get(line.itemcode);
            return {
              line_order: idx,
              itemcode: line.itemcode,
              item_name: nameByCode.get(line.itemcode) ?? loc?.itemname ?? null,
              qty: line.qty,
              location_row: loc?.location_row ?? null,
              location_rack: loc?.location_rack ?? null,
              location_shelf: loc?.location_shelf ?? null,
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
  }): Promise<DepartmentDispenseExportData> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(500, Math.max(1, params.limit ?? 100));
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

    const documents = await this.prisma.departmentDispenseDocument.findMany({
      where,
      skip,
      take: limit,
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
        location_row: line.location_row,
        location_rack: line.location_rack,
        location_shelf: line.location_shelf,
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
  }): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.buildExportData(params);
    if (data.documents.length === 0) {
      throw new BadRequestException('ไม่มีเอกสารสำหรับส่งออก');
    }
    const buffer = await this.exportPdfService.generateReport(data);
    const date = new Date().toISOString().split('T')[0];
    return { buffer, filename: `department_dispense_documents_${date}.pdf` };
  }
}
