import {
  IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsDateString,
  MaxLength, MinLength, Min, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const EMPLOYMENT_TYPES = [
  'EMPLOYEE', 'SELF_EMPLOYED', 'FREELANCER', 'BUSINESS_OWNER',
  'STUDENT', 'RETIRED', 'UNEMPLOYED', 'OTHER',
] as const;

const MARITAL_STATUSES = [
  'SINGLE', 'IN_RELATIONSHIP', 'MARRIED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY',
] as const;

/**
 * Todos los campos son opcionales — el usuario va completando su perfil
 * a medida que quiera/le pidan. PATCH parcial: solo se actualiza lo que viene.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MinLength(2) @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MinLength(2) @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Juancho', description: 'Apodo opcional para mostrar en lugar del nombre real' })
  @IsString() @IsOptional() @MaxLength(40)
  nickname?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MinLength(8) @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MinLength(5) @MaxLength(200)
  address?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MinLength(2) @MaxLength(80)
  city?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(80)
  province?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsDateString() @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Argentina' })
  @IsString() @IsOptional() @MinLength(2) @MaxLength(60)
  nationality?: string;

  @ApiPropertyOptional({ example: '32123456', description: 'DNI sin puntos' })
  @IsString() @IsOptional() @Matches(/^\d{7,9}$/, { message: 'DNI debe tener entre 7 y 9 dígitos' })
  dni?: string;

  // ─── Profesional / económico ────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Programadora' })
  @IsString() @IsOptional() @MinLength(2) @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsEnum(EMPLOYMENT_TYPES) @IsOptional()
  employmentType?: typeof EMPLOYMENT_TYPES[number];

  @ApiPropertyOptional({ example: 'Telecom Argentina' })
  @IsString() @IsOptional() @MaxLength(120)
  employer?: string;

  @ApiPropertyOptional({ example: 850000, description: 'Ingreso mensual en pesos' })
  @IsNumber() @IsOptional() @Min(0)
  @Type(() => Number)
  monthlyIncome?: number;

  // ─── Personal / social ──────────────────────────────────────────────────

  @ApiPropertyOptional({ enum: MARITAL_STATUSES })
  @IsEnum(MARITAL_STATUSES) @IsOptional()
  maritalStatus?: typeof MARITAL_STATUSES[number];

  @ApiPropertyOptional({ example: false })
  @IsBoolean() @IsOptional()
  hasPets?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean() @IsOptional()
  smoker?: boolean;

  @ApiPropertyOptional({ example: 'Soy tranqui, trabajo desde casa, sin hijos, sin mascotas.' })
  @IsString() @IsOptional() @MaxLength(2000)
  bio?: string;

  // ─── Contacto de emergencia ─────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'María Pérez' })
  @IsString() @IsOptional() @MaxLength(120)
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+5491155667788' })
  @IsString() @IsOptional() @MinLength(8) @MaxLength(20)
  emergencyContactPhone?: string;
}
