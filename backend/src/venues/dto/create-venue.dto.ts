import { IsString, IsNotEmpty } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;
}