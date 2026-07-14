import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthContext, AuthGuard } from '../auth/guards/auth.guard';
import { DepartmentDispenseService } from './department-dispense.service';
import { CreateDepartmentDispenseDocumentDto } from './dto/create-department-dispense-document.dto';

const EXCEL_CONTENT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_CONTENT = 'application/pdf';

function toFileResponse(buffer: Buffer, filename: string, contentType: string) {
  return {
    success: true as const,
    data: {
      buffer: buffer.toString('base64'),
      filename,
      contentType,
    },
  };
}

@Controller('department-dispense')
@UseGuards(AuthGuard)
export class DepartmentDispenseController {
  constructor(private readonly service: DepartmentDispenseService) {}

  /** รายการ Item ที่ mapping ตำแหน่งแล้ว (ไม่ต้องผูกกับ Division) */
  @Get('department-items')
  listDepartmentItems(
    @Query('department_id', ParseIntPipe) departmentId: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.listDepartmentItems(departmentId, keyword);
  }

  /** ตำแหน่ง Row/Rack/Shelf จาก app_item_storage_locations (สอดคล้องเมนูตำแหน่งจัดเก็บอุปกรณ์) */
  @Post('item-locations')
  @HttpCode(HttpStatus.OK)
  resolveItemLocations(@Body() body: { itemcodes: string[]; department_id?: number }) {
    const departmentId =
      body?.department_id != null && !Number.isNaN(Number(body.department_id))
        ? Number(body.department_id)
        : undefined;
    return this.service.resolveItemLocations(body?.itemcodes ?? [], departmentId);
  }

  /** บันทึกเอกสารควบคุมการเบิก */
  @Post('documents')
  createDocument(
    @Body() dto: CreateDepartmentDispenseDocumentDto,
    @Req() req: Request & { auth?: AuthContext },
  ) {
    const userId = req.auth?.user?.id as number | undefined;
    return this.service.createDocument(dto, userId);
  }

  /** รายการเอกสารควบคุมการเบิก */
  @Get('documents')
  listDocuments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('department_id') departmentId?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.listDocuments({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      department_id: departmentId ? parseInt(departmentId, 10) : undefined,
      keyword,
    });
  }

  /** ส่งออกรายการเอกสารควบคุมการเบิก — Excel */
  @Post('documents/export/excel')
  @HttpCode(HttpStatus.OK)
  async exportDocumentsExcel(
    @Body()
    body: {
      page?: number;
      limit?: number;
      department_id?: number;
      keyword?: string;
    },
  ) {
    try {
      const result = await this.service.exportDocumentsExcel(body ?? {});
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ส่งออก Excel ไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  /** ส่งออกรายการเอกสารควบคุมการเบิก — PDF */
  @Post('documents/export/pdf')
  @HttpCode(HttpStatus.OK)
  async exportDocumentsPdf(
    @Body()
    body: {
      page?: number;
      limit?: number;
      department_id?: number;
      keyword?: string;
    },
  ) {
    try {
      const result = await this.service.exportDocumentsPdf(body ?? {});
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ส่งออก PDF ไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  /** ส่งออกเอกสารเดี่ยว — PDF */
  @Post('documents/:id/export/pdf')
  @HttpCode(HttpStatus.OK)
  async exportDocumentPdf(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.service.exportDocumentsPdf({ document_id: id });
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ส่งออก PDF ไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  /** รายละเอียดเอกสาร */
  @Get('documents/:id')
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDocument(id);
  }
}
