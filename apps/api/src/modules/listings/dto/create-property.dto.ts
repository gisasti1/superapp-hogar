import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiPropertyOptional({ example: 35000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  expenses?: number;

  @ApiPropertyOptional({ example: 'Departamento luminoso en Palermo.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  petsAllowed?: boolean;

  @ApiPropertyOptional({ example: ['pool', 'gym', 'parking'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({ example: -34.5921, description: 'Latitud (entre -90 y 90)' })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: -58.3956, description: 'Longitud (entre -180 y 180)' })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;
}
