import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkUpsertItemStorageLocationsDto } from './dto/bulk-upsert-cabinet-slot-locations.dto';

function normalizeQty(qty?: number | null): number | null {
  if (qty == null || Number.isNaN(Number(qty))) return null;
  return Math.max(0, Math.trunc(Number(qty)));
}

/** ค่าว่างเก็บเป็น '' เพื่อให้ unique (itemcode,row,rack,shelf) ใช้งานได้ */
function normalizeLoc(value?: string | null): string {
  return (value ?? '').trim();
}

@Injectable()
export class CabinetSlotLocationService {
  constructor(private readonly prisma: PrismaService) {}

  /** รายการ item สำหรับตั้งค่าตำแหน่ง (ไม่ preload mapping — เพิ่มซ้ำได้) */
  async listItems(keyword?: string, page = 1, limit = 10) {
    const kw = keyword?.trim();
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const itemWhere: Prisma.ItemWhereInput = {
      item_status: 0,
      OR: [{ IsCancel: 0 }, { IsCancel: null }],
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

    const [total, items] = await Promise.all([
      this.prisma.item.count({ where: itemWhere }),
      this.prisma.item.findMany({
        where: itemWhere,
        select: {
          itemcode: true,
          itemname: true,
          stock_max: true,
          _count: { select: { itemStorageLocations: true } },
        },
        orderBy: { itemcode: 'asc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const data = items.map((item) => ({
      itemcode: item.itemcode,
      itemname: item.itemname ?? null,
      stock_max: item.stock_max ?? null,
      mapped_count: item._count.itemStorageLocations,
      location_id: null as number | null,
      location_row: null as string | null,
      location_rack: null as string | null,
      location_shelf: null as string | null,
      qty: null as number | null,
    }));

    return {
      success: true,
      data: {
        items: data,
        total,
        page: safePage,
        limit: safeLimit,
        lastPage: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  /** รายการที่ mapping ตำแหน่งแล้ว */
  async listMapped(keyword?: string, page = 1, limit = 10) {
    const kw = keyword?.trim();
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.ItemStorageLocationWhereInput = kw
      ? {
          OR: [
            { itemcode: { contains: kw } },
            { item: { itemname: { contains: kw } } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.itemStorageLocation.count({ where }),
      this.prisma.itemStorageLocation.findMany({
        where,
        select: {
          id: true,
          itemcode: true,
          location_row: true,
          location_rack: true,
          location_shelf: true,
          qty: true,
          updated_at: true,
          item: { select: { itemname: true, stock_max: true } },
        },
        orderBy: [{ itemcode: 'asc' }, { id: 'asc' }],
        skip,
        take: safeLimit,
      }),
    ]);

    const data = rows.map((row) => ({
      itemcode: row.itemcode,
      itemname: row.item?.itemname ?? null,
      stock_max: row.item?.stock_max ?? null,
      location_id: row.id,
      location_row: row.location_row || null,
      location_rack: row.location_rack || null,
      location_shelf: row.location_shelf || null,
      qty: row.qty,
      updated_at: row.updated_at,
    }));

    return {
      success: true,
      data: {
        items: data,
        total,
        page: safePage,
        limit: safeLimit,
        lastPage: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  /**
   * บันทึกตำแหน่ง: ถ้า itemcode+Row+Rack+Shelf ซ้ำ → update qty
   * ถ้าไม่ตรง → สร้างแถวใหม่
   */
  async bulkUpsert(dto: BulkUpsertItemStorageLocationsDto) {
    const results = await this.prisma.$transaction(
      dto.locations.map((line) => {
        const itemcode = line.itemcode.trim();
        const location_row = normalizeLoc(line.location_row);
        const location_rack = normalizeLoc(line.location_rack);
        const location_shelf = normalizeLoc(line.location_shelf);
        const qty = normalizeQty(line.qty);

        return this.prisma.itemStorageLocation.upsert({
          where: {
            itemcode_location_row_location_rack_location_shelf: {
              itemcode,
              location_row,
              location_rack,
              location_shelf,
            },
          },
          create: {
            itemcode,
            location_row,
            location_rack,
            location_shelf,
            qty,
          },
          update: { qty },
        });
      }),
    );

    return { success: true, data: results, count: results.length };
  }
}
