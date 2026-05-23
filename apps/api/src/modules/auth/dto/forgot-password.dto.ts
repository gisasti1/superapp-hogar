import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@test.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123def456...' })
  @IsString()
  @MinLength(20)
  token: string;

  @ApiProperty({ example: 'NuevaPassword123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
