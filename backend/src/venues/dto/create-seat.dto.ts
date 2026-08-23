import { IsString, IsInt, IsEnum } from 'class-validator';
import { SeatCategory } from '@prisma/client';

export class CreateSeatDto {
  @IsString()
  row!: string;

  @IsInt()
  number!: number;

  @IsEnum(SeatCategory)
  category!: SeatCategory;
}