import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PremiumService } from './premium.service';
import { SubscribeDto } from './dto/subscribe.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Premium')
@Controller({ path: 'premium', version: '1' })
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Obtener planes disponibles' })
  getPlans() {
    return this.premiumService.getPlans();
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Suscribirse a un plan (retorna URL de MercadoPago)' })
  async subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.premiumService.subscribe(user.id, dto.plan);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de MercadoPago para suscripciones (público)' })
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: Record<string, unknown>) {
    return this.premiumService.handleWebhook(body);
  }

  @Delete('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancelar suscripción activa' })
  async cancel(@CurrentUser() user: AuthUser) {
    return this.premiumService.cancelSubscription(user.id);
  }

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener suscripción activa' })
  async getSubscription(@CurrentUser() user: AuthUser) {
    return this.premiumService.getSubscription(user.id);
  }
}
