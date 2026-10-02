import { IsArray, IsInt } from 'class-validator';

/** ตั้งค่ารายการแผนกที่ผู้ใช้ (staff) เข้าถึงได้ — แทนที่ทั้งชุด (ว่าง = ไม่จำกัดแผนก) */
export class SetStaffPermissionDepartmentsDto {
  @IsInt()
  user_id: number;

  @IsArray()
  @IsInt({ each: true })
  department_ids: number[];
}
