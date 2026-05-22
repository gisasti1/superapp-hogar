import { IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CaseCategory } from '@superapp/shared';

export class OpenCaseDto {
  @ApiProperty({ example: 'uuid-of-contract' })
  @IsString()
  contractId: string;

  @ApiProperty({ enum: CaseCategory })
  @IsEnum(CaseCategory)
  category: CaseCategory;

  @ApiProperty({ minLength: 50 })
  @IsString()
  @MinLength(50)
  summary: string;
}
