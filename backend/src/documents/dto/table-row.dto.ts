import { IsNumber, IsOptional } from 'class-validator';

export class TableRowDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNumber()
  sum: number;

  @IsNumber()
  count: number;
}
