import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthContext, AuthGuard } from '../auth/guards/auth.guard';
import { PrintLabelItemDto } from './dto/print-label-item.dto';
import { PrintLabelItemsDto } from './dto/print-label-items.dto';
import {
  CreateStickerPrintHistoryDto,
  GetStickerPrintHistoryQueryDto,
} from './dto/sticker-print-history.dto';
import { StickerPrintService } from './sticker-print.service';

/**
 * สติ๊กเกอร์ SATO SBPL — ต้องล็อกอิน
 */
@Controller('sticker-print')
@UseGuards(AuthGuard)
export class StickerPrintController {
  constructor(private readonly stickerPrintService: StickerPrintService) {}

  @Post('printLabel')
  @HttpCode(200)
  testPrintLabel(
    @Body() body: { ip?: string; port?: number | string },
    @Req() req: Request & { auth?: AuthContext },
  ) {
    return this.stickerPrintService.printLabel(body?.ip, body?.port, this.userId(req));
  }

  /** พิมพ์จาก Item master รายการเดียว — SBPL1 + token จาก DB */
  @Post('printLabel-item')
  @HttpCode(200)
  printLabelItem(
    @Body() body: PrintLabelItemDto,
    @Req() req: Request & { auth?: AuthContext },
  ) {
    return this.stickerPrintService.printLabelItem(body, this.userId(req));
  }

  /** พิมพ์หลายรายการตามลำดับ — host/port จาก PRINT_STICKER_* ใน .env */
  @Post('printLabel-items')
  @HttpCode(200)
  printLabelItems(
    @Body() body: PrintLabelItemsDto,
    @Req() req: Request & { auth?: AuthContext },
  ) {
    return this.stickerPrintService.printLabelItems(body, this.userId(req));
  }

  /** บันทึกประวัติการพิมพ์ (ไม่สั่งเครื่อง) */
  @Post('history')
  createHistory(
    @Body() body: CreateStickerPrintHistoryDto,
    @Req() req: Request & { auth?: AuthContext },
  ) {
    return this.stickerPrintService.createHistory(body, this.userId(req));
  }

  /** รายการประวัติการพิมพ์ */
  @Get('history')
  listHistory(@Query() query: GetStickerPrintHistoryQueryDto) {
    return this.stickerPrintService.listHistory(query);
  }

  /** รายละเอียดประวัติครั้งหนึ่ง */
  @Get('history/:id')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.stickerPrintService.getHistory(id);
  }

  private userId(req: Request & { auth?: AuthContext }): number | undefined {
    const id = req.auth?.user?.id;
    return typeof id === 'number' && Number.isFinite(id) ? id : undefined;
  }
}
