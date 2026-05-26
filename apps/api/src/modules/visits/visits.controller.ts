import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VisitsService, CreateVisitDto, CounterVisitDto } from './visits.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Property Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'visits', version: '1' })
export class VisitsController {
  constructor(private readonly svc: VisitsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis visitas (como interesado y como dueño)' })
  list(@CurrentUser() u: AuthUser) { return this.svc.listMine(u.id); }

  @Get('property/:propertyId/slots')
  @ApiOperation({ summary: 'Horarios ocupados de una propiedad' })
  slots(@Param('propertyId') propertyId: string) {
    return this.svc.slotsForProperty(propertyId);
  }

  @Post()
  @ApiOperation({ summary: 'Pedir una visita a una propiedad' })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateVisitDto) {
    return this.svc.createVisit(u.id, dto);
  }

  @Post(':id/counter')
  @ApiOperation({ summary: 'Contraproponer otra fecha/hora' })
  counter(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: CounterVisitDto) {
    return this.svc.counterPropose(u.id, id, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirmar la última propuesta del otro lado' })
  confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.confirm(u.id, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar' })
  reject(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.reject(u.id, id, body?.reason);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar (incluso si estaba confirmada)' })
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.cancel(u.id, id, body?.reason);
  }
}
