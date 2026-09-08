import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ItemService } from '../item/item.service';
import { StaffDepartmentScopeService } from './staff-department-scope.service';

/**
 * รายการสต็อกอุปกรณ์ในตู้ — Staff portal เท่านั้น
 * ไม่ส่ง cabinet_id = รวมทุกตู้ที่เข้าถึงได้
 * - ส่ง department_id = กรองแผนกเดียว
 * - ไม่ส่ง department_id แต่ role จำกัดแผนก = รวมทุกแผนกใน role (อารมณ์ WHERE department_id IN (allowed…))
 */
@Controller('staff/items')
export class StaffItemsController {
  constructor(
    private readonly itemService: ItemService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('status') status?: string,
    @Query('stock_status') stock_status?: string,
    @Query('expire_from') expire_from?: string,
    @Query('expire_to') expire_to?: string,
  ) {
    const departmentId =
      department_id != null && String(department_id).trim() !== ''
        ? parseInt(String(department_id), 10)
        : undefined;
    if (departmentId != null && (!Number.isFinite(departmentId) || departmentId < 1)) {
      throw new BadRequestException('department_id ไม่ถูกต้อง');
    }

    if (cabinet_id == null || String(cabinet_id).trim() === '') {
      const { stockIds, usageDepartmentIds } =
        await this.staffDepartmentScope.resolveAccessibleStocksForStaffItemsList(
          req,
          departmentId,
        );
      if (stockIds.length === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          page,
          limit,
          lastPage: 0,
        };
      }
      return this.itemService.findAllItems(
        page,
        limit,
        keyword,
        sort_by || 'itemcode',
        sort_order || 'asc',
        undefined,
        departmentId,
        status,
        { restrictedStockIds: stockIds, usageDepartmentIds },
        stock_status,
        expire_from,
        expire_to,
      );
    }

    const cabinetId = parseInt(String(cabinet_id), 10);
    if (!Number.isFinite(cabinetId) || cabinetId < 1) {
      throw new BadRequestException('cabinet_id ไม่ถูกต้อง');
    }

    await this.staffDepartmentScope.assertStaffCabinetAccess(req, cabinetId, departmentId);

    return this.itemService.findAllItems(
      page,
      limit,
      keyword,
      sort_by || 'itemcode',
      sort_order || 'asc',
      cabinetId,
      departmentId,
      status,
      undefined,
      stock_status,
      expire_from,
      expire_to,
    );
  }
}
