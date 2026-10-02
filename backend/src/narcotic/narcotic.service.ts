import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ITEM_SELECT = {
  itemcode: true,
  itemname: true,
  Alternatename: true,
} as const;

const CABINET_SELECT = {
  id: true,
  cabinet_name: true,
  cabinet_code: true,
  stock_id: true,
  trolley_id: true,
  cabinet_type: true,
} as const;

function toNum(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalInt(raw?: string | number): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}

@Injectable()
export class NarcoticService {
  constructor(private readonly prisma: PrismaService) {}

  /** ตู้นาโคติกอ้าง app_cabinets.trolley_id = item_narcotic_detail.trolley_id */
  private async findCabinetByTrolleyId(trolleyId: number) {
    const byTrolley = await this.prisma.cabinet.findFirst({
      where: { trolley_id: trolleyId },
      select: CABINET_SELECT,
    });
    if (byTrolley) return byTrolley;
    return this.prisma.cabinet.findFirst({
      where: { stock_id: trolleyId },
      select: CABINET_SELECT,
    });
  }

  private mapSlot(row: {
    id: number;
    trolley_id: number;
    drawer: number;
    box: number;
    itemcode: string;
    qty: number;
    item_min: number;
    item_max: number;
    permission_id: number;
    weight_per_item: unknown;
    last_weight_g: unknown;
    weight_tare_g: unknown;
    created_at: Date;
    updated_at: Date;
    item?: { itemcode: string; itemname: string | null; Alternatename: string | null } | null;
    cabinet?: {
      id: number;
      cabinet_name: string | null;
      cabinet_code: string | null;
      stock_id: number | null;
      trolley_id: number | null;
      cabinet_type: string | null;
    } | null;
  }) {
    return {
      id: row.id,
      trolley_id: row.trolley_id,
      drawer: row.drawer,
      box: row.box,
      itemcode: row.itemcode,
      itemname: row.item?.itemname ?? row.item?.Alternatename ?? null,
      qty: row.qty,
      item_min: row.item_min,
      item_max: row.item_max,
      permission_id: row.permission_id,
      permission_label: row.permission_id === 2 ? 'two-person' : 'single',
      low_stock: row.item_min > 0 && row.qty < row.item_min,
      weight_per_item: toNum(row.weight_per_item),
      last_weight_g: toNum(row.last_weight_g),
      weight_tare_g: toNum(row.weight_tare_g),
      created_at: row.created_at,
      updated_at: row.updated_at,
      cabinet: row.cabinet ?? null,
    };
  }

  async listSlots(query: {
    trolleyId?: string;
    drawer?: string;
    box?: string;
    itemcode?: string;
    keyword?: string;
    lowStock?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, parseOptionalInt(query.page) ?? 1);
    const limit = Math.min(500, Math.max(1, parseOptionalInt(query.limit) ?? 100));
    const trolleyId = parseOptionalInt(query.trolleyId);
    const drawer = parseOptionalInt(query.drawer);
    const box = parseOptionalInt(query.box);
    const itemcode = query.itemcode?.trim();
    const keyword = query.keyword?.trim();
    const lowOnly = query.lowStock === '1' || query.lowStock === 'true';

    const where: Prisma.ItemNarcoticWhereInput = {};
    if (trolleyId != null) where.trolley_id = trolleyId;
    if (drawer != null) where.drawer = drawer;
    if (box != null) where.box = box;
    if (itemcode) where.itemcode = itemcode;
    if (keyword) {
      where.OR = [
        { itemcode: { contains: keyword } },
        { item: { itemname: { contains: keyword } } },
        { item: { Alternatename: { contains: keyword } } },
      ];
    }
    if (lowOnly) {
      const rows = await this.prisma.itemNarcotic.findMany({
        where,
        include: { item: { select: ITEM_SELECT }, cabinet: { select: CABINET_SELECT } },
        orderBy: [{ trolley_id: 'asc' }, { drawer: 'asc' }, { box: 'asc' }],
      });
      const data = rows.map((row) => this.mapSlot(row)).filter((row) => row.low_stock);
      const start = (page - 1) * limit;
      return {
        success: true as const,
        data: data.slice(start, start + limit),
        meta: {
          total: data.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(data.length / limit)),
        },
      };
    }

    const [total, rows] = await Promise.all([
      this.prisma.itemNarcotic.count({ where }),
      this.prisma.itemNarcotic.findMany({
        where,
        include: { item: { select: ITEM_SELECT }, cabinet: { select: CABINET_SELECT } },
        orderBy: [{ trolley_id: 'asc' }, { drawer: 'asc' }, { box: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      success: true as const,
      data: rows.map((row) => this.mapSlot(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getLayout(trolleyIdRaw?: string) {
    const trolleyId = parseOptionalInt(trolleyIdRaw);
    if (trolleyId == null) {
      throw new NotFoundException('ต้องระบุ trolleyId');
    }

    const [cabinet, rows] = await Promise.all([
      this.findCabinetByTrolleyId(trolleyId),
      this.prisma.itemNarcotic.findMany({
        where: { trolley_id: trolleyId },
        include: { item: { select: ITEM_SELECT } },
        orderBy: [{ drawer: 'asc' }, { box: 'asc' }],
      }),
    ]);

    const byDrawer = new Map<number, ReturnType<NarcoticService['mapSlot']>[]>();
    for (const row of rows) {
      const mapped = this.mapSlot({ ...row, cabinet: cabinet ?? null });
      const list = byDrawer.get(row.drawer) ?? [];
      list.push(mapped);
      byDrawer.set(row.drawer, list);
    }

    const drawers = [...byDrawer.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([drawer, boxes]) => ({
        drawer,
        box_count: boxes.length,
        boxes,
      }));

    return {
      success: true as const,
      data: {
        trolley_id: trolleyId,
        cabinet,
        drawer_count: drawers.length,
        slot_count: rows.length,
        drawers,
      },
    };
  }

  async listTrolleys() {
    const groups = await this.prisma.itemNarcotic.groupBy({
      by: ['trolley_id'],
      _count: { id: true },
      orderBy: { trolley_id: 'asc' },
    });
    const trolleyIds = groups.map((g) => g.trolley_id);
    const cabinets =
      trolleyIds.length > 0
        ? await this.prisma.cabinet.findMany({
            where: {
              OR: [{ trolley_id: { in: trolleyIds } }, { stock_id: { in: trolleyIds } }],
            },
            select: CABINET_SELECT,
          })
        : [];
    const cabByTrolley = new Map<number, (typeof cabinets)[number]>();
    for (const c of cabinets) {
      if (c.stock_id != null) cabByTrolley.set(c.stock_id, c);
    }
    for (const c of cabinets) {
      if (c.trolley_id != null) cabByTrolley.set(c.trolley_id, c);
    }

    return {
      success: true as const,
      data: groups.map((g) => ({
        trolley_id: g.trolley_id,
        slot_count: g._count.id,
        cabinet: cabByTrolley.get(g.trolley_id) ?? null,
      })),
    };
  }

  private mapDetail(row: {
    id: number;
    trolley_id: number;
    drawer: number;
    box: number;
    itemcode: string;
    qty: number;
    sign: string;
    userid1: string;
    userid2: string;
    note: string;
    modify_date: Date;
    item?: { itemcode: string; itemname: string | null; Alternatename: string | null } | null;
  }) {
    return {
      id: row.id,
      trolley_id: row.trolley_id,
      drawer: row.drawer,
      box: row.box,
      itemcode: row.itemcode,
      itemname: row.item?.itemname ?? row.item?.Alternatename ?? null,
      qty: row.qty,
      sign: row.sign,
      sign_label: row.sign === '-' ? 'เบิก' : 'เติม',
      userid1: row.userid1,
      userid2: row.userid2,
      note: row.note,
      modify_date: row.modify_date,
    };
  }

  async getSlot(id: number) {
    const row = await this.prisma.itemNarcotic.findUnique({
      where: { id },
      include: { item: { select: ITEM_SELECT }, cabinet: { select: CABINET_SELECT } },
    });
    if (!row) throw new NotFoundException(`ไม่พบช่องตู้นาโคติก id ${id}`);
    return { success: true as const, data: this.mapSlot(row) };
  }

  async listDetails(query: {
    trolleyId?: string;
    drawer?: string;
    box?: string;
    itemcode?: string;
    keyword?: string;
    sign?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, parseOptionalInt(query.page) ?? 1);
    const limit = Math.min(500, Math.max(1, parseOptionalInt(query.limit) ?? 50));
    const trolleyId = parseOptionalInt(query.trolleyId);
    const drawer = parseOptionalInt(query.drawer);
    const box = parseOptionalInt(query.box);
    const itemcode = query.itemcode?.trim();
    const keyword = query.keyword?.trim();
    const sign = query.sign?.trim();
    const ymd = /^\d{4}-\d{2}-\d{2}$/;

    const where: Prisma.ItemNarcoticDetailWhereInput = {};
    if (trolleyId != null) where.trolley_id = trolleyId;
    if (drawer != null) where.drawer = drawer;
    if (box != null) where.box = box;
    if (itemcode) where.itemcode = itemcode;
    if (sign === '+' || sign === '-') where.sign = sign;
    if (keyword) {
      where.OR = [
        { itemcode: { contains: keyword } },
        { userid1: { contains: keyword } },
        { userid2: { contains: keyword } },
        { note: { contains: keyword } },
        { item: { itemname: { contains: keyword } } },
      ];
    }
    if (
      (query.dateFrom && ymd.test(query.dateFrom)) ||
      (query.dateTo && ymd.test(query.dateTo))
    ) {
      const range: Prisma.DateTimeFilter = {};
      if (query.dateFrom && ymd.test(query.dateFrom)) {
        range.gte = new Date(`${query.dateFrom}T00:00:00.000`);
      }
      if (query.dateTo && ymd.test(query.dateTo)) {
        range.lte = new Date(`${query.dateTo}T23:59:59.999`);
      }
      where.modify_date = range;
    }

    const [total, rows] = await Promise.all([
      this.prisma.itemNarcoticDetail.count({ where }),
      this.prisma.itemNarcoticDetail.findMany({
        where,
        include: { item: { select: ITEM_SELECT } },
        orderBy: { modify_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      success: true as const,
      data: rows.map((row) => this.mapDetail(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listSets(query: {
    trolleyId?: string;
    activeOnly?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, parseOptionalInt(query.page) ?? 1);
    const limit = Math.min(100, Math.max(1, parseOptionalInt(query.limit) ?? 50));
    const trolleyId = parseOptionalInt(query.trolleyId);
    const activeOnly = query.activeOnly !== '0' && query.activeOnly !== 'false';

    const where: Prisma.ItemNarcoticSetWhereInput = {};
    if (trolleyId != null) where.trolley_id = trolleyId;
    if (activeOnly) where.is_active = true;

    const [total, rows] = await Promise.all([
      this.prisma.itemNarcoticSet.count({ where }),
      this.prisma.itemNarcoticSet.findMany({
        where,
        include: {
          cabinet: { select: CABINET_SELECT },
          details: {
            include: {
              slot: {
                include: { item: { select: ITEM_SELECT } },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      success: true as const,
      data: rows.map((row) => this.mapSet(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getSet(id: number) {
    const row = await this.prisma.itemNarcoticSet.findUnique({
      where: { id },
      include: {
        cabinet: { select: CABINET_SELECT },
        details: {
          include: {
            slot: {
              include: { item: { select: ITEM_SELECT } },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException(`ไม่พบชุดยานาโคติก id ${id}`);
    return { success: true as const, data: this.mapSet(row) };
  }

  private mapSet(row: {
    id: number;
    trolley_id: number;
    set_name: string;
    created_by: string;
    is_active: boolean;
    created_at: Date;
    cabinet?: {
      id: number;
      cabinet_name: string | null;
      cabinet_code: string | null;
      stock_id: number | null;
      trolley_id: number | null;
      cabinet_type: string | null;
    } | null;
    details: Array<{
      id: number;
      set_id: number;
      item_id: number;
      qty: number;
      slot: {
        id: number;
        trolley_id: number;
        drawer: number;
        box: number;
        itemcode: string;
        qty: number;
        item_min: number;
        item_max: number;
        item?: { itemcode: string; itemname: string | null; Alternatename: string | null } | null;
      };
    }>;
  }) {
    return {
      id: row.id,
      trolley_id: row.trolley_id,
      set_name: row.set_name,
      created_by: row.created_by,
      is_active: row.is_active,
      created_at: row.created_at,
      cabinet: row.cabinet ?? null,
      line_count: row.details.length,
      lines: row.details.map((line) => ({
        id: line.id,
        item_id: line.item_id,
        qty: line.qty,
        drawer: line.slot.drawer,
        box: line.slot.box,
        itemcode: line.slot.itemcode,
        itemname: line.slot.item?.itemname ?? line.slot.item?.Alternatename ?? null,
        stock_qty: line.slot.qty,
        item_min: line.slot.item_min,
        item_max: line.slot.item_max,
      })),
    };
  }
}
