import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ItemStorageLocationLineDto {
  @IsInt()
  stock_id!: number;

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
}

export class BulkUpsertItemStorageLocationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemStorageLocationLineDto)
  locations!: ItemStorageLocationLineDto[];
}
