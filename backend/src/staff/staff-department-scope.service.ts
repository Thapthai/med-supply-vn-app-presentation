import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type RequestLike = { headers: Record<string, string | string[] | undefined> };

/**
 * กำหนดขอบเขตแผนกสำหรับ Staff portal
 * - null = ไม่จำกัด (ไม่ใช่ staff หรือ role ไม่มีแถวใน app_staff_role_permission_departments)
 * - number[] (length >= 1) = เห็นได้เฉพาะแผนกเหล่านี้
 */
@Injectable()
export class StaffDepartmentScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Staff ที่ล็อกอินอยู่ (JWT staff / client_id) — ไม่ใช่ staff คืน null */
  async resolveActiveStaffUser(req: RequestLike): Promise<{ id: number; role_id: number } | null> {
    return this.resolveStaffFromRequest(req);
  }

  async resolveAllowedDepartmentIds(req: RequestLike): Promise<number[] | null> {
    const staff = await this.resolveStaffFromRequest(req);
    if (!staff) return null;

    const rows = await this.prisma.staffPermissionDepartment.findMany({
      where: { user_id: staff.id },
      select: { department_id: true },
    });
    if (rows.length === 0) return null;

    return [...new Set(rows.map((r) => r.department_id))].sort((a, b) => a - b);
  }

  /**
   * Staff portal: ตู้ที่เลือกต้องผูกแผนก ACTIVE อย่างน้อยหนึ่งแผนก
   * และถ้า role จำกัดแผนก ต้องมีแผนกร่วมกับที่ role อนุญาต
   * departmentId (optional) ต้องเป็นแผนกที่ผูกกับตู้นี้
   */
  async assertStaffCabinetAccess(
    req: RequestLike,
    cabinetId: number,
    departmentId?: number,
  ): Promise<void> {
    const staff = await this.resolveStaffFromRequest(req);
    if (!staff) {
      throw new UnauthorizedException('ต้องล็อกอิน Staff');
    }

    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: {
        id: true,
        cabinetDepartments: {
          where: { status: 'ACTIVE' },
          select: { department_id: true },
        },
      },
    });
    if (!cabinet) {
      throw new NotFoundException('ไม่พบตู้');
    }

    const deptIds = cabinet.cabinetDepartments
      .map((cd) => cd.department_id)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
    if (deptIds.length === 0) {
      throw new BadRequestException('ตู้นี้ยังไม่ผูกแผนกที่ใช้งาน');
    }

    if (departmentId != null && !deptIds.includes(departmentId)) {
      throw new BadRequestException('แผนกที่เลือกไม่ตรงกับตู้นี้');
    }

    const allowed = await this.resolveAllowedDepartmentIds(req);
    if (allowed != null) {
      const intersects = deptIds.some((id) => allowed.includes(id));
      if (!intersects) {
        throw new ForbiddenException('ตู้นี้อยู่นอกแผนกที่คุณได้รับอนุญาต');
      }
      if (departmentId != null && !allowed.includes(departmentId)) {
        throw new ForbiddenException('แผนกนี้อยู่นอกขอบเขตที่คุณได้รับอนุญาต');
      }
    }
  }

  /**
   * Staff portal: ใช้เมื่อกรอง will-return แบบทุกตู้ — ต้องล็อกอิน และแผนกต้องอยู่ในขอบเขต role
   */
  async assertStaffDepartmentAccess(req: RequestLike, departmentId: number): Promise<void> {
    const staff = await this.resolveStaffFromRequest(req);
    if (!staff) {
      throw new UnauthorizedException('ต้องล็อกอิน Staff');
    }
    const allowed = await this.resolveAllowedDepartmentIds(req);
    if (allowed != null && !allowed.includes(departmentId)) {
      throw new ForbiddenException('แผนกนี้อยู่นอกขอบเขตที่คุณได้รับอนุญาต');
    }
  }

  /**
   * will-return ไม่ส่ง department_id แต่ส่ง sub_department_id — ตรวจว่าแผนกย่อยถูกต้องและ staff เข้าถึงแผนกได้
   */
  async assertStaffCanAccessSubDepartment(req: RequestLike, subDepartmentId: number): Promise<void> {
    const sub = await this.prisma.medicalSupplySubDepartment.findFirst({
      where: { id: subDepartmentId, status: true },
      select: { department_id: true },
    });
    if (!sub) {
      throw new BadRequestException('แผนกย่อยไม่ถูกต้อง');
    }
    await this.assertStaffDepartmentAccess(req, sub.department_id);
  }

  /**
   * GET /staff/items ไม่ส่ง cabinet_id — รวมทุกตู้ที่ staff เข้าถึงได้ (จำกัดตาม role แผนก)
   * หลักเดียวกับ DepartmentService.getAllCabinets: ผูกแผนกผ่าน app_cabinet_departments โดยไม่บังคับ status = ACTIVE
   * (ข้อมูลเก่าอาจมี status ว่าง/ค่าอื่น — เดิมบังคับ ACTIVE ทำให้ stockIds ว่างและได้ data: [])
   */
  async resolveAccessibleStocksForStaffItemsList(
    req: RequestLike,
    departmentFilter?: number,
  ): Promise<{ stockIds: number[]; usageDepartmentIds: string[] | null }> {
    const staff = await this.resolveStaffFromRequest(req);
    if (!staff) {
      throw new UnauthorizedException('ต้องล็อกอิน Staff');
    }

    if (departmentFilter != null) {
      if (!Number.isFinite(departmentFilter) || departmentFilter < 1) {
        throw new BadRequestException('department_id ไม่ถูกต้อง');
      }
      await this.assertStaffDepartmentAccess(req, departmentFilter);
    }

    const allowed = await this.resolveAllowedDepartmentIds(req);

    const whereCabinet: {
      stock_id: { not: null };
      id?: { in: number[] };
      cabinetDepartments?: { some: { department_id: number } };
    } = { stock_id: { not: null } };

    if (departmentFilter != null) {
      whereCabinet.cabinetDepartments = {
        some: { department_id: departmentFilter },
      };
    } else if (allowed != null) {
      if (allowed.length === 0) {
        return { stockIds: [], usageDepartmentIds: null };
      }
      /** ตู้ที่มีลิงก์กับแผนกใดแผนกหนึ่งใน allowed — เทียบเท่า WHERE department_id IN (allowed) */
      const links = await this.prisma.cabinetDepartment.findMany({
        where: { department_id: { in: allowed } },
        select: { cabinet_id: true },
      });
      const scopedIds = [
        ...new Set(
          links
            .map((l) => l.cabinet_id)
            .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
        ),
      ];
      if (scopedIds.length === 0) {
        return { stockIds: [], usageDepartmentIds: null };
      }
      whereCabinet.id = { in: scopedIds };
    }

    const cabinets = await this.prisma.cabinet.findMany({
      where: whereCabinet,
      select: { stock_id: true },
    });

    const stockIds = [
      ...new Set(
        cabinets
          .map((c) => c.stock_id)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    ];

    let usageDepartmentIds: string[] | null = null;
    if (departmentFilter != null) {
      usageDepartmentIds = [String(departmentFilter)];
    } else if (allowed != null && allowed.length > 0) {
      usageDepartmentIds = allowed.map(String);
    }

    return { stockIds, usageDepartmentIds };
  }

  /** แผนกย่อยต้องเป็นของแผนกที่เลือก (ไม่ต้องมีตู้เดียว) — will-return แบบทุกตู้ */
  async assertSubDepartmentBelongsToDepartment(
    subDepartmentId: number,
    departmentId: number,
  ): Promise<void> {
    const sub = await this.prisma.medicalSupplySubDepartment.findFirst({
      where: { id: subDepartmentId, department_id: departmentId, status: true },
      select: { id: true },
    });
    if (!sub) {
      throw new BadRequestException('แผนกย่อยไม่ถูกต้องหรือไม่อยู่ภายใต้แผนกที่เลือก');
    }
  }

  /** แผนกย่อยต้องอยู่ภายใต้แผนกที่ตู้นี้ผูกอยู่ (ACTIVE cabinet-departments) */
  async assertSubDepartmentCompatibleWithCabinet(cabinetId: number, subDepartmentId: number): Promise<void> {
    const sub = await this.prisma.medicalSupplySubDepartment.findFirst({
      where: { id: subDepartmentId, status: true },
      select: { department_id: true },
    });
    if (!sub) {
      throw new BadRequestException('แผนกย่อยไม่ถูกต้อง');
    }
    const cd = await this.prisma.cabinetDepartment.findFirst({
      where: { cabinet_id: cabinetId, status: 'ACTIVE', department_id: sub.department_id },
      select: { id: true },
    });
    if (!cd) {
      throw new BadRequestException('แผนกย่อยนี้ไม่อยู่ภายใต้แผนกเดียวกับตู้ที่เลือก');
    }
  }

  private async resolveStaffFromRequest(req: RequestLike): Promise<{ id: number; role_id: number } | null> {
    const h = req.headers;
    const authHeader = this.headerString(h['authorization']);
    const bearer = this.extractBearerToken(authHeader);
    if (bearer) {
      try {
        const payload = this.jwt.verify<{ sub?: number | string; staff?: boolean }>(bearer);
        const sub =
          typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : Number(payload.sub);
        if (Number.isFinite(sub) && sub >= 1) {
          const u = await this.prisma.user.findFirst({
            where: { id: sub, is_active: true, role_id: { not: null } },
            select: { id: true, role_id: true },
          });
          if (u?.role_id != null) return { id: u.id, role_id: u.role_id };
        }
      } catch {
        /* ไม่ใช่ JWT ที่อ่านได้ */
      }
    }

    const clientId = this.headerString(h['client_id'])?.trim();
    if (clientId) {
      const u = await this.prisma.user.findFirst({
        where: { client_id: clientId, is_active: true, role_id: { not: null } },
        select: { id: true, role_id: true },
      });
      if (u?.role_id != null) return { id: u.id, role_id: u.role_id };
    }

    return null;
  }

  private headerString(v: string | string[] | undefined): string | undefined {
    if (v == null) return undefined;
    return Array.isArray(v) ? v[0] : v;
  }

  private extractBearerToken(authHeader?: string): string {
    if (!authHeader?.trim()) return '';
    const s = authHeader.trim();
    const m = /^Bearer\s+(.+)$/i.exec(s);
    if (m) return m[1].trim();
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+\./i.test(s)) return s;
    return '';
  }
}
