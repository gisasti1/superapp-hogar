import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InsuranceService } from './insurance.service';
import { QuoteRequestDto } from './dto/quote-request.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'insurance', version: '1' })
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Cotizar seguro de garantía' })
  async quote(@CurrentUser() user: AuthUser, @Body() dto: QuoteRequestDto) {
    return this.insuranceService.quote(user.id, dto);
  }

  @Post('quote/:id/select')
  @ApiOperation({ summary: 'Seleccionar una cotización de seguro' })
  @HttpCode(HttpStatus.OK)
  async selectQuote(@CurrentUser() user: AuthUser, @Param('id') quoteId: string) {
    return this.insuranceService.selectQuote(user.id, quoteId);
  }

  @Post('policy/:id/pay')
  @ApiOperation({ summary: 'Pagar póliza de seguro (retorna URL de MercadoPago)' })
  @HttpCode(HttpStatus.OK)
  async payPolicy(@CurrentUser() user: AuthUser, @Param('id') policyId: string) {
    return this.insuranceService.payPolicy(user.id, policyId);
  }

  @Get('policy/:id/pdf')
  @ApiOperation({ summary: 'Descargar PDF de la póliza' })
  async getPolicyPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') policyId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.insuranceService.getPolicyPdf(user.id, policyId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="poliza-${policyId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('policies')
  @ApiOperation({ summary: 'Listar mis pólizas' })
  async getMyPolicies(@CurrentUser() user: AuthUser) {
    return this.insuranceService.getMyPolicies(user.id);
  }
}
