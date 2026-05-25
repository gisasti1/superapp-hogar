import { IsString, IsNotEmpty, IsOptional, IsArray, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORIES = [
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

export class UpsertProviderProfileDto {
  @ApiProperty({ example: 'Plomería del Centro', description: 'Nombre comercial o tu nombre' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  businessName: string;

  @ApiProperty({ enum: CATEGORIES, example: 'PLUMBER' })
  @IsString()
  @IsNotEmpty()
  category: typeof CATEGORIES[number];

  @ApiPropertyOptional({ example: '15 años de experiencia. Plomería domiciliaria, destapaciones, fugas de gas, calefones.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: ['Capital Federal', 'San Isidro', 'Vicente López'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  cities: string[];

  @ApiPropertyOptional({ example: true, description: 'Si lo desactivás, dejás de aparecer en búsquedas' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
