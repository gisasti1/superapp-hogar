import { IsInt, IsString, IsOptional, Min, Max, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractReviewDto {
  @ApiProperty({ example: 5, description: '1 (pésimo) a 5 (excelente)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excelente propietario, siempre disponible, devolvió el depósito en término.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Sub-ratings opcionales 1-5. Ej: { puntualidad: 5, comunicación: 4, cuidadoInmueble: 5 }',
    example: { puntualidad: 5, comunicacion: 4 },
  })
  @IsObject()
  @IsOptional()
  ratingDetails?: Record<string, number>;
}
