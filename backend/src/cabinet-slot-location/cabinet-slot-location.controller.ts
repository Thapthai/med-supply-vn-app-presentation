import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CabinetSlotLocationService } from './cabinet-slot-location.service';
import { BulkUpsertItemStorageLocationsDto } from './dto/bulk-upsert-cabinet-slot-locations.dto';

@Controller('cabinet-slot-locations')
@UseGuards(AuthGuard)
export class CabinetSlotLocationController {
  constructor(private readonly service: CabinetSlotLocationService) {}

  /** รายการ item สำหรับจัดการตำแหน่ง (ไม่ต้องเลือกตู้) */
  @Get('items')
  listItems(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listItems(
      keyword,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** รายการที่ mapping ตำแหน่งแล้ว */
  @Get('mapped')
  listMapped(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listMapped(
      keyword,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** @deprecated ใช้ GET /items แทน — คงไว้เพื่อไม่ให้ client เก่าพัง (ignore cabinet_id) */
  @Get('cabinet-items')
  listCabinetItems(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listItems(
      keyword,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** บันทึก mapping Row / Rack / Shelf / qty ต่อ itemcode */
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulkUpsert(@Body() dto: BulkUpsertItemStorageLocationsDto) {
    return this.service.bulkUpsert(dto);
  }
}
