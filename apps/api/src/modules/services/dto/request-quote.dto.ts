import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestQuoteDto {
  @ApiProperty({ example: 'uuid-of-provider' })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({ example: 'PLUMBING' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Necesito arreglar una canilla rota en el baño principal' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Av. Corrientes 1234, Buenos Aires' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: '2025-06-15T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
