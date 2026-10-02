import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { StaffService } from './staff.service';

/**
 * ข้อมูล "ฉัน" ฝั่ง Staff portal — อ่านจาก Bearer (staff JWT) หรือ client_id
 */
@Controller('staff/me')
export class StaffMeController {
  constructor(private readonly staffService: StaffService) {}

  /** แผนกจาก app_staff_role_permission_departments ของ role ของ Staff ที่ล็อกอิน */
  @Get('departments')
  async myDepartments(
    @Req() req: Request,
    @Query('with_cabinet') with_cabinet?: string,
  ) {
    return this.staffService.findMyPermissionDepartments(req, {
      with_cabinet: with_cabinet === 'true' || with_cabinet === '1',
    });
  }
}
