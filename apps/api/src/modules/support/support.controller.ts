import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@superapp/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService, CreateTicketDto, AdminUpdateTicketDto } from './support.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Support — consultas y quejas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  @Get('tickets/mine')
  @ApiOperation({ summary: 'Mis tickets de soporte' })
  listMine(@CurrentUser() u: AuthUser) {
    return this.svc.listMine(u.id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Abrir un ticket nuevo' })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTicketDto) {
    return this.svc.createTicket(u.id, dto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Detalle de mi ticket + historial de mensajes' })
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.getMine(u.id, id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Responder en mi ticket' })
  reply(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.svc.reply(u.id, id, body?.body);
  }
}

@ApiTags('Support — admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/support', version: '1' })
export class AdminSupportController {
  constructor(private readonly svc: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Listar todos los tickets con filtros y agregados' })
  @ApiQuery({ name: 'status',   required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search',   required: false })
  list(
    @Query('status')   status?:   string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('search')   search?:   string,
  ) {
    return this.svc.adminList({ status, category, priority, search });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Detalle de un ticket (admin) — incluye datos privados del user' })
  get(@Param('id') id: string) {
    return this.svc.adminGet(id);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Cambiar status / priority / asignar / nota interna' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: AdminUpdateTicketDto) {
    return this.svc.adminUpdate(u.id, id, dto);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Responder al usuario' })
  reply(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.svc.adminReply(u.id, id, body?.body);
  }
}
