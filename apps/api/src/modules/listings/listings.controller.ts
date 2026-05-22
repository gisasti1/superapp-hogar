import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListingsService } from './listings.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

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
}
