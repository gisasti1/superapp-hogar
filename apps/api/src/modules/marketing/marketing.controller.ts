import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@superapp/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketingService } from './marketing.service';
import { SegmentFilters } from './segment-filters';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'marketing', version: '1' })
export class MarketingController {
  constructor(private readonly service: MarketingService) {}

  @Post('segments/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular cuántos usuarios coinciden con filtros (sin guardar)' })
  preview(@Body() body: { filters: SegmentFilters }) {
    return this.service.previewSegment(body.filters ?? {});
  }

  @Get('segments')
  @ApiOperation({ summary: 'Listar segmentos guardados' })
  list() {
    return this.service.listSegments();
  }

  @Get('segments/:id')
  @ApiOperation({ summary: 'Ver segmento (refresca count actual)' })
  get(@Param('id') id: string) {
    return this.service.getSegment(id);
  }

  @Get('segments/:id/users')
  @ApiOperation({ summary: 'Listar usuarios del segmento (paginado)' })
  users(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.service.listSegmentUsers(id, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 50,
    });
  }

  @Post('segments')
  @ApiOperation({ summary: 'Crear segmento' })
  create(@CurrentUser() user: AuthUser, @Body() body: { name: string; description?: string; filters: SegmentFilters }) {
    return this.service.createSegment(user.id, body);
  }

  @Patch('segments/:id')
  @ApiOperation({ summary: 'Actualizar segmento' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; filters?: SegmentFilters }) {
    return this.service.updateSegment(id, body);
  }

  @Delete('segments/:id')
  @ApiOperation({ summary: 'Eliminar segmento (bloqueado si tiene campañas)' })
  remove(@Param('id') id: string) {
    return this.service.deleteSegment(id);
  }
}
