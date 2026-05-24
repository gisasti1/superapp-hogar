import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'favorites', version: '1' })
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis propiedades favoritas (con detalle)' })
  list(@CurrentUser() user: AuthUser) {
    return this.favoritesService.list(user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Listar sólo los IDs (para pintar corazones en /listings)' })
  listIds(@CurrentUser() user: AuthUser) {
    return this.favoritesService.listIds(user.id);
  }

  @Post(':propertyId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favorito (agrega o quita según el estado actual)' })
  toggle(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.favoritesService.toggle(user.id, propertyId);
  }

  @Delete(':propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar de favoritos (idempotente)' })
  async remove(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    await this.favoritesService.remove(user.id, propertyId);
  }
}
