import { IsString, IsInt, IsNumber, IsOptional, Min, Max, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** ช่องว่างหรือ null = ยังไม่ตั้งเกณฑ์; ตัวเลขที่ไม่ถูกต้องคงไว้ให้ validator ปฏิเสธ */
function toNullableNumber({ value }: { value: unknown }): number | null | unknown {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

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
