import { IsString, IsInt, IsNumber, IsOptional, Min, Max, ValidateIf, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** ช่องว่างหรือ null = ยังไม่ตั้งเกณฑ์; ตัวเลขที่ไม่ถูกต้องคงไว้ให้ validator ปฏิเสธ */
function toNullableNumber({ value }: { value: unknown }): number | null | unknown {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function toNullableIp({ value }: { value: unknown }): string | null {
  if (value == null) return null;
  const ip = String(value).trim();
  return ip || null;
}

function toNullableInt({ value }: { value: unknown }): number | null | unknown {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : value;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : value;
}

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export class CreateCabinetDto {
  @IsOptional()
  @IsString()
  cabinet_name?: string;

  @IsOptional()
  @IsString()
  cabinet_code?: string;

  @IsOptional()
  @IsString()
  cabinet_type?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_id?: number;

  /** ตู้นาโคติก — ตรงกับ item_narcotic_detail.trolley_id */
  @IsOptional()
  @Transform(toNullableInt)
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  trolley_id?: number | null;

  @IsOptional()
  @Transform(toNullableIp)
  @ValidateIf((_, v) => v != null)
  @IsString()
  @Matches(IPV4_PATTERN, { message: 'รูปแบบ IP ไม่ถูกต้อง เช่น 192.168.1.2' })
  machine_ip?: string | null;

  @IsOptional()
  @IsString()
  cabinet_status?: string;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(-50)
  @Max(80)
  temp_min?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(-50)
  @Max(80)
  temp_max?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  hum_min?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  hum_max?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;
}

export class UpdateCabinetDto {
  @IsOptional()
  @IsString()
  cabinet_name?: string;

  @IsOptional()
  @IsString()
  cabinet_code?: string;

  @IsOptional()
  @IsString()
  cabinet_type?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_id?: number;

  @IsOptional()
  @Transform(toNullableInt)
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  trolley_id?: number | null;

  @IsOptional()
  @Transform(toNullableIp)
  @ValidateIf((_, v) => v != null)
  @IsString()
  @Matches(IPV4_PATTERN, { message: 'รูปแบบ IP ไม่ถูกต้อง เช่น 192.168.1.2' })
  machine_ip?: string | null;

  @IsOptional()
  @IsString()
  cabinet_status?: string;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(-50)
  @Max(80)
  temp_min?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(-50)
  @Max(80)
  temp_max?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  hum_min?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  hum_max?: number | null;
}
