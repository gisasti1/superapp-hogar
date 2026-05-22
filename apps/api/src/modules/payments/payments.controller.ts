import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mis pagos' })
  async list(@CurrentUser() user: AuthUser) {
    return this.paymentsService.listByUser(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener pago por ID' })
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentsService.getById(id, user.id);
  }

  @Post(':id/pay')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear preferencia de pago (MercadoPago)' })
  @HttpCode(HttpStatus.OK)
  async pay(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentsService.createPaymentPreference(id, user.id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de MercadoPago (público, sin JWT)' })
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
