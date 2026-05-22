import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StatementDto {
  @ApiProperty({ minLength: 100 })
  @IsString()
  @MinLength(100)
  content: string;
}
