import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsDateString, MinLength, MaxLength } from 'class-validator';
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
}

export class RespondRentalRequestDto {
  @ApiPropertyOptional({ example: 'Aceptado. Te paso datos del contrato.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  response?: string;
}
