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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

const RECEIPTS_DIR =
  process.env.RECEIPTS_UPLOADS_DIR ??
  (process.env.NODE_ENV === 'production'
    ? '/tmp/superapp-uploads/receipts'
    : join(process.cwd(), '..', '..', '.local-uploads', 'receipts'));
try { mkdirSync(RECEIPTS_DIR, { recursive: true }); } catch { /* no-op */ }

class ReviewReceiptDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

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

  // ─── Comprobante manual (transferencia bancaria, depósito, etc.) ───────────

  @Post(':id/receipt')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir comprobante manual de pago (PDF o imagen)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: RECEIPTS_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Sólo JPG, PNG, WEBP o PDF'), ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadReceipt(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { note?: string },
  ) {
    if (!file) throw new BadRequestException('Subí un comprobante');
    return this.paymentsService.uploadReceipt(user.id, id, `/uploads/receipts/${file.filename}`, body?.note);
  }

  @Post(':id/receipt/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propietario aprueba el comprobante manual → status PAID' })
  approveReceipt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentsService.approveReceipt(user.id, id);
  }

  @Post(':id/receipt/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propietario rechaza el comprobante → status PENDING + reason' })
  rejectReceipt(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewReceiptDto,
  ) {
    return this.paymentsService.rejectReceipt(user.id, id, dto.note ?? 'Comprobante rechazado');
  }
}
