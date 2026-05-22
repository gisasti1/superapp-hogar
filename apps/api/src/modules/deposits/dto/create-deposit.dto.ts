import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({ example: 'uuid-of-contract' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  @Min(1)
  amount: number;
}
