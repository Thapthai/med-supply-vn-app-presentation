import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ItemStorageLocationLineDto {
  @IsString()
  itemcode!: string;

  @IsOptional()
  @IsString()
  location_row?: string | null;

  @IsOptional()
  @IsString()
  location_rack?: string | null;

  @IsOptional()
  @IsString()
  location_shelf?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(0)
  qty?: number | null;
}

export class BulkUpsertItemStorageLocationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemStorageLocationLineDto)
  locations!: ItemStorageLocationLineDto[];
}
