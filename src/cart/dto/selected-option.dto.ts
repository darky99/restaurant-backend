import { IsString } from 'class-validator';

export class SelectedOptionDto {
  @IsString()
  groupName: string;

  @IsString()
  optionName: string;
}
