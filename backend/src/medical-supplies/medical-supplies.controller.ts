import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { MedicalSuppliesService } from './medical-supplies.service';
import { FlexibleAuthGuard, MedicalSuppliesAuthRequest } from './guards/flexible-auth.guard';
import { StaffDepartmentScopeService } from '../staff/staff-department-scope.service';
import {
  CreateMedicalSupplyUsageDto,
  UpdateMedicalSupplyUsageDto,
  GetMedicalSupplyUsagesQueryDto,
  GetMedicalSupplyUsageLogsQueryDto,
  RecordItemUsedWithPatientDto,
  RecordItemReturnDto,
  RecordStockReturnDto,
  GetPendingItemsQueryDto,
  GetReturnHistoryQueryDto,
} from './dto';

@Controller('medical-supplies')
export class MedicalSupplyUsageController {
  constructor(
    private readonly medicalSuppliesService: MedicalSuppliesService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  // AuthGuard
  @Post()
  @UseGuards(FlexibleAuthGuard)
  async create(
    @Body() payload: any,
    @Req() req: Request & MedicalSuppliesAuthRequest,
  ) {
    try {
      let userContext: { user: any; userType: string };

      if (req.clientCredential) {
        userContext = {
          user: req.clientCredential.user,
          userType: req.clientCredential.userType || 'admin',
        };
      } else if (req.user && req.staffJwt) {
        userContext = { user: req.user, userType: 'staff' };
      } else if (req.user) {
        userContext = { user: req.user, userType: 'admin' };
      } else if (req.clientIdForStaffCheck) {
        userContext = {
          user: { client_id: req.clientIdForStaffCheck },
          userType: 'unknown',
        };
      } else {
        throw new UnauthorizedException();
      }

      const { _userContext: _ignoredUserContext, ...data } = payload;
      void _ignoredUserContext;
      const usage = await this.medicalSuppliesService.create(data, userContext);
      return { success: true, data: usage };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      return { success: false, message: error?.message };
    }
  }

  /**
   * POST /medical-supplies/open — ไม่มี guard
   * ใส่ recorded_by_user_id หรือ _userContext ใน body ได้ (ระบบภายนอก)
   */
  @Post('open')
  async createOpen(@Body() payload: any) {
    try {
      const { _userContext, ...data } = payload;
      const usage = await this.medicalSuppliesService.create(
        data,
        _userContext ?? undefined,
      );
      return { success: true, data: usage };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get()
  @UseGuards(FlexibleAuthGuard)
  async findAll(
    @Req() req: Request & MedicalSuppliesAuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('patient_hn') patient_hn?: string,
    @Query('HN') HN?: string,
    @Query('EN') EN?: string,
    @Query('department_code') department_code?: string,
    @Query('department_name') department_name?: string,
    @Query('print_date') print_date?: string,
    @Query('time_print_date') time_print_date?: string,
    @Query('billing_status') billing_status?: string,
    @Query('usage_type') usage_type?: string,
    @Query('keyword') keyword?: string,
    @Query('patient_keyword') patient_keyword?: string,
    @Query('item_keyword') item_keyword?: string,
    @Query('user_name') user_name?: string,
    @Query('first_name') first_name?: string,
    @Query('lastname') lastname?: string,
    @Query('assession_no') assession_no?: string,
  ) {
    try {
      /** ใช้ user ที่มี role_id (staff) — ไม่พึ่งแค่ payload.staff ใน JWT เพื่อไม่ให้เห็นทุกแผนกเมื่อโทเคนไม่มี staff: true */
      let staffAllowedDepartmentIds: number[] | null | undefined = undefined;
      const staffUser = await this.staffDepartmentScope.resolveActiveStaffUser(req);
      if (staffUser != null) {
        staffAllowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
      }

      const query: GetMedicalSupplyUsagesQueryDto = {
        page: page != null ? page : undefined,
        limit: limit != null ? limit : undefined,
        startDate,
        endDate,
        patient_hn,
        HN,
        EN,
        department_code,
        department_name,
        print_date,
        time_print_date,
        billing_status,
        usage_type,
        keyword,
        patient_keyword,
        item_keyword,
        user_name,
        first_name,
        lastname,
        assession_no,
      };
      const normalized = {
        ...query,
        page: page != null ? Number(page) : undefined,
        limit: limit != null ? Number(limit) : undefined,
      };
      const result = await this.medicalSuppliesService.findAll(
        normalized as GetMedicalSupplyUsagesQueryDto,
        { staffAllowedDepartmentIds },
      );
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('logs')
  async findAllLogs(@Query() query: GetMedicalSupplyUsageLogsQueryDto) {
    try {
      const result = await this.medicalSuppliesService.findAllLogs(query);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      const stats = await this.medicalSuppliesService.getStatistics();
      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('by-patient-hn/:patient_hn')
  async findByPatientHN(@Param('patient_hn') patient_hn: string) {
    try {
      const usages = await this.medicalSuppliesService.findByHN(patient_hn);
      return { success: true, data: usages };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('by-department/:department_code')
  async findByDepartment(@Param('department_code') department_code: string) {
    try {
      const usages = await this.medicalSuppliesService.findByDepartment(department_code);
      return { success: true, data: usages };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const usage = await this.medicalSuppliesService.findOne(id);
      return { success: true, data: usage };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { updateData: UpdateMedicalSupplyUsageDto },
  ) {
    try {
      const usage = await this.medicalSuppliesService.update(id, body.updateData);
      return { success: true, data: usage };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Patch(':id/print-info')
  async updatePrintInfo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { printData: any },
  ) {
    try {
      const usage = await this.medicalSuppliesService.updatePrintInfo(id, body.printData);
      return { success: true, data: usage };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Patch(':id/billing-status')
  async updateBillingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    try {
      const usage = await this.medicalSuppliesService.updateBillingStatus(id, body.status);
      return { success: true, data: usage };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.medicalSuppliesService.remove(id);
      return result;
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }
}

@Controller('medical-supply-items')
export class MedicalSupplyItemController {
  constructor(
    private readonly medicalSuppliesService: MedicalSuppliesService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Post('record-used')
  async recordItemUsedWithPatient(@Body() data: RecordItemUsedWithPatientDto) {
    try {
      const result = await this.medicalSuppliesService.recordItemUsedWithPatient(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Post('record-return')
  async recordItemReturn(@Body() data: RecordItemReturnDto) {
    try {
      const result = await this.medicalSuppliesService.recordItemReturn(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Post('record-stock-returns')
  async recordStockReturns(@Body() data: RecordStockReturnDto) {
    try {
      const result = await this.medicalSuppliesService.recordStockReturns(data);
      return result;
    } catch (error: any) {
      return { success: false, error: (error as any)?.message };
    }
  }

  @Post('return-to-cabinet')
  async returnItemsToCabinet(@Body() body: { rowIds: number[]; userId: number }) {
    try {
      const result = await this.medicalSuppliesService.returnItemsToCabinet(
        body.rowIds,
        body.userId,
      );
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispense-from-cabinet')
  async dispenseItemsFromCabinet(@Body() body: { rowIds: number[]; userId: number }) {
    try {
      const result = await this.medicalSuppliesService.dispenseItemsFromCabinet(
        body.rowIds,
        body.userId,
      );
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('pending')
  async getPendingItems(@Query() query: GetPendingItemsQueryDto) {
    try {
      const result = await this.medicalSuppliesService.getPendingItems(query);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('return-history')
  @UseGuards(FlexibleAuthGuard)
  async getReturnHistory(
    @Req() req: Request & MedicalSuppliesAuthRequest,
    @Query() query: GetReturnHistoryQueryDto,
  ) {
    try {
      const normalized = {
        ...query,
        page: query.page != null ? Number(query.page) : undefined,
        limit: query.limit != null ? Number(query.limit) : undefined,
      };
      let staffAllowedDepartmentIds: number[] | null | undefined = undefined;
      const staffUser = await this.staffDepartmentScope.resolveActiveStaffUser(req);
      if (staffUser != null) {
        staffAllowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
      }
      const result = await this.medicalSuppliesService.getReturnHistory(
        normalized as GetReturnHistoryQueryDto,
        { staffAllowedDepartmentIds },
      );
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('quantity-statistics')
  async getQuantityStatistics(@Query('department_code') department_code?: string) {
    try {
      const result = await this.medicalSuppliesService.getQuantityStatistics(department_code);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get('for-return-to-cabinet')
  async getItemStocksForReturnToCabinet(
    @Query('itemCode') itemCode?: string,
    @Query('itemTypeId') itemTypeId?: string,
    @Query('rfidCode') rfidCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const result = await this.medicalSuppliesService.getItemStocksForReturnToCabinet({
        itemCode,
        itemTypeId: itemTypeId ? parseInt(itemTypeId, 10) : undefined,
        rfidCode,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('for-dispense-from-cabinet')
  async getItemStocksForDispenseFromCabinet(
    @Query('itemCode') itemCode?: string,
    @Query('itemTypeId') itemTypeId?: string,
    @Query('rfidCode') rfidCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const result = await this.medicalSuppliesService.getItemStocksForDispenseFromCabinet({
        itemCode,
        itemTypeId: itemTypeId ? parseInt(itemTypeId, 10) : undefined,
        rfidCode,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('by-usage/:usageId')
  async getSupplyItemsByUsageId(@Param('usageId', ParseIntPipe) usageId: number) {
    try {
      const result = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }

  @Get(':id')
  async getSupplyItemById(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.medicalSuppliesService.getSupplyItemById(id);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }
}

@Controller('medical-supply')
export class MedicalSupplyController {
  constructor(
    private readonly medicalSuppliesService: MedicalSuppliesService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get('validate-item-code')
  async validateItemCode(@Query('itemCode') itemCode: string) {
    try {
      const result = await this.medicalSuppliesService.validateItemCode(itemCode);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('validate-item-codes')
  async validateItemCodes(@Body() body: { itemCodes: string[] }) {
    try {
      const result = await this.medicalSuppliesService.validateItemCodes(body.itemCodes || []);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('dispensed-items-from-slots')
  @UseGuards(FlexibleAuthGuard)
  async getDispensedItemsFromSlots(
    @Req() req: Request & MedicalSuppliesAuthRequest,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('departmentId') departmentId?: string,
    @Query('cabinetId') cabinetId?: string,
    @Query('subDepartmentId') subDepartmentId?: string,
  ) {
    try {
      let staffAllowedDepartmentIds: number[] | null | undefined = undefined;
      const staffUser = await this.staffDepartmentScope.resolveActiveStaffUser(req);
      if (staffUser != null) {
        staffAllowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
      }
      const result = await this.medicalSuppliesService.getDispensedItemsFromSlotDetail({
        keyword,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        departmentId,
        cabinetId,
        subDepartmentId,
        staffAllowedDepartmentIds,
      });
      return {
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        filters: result.filters,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('dispensed-items')
  @UseGuards(FlexibleAuthGuard)
  async getDispensedItems(
    @Req() req: Request & MedicalSuppliesAuthRequest,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('departmentId') departmentId?: string,
    @Query('cabinetId') cabinetId?: string,
    @Query('subDepartmentId') subDepartmentId?: string,
  ) {
    try {
      let staffAllowedDepartmentIds: number[] | null | undefined = undefined;
      const staffUser = await this.staffDepartmentScope.resolveActiveStaffUser(req);
      if (staffUser != null) {
        staffAllowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
      }
      const result = await this.medicalSuppliesService.getDispensedItems({
        keyword,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        departmentId,
        cabinetId,
        subDepartmentId,
        staffAllowedDepartmentIds,
      });
      return {
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        filters: result.filters,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('returned-items')
  @UseGuards(FlexibleAuthGuard)
  async getReturnedItems(
    @Req() req: Request & MedicalSuppliesAuthRequest,
    @Query('keyword') keyword?: string,
    @Query('itemTypeId') itemTypeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('departmentId') departmentId?: string,
    @Query('cabinetId') cabinetId?: string,
    @Query('subDepartmentId') subDepartmentId?: string,
  ) {
    try {
      let staffAllowedDepartmentIds: number[] | null | undefined = undefined;
      const staffUser = await this.staffDepartmentScope.resolveActiveStaffUser(req);
      if (staffUser != null) {
        staffAllowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
      }
      const result = await this.medicalSuppliesService.getReturnedItems({
        keyword,
        itemTypeId: itemTypeId ? parseInt(itemTypeId, 10) : undefined,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        departmentId,
        cabinetId,
        subDepartmentId,
        staffAllowedDepartmentIds,
      });
      return {
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        filters: result.filters,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('dispensed-vs-usage-summary')
  async getDispensedVsUsageSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.medicalSuppliesService.getDispensedVsUsageSummary({ startDate, endDate });
  }

  @Get('compare-dispensed-vs-usage')
  async compareDispensedVsUsage(
    @Query('itemCode') itemCode?: string,
    @Query('itemTypeId') itemTypeId?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentCode') departmentCode?: string,
    @Query('subDepartmentId') subDepartmentId?: string,
    @Query('cabinetId') cabinetId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const result = await this.medicalSuppliesService.compareDispensedVsUsage({
        itemCode,
        itemTypeId: itemTypeId ? parseInt(itemTypeId, 10) : undefined,
        keyword,
        startDate,
        endDate,
        departmentCode,
        subDepartmentId,
        cabinetId,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Get('usage-by-item-code')
  async getUsageByItemCode(@Query() query: any) {
    return this.medicalSuppliesService.getUsageByItemCode(query);
  }

  @Get('usage-by-order-item-code')
  async getUsageByOrderItemCode(@Query() query: any) {
    return this.medicalSuppliesService.getUsageByOrderItemCode(query);
  }

  @Get('usage-by-item-code-from-item-table')
  async getUsageByItemCodeFromItemTable(@Query() query: any) {
    return this.medicalSuppliesService.getUsageByItemCodeFromItemTable(query);
  }

  @Post('handle-cross-day-cancel-bill')
  async handleCrossDayCancelBill(@Body() data: any) {
    try {
      const result = await this.medicalSuppliesService.handleCrossDayCancelBill(data);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error?.message };
    }
  }


}
