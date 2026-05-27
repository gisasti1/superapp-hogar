import { Controller, Get, Param, UseGuards, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReceiptsService } from './receipts.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Receipts — Comprobantes de pago')
@Controller({ path: 'receipts', version: '1' })
export class ReceiptsController {
  constructor(private readonly svc: ReceiptsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mis recibos (como pagador o receptor)' })
  list(@CurrentUser() u: AuthUser) {
    return this.svc.listMine(u.id);
  }

  @Get('verify/:hash')
  @ApiOperation({ summary: 'Verificación pública de un recibo por hash sha256 (sin auth)' })
  verify(@Param('hash') hash: string) {
    return this.svc.verifyByHash(hash);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalle de un recibo (solo payer o receiver)' })
  getOne(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.getById(u.id, id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Descargar comprobante (recibo no fiscal en formato texto)' })
  async download(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.generateReceiptText(u.id, id);
    const r   = await this.svc.getById(u.id, id);
    res.setHeader('Content-Disposition', `attachment; filename="comprobante-${r.number}.txt"`);
    res.send(buf);
  }
}
