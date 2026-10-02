import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  RegenerateClientSecretDto,
  StaffLoginDto,
} from '../auth/dto/staff-user.dto';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from '../auth/dto/staff-role.dto';
import { BulkUpdateStaffRolePermissionsDto } from '../auth/dto/staff-role-permission.dto';
import { SetStaffPermissionDepartmentsDto } from '../auth/dto/staff-permission-department.dto';

@Controller('staff-users')
export class StaffUsersController {
  constructor(
    private readonly staffService: StaffService,
    private readonly authService: AuthService,
  ) {}

  /** รองรับ client เดิม — delegate ไปยัง /auth/login (ตาราง User เดียว) */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: StaffLoginDto) {
    return this.authService.login({ email: dto.email, password: dto.password });
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ) {
    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword: keyword?.trim() || undefined,
    };
    return this.staffService.findAllStaffUsers(params);
  }

  /** รายชื่อพนักงานจาก HR สำหรับเลือกผูก emp_code (ต้องอยู่ก่อน @Get(':id')) */
  @Get('employees')
  async listEmployees(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('exclude_linked') exclude_linked?: string,
    @Query('except_user_id') except_user_id?: string,
    @Query('active_only') active_only?: string,
  ) {
    const exceptId =
      except_user_id != null && except_user_id !== '' && !Number.isNaN(parseInt(except_user_id, 10))
        ? parseInt(except_user_id, 10)
        : undefined;
    const exclude =
      exclude_linked === '0' || exclude_linked === 'false' ? false : true;
    const activeOnly =
      active_only === '0' || active_only === 'false' ? false : true;
    return this.staffService.findEmployeesForPicker({
      keyword: keyword?.trim() || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      exclude_linked: exclude,
      except_user_id: exceptId,
      active_only: activeOnly,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOneStaffUser(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto) {
    try {
      return await this.staffService.createStaffUser(dto);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const message = err?.message ?? String(err);
      if (err?.code === 'P2003') throw new BadRequestException('Department or role not found. Please check department_id and role.');
      throw new BadRequestException(message || 'Failed to create staff user');
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffUserDto,
  ) {
    return this.staffService.updateStaffUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.deleteStaffUser(id);
  }

  @Post(':id/regenerate-secret')
  async regenerateSecret(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegenerateClientSecretDto,
  ) {
    return this.staffService.regenerateClientSecret(id, dto);
  }
}

@Controller('staff-roles')
export class StaffRolesController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll(@Query('active_only') active_only?: string) {
    const activeOnly = active_only === '1' || active_only === 'true';
    return this.staffService.findAllStaffRoles(activeOnly);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOneStaffRole(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffRoleDto) {
    return this.staffService.createStaffRole(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffRoleDto,
  ) {
    return this.staffService.updateStaffRole(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.deleteStaffRole(id);
  }
}

@Controller('staff-role-permissions')
export class StaffRolePermissionsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll() {
    return this.staffService.findAllStaffRolePermissions();
  }

  @Get(':role')
  async getByRole(@Param('role') role: string) {
    return this.staffService.findPermissionsByRoleCode(role);
  }

  @Put('bulk')
  async bulkUpdate(@Body() dto: BulkUpdateStaffRolePermissionsDto) {
    const list = (dto.permissions ?? []).map((p) => ({
      role_code: p.role_code,
      role_id: p.role_id,
      menu_href: p.menu_href,
      can_access: p.can_access ?? true,
    }));
    return this.staffService.bulkUpdateStaffRolePermissions(list);
  }
}

/** จำกัดแผนกต่อผู้ใช้ Staff — ไม่มีแถว = ไม่จำกัด */
@Controller('staff-permission-departments')
export class StaffPermissionDepartmentsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async find(@Query('user_id') userIdStr?: string) {
    const user_id =
      userIdStr != null && userIdStr !== '' && !Number.isNaN(parseInt(userIdStr, 10))
        ? parseInt(userIdStr, 10)
        : undefined;
    return this.staffService.findStaffPermissionDepartments(user_id);
  }

  @Put()
  async set(@Body() dto: SetStaffPermissionDepartmentsDto) {
    return this.staffService.setStaffPermissionDepartments(dto);
  }
}
