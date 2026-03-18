import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SelectedOptionDto } from './selected-option.dto';

export class UpdateCartItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions?: SelectedOptionDto[];

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
