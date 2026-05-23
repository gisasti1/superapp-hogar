import { IsString, IsNumber, IsOptional, IsInt, IsBoolean, IsArray, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class SearchListingsDto {
  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minRooms?: number;

  @ApiPropertyOptional({ example: 500000 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxRent?: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  petsAllowed?: boolean;

  @ApiPropertyOptional({ example: 50000 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxExpenses?: number;

  @ApiPropertyOptional({ example: ['pool', 'gym'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  amenities?: string[];

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;
}
