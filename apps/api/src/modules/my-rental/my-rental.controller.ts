import {
  Controller, Get, Put, Post, Delete, Body, Param, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  MyRentalService,
  UpsertExternalRentalDto,
  RegisterPaymentDto,
} from './my-rental.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('My Rental — Contrato externo del usuario "Particular"')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'my-rental', version: '1' })
export class MyRentalController {
  constructor(private readonly svc: MyRentalService) {}

  @Get()
  @ApiOperation({ summary: 'Devuelve el contrato externo del usuario actual (o null)' })
  getMine(@CurrentUser() user: AuthUser) {
    return this.svc.getMyRental(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Crea o actualiza el contrato externo del usuario actual' })
  upsertMine(@CurrentUser() user: AuthUser, @Body() dto: UpsertExternalRentalDto) {
    return this.svc.upsertMyRental(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina el contrato externo y todos sus pagos' })
  deleteMine(@CurrentUser() user: AuthUser) {
    return this.svc.deleteMyRental(user.id);
  }

  /* ── Pagos ───────────────────────────────────────────────────────── */

  @Get('payments')
  @ApiOperation({ summary: 'Lista los pagos registrados del alquiler externo' })
  listPayments(@CurrentUser() user: AuthUser) {
    return this.svc.listPayments(user.id);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Registra un pago mensual' })
  registerPayment(@CurrentUser() user: AuthUser, @Body() dto: RegisterPaymentDto) {
    return this.svc.registerPayment(user.id, dto);
  }

  @Delete('payments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Borra un pago registrado' })
  deletePayment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deletePayment(user.id, id);
  }
}
