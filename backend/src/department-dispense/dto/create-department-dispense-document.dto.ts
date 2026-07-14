import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class DepartmentDispenseLineDto {
  @IsString()
  itemcode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  location_id?: number;

  @IsOptional()
  @IsString()
  location_row?: string | null;

  @IsOptional()
  @IsString()
  location_rack?: string | null;

  @IsOptional()
  @IsString()
  location_shelf?: string | null;
}

export class CreateDepartmentDispenseDocumentDto {
  @IsInt()
  department_id!: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DepartmentDispenseLineDto)
  lines!: DepartmentDispenseLineDto[];
}
