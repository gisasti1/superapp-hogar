import {
  Controller, Get, Post, Put, Body, UseGuards, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@superapp/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RealtorService, UpsertAgencyDto } from './realtor.service';

interface AuthUser { id: string; email: string; role: string; }

// Directorio para logos de agencias
const LOGOS_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/superapp-uploads/logos'
  : join(process.cwd(), '.local-uploads', 'logos');

if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });

const logoStorage = diskStorage({
  destination: LOGOS_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    cb(null, `logo-${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('Realtor — Agencia inmobiliaria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.REALTOR, UserRole.ADMIN)
@Controller({ path: 'realtor', version: '1' })
export class RealtorController {
  constructor(private readonly realtorService: RealtorService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil de mi agencia' })
  getMyAgency(@CurrentUser() user: AuthUser) {
    return this.realtorService.getMyAgency(user.id);
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear o actualizar perfil de agencia' })
  upsertMyAgency(
    @CurrentUser() user: AuthUser,
    @Body() body: UpsertAgencyDto,
  ) {
    return this.realtorService.upsertMyAgency(user.id, body);
  }

  @Get('me/listings')
  @ApiOperation({ summary: 'Mis propiedades publicadas' })
  getMyListings(@CurrentUser() user: AuthUser) {
    return this.realtorService.getMyListings(user.id);
  }

  @Get('me/contracts')
  @ApiOperation({ summary: 'Contratos donde soy landlord/gestor' })
  getMyContracts(@CurrentUser() user: AuthUser) {
    return this.realtorService.getMyContracts(user.id);
  }

  @Put('me/logo')
  @ApiOperation({ summary: 'Subir logo de la agencia' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', {
    storage: logoStorage,
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Solo se permiten imágenes'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  }))
  async uploadLogo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No se recibió ningún archivo');
    const logoUrl = `/uploads/logos/${file.filename}`;
    return this.realtorService.updateLogo(user.id, logoUrl);
  }
}
