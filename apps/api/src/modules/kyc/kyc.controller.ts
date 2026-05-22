import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { KycService } from './kyc.service';
import { S3Service } from '../../common/services/s3.service';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'kyc', version: '1' })
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Iniciar proceso de verificación KYC' })
  async start(@CurrentUser() user: AuthUser) {
    return this.kycService.startVerification(user.id);
  }

  @Post('upload-dni')
  @ApiOperation({ summary: 'Subir imágenes del DNI (frente y dorso)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]),
  )
  async uploadDni(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
  ) {
    const front = files?.front?.[0];
    const back = files?.back?.[0];

    if (!front || !back) {
      throw new BadRequestException('Se requieren las imágenes del frente y dorso del DNI.');
    }

    const [frontUrl, backUrl] = await Promise.all([
      this.s3Service.uploadFile(
        front.buffer,
        `kyc/${user.id}/dni-front-${Date.now()}`,
        front.mimetype,
      ),
      this.s3Service.uploadFile(
        back.buffer,
        `kyc/${user.id}/dni-back-${Date.now()}`,
        back.mimetype,
      ),
    ]);

    return this.kycService.uploadDni(user.id, frontUrl, backUrl);
  }

  @Post('selfie')
  @ApiOperation({ summary: 'Subir selfie para verificación facial' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('selfie'))
  async uploadSelfie(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere la imagen de la selfie.');
    }

    const selfieUrl = await this.s3Service.uploadFile(
      file.buffer,
      `kyc/${user.id}/selfie-${Date.now()}`,
      file.mimetype,
    );

    return this.kycService.uploadSelfie(user.id, selfieUrl);
  }

  @Post('validate-renaper')
  @ApiOperation({ summary: 'Validar identidad con RENAPER' })
  @HttpCode(HttpStatus.OK)
  async validateRenaper(@CurrentUser() user: AuthUser) {
    return this.kycService.validateWithRenaper(user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado de verificación KYC' })
  async getStatus(@CurrentUser() user: AuthUser) {
    return this.kycService.getStatus(user.id);
  }
}
