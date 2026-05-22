import { IsString, IsNumber, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuoteRequestDto {
  @ApiProperty({ example: 'Av. Corrientes 1234' })
  @IsString()
  @IsNotEmpty()
  propertyAddress: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  monthlyRent: number;

  @ApiProperty({ example: 'ARS' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 24 })
  @IsInt()
  contractMonths: number;

  @ApiProperty({ example: '30123456' })
  @IsString()
  @IsNotEmpty()
  tenantDni: string;
}
