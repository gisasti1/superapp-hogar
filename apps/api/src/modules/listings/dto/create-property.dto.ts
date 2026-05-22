import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Av. Corrientes 1234, Piso 3 Dto B' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  rooms: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  bathrooms: number;

  @ApiProperty({ example: 65 })
  @IsNumber()
  @Min(1)
  squareMeters: number;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'Departamento luminoso en Palermo.' })
  @IsString()
  @IsOptional()
  description?: string;
}
