import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitQuoteDto {
  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(1)
  amount: number;
}
