import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { MenuItemOptionInputDto } from './menu-item-option-input.dto';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsUUID()
  categoryId: string;

  @Type(() => Number)
  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryTags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemOptionInputDto)
  options?: MenuItemOptionInputDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
