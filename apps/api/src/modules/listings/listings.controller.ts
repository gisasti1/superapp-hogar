import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListingsService } from './listings.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

const UPLOADS_DIR = join(process.cwd(), '..', '..', '.local-uploads', 'properties');
mkdirSync(UPLOADS_DIR, { recursive: true });

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Listings')
@Controller({ path: 'listings', version: '1' })
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar propiedades publicadas' })
  async search(@Query() filters: SearchListingsDto) {
    return this.listingsService.search(filters);
  }

  @Get('my-properties')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mis propiedades' })
  async getMyProperties(@CurrentUser() user: AuthUser) {
    return this.listingsService.getMyProperties(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una publicación' })
  async getById(@Param('id') id: string) {
    return this.listingsService.getById(id);
  }

  @Post('properties')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear una nueva propiedad' })
  async createProperty(@CurrentUser() user: AuthUser, @Body() dto: CreatePropertyDto) {
    return this.listingsService.createProperty(user.id, dto);
  }

  @Patch('properties/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar propiedad' })
  async updateProperty(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePropertyDto>,
  ) {
    return this.listingsService.updateProperty(user.id, id, dto);
  }

  @Post('properties/:id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Publicar propiedad (crear o activar listing)' })
  async publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.listingsService.publishListing(user.id, id);
  }

  @Post('properties/:id/unpublish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Despublicar inmueble (el listing queda en isPublished=false)' })
  async unpublish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.listingsService.unpublishListing(user.id, id);
  }

  @Delete('properties/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar inmueble (soft delete via isActive=false)' })
  async deleteProperty(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.listingsService.deleteProperty(user.id, id);
  }

  @Post('properties/:id/images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir hasta 10 imágenes para una propiedad' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Solo se permiten imágenes JPG/PNG/WEBP/GIF'), ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadImages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No se subió ningún archivo');
    const urls = files.map(f => `/uploads/properties/${f.filename}`);
    return this.listingsService.addImages(user.id, id, urls);
  }

  @Delete('properties/:propertyId/images/:imageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar una imagen de la propiedad' })
  async deleteImage(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.listingsService.deleteImage(user.id, propertyId, imageId);
  }
}
