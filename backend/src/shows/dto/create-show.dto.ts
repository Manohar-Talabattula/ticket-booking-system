import { IsString, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SeatCategory } from '@prisma/client';

class PricingEntryDto {
  @IsString()
  category!: SeatCategory;

  price!: number;
}

export class CreateShowDto {
  @IsString()
  title!: string;

  @IsString()
  venueId!: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingEntryDto)
  pricing!: PricingEntryDto[];
}