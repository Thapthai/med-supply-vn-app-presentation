import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import moment from 'moment-timezone';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMedicalSupplySubDepartmentDto,
  UpdateMedicalSupplySubDepartmentDto,
} from './dto/medical-supply-sub-department.dto';

@Injectable()
export class MedicalSupplySubDepartmentService {
  private readonly logger = new Logger(MedicalSupplySubDepartmentService.name);

  constructor(private prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim();
  }

  private isUniqueConstraintViolation(err: unknown): boolean {
    return err instanceof PrismaClientKnownRequestError && err.code === 'P2002';
  }

  /** ค่า `created_at` / `updated_at` ที่ส่งเข้า Prisma (สอดคล้องกับ medical-supplies.service) */
  private nowBangkokUtcTrueForPrisma(): Date {
    return moment().tz('Asia/Bangkok').utc(true).toDate();
  }

  /**
   * @param allowedDepartmentIds null = ไม่จำกัด (admin หรือ staff role ไม่มีแถว permission)
   * number[] = เฉพาะแผนกเหล่านี้
   */
  async findAll(allowedDepartmentIds?: number[] | null) {
    try {
      if (allowedDepartmentIds != null && allowedDepartmentIds.length === 0) {
        return { success: true, data: [] };
      }

      const rows = await this.prisma.medicalSupplySubDepartment.findMany({
        where:
          allowedDepartmentIds != null
            ? { department_id: { in: allowedDepartmentIds } }
            : undefined,
        orderBy: [{ department_id: 'asc' }, { code: 'asc' }],
        include: {
          department: { select: { ID: true, DepName: true, DepName2: true } },
          _count: { select: { medicalSupplyUsages: true } },
        },
      });
      return { success: true, data: rows };
    } catch (err: any) {
      this.logger.error(`findAll: ${err?.message}`);
      return { success: false, message: 'Failed to list sub-departments', error: err?.message };
    }
  }

  async findOne(id: number) {
    const row = await this.prisma.medicalSupplySubDepartment.findUnique({
      where: { id },
      include: {
        department: { select: { ID: true, DepName: true, DepName2: true } },
      },
    });
    if (!row) throw new NotFoundException(`Sub-department id ${id} not found`);
    return { success: true, data: row };
  }

  async create(dto: CreateMedicalSupplySubDepartmentDto) {
    const code = this.normalizeCode(dto.code);
    const dept = await this.prisma.department.findUnique({
      where: { ID: dto.department_id },
      select: { ID: true },
    });
    if (!dept) throw new NotFoundException(`ไม่พบแผนก ID ${dto.department_id}`);

    try {
      const row = await this.prisma.medicalSupplySubDepartment.create({
        data: {
          department_id: dto.department_id,
          code,
          name: dto.name?.trim() || null,
          description: dto.description?.trim() ? dto.description.trim() : null,
          status: dto.status !== false,
        },
      });
      return { success: true, message: 'สร้างแผนกย่อยแล้ว', data: row };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      if (this.isUniqueConstraintViolation(err)) {
        return { success: false, message: 'รหัส (code) นี้มีในระบบแล้ว', error: err.message };
      }
      this.logger.error(`create: ${err?.message}`);
      return { success: false, message: 'สร้างไม่สำเร็จ', error: err?.message };
    }
  }

  async update(id: number, dto: UpdateMedicalSupplySubDepartmentDto) {
    const current = await this.prisma.medicalSupplySubDepartment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Sub-department id ${id} not found`);

    const nextDeptId = dto.department_id ?? current.department_id;
    const nextCode = dto.code != null ? this.normalizeCode(dto.code) : current.code;

    if (dto.department_id != null && dto.department_id !== current.department_id) {
      const dept = await this.prisma.department.findUnique({
        where: { ID: dto.department_id },
        select: { ID: true },
      });
      if (!dept) throw new NotFoundException(`ไม่พบแผนก ID ${dto.department_id}`);
    }

    try {
      const timeTs = this.nowBangkokUtcTrueForPrisma();
      const row = await this.prisma.medicalSupplySubDepartment.update({
        where: { id },
        data: {
          ...(dto.department_id !== undefined ? { department_id: dto.department_id } : {}),
          ...(dto.code != null ? { code: nextCode } : {}),
          ...(dto.name !== undefined ? { name: dto.name?.trim() || null } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() ? dto.description.trim() : null }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          updated_at: timeTs,
        },
      });

      return { success: true, message: 'อัปเดตแล้ว', data: row };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      if (this.isUniqueConstraintViolation(err)) {
        return { success: false, message: 'รหัส (code) นี้มีในระบบแล้ว', error: err.message };
      }
      this.logger.error(`update: ${err?.message}`);
      return { success: false, message: 'อัปเดตไม่สำเร็จ', error: err?.message };
    }
  }

  async remove(id: number) {
    const current = await this.prisma.medicalSupplySubDepartment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Sub-department id ${id} not found`);

    try {
      await this.prisma.$transaction([
        this.prisma.medicalSupplyUsage.updateMany({
          where: { sub_department_id: id },
          data: { sub_department_id: null },
        }),
        this.prisma.medicalSupplySubDepartment.delete({ where: { id } }),
      ]);
      return { success: true, message: 'ลบแผนกย่อยแล้ว' };
    } catch (err: any) {
      this.logger.error(`remove: ${err?.message}`);
      return { success: false, message: 'ลบไม่สำเร็จ', error: err?.message };
    }
  }
}
