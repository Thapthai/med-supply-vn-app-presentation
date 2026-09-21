import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
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

export class CreateStickerPrintHistoryLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  itemcode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  item_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  copies?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expire_date must be YYYY-MM-DD' })
  expire_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bytes_sent?: number;
}

/** บันทึกประวัติการพิมพ์ด้วยตนเอง */
export class CreateStickerPrintHistoryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => CreateStickerPrintHistoryLineDto)
  items!: CreateStickerPrintHistoryLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  template?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'ERROR'])
  status?: 'SUCCESS' | 'ERROR';

  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;

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

export class GetStickerPrintHistoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(25)
  itemcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  printed_by_user_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  source?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'ERROR'])
  status?: 'SUCCESS' | 'ERROR';

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
