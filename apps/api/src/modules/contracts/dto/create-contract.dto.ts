import { IsString, IsDateString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ example: 'uuid-of-property' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: 'uuid-of-tenant' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-01-01' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  monthlyAmount: number;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  depositAmount: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsString()
  @IsOptional()
  currency?: string;
}
