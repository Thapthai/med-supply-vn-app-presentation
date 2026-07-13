import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
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

  /** Step 1 — รายการจาก item สำหรับจัดการตำแหน่ง */
  @Get('cabinet-items')
  listCabinetItems(
    @Query('cabinet_id', ParseIntPipe) cabinetId: number,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listCabinetItems(
      cabinetId,
      keyword,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** Step 2 — บันทึก mapping Row / Rack / Shelf */
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulkUpsert(@Body() dto: BulkUpsertItemStorageLocationsDto) {
    return this.service.bulkUpsert(dto);
  }
}
