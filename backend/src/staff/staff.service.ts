import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientCredentialStrategy } from '../auth/strategies/client-credential.strategy';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  RegenerateClientSecretDto,
} from '../auth/dto/staff-user.dto';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from '../auth/dto/staff-role.dto';
import { SetStaffPermissionDepartmentsDto } from '../auth/dto/staff-permission-department.dto';
import { StaffDepartmentScopeService } from './staff-department-scope.service';

/** เมนูเริ่มต้นหลังสร้าง role — บันทึกใน app_staff_role_permissions */
const STAFF_ENTRY_MENU_HREF = '/staff/dashboard';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientCredentialStrategy: ClientCredentialStrategy,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  private normalizeOptionalEmpCode(raw: string | null | undefined): string | null {
    if (raw === undefined || raw === null) return null;
    const t = String(raw).trim();
    return t.length === 0 ? null : t;
  }

  /** ตรวจว่ามี employee และยังไม่ถูก user อื่นใช้ (ยกเว้น exceptUserId) */
  private async assertEmpCodeAssignable(empCode: string, exceptUserId?: number) {
    const emp = await this.prisma.employee.findUnique({
      where: { EmpCode: empCode },
      select: { EmpCode: true, IsUser: true },
    });
    if (!emp) throw new BadRequestException(`Employee with code "${empCode}" not found`);
    if (emp.IsUser === 0) {
      throw new BadRequestException(`พนักงาน EmpCode "${empCode}" ปิดการใช้งาน (IsUser = 0) — ไม่สามารถผูกได้`);
    }

    const taken = await this.prisma.user.findFirst({
      where: {
        emp_code: empCode,
        ...(exceptUserId != null ? { id: { not: exceptUserId } } : {}),
      },
      select: { id: true, email: true },
    });
    if (taken) {
      throw new BadRequestException(`รหัสพนักงานนี้ถูกใช้กับบัญชีอื่นแล้ว (user id ${taken.id})`);
    }
  }

  /**
   * ค้นหาพนักงานสำหรับ dropdown จัดการ Staff User
   * exclude_linked: ไม่แสดงรหัสที่ถูกผูกกับ app_users แล้ว (ยกเว้น except_user_id)
   * active_only: เฉพาะ IsUser = 1 (หรือ null ถือเป็นใช้งาน)
   */
  async findEmployeesForPicker(params?: {
    keyword?: string;
    page?: number;
    limit?: number;
    exclude_linked?: boolean;
    except_user_id?: number;
    active_only?: boolean;
  }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 30));
    const skip = (page - 1) * limit;

    let notInCodes: string[] | undefined;
    if (params?.exclude_linked) {
      const linked = await this.prisma.user.findMany({
        where: {
          emp_code: { not: null },
          ...(params.except_user_id != null ? { id: { not: params.except_user_id } } : {}),
        },
        select: { emp_code: true },
      });
      notInCodes = linked.map((u) => u.emp_code!).filter(Boolean);
    }

    const kw = params?.keyword?.trim();
    const activeOnly = params?.active_only !== false;
    const andParts: Prisma.EmployeeWhereInput[] = [];
    if (notInCodes?.length) {
      andParts.push({ EmpCode: { notIn: notInCodes } });
    }
    if (activeOnly) {
      andParts.push({ OR: [{ IsUser: 1 }, { IsUser: null }] });
    }
    if (kw) {
      andParts.push({
        OR: [
          { EmpCode: { contains: kw } },
          { FirstName: { contains: kw } },
          { LastName: { contains: kw } },
        ],
      });
    }
    const where: Prisma.EmployeeWhereInput = andParts.length ? { AND: andParts } : {};

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { EmpCode: 'asc' },
        select: { EmpCode: true, FirstName: true, LastName: true },
      }),
      this.prisma.employee.count({ where }),
    ]);

    const data = rows.map((e) => {
      const fn = e.FirstName?.trim() ?? '';
      const ln = e.LastName?.trim() ?? '';
      const name = [fn, ln].filter(Boolean).join(' ') || null;
      return {
        emp_code: e.EmpCode,
        first_name: e.FirstName,
        last_name: e.LastName,
        display_name: name,
      };
    });

    return {
      success: true,
      data,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  private async resolveRoleId(role_code?: string, role_id?: number): Promise<number | null> {
    if (role_id != null) return role_id;
    if (!role_code?.trim()) return null;
    const role = await this.prisma.staffRole.findUnique({
      where: { code: role_code.trim() },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  /** บทบาทต้องมีอยู่และ is_active = true */
  private async resolveActiveRoleId(role_code?: string, role_id?: number): Promise<number | null> {
    const id = await this.resolveRoleId(role_code, role_id);
    if (id == null) return null;
    const role = await this.prisma.staffRole.findUnique({
      where: { id },
      select: { id: true, is_active: true, code: true },
    });
    if (!role) return null;
    if (!role.is_active) {
      throw new BadRequestException(`บทบาท "${role.code}" ปิดใช้งานแล้ว ไม่สามารถเลือกได้`);
    }
    return role.id;
  }

  async findAllStaffUsers(params?: { page?: number; limit?: number; keyword?: string }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { is_admin: false };
    if (params?.keyword?.trim()) {
      const k = params.keyword.trim();
      Object.assign(where, {
        OR: [
          { email: { contains: k } },
          { fname: { contains: k } },
          { lname: { contains: k } },
          { client_id: { contains: k } },
        ],
      });
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          role: { select: { id: true, code: true, name: true } },
          department: { select: { ID: true, DepName: true, DepName2: true } },
          employee: { select: { EmpCode: true, FirstName: true, LastName: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const list = data.map((u) => {
      const ef = u.employee?.FirstName?.trim() ?? '';
      const el = u.employee?.LastName?.trim() ?? '';
      const employee_display = [ef, el].filter(Boolean).join(' ') || null;
      return {
        id: u.id,
        email: u.email,
        fname: u.fname,
        lname: u.lname,
        emp_code: u.emp_code ?? null,
        employee_display,
        role: u.role?.code ?? null,
        role_name: u.role?.name ?? null,
        role_id: u.role_id,
        department_id: u.department_id,
        department_name: u.department?.DepName ?? u.department?.DepName2 ?? null,
        client_id: u.client_id,
        expires_at: u.expires_at?.toISOString?.() ?? null,
        is_active: u.is_active,
        isUser: u.is_active ? 1 : 0,
        created_at: u.created_at?.toISOString?.() ?? null,
        updated_at: u.updated_at?.toISOString?.() ?? null,
      };
    });
    return { success: true, data: list, total, page, limit, lastPage: Math.ceil(total / limit) };
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.trim() } });
    if (existing) throw new BadRequestException('Email already exists');

    const roleId = await this.resolveActiveRoleId(dto.role_code, dto.role_id);
    if (roleId == null) throw new BadRequestException('role_code or role_id is required and must match an active role');

    const departmentId = dto.department_id ?? null;
    if (departmentId != null) {
      const dept = await this.prisma.department.findUnique({ where: { ID: departmentId }, select: { ID: true } });
      if (!dept) throw new BadRequestException(`Department with ID ${departmentId} not found`);
    }

    const empCode = this.normalizeOptionalEmpCode(dto.emp_code as string | null | undefined);
    if (empCode) await this.assertEmpCodeAssignable(empCode);

    const password = dto.password?.trim() && dto.password.length >= 8
      ? await bcrypt.hash(dto.password, 10)
      : await bcrypt.hash('password123', 10);

    const { client_id, client_secret, client_secret_hash } = this.clientCredentialStrategy.generateClientCredential();

    const expiresAt = dto.expires_at?.trim()
      ? new Date(dto.expires_at)
      : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim(),
        fname: dto.fname.trim(),
        lname: dto.lname.trim(),
        role_id: roleId,
        department_id: departmentId,
        password,
        client_id,
        client_secret: client_secret_hash,
        expires_at: expiresAt,
        is_active: dto.is_active ?? true,
        is_admin: false,
        emp_code: empCode,
      },
    });
    return {
      success: true,
      message: 'Staff user created',
      data: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        client_id,
        client_secret,
      },
    };
  }

  async findOneStaffUser(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, is_admin: false },
      include: {
        role: { select: { id: true, code: true, name: true } },
        department: { select: { ID: true, DepName: true, DepName2: true } },
        employee: { select: { EmpCode: true, FirstName: true, LastName: true } },
      },
    });
    if (!user) throw new NotFoundException('Staff user not found');
    const ef = user.employee?.FirstName?.trim() ?? '';
    const el = user.employee?.LastName?.trim() ?? '';
    const employee_display = [ef, el].filter(Boolean).join(' ') || null;
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        emp_code: user.emp_code ?? null,
        employee_display,
        role: user.role?.code ?? null,
        role_name: user.role?.name ?? null,
        department_id: user.department_id,
        department_name: user.department?.DepName ?? user.department?.DepName2 ?? null,
        client_id: user.client_id,
        expires_at: user.expires_at?.toISOString?.() ?? null,
        is_active: user.is_active,
        isUser: user.is_active ? 1 : 0,
        created_at: user.created_at?.toISOString?.() ?? null,
        updated_at: user.updated_at?.toISOString?.() ?? null,
      },
    };
  }

  async updateStaffUser(id: number, dto: UpdateStaffUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, is_admin: false } });
    if (!user) throw new NotFoundException('Staff user not found');

    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email.trim();
    if (dto.fname !== undefined) data.fname = dto.fname.trim();
    if (dto.lname !== undefined) data.lname = dto.lname.trim();
    if (dto.department_id !== undefined) data.department_id = dto.department_id;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.expires_at !== undefined) data.expires_at = dto.expires_at?.trim() ? new Date(dto.expires_at) : null;

    if (dto.role_code !== undefined || dto.role_id !== undefined) {
      const roleId = await this.resolveActiveRoleId(dto.role_code, dto.role_id);
      if (roleId == null) {
        throw new BadRequestException('role_code or role_id is required and must match an active role');
      }
      data.role_id = roleId;
    }

    if (dto.password?.trim() && dto.password.length >= 8) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.emp_code !== undefined) {
      const next = this.normalizeOptionalEmpCode(dto.emp_code as string | null | undefined);
      if (next) await this.assertEmpCodeAssignable(next, id);
      data.emp_code = next;
    }

    await this.prisma.user.update({ where: { id }, data });

    if (dto.is_active !== undefined && user.emp_code?.trim()) {
      await this.prisma.employee.updateMany({
        where: { EmpCode: user.emp_code.trim() },
        data: { IsUser: dto.is_active ? 1 : 0 },
      });
    }

    return { success: true, message: 'Staff user updated' };
  }

  async deleteStaffUser(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, is_admin: false } });
    if (!user) throw new NotFoundException('Staff user not found');
    await this.prisma.user.update({ where: { id }, data: { is_active: false } });
    if (user.emp_code?.trim()) {
      await this.prisma.employee.updateMany({
        where: { EmpCode: user.emp_code.trim() },
        data: { IsUser: 0 },
      });
    }
    return { success: true, message: 'Staff user deactivated' };
  }

  async regenerateClientSecret(id: number, dto?: RegenerateClientSecretDto) {
    const user = await this.prisma.user.findFirst({ where: { id, is_admin: false } });
    if (!user) throw new NotFoundException('Staff user not found');

    const { client_id, client_secret, client_secret_hash } = this.clientCredentialStrategy.generateClientCredential();
    const expiresAt = dto?.expires_at?.trim() ? new Date(dto.expires_at) : user.expires_at;

    await this.prisma.user.update({
      where: { id },
      data: { client_secret: client_secret_hash, client_id, expires_at: expiresAt },
    });
    return {
      success: true,
      message: 'Client secret regenerated',
      data: { client_id, client_secret },
    };
  }

  async findAllStaffRoles(activeOnly = false) {
    const list = await this.prisma.staffRole.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { code: 'asc' },
    });
    return { success: true, data: list };
  }

  async findOneStaffRole(id: number) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    return { success: true, data: role };
  }

  private normalizeHierarchyLevel(v: unknown): number {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
    if (!Number.isFinite(n) || n < 1) return 3;
    if (n > 3) return 3;
    return n;
  }

  /** รหัสอัตโนมัติสำหรับ Role ที่สร้างจากแอดมิน — STF-001, STF-002, … */
  private async allocateNextStfRoleCode(): Promise<string> {
    const rows = await this.prisma.staffRole.findMany({ select: { code: true } });
    let max = 0;
    for (const { code } of rows) {
      const m = /^stf-(\d+)$/i.exec(code.trim());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `STF-${String(max + 1).padStart(3, '0')}`;
  }

  async createStaffRole(dto: CreateStaffRoleDto) {
    let code = dto.code?.trim() ?? '';
    if (!code) {
      code = await this.allocateNextStfRoleCode();
    }
    const existing = await this.prisma.staffRole.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('รหัส Role นี้มีอยู่แล้ว');
    const role = await this.prisma.staffRole.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        is_active: dto.is_active ?? true,
      },
    });
    await this.prisma.staffRolePermission.upsert({
      where: {
        role_menu_href: { role_id: role.id, menu_href: STAFF_ENTRY_MENU_HREF },
      },
      create: {
        role_id: role.id,
        menu_href: STAFF_ENTRY_MENU_HREF,
        can_access: true,
      },
      update: { can_access: true },
    });
    return { success: true, message: 'Role created', data: role };
  }

  async updateStaffRole(id: number, dto: UpdateStaffRoleDto) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    await this.prisma.staffRole.update({ where: { id }, data });
    return { success: true, message: 'Role updated' };
  }

  async deleteStaffRole(id: number) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    await this.prisma.staffRole.delete({ where: { id } });
    return { success: true, message: 'Role deleted' };
  }

  async findAllStaffRolePermissions() {
    const list = await this.prisma.staffRolePermission.findMany({
      orderBy: [{ role_id: 'asc' }, { menu_href: 'asc' }],
      include: {
        role: { select: { id: true, code: true, name: true } },
      },
    });
    const data = list.map((p) => ({
      id: p.id,
      role_id: p.role_id,
      role_code: p.role?.code ?? null,
      menu_href: p.menu_href,
      can_access: p.can_access,
      created_at: p.created_at?.toISOString?.() ?? null,
      updated_at: p.updated_at?.toISOString?.() ?? null,
      role: p.role ? { code: p.role.code, name: p.role.name } : null,
    }));
    return { success: true, data };
  }

  async findPermissionsByRoleCode(roleCode: string) {
    const role = await this.prisma.staffRole.findUnique({
      where: { code: roleCode.trim() },
      select: { id: true },
    });
    if (!role) return { success: true, data: [] };
    const list = await this.prisma.staffRolePermission.findMany({
      where: { role_id: role.id },
      orderBy: { menu_href: 'asc' },
      select: { menu_href: true, can_access: true },
    });
    return { success: true, data: list };
  }

  async bulkUpdateStaffRolePermissions(
    permissions: Array<{ role_code?: string; role_id?: number; menu_href: string; can_access: boolean }>,
  ) {
    let updated = 0;
    for (const p of permissions) {
      const roleId = await this.resolveRoleId(p.role_code, p.role_id);
      if (roleId == null || !p.menu_href?.trim()) continue;
      const menu_href = p.menu_href.trim();
      await this.prisma.staffRolePermission.upsert({
        where: {
          role_menu_href: { role_id: roleId, menu_href },
        },
        create: { role_id: roleId, menu_href, can_access: p.can_access ?? true },
        update: { can_access: p.can_access ?? true },
      });
      updated++;
    }
    return { success: true, message: 'อัพเดตสิทธิ์แล้ว', updatedCount: updated };
  }

  /** ไม่มีแถว = ผู้ใช้คนนั้นไม่จำกัดแผนก (เห็นทุกแผนก) */
  async findStaffPermissionDepartments(userId?: number) {
    if (userId == null || !Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('รหัสผู้ใช้งานต้องเป็นตัวเลขบวก');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_admin: false },
      select: { id: true, email: true, fname: true, lname: true, role: { select: { code: true, name: true } } },
    });
    if (!user) throw new BadRequestException('ไม่พบผู้ใช้งาน');

    const rows = await this.prisma.staffPermissionDepartment.findMany({
      where: { user_id: userId },
      include: {
        department: { select: { ID: true, DepName: true, DepName2: true } },
      },
      orderBy: { department_id: 'asc' },
    });

    const unrestricted = rows.length === 0;
    return {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        user_name: [user.fname, user.lname].filter(Boolean).join(' ').trim() || user.email,
        role_code: user.role?.code ?? null,
        role_name: user.role?.name ?? null,
        unrestricted,
        departments: rows.map((r) => ({
          id: r.department.ID,
          department_name: r.department.DepName ?? r.department.DepName2 ?? null,
        })),
      },
    };
  }

  /** แทนที่รายการแผนกทั้งชุดของผู้ใช้ — ส่งว่างหรือลบทั้งหมด = ไม่จำกัดแผนก */
  async setStaffPermissionDepartments(dto: SetStaffPermissionDepartmentsDto) {
    const userId = dto.user_id;
    if (userId == null || !Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('รหัสผู้ใช้งานต้องเป็นตัวเลขบวก');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_admin: false },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Staff user not found');

    const raw = dto.department_ids ?? [];
    for (const n of raw) {
      const v = Number(n);
      if (!Number.isInteger(v) || v < 1) {
        throw new BadRequestException('รหัสแผนกต้องเป็นตัวเลขบวก');
      }
    }
    const ids = [...new Set(raw.map((n) => Number(n)))];

    if (ids.length > 0) {
      const found = await this.prisma.department.findMany({
        where: { ID: { in: ids } },
        select: { ID: true },
      });
      if (found.length !== ids.length) {
        throw new BadRequestException('ไม่พบแผนกที่ระบุ');
      }
    }

    await this.prisma.$transaction([
      this.prisma.staffPermissionDepartment.deleteMany({ where: { user_id: userId } }),
      ...(ids.length > 0
        ? [
            this.prisma.staffPermissionDepartment.createMany({
              data: ids.map((department_id) => ({ user_id: userId, department_id })),
            }),
          ]
        : []),
    ]);

    return {
      success: true,
      message: 'เพิ่มสิทธิ์แผนกแล้ว',
      data: { user_id: userId, unrestricted: ids.length === 0, department_ids: ids },
    };
  }

  /**
   * Staff ปัจจุบัน → app_staff_permission_departments (user_id) → department
   * มีแถวใน permission_departments = รายการแผนกใน dropdown ตามที่ผู้ใช้ได้รับสิทธิ์เท่านั้น
   * ไม่มีแถว = unrestricted (API ข้อมูลไม่กรองแผนก); dropdown ใช้ with_cabinet → ทุกแผนกที่มีตู้ ACTIVE
   * ไม่ใช้ app_users.department_id สำหรับรายการ แผนก
   */
  async findMyPermissionDepartments(
    req: { headers: Record<string, string | string[] | undefined> },
    opts?: { with_cabinet?: boolean },
  ) {
    const staff = await this.staffDepartmentScope.resolveActiveStaffUser(req);
    if (!staff) {
      throw new UnauthorizedException('ต้องล็อกอิน Staff (Bearer token หรือ client_id)');
    }

    const departmentSelect = {
      ID: true,
      DepName: true,
      DepName2: true,
      RefDepID: true,
    } as const;

    type DepartmentRow = {
      ID: number;
      DepName: string | null;
      DepName2: string | null;
      RefDepID: string | null;
    };

    const rows = await this.prisma.staffPermissionDepartment.findMany({
      where: { user_id: staff.id },
      include: {
        department: {
          select: departmentSelect,
        },
      },
      orderBy: { department_id: 'asc' },
    });

    let departments: DepartmentRow[] = rows.map((r) => r.department);

    if (rows.length === 0 && opts?.with_cabinet) {
      departments = await this.listDepartmentsWithActiveCabinet();
    }

    if (opts?.with_cabinet && departments.length > 0) {
      departments = await this.filterDepartmentsWithActiveCabinet(departments);
    }

    if (rows.length === 0) {
      return {
        success: true,
        data: {
          unrestricted: true,
          staff_user_id: staff.id,
          role_id: staff.role_id,
          departments,
        },
      };
    }

    return {
      success: true,
      data: {
        unrestricted: false,
        staff_user_id: staff.id,
        role_id: staff.role_id,
        departments,
      },
    };
  }

  /** แผนกที่มีตู้ผูก ACTIVE อย่างน้อยหนึ่งตู้ */
  private async listDepartmentsWithActiveCabinet(): Promise<
    Array<{ ID: number; DepName: string | null; DepName2: string | null; RefDepID: string | null }>
  > {
    const mappings = await this.prisma.cabinetDepartment.findMany({
      where: {
        status: 'ACTIVE',
        department_id: { not: null },
      },
      select: { department_id: true },
      distinct: ['department_id'],
    });
    const ids = [
      ...new Set(
        mappings
          .map((m) => m.department_id)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    ];
    if (ids.length === 0) return [];
    return this.prisma.department.findMany({
      where: {
        ID: { in: ids },
        OR: [{ IsCancel: null }, { IsCancel: 0 }],
      },
      select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
      orderBy: { ID: 'asc' },
    });
  }

  private async filterDepartmentsWithActiveCabinet<
    T extends { ID: number },
  >(departments: T[]): Promise<T[]> {
    if (departments.length === 0) return [];
    const ids = departments.map((d) => d.ID);
    const mappings = await this.prisma.cabinetDepartment.findMany({
      where: {
        status: 'ACTIVE',
        department_id: { in: ids },
      },
      select: { department_id: true },
      distinct: ['department_id'],
    });
    const withCabinet = new Set(
      mappings
        .map((m) => m.department_id)
        .filter((id): id is number => typeof id === 'number'),
    );
    return departments.filter((d) => withCabinet.has(d.ID));
  }
}
