import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillsService, UpsertBillDto, PayMonthDto, FreezeBillDto } from './bills.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Bills — Presupuesto y pagos mensuales del Particular')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bills', version: '1' })
export class BillsController {
  constructor(private readonly svc: BillsService) {}

  /* ── Items del presupuesto ─────────────────────────────────────────── */

  @Get()
  @ApiOperation({ summary: 'Devuelve los items recurrentes del presupuesto del usuario actual' })
  list(@CurrentUser() u: AuthUser) {
    return this.svc.listBills(u.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea (o actualiza si trae id) un item del presupuesto' })
  upsert(@CurrentUser() u: AuthUser, @Body() dto: UpsertBillDto) {
    return this.svc.upsertBill(u.id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activa o desactiva un item (ej: ABL que paga el propietario)' })
  toggle(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { isEnabled: boolean },
  ) {
    return this.svc.toggleBill(u.id, id, !!body.isEnabled);
  }

  @Patch(':id/freeze')
  @ApiOperation({ summary: 'Congelar un item N meses o hasta una fecha (months=0 descongela)' })
  freeze(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: FreezeBillDto,
  ) {
    return this.svc.freezeBill(u.id, id, dto);
  }

  @Patch('freeze-all')
  @ApiOperation({ summary: 'Congelar todos los items activos N meses (ej: vacaciones)' })
  freezeAll(@CurrentUser() u: AuthUser, @Body() dto: FreezeBillDto) {
    return this.svc.freezeAll(u.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.deleteBill(u.id, id);
  }

  @Post('seed-from-rental')
  @ApiOperation({ summary: 'Pre-carga el presupuesto inicial: alquiler activo + categorías comunes en off' })
  seed(@CurrentUser() u: AuthUser) {
    return this.svc.seedFromRental(u.id);
  }

  /* ── Pago mensual completo ─────────────────────────────────────────── */

  @Get('payments')
  @ApiOperation({ summary: 'Historial de pagos mensuales con desglose' })
  listPayments(@CurrentUser() u: AuthUser) {
    return this.svc.listMonthlyPayments(u.id);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Marca un mes como pagado y guarda el desglose congelado' })
  payMonth(@CurrentUser() u: AuthUser, @Body() dto: PayMonthDto) {
    return this.svc.payMonth(u.id, dto);
  }

  @Delete('payments/:id')
  @HttpCode(HttpStatus.OK)
  deletePayment(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.deleteMonthlyPayment(u.id, id);
  }
}
