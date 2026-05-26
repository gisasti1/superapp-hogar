import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@superapp/shared';

export class RegisterDto {
  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+5491187654321', description: 'Obligatorio para contactarte' })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MinLength(8)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'Av. Corrientes 1234, Piso 3 Dto B', description: 'Tu dirección particular (no la del inmueble que publicás)' })
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  province?: string;

  @ApiProperty({ example: '1990-05-15', description: 'Fecha de nacimiento (ISO YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Fecha de nacimiento inválida' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  dateOfBirth: string;

  @ApiProperty({ example: 'Argentina' })
  @IsString()
  @IsNotEmpty({ message: 'La nacionalidad es obligatoria' })
  @MinLength(2)
  @MaxLength(60)
  nationality: string;

  @ApiProperty({ example: 'Programador', description: 'Ocupación o profesión' })
  @IsString()
  @IsNotEmpty({ message: 'La ocupación es obligatoria' })
  @MinLength(2)
  @MaxLength(100)
  occupation: string;

  @ApiProperty({ enum: UserRole, default: UserRole.TENANT })
  @IsEnum(UserRole)
  role: UserRole;

  // ─── Consentimientos opcionales (default false si no vienen) ──────────

  @ApiPropertyOptional({ description: 'Acepto recibir novedades y promociones por email' })
  @IsBoolean()
  @IsOptional()
  marketingEmailConsent?: boolean;

  @ApiPropertyOptional({ description: 'Acepto recibir alertas y promociones por SMS' })
  @IsBoolean()
  @IsOptional()
  marketingSmsConsent?: boolean;

  @ApiPropertyOptional({ example: 'instagram', description: '¿Cómo te enteraste de la app?' })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  referralSource?: string;

  @ApiPropertyOptional({
    description: 'Marca al usuario como "Particular" — alquila por fuera de la plataforma y va a usar /my-rental para cargar su contrato externo.',
  })
  @IsBoolean()
  @IsOptional()
  selfManagedRental?: boolean;
}
