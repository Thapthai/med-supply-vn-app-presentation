import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** แถวหนึ่งในรายการสั่งพิมพ์ */
export class PrintLabelItemLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  itemcode!: string;

  /** จำนวนฉลากของรหัสนี้ — ค่าเริ่มต้น 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  copies?: number;

  /** แสดงเป็นบรรทัดหมดอายุบนฉลาก (SBPL num4) — YYYY-MM-DD */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expire_date must be YYYY-MM-DD' })
  expire_date?: string;
}

/** พิมพ์หลายฉลากจาก Item master ตามลำดับแถว — host/port จาก .env */
export class PrintLabelItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => PrintLabelItemLineDto)
  items!: PrintLabelItemLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  department_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cabinet_id?: number;
}
