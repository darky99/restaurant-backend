import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MenuItemOptionInputDto {
  @IsString()
  groupName: string;

  @IsString()
  optionName: string;

  @Type(() => Number)
  @IsNumber()
  priceModifier: number;
}
