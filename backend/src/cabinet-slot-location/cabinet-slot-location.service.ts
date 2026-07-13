import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkUpsertItemStorageLocationsDto } from './dto/bulk-upsert-cabinet-slot-locations.dto';

function storageKey(stockId: number, itemcode: string): string {
  return `${stockId}:${itemcode}`;
}

@Injectable()
export class CabinetSlotLocationService {
  constructor(private readonly prisma: PrismaService) {}

  /** รายการจาก item + mapping จาก app_item_storage_locations */
  async listCabinetItems(
    cabinetId: number,
    keyword?: string,
    page = 1,
    limit = 100,
  ) {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: {
        id: true,
        stock_id: true,
        cabinet_name: true,
        cabinet_code: true,
      },
    });
    if (!cabinet) throw new NotFoundException('ไม่พบตู้');
    if (cabinet.stock_id == null) {
      throw new BadRequestException('ตู้นี้ยังไม่มี stock_id');
    }

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

    const [total, items, storageLocations] = await Promise.all([
      this.prisma.item.count({ where: itemWhere }),
      this.prisma.item.findMany({
        where: itemWhere,
        select: {
          itemcode: true,
          itemname: true,
          stock_max: true,
        },
        orderBy: { itemcode: 'asc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.itemStorageLocation.findMany({
        where: { stock_id: cabinet.stock_id },
        select: {
          id: true,
          stock_id: true,
          itemcode: true,
          location_row: true,
          location_rack: true,
          location_shelf: true,
        },
      }),
    ]);

    const locationByKey = new Map(
      storageLocations.map((l) => [storageKey(l.stock_id, l.itemcode), l]),
    );

    const data = items.map((item) => {
      const loc = locationByKey.get(storageKey(cabinet.stock_id!, item.itemcode));
      return {
        itemcode: item.itemcode,
        itemname: item.itemname ?? null,
        stock_id: cabinet.stock_id!,
        stock_max: item.stock_max ?? null,
        location_id: loc?.id ?? null,
        location_row: loc?.location_row ?? null,
        location_rack: loc?.location_rack ?? null,
        location_shelf: loc?.location_shelf ?? null,
      };
    });

    return {
      success: true,
      data: {
        cabinet: {
          id: cabinet.id,
          stock_id: cabinet.stock_id,
          cabinet_name: cabinet.cabinet_name,
          cabinet_code: cabinet.cabinet_code,
        },
        items: data,
        total,
        page: safePage,
        limit: safeLimit,
        lastPage: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  /** บันทึก Row / Rack / Shelf ต่อ stock_id + itemcode */
  async bulkUpsert(dto: BulkUpsertItemStorageLocationsDto) {
    const results = await this.prisma.$transaction(
      dto.locations.map((line) =>
        this.prisma.itemStorageLocation.upsert({
          where: {
            stock_id_itemcode: {
              stock_id: line.stock_id,
              itemcode: line.itemcode.trim(),
            },
          },
          create: {
            stock_id: line.stock_id,
            itemcode: line.itemcode.trim(),
            location_row: line.location_row?.trim() || null,
            location_rack: line.location_rack?.trim() || null,
            location_shelf: line.location_shelf?.trim() || null,
          },
          update: {
            location_row: line.location_row?.trim() || null,
            location_rack: line.location_rack?.trim() || null,
            location_shelf: line.location_shelf?.trim() || null,
          },
        }),
      ),
    );

    return { success: true, data: results, count: results.length };
  }
}
