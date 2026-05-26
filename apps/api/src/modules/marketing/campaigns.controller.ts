import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@superapp/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Marketing - Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'marketing/campaigns', version: '1' })
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar campañas (todas, incluso enviadas y canceladas)' })
  list() {
    return this.campaignsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una campaña' })
  get(@Param('id') id: string) {
    return this.campaignsService.get(id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Calcular cuántos destinatarios reales tiene la campaña (post-consentimiento)' })
  preview(@Param('id') id: string) {
    return this.campaignsService.preview(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear campaña (queda en DRAFT)' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      name: string;
      segmentId: string;
      channel: 'EMAIL' | 'SMS';
      subject?: string;
      body: string;
    },
  ) {
    return this.campaignsService.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar campaña (solo si está en DRAFT)' })
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; subject?: string; body?: string; segmentId?: string },
  ) {
    return this.campaignsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar campaña (no enviadas)' })
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar campaña antes de enviarla' })
  cancel(@Param('id') id: string) {
    return this.campaignsService.cancel(id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '⚠️ Enviar campaña a todos los destinatarios. Irreversible.' })
  send(
    @Param('id') id: string,
    @Body() body: { confirmedReachable?: number },
  ) {
    return this.campaignsService.send(id, body?.confirmedReachable);
  }
}
