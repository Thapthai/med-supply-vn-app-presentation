import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetCabinetTempHumChartQueryDto {
  /** PK ของ `app_cabinets` — backend แปลงเป็น `cabinet_temp_hum_log.cabinet_id` (stock_id) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cabinet_id?: number;

  /** ช่วงเวลาย้อนหลัง (ชั่วโมง) — ใช้เมื่อไม่ระบุเดือน */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 90)
  hours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(2000)
  limit?: number;
}
