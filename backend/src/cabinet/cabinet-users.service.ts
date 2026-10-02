import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCabinetUserDto, UpdateCabinetUserDto } from './dto/cabinet-user.dto';

/** ข้อมูลตู้จาก app_cabinets ที่ใช้ตอบ API */
type CabinetSummary = {
  id: number;
  cabinet_name: string | null;
  cabinet_code: string | null;
  stock_id: number | null;
};

@Injectable()
export class CabinetUsersService {
  constructor(private readonly prisma: PrismaService) { }

  private async cabinetsByStockIds(stockIds: number[]): Promise<Map<number, CabinetSummary>> {
    const unique = [...new Set(stockIds.filter((n) => Number.isFinite(n)))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.cabinet.findMany({
      where: { stock_id: { in: unique } },
      select: {
        id: true,
        cabinet_name: true,
        cabinet_code: true,
        stock_id: true,
      },
    });
    const map = new Map<number, CabinetSummary>();
    for (const c of rows) {
      if (c.stock_id != null) map.set(c.stock_id, c);
    }
    return map;
  }

  /**
   * ดึง `stock_id` จาก `app_cabinets` ผ่านแถว `app_cabinet_departments` (cabinet_id = PK ตู้)
   * ใช้เมื่อมี `cabinet_id` หรือเมื่อกรอง แผนก แล้วต้องการ stock_id ของตู้ใน mapping
   */
  private async stockIdFromActiveCabinetDepartment(opts: {
    cabinetPk: number;
    departmentId?: number;
  }): Promise<number | null> {
    const mapping = await this.prisma.cabinetDepartment.findFirst({
      where: {
        cabinet_id: opts.cabinetPk,

        department_id: opts.departmentId,
      },
      include: {
        cabinet: { select: { stock_id: true, cabinet_status: true } },
      },
    });
    const stock = mapping?.cabinet?.stock_id;
    if (stock == null) return null;
    return stock;
  }

  /**
   * สร้างเงื่อนไข `user_cabinet` — เปรียบเทียบกับ `user_cabinet.cabinet_id` (= `app_cabinets.stock_id`)
   * ทุกกรณี resolve `stock_id` ผ่าน `app_cabinet_departments` + `app_cabinets` (ไม่ดึงตู้ตรงๆ โดยตัด mapping)
   */
  private async stockIdsFromDepartmentMappings(deptFilter: {
    department_id?: number;
    department_ids?: number[];
  }): Promise<number[] | 'empty'> {
    const deptId = deptFilter.department_id;
    const deptIds = deptFilter.department_ids;
    const departmentWhere =
      deptId != null
        ? { department_id: deptId }
        : deptIds != null && deptIds.length > 0
          ? { department_id: { in: deptIds } }
          : null;
    if (!departmentWhere) return 'empty';

    const mappingRows = await this.prisma.cabinetDepartment.findMany({
      where: {
        ...departmentWhere,
        status: 'ACTIVE',
        cabinet_id: { not: null },
      },
      select: { cabinet_id: true },
    });
    if (mappingRows.length === 0) return 'empty';
    const cabinetPkIds = [
      ...new Set(
        mappingRows.map((r) => r.cabinet_id).filter((id): id is number => typeof id === 'number'),
      ),
    ];
    const cabs = await this.prisma.cabinet.findMany({
      where: { id: { in: cabinetPkIds }, stock_id: { not: null } },
      select: { stock_id: true },
    });
    const fingerStockIds = cabs.map((c) => c.stock_id!).filter((n) => typeof n === 'number');
    return fingerStockIds.length === 0 ? 'empty' : fingerStockIds;
  }

  private async resolveUserCabinetSomeFilter(params: {
    department_id?: number;
    department_ids?: number[];
    cabinet_id?: number;
  }): Promise<'none' | 'empty' | Prisma.UserCabinetWhereInput> {
    const deptId = params.department_id;
    const deptIds = params.department_ids;
    const cabinetPk = params.cabinet_id;

    if (deptId == null && cabinetPk == null && (deptIds == null || deptIds.length === 0)) {
      return 'none';
    }

    if (cabinetPk != null && deptId != null) {
      const stockId = await this.stockIdFromActiveCabinetDepartment({
        cabinetPk,
        departmentId: deptId,
      });

      if (stockId == null) return 'empty';
      return { cabinet_id: stockId };
    }

    if (cabinetPk != null && deptId == null) {
      const mappingWhere: {
        cabinet_id: number;
        status: string;
        department_id?: { in: number[] };
      } = {
        cabinet_id: cabinetPk,
        status: 'ACTIVE',
      };
      if (deptIds != null && deptIds.length > 0) {
        mappingWhere.department_id = { in: deptIds };
      }
      const mapping = await this.prisma.cabinetDepartment.findFirst({
        where: mappingWhere,
        include: { cabinet: { select: { stock_id: true } } },
      });
      const stock = mapping?.cabinet?.stock_id;
      if (stock == null) return 'empty';
      return { cabinet_id: stock };
    }

    if (deptId != null || (deptIds != null && deptIds.length > 0)) {
      const stockIds = await this.stockIdsFromDepartmentMappings({
        department_id: deptId,
        department_ids: deptId == null ? deptIds : undefined,
      });
      if (stockIds === 'empty') return 'empty';
      return { cabinet_id: { in: stockIds } };
    }

    return 'none';
  }

  async findAll(
    params?: {
      page?: number;
      limit?: number;
      keyword?: string;
      department_id?: number;
      /** `app_cabinets.id` — แปลงเป็น `stock_id` ก่อนเทียบกับ `user_cabinet.cabinet_id` */
      cabinet_id?: number;
    },
    allowedDepartmentIds?: number[] | null,
  ) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;
    const kw = params?.keyword?.trim();

    if (allowedDepartmentIds != null && allowedDepartmentIds.length === 0) {
      return { success: true, data: [], total: 0, page, limit, lastPage: 1 };
    }

    const deptId = params?.department_id;
    if (allowedDepartmentIds != null && deptId != null && !allowedDepartmentIds.includes(deptId)) {
      return { success: true, data: [], total: 0, page, limit, lastPage: 1 };
    }

    /** Staff ที่ role จำกัดแผนก — ต้องเลือกแผนกก่อน (ไม่ดึงทั้ง role อัตโนมัติ) */
    if (allowedDepartmentIds != null && allowedDepartmentIds.length > 0 && deptId == null) {
      return { success: true, data: [], total: 0, page, limit, lastPage: 1 };
    }

    const ucSome = await this.resolveUserCabinetSomeFilter({
      department_id: deptId,
      cabinet_id: params?.cabinet_id,
    });


    if (ucSome === 'empty') {
      return {
        success: true,
        data: [],
        total: 0,
        page,
        limit,
        lastPage: 1,
      };
    }

    const where: Prisma.LegacyUsersWhereInput = {};
    if (kw) {
      where.OR = [{ UserName: { contains: kw } }, { EmpCode: { contains: kw } }];
    }
    if (ucSome !== 'none') {
      where.userCabinet = { some: ucSome };
    }
    const [rows, total] = await Promise.all([
      this.prisma.legacyUsers.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          employee: { select: { EmpCode: true, FirstName: true, LastName: true } },
          userCabinet: {
            select: { id: true, user_id: true, cabinet_id: true },
            orderBy: { id: 'asc' },
          },
        },
      }),
      this.prisma.legacyUsers.count({ where }),
    ]);

    const allFingerStockIds = [
      ...new Set(rows.flatMap((r) => r.userCabinet.map((c) => c.cabinet_id))),
    ];
    const cabinetByStock = await this.cabinetsByStockIds(allFingerStockIds);

    const data = rows.map((u) => {
      const fn = u.employee?.FirstName?.trim() ?? '';
      const ln = u.employee?.LastName?.trim() ?? '';
      const employee_display = [fn, ln].filter(Boolean).join(' ') || null;
      const linked_cabinets = u.userCabinet.map((uc) => {
        const sid = uc.cabinet_id;
        const cab = cabinetByStock.get(sid) ?? null;
        return {
          user_cabinet_id: uc.id,
          user_id: uc.user_id,
          cabinet_id: sid,
          cabinet: cab,
        };
      });
      return {
        id: u.id,
        userName: u.UserName,
        empCode: u.EmpCode,
        employee_display,
        employee: u.employee
          ? {
            empCode: u.employee.EmpCode,
            firstName: u.employee.FirstName,
            lastName: u.employee.LastName,
          }
          : null,
        linked_cabinets,
        cabinet_count: u.userCabinet.length,
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

  async findOne(id: number) {
    const u = await this.prisma.legacyUsers.findUnique({
      where: { id },
      include: {
        employee: { select: { EmpCode: true, FirstName: true, LastName: true } },
      },
    });
    if (!u) throw new NotFoundException('ไม่พบผู้ใช้ตู้');

    const userCabinet = await this.prisma.userCabinet.findMany({
      where: { user_id: id },
      select: {
        id: true,
        user_id: true,
        cabinet_id: true,
      },
    });

    const fingerStockIds = userCabinet.map((x) => x.cabinet_id);
    const cabinetByStock = await this.cabinetsByStockIds(fingerStockIds);

    const linked_cabinets = userCabinet.map((uc) => {
      const sid = uc.cabinet_id;
      const cab = cabinetByStock.get(sid) ?? null;
      return {
        user_cabinet_id: uc.id,
        user_id: uc.user_id,
        cabinet_id: sid,
        cabinet: cab,
      };
    });

    /** app_cabinets.id ตามลำดับแถว user_cabinet — ใช้ติ๊กในฟอร์ม (ตู้ที่ resolve ได้จาก stock_id เท่านั้น) */
    const cabinet_ids: number[] = [];
    const seenCabinetPk = new Set<number>();
    for (const link of linked_cabinets) {
      if (link.cabinet && !seenCabinetPk.has(link.cabinet.id)) {
        seenCabinetPk.add(link.cabinet.id);
        cabinet_ids.push(link.cabinet.id);
      }
    }

    const resolved_cabinets: CabinetSummary[] = [];
    const seenRes = new Set<number>();
    for (const link of linked_cabinets) {
      const c = link.cabinet;
      if (c && !seenRes.has(c.id)) {
        seenRes.add(c.id);
        resolved_cabinets.push(c);
      }
    }

    const fn = u.employee?.FirstName?.trim() ?? '';
    const ln = u.employee?.LastName?.trim() ?? '';
    return {
      success: true,
      data: {
        id: u.id,
        userName: u.UserName,
        empCode: u.EmpCode,
        employee_display: [fn, ln].filter(Boolean).join(' ') || null,
        employee: u.employee
          ? {
            empCode: u.employee.EmpCode,
            firstName: u.employee.FirstName,
            lastName: u.employee.LastName,
          }
          : null,
        hasPassword: !!(u.Password && String(u.Password).length > 0),
        userCabinet,
        linked_cabinets,
        resolved_cabinets,
        cabinet_ids,
      },
    };
  }

  async create(dto: CreateCabinetUserDto) {
    const userName = dto.user_name?.trim();
    if (!userName) throw new BadRequestException('กรุณากรอกชื่อ (UserName)');

    const empCode = dto.emp_code?.trim() || null;
    if (empCode) {
      await this.assertEmployeeExists(empCode);
      const taken = await this.prisma.legacyUsers.findFirst({ where: { EmpCode: empCode } });
      if (taken) {
        throw new BadRequestException('รหัสพนักงานนี้มีผู้ใช้ตู้อยู่แล้ว — ใช้แก้ไขแทนการสร้างใหม่');
      }
    }

    const pwd = dto.password?.trim() ? dto.password.trim().slice(0, 20) : null;

    const user = await this.prisma.legacyUsers.create({
      data: {
        UserName: userName,
        EmpCode: empCode,
        Password: pwd,
      },
    });

    const warnings = await this.syncCabinets(user.id, dto.cabinet_ids ?? []);
    return {
      success: true,
      message: 'สร้างผู้ใช้ตู้แล้ว',
      data: { id: user.id },
      warnings: warnings.length ? warnings : undefined,
    };
  }

  /**
   * ซิงก์ `user_cabinet` เท่านั้น — ไม่อัปเดตตาราง `users` (UserName / EmpCode / Password)
   */
  async update(id: number, dto: UpdateCabinetUserDto) {
    const legacyUser = await this.prisma.legacyUsers.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!legacyUser) throw new NotFoundException('ไม่พบผู้ใช้ตู้');

    const legacyUserId = legacyUser.id;

    let warnings: string[] | undefined;
    if (dto.cabinet_ids !== undefined) {
      warnings = await this.syncCabinets(legacyUserId, dto.cabinet_ids);
      if (warnings.length === 0) warnings = undefined;
    }

    return {
      success: true,
      message: 'บันทึกแล้ว',
      warnings,
    };
  }

  private async assertEmployeeExists(empCode: string) {
    const e = await this.prisma.employee.findUnique({ where: { EmpCode: empCode } });
    if (!e) throw new BadRequestException(`ไม่พบพนักงาน EmpCode ${empCode}`);
  }

  /**
   * ซิงก์เฉพาะแถวของผู้ใช้ตู้คนนี้ (user_id = legacy user):
   * ลบเฉพาะผูกของคนนี้ที่ไม่อยู่ในรายการใหม่ — ไม่แก้/ไม่ลบแถวของผู้ใช้ตู้คนอื่น
   * แต่ละ stock_id: ไม่มีแถว → create ให้คนนี้; เป็นของคนนี้แล้ว → ข้าม; เป็นของคนอื่น → warning (ไม่ย้าย user_id)
   */
  private async syncCabinets(legacyUserId: number, cabinetIds: number[]): Promise<string[]> {
    const warnings: string[] = [];
    const rawList = Array.isArray(cabinetIds) ? cabinetIds : [];
    const ids = [
      ...new Set(
        rawList
          .map((raw) => {
            if (raw == null) return NaN;
            return typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10);
          })
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];
    /** ส่งมาว่าไม่ว่างแต่ parse ไม่ได้ — อย่าถือว่าเป็น “ล้างทั้งหมด” (เดิมจะได้ ids=[] แล้วไปลบผูกครบ) */
    if (rawList.length > 0 && ids.length === 0) {
      throw new BadRequestException('รูปแบบ cabinet_ids ไม่ถูกต้อง (ต้องเป็นเลข id ตู้)');
    }

    const cabinets =
      ids.length > 0
        ? await this.prisma.cabinet.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            cabinet_name: true,
            cabinet_code: true,
            stock_id: true,
          },
        })
        : [];

    for (const cid of ids) {
      const c = cabinets.find((x) => x.id === cid);

      if (!c) warnings.push(`ไม่พบตู้ id ${cid}`);
      else if (c.stock_id == null) {
        warnings.push(
          `ตู้ "${c.cabinet_name ?? c.cabinet_code ?? cid}" ยังไม่มี stock_id — ตั้ง stock_id ในจัดการตู้ก่อน (ใช้เป็นตัวเชื่อมกับตู้จริง)`,
        );
      }
    }

    const desiredStockIds = [...new Set(cabinets.filter((c) => c.stock_id != null).map((c) => c.stock_id!))];
    const uid = Number.parseInt(String(legacyUserId), 10);
    if (!Number.isSafeInteger(uid) || uid < 1) {
      throw new BadRequestException('รหัสผู้ใช้ตู้ไม่ถูกต้อง');
    }

    await this.prisma.$transaction(async (tx) => {
      /**
       * ล้างผูกทั้งหมดเฉพาะเมื่อส่งมาว่างจริงๆ — ถ้าเลือกตู้แต่ไม่มี stock_id เลย อย่าลบของเดิมทั้งหมด
       */

      if (desiredStockIds.length === 0) {
        if (ids.length === 0) {
          await tx.userCabinet.deleteMany({ where: { user_id: uid } });
        }
        return;
      }

      /** ถอดเฉพาะผูกของ user คนนี้ที่ไม่อยู่ในรายการใหม่ — ไม่แตะแถวของ user_id อื่น */

      await tx.userCabinet.deleteMany({
        where: {
          user_id: uid,
          cabinet_id: { notIn: desiredStockIds },
        },
      });


      /**
       * cabinet_id = stock_id unique ทั้งระบบ — create ได้เมื่อยังไม่มีแถว;
       * ถ้ามีของผู้ใช้อื่นอยู่แล้วไม่ย้าย user_id (กันผู้ใช้อื่นถูกถอดตู้โดยไม่เกี่ยวข้อง)
       */
      for (const fid of desiredStockIds) {
        const existingMine = await tx.userCabinet.findFirst({
          where: { user_id: uid, cabinet_id: fid },
          select: { id: true },
        });

        if (existingMine) {
          continue;
        }

        const row = await tx.userCabinet.findUnique({
          where: { cabinet_id: fid, user_id: uid },
          select: { user_id: true },
        });

        if (row == null) {
          await tx.userCabinet.create({
            data: { user_id: uid, cabinet_id: fid },
          });
          continue;
        }

        warnings.push(
          `ไม่ผูก stock_id ${fid} — มีผู้ใช้ตู้ (users.ID=${row.user_id}) ใช้อยู่แล้ว`,
        );
      }
    });

    return warnings;
  }
}
