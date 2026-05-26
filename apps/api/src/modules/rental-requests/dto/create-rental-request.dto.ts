import { IsString, IsNumber, IsNotEmpty, IsOptional, IsInt, Min, Max, IsDateString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRentalRequestDto {
  @ApiProperty({ example: 'Hola, me interesa el departamento. Soy soltero, sin mascotas, ingresos estables.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ example: '2026-07-01', description: 'Fecha tentativa de inicio de contrato (ISO)' })
  @IsDateString()
  @IsOptional()
  proposedStartDate?: string;

  @ApiPropertyOptional({ example: 24, description: 'Duración propuesta en meses (típico: 24-36)' })
  @IsInt()
  @Min(6)
  @Max(60)
  @IsOptional()
  @Type(() => Number)
  proposedMonths?: number;

  @ApiPropertyOptional({ example: 480000, description: 'Monto mensual que el inquilino quiere proponer (puede ser distinto al publicado, abre negociación)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  proposedMonthlyAmount?: number;
}

export class CounterOfferDto {
  @ApiPropertyOptional({ example: 510000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  @Type(() => Number)
  months?: number;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

export class RespondRentalRequestDto {
  @ApiPropertyOptional({ example: 'Aceptado. Te paso datos del contrato.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  response?: string;
}
