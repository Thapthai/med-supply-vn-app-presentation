import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { NarcoticService } from './narcotic.service';

@Controller('narcotic')
@UseGuards(AuthGuard)
export class NarcoticController {
  constructor(private readonly narcoticService: NarcoticService) {}

  /** รายการช่องยาในตู้นาโคติก — item_narcotic */
  @Get()
  listSlots(
    @Query('trolleyId') trolleyId?: string,
    @Query('drawer') drawer?: string,
    @Query('box') box?: string,
    @Query('itemcode') itemcode?: string,
    @Query('keyword') keyword?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.narcoticService.listSlots({
      trolleyId,
      drawer,
      box,
      itemcode,
      keyword,
      lowStock,
      page,
      limit,
    });
  }

  /** ผังลิ้นชัก/ช่องของ trolley หนึ่งตู้ */
  @Get('layout')
  getLayout(@Query('trolleyId') trolleyId?: string) {
    return this.narcoticService.getLayout(trolleyId);
  }

  /** รายการ trolley ที่มีช่องใน item_narcotic */
  @Get('trolleys')
  listTrolleys() {
    return this.narcoticService.listTrolleys();
  }

  /** ประวัติเติม/เบิก — item_narcotic_detail */
  @Get('details')
  listDetails(
    @Query('trolleyId') trolleyId?: string,
    @Query('drawer') drawer?: string,
    @Query('box') box?: string,
    @Query('itemcode') itemcode?: string,
    @Query('keyword') keyword?: string,
    @Query('sign') sign?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.narcoticService.listDetails({
      trolleyId,
      drawer,
      box,
      itemcode,
      keyword,
      sign,
      dateFrom,
      dateTo,
      page,
      limit,
    });
  }

  /** ชุดยา preset — item_narcotic_set + detail */
  @Get('sets')
  listSets(
    @Query('trolleyId') trolleyId?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.narcoticService.listSets({ trolleyId, activeOnly, page, limit });
  }

  @Get('sets/:id')
  getSet(@Param('id', ParseIntPipe) id: number) {
    return this.narcoticService.getSet(id);
  }

  /** รายการเบิกตู้นาโคติก — item_narcotic_detail ที่ sign = '-' */
  @Get('dispense')
  listDispense(
    @Query('trolleyId') trolleyId?: string,
    @Query('drawer') drawer?: string,
    @Query('box') box?: string,
    @Query('itemcode') itemcode?: string,
    @Query('keyword') keyword?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.narcoticService.listDetails({
      trolleyId,
      drawer,
      box,
      itemcode,
      keyword,
      sign: '-',
      dateFrom,
      dateTo,
      page,
      limit,
    });
  }

  @Get(':id')
  getSlot(@Param('id', ParseIntPipe) id: number) {
    return this.narcoticService.getSlot(id);
  }
}
