import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Res, Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';
import { UserRole } from '@superapp/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

interface AuthUser { id: string; email: string; role: string; }

class SetActiveDto {
  @IsBoolean()
  isActive: boolean;
}
class ChangeRoleDto {
  @IsString()
  role: string;
}
class ForceCloseDto {
  @IsString() @IsOptional() @MaxLength(2000)
  note?: string;
}

/**
 * Todos los endpoints de este controller requieren role=ADMIN.
 * Si alguien con role TENANT/LANDLORD/PROVIDER intenta acceder, el
 * RolesGuard rechaza con 403.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Métricas globales del sistema' })
  stats() {
    return this.admin.getStats();
  }

  // ─── Users ────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios (con filtros)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.admin.listUsers({
      search,
      role,
      activeOnly: activeOnly === 'true',
    });
  }

  @Post('users/:id/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar/desactivar usuario (cuando desactiva, invalida sesiones)' })
  setUserActive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.admin.setUserActive(user.id, id, dto.isActive);
  }

  @Post('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar role de un usuario' })
  changeUserRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.admin.changeUserRole(user.id, id, dto.role);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar usuario (bloqueado si tiene contratos activos)' })
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.deleteUser(user.id, id);
  }

  // ─── Properties ───────────────────────────────────────────────────────

  @Get('properties')
  @ApiOperation({ summary: 'Listar propiedades' })
  listProperties(@Query('search') search?: string) {
    return this.admin.listProperties({ search });
  }

  @Post('properties/:id/force-unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Despublicar propiedad (sin importar el dueño)' })
  forceUnpublishProperty(@Param('id') id: string) {
    return this.admin.forceUnpublishProperty(id);
  }

  @Delete('properties/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar propiedad (bloqueado si tiene contratos activos)' })
  deleteProperty(@Param('id') id: string) {
    return this.admin.deleteProperty(id);
  }

  // ─── Providers ────────────────────────────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'Listar prestadores' })
  listProviders() {
    return this.admin.listProviders();
  }

  @Post('providers/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar prestador como verificado (✓ azul)' })
  verifyProvider(@Param('id') id: string, @Body() dto: { isVerified: boolean }) {
    return this.admin.verifyProvider(id, dto.isVerified);
  }

  @Post('providers/:id/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar/desactivar prestador' })
  setProviderActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.admin.setProviderActive(id, dto.isActive);
  }

  @Delete('providers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar prestador (bloqueado si tiene bookings activos)' })
  deleteProvider(@Param('id') id: string) {
    return this.admin.deleteProvider(id);
  }

  // ─── Issues ───────────────────────────────────────────────────────────

  @Get('issues')
  @ApiOperation({ summary: 'Listar todos los issues del sistema' })
  listIssues() {
    return this.admin.listAllIssues();
  }

  @Post('issues/:id/force-close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forzar cierre del issue (cuando no se resolvió bien)' })
  forceCloseIssue(@Param('id') id: string, @Body() dto: ForceCloseDto) {
    return this.admin.forceCloseIssue(id, dto.note);
  }

  // ─── Marketing / Campaigns ─────────────────────────────────────────────

  @Get('marketing/stats')
  @ApiOperation({ summary: 'Estadísticas de consentimientos para campañas' })
  marketingStats() {
    return this.admin.getMarketingStats();
  }

  @Get('marketing/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="superapp-users.csv"')
  @ApiOperation({ summary: 'Export usuarios a CSV (Mailchimp/Meta Ads). Respeta consentimientos.' })
  @ApiQuery({ name: 'onlyEmailConsent', required: false, type: Boolean })
  @ApiQuery({ name: 'onlySmsConsent', required: false, type: Boolean })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'city', required: false })
  async exportCsv(
    @Res() res: Response,
    @Query('onlyEmailConsent') onlyEmailConsent?: string,
    @Query('onlySmsConsent') onlySmsConsent?: string,
    @Query('role') role?: string,
    @Query('city') city?: string,
  ) {
    const csv = await this.admin.exportUsersCsv({
      onlyEmailConsent: onlyEmailConsent === 'true',
      onlySmsConsent: onlySmsConsent === 'true',
      role,
      city,
    });
    // BOM UTF-8 para que Excel abra acentos bien en Windows
    res.send('﻿' + csv);
  }
}
