import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DepartmentDispenseLineDto {
  @IsString()
  itemcode!: string;

  @IsInt()
  @Min(1)
  qty!: number;
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
