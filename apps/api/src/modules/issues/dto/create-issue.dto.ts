import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Estos enums los mantenemos como string union compatibles con Prisma sin importar
// el cliente generado para no acoplar el DTO al runtime.
const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'APPLIANCES', 'STRUCTURAL', 'PEST', 'HEATING_COOLING', 'COMMON_AREAS', 'OTHER'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateIssueDto {
  @ApiProperty({ example: 'Pérdida de agua en el baño' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'El cesto del lavabo pierde desde hace 2 días. Hay un charco constante en el piso.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ enum: CATEGORIES, example: 'PLUMBING' })
  @IsEnum(CATEGORIES)
  @IsOptional()
  category?: typeof CATEGORIES[number];

  @ApiPropertyOptional({ enum: PRIORITIES, example: 'MEDIUM' })
  @IsEnum(PRIORITIES)
  @IsOptional()
  priority?: typeof PRIORITIES[number];

  @ApiPropertyOptional({ type: [String], example: ['/uploads/issues/foto1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Si el issue está vinculado a un contrato activo' })
  @IsString()
  @IsOptional()
  contractId?: string;
}

const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export class UpdateIssueStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsEnum(STATUSES)
  status: typeof STATUSES[number];

  @ApiPropertyOptional({ example: 'Vino el plomero el martes, cambió el flexible. Resuelto.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  resolutionNote?: string;
}
