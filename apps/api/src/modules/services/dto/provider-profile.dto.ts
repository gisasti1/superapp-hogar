import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsNumber,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PROVIDER_CATEGORIES = [
  'PLUMBER',           // plomero
  'ELECTRICIAN',       // electricista
  'GAS',               // gasista
  'PAINTER',           // pintor
  'CARPENTER',         // carpintero
  'LOCKSMITH',         // cerrajero
  'AC_TECHNICIAN',     // técnico aire / refrigeración
  'CLEANER',           // limpieza
  'GARDENER',          // jardinería
  'MOVER',             // mudanzas
  'PEST_CONTROL',      // control de plagas
  'APPLIANCE_REPAIR',  // reparación electrodomésticos
  'GENERAL',           // multi-rubro / servicios generales
] as const;

/**
 * Categorías que por ley argentina exigen matrícula profesional.
 * - GAS: matrícula ENARGAS obligatoria.
 * - ELECTRICIAN: en CABA exige COPIME para instalaciones eléctricas mayores;
 *   para reparaciones menores no, pero pedimos como buena práctica.
 * - AC_TECHNICIAN: técnicos en gases refrigerantes requieren habilitación SRT.
 *
 * Si una categoría no está en esta lista, la matrícula queda NOT_REQUIRED
 * y el prestador puede operar sin presentarla.
 */
export const CATEGORIES_REQUIRING_LICENSE = ['GAS', 'ELECTRICIAN', 'AC_TECHNICIAN'] as const;

export class UpsertProviderProfileDto {
  @ApiProperty({ example: 'Plomería del Centro' })
  @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(80)
  businessName: string;

  @ApiProperty({ enum: PROVIDER_CATEGORIES, example: 'PLUMBER' })
  @IsString() @IsNotEmpty()
  category: typeof PROVIDER_CATEGORIES[number];

  @ApiPropertyOptional({ example: '15 años de experiencia. Plomería domiciliaria, destapaciones, fugas, calefones.' })
  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: ['Capital Federal', 'San Isidro', 'Vicente López'], type: [String] })
  @IsArray() @IsString({ each: true })
  cities: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;

  // Datos opcionales que también se pueden setear en la creación inicial.
  // Si el front prefiere, los manda en endpoints dedicados (más limpio para
  // el flujo de onboarding multi-paso).
  @ApiPropertyOptional({ example: 10 })
  @IsOptional() @IsInt() @Min(0) @Max(70)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  hasInsurance?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  emergency24h?: boolean;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional() @IsNumber() @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional() @IsNumber() @Min(0)
  calloutFee?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @IsInt() @Min(0) @Max(500)
  serviceRadiusKm?: number;
}

/**
 * Datos personales / fiscales del prestador. Se separan del User porque
 * un Provider puede ser una empresa (donde el User es el dueño pero los
 * datos fiscales y de contacto comercial son distintos).
 */
export class UpdateProviderPersonalDataDto {
  @ApiProperty({ enum: ['DNI', 'CUIT', 'CUIL'] })
  @IsEnum(['DNI', 'CUIT', 'CUIL'])
  documentType: 'DNI' | 'CUIT' | 'CUIL';

  @ApiProperty({ example: '20345678901', description: 'Sólo dígitos, sin guiones' })
  @IsString()
  @Matches(/^\d{7,11}$/, { message: 'Documento inválido: debe tener entre 7 y 11 dígitos' })
  documentNumber: string;

  @ApiPropertyOptional({ example: '+5491155667788' })
  @IsOptional() @IsString() @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({ example: '1985-05-15' })
  @IsOptional() @IsDateString()
  birthDate?: string;
}

/**
 * Cuenta donde el prestador recibe los pagos. Validamos formato CBU/CVU
 * (22 dígitos exactos por norma BCRA Comunicación A 5232).
 */
export class UpdateProviderPayoutAccountDto {
  @ApiProperty({ enum: ['BANK_TRANSFER', 'CVU', 'MERCADOPAGO'] })
  @IsEnum(['BANK_TRANSFER', 'CVU', 'MERCADOPAGO'])
  payoutMethod: 'BANK_TRANSFER' | 'CVU' | 'MERCADOPAGO';

  @ApiPropertyOptional({ example: '0070123456789012345678', description: '22 dígitos exactos' })
  @IsOptional() @IsString()
  @Matches(/^\d{22}$/, { message: 'CBU inválido: deben ser 22 dígitos exactos' })
  cbu?: string;

  @ApiPropertyOptional({ example: '0000003100012345678901', description: '22 dígitos exactos' })
  @IsOptional() @IsString()
  @Matches(/^\d{22}$/, { message: 'CVU inválido: deben ser 22 dígitos exactos' })
  cvu?: string;

  @ApiPropertyOptional({ example: 'plomero.del.centro' })
  @IsOptional() @IsString() @MaxLength(20)
  bankAlias?: string;

  @ApiPropertyOptional({ example: 'Banco Galicia' })
  @IsOptional() @IsString() @MaxLength(80)
  bankName?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional() @IsString() @MaxLength(120)
  bankAccountHolder?: string;

  @ApiPropertyOptional({ example: '20345678901', description: 'CUIT/CUIL del titular' })
  @IsOptional() @IsString()
  @Matches(/^\d{11}$/, { message: 'CUIT/CUIL del titular debe ser 11 dígitos' })
  bankAccountHolderId?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'ID de cuenta MercadoPago (si payoutMethod=MERCADOPAGO)' })
  @IsOptional() @IsString() @MaxLength(40)
  mpAccountId?: string;
}

/**
 * Datos de la matrícula profesional (sólo para categorías que la requieren).
 * El documento físico se sube por separado via multipart upload.
 */
export class UpdateProviderLicenseDto {
  @ApiProperty({ example: 'M-12345' })
  @IsString() @IsNotEmpty() @MaxLength(40)
  licenseNumber: string;

  @ApiProperty({ example: 'ENARGAS', description: 'Ente emisor de la matrícula' })
  @IsString() @IsNotEmpty() @MaxLength(80)
  licenseAuthority: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional() @IsDateString()
  licenseExpiry?: string;
}

/**
 * Datos del seguro de responsabilidad civil (opcional pero recomendado).
 */
export class UpdateProviderInsuranceDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasInsurance: boolean;

  @ApiPropertyOptional({ example: 'La Caja Seguros' })
  @IsOptional() @IsString() @MaxLength(80)
  insuranceProvider?: string;

  @ApiPropertyOptional({ example: 'POL-12345' })
  @IsOptional() @IsString() @MaxLength(40)
  insurancePolicyNumber?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  insuranceExpiry?: string;
}

/**
 * Acción admin: aprobar o rechazar el KYC o la matrícula.
 */
export class AdminReviewProviderDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ example: 'La foto del DNI está borrosa, por favor re-cargala.' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
