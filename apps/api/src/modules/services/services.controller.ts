import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@superapp/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServicesService } from './services.service';
import { RequestQuoteDto } from './dto/request-quote.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import {
  UpsertProviderProfileDto,
  UpdateProviderPersonalDataDto,
  UpdateProviderPayoutAccountDto,
  UpdateProviderLicenseDto,
  UpdateProviderInsuranceDto,
  AdminReviewProviderDto,
} from './dto/provider-profile.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// Carpeta donde se guardan los documentos KYC y de matrícula de los
// prestadores. En prod (/tmp) son efímeros — la integración real con S3
// está lista pero todavía no la prendemos por costos en free tier.
const PROVIDER_DOCS_DIR =
  process.env.PROVIDER_DOCS_DIR ??
  (process.env.NODE_ENV === 'production'
    ? '/tmp/superapp-uploads/providers'
    : join(process.cwd(), '..', '..', '.local-uploads', 'providers'));

try {
  mkdirSync(PROVIDER_DOCS_DIR, { recursive: true });
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(`[uploads] No se pudo crear ${PROVIDER_DOCS_DIR}:`, (err as Error).message);
}

const docStorage = diskStorage({
  destination: PROVIDER_DOCS_DIR,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const docFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
  cb(ok ? null : new BadRequestException('Solo JPG/PNG/WEBP/PDF'), ok);
};

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Buscar proveedores verificados' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async searchProviders(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
  ) {
    return this.servicesService.searchProviders(category, city, page ? parseInt(page, 10) : 1);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Ver perfil de proveedor' })
  async getProvider(@Param('id') id: string) {
    return this.servicesService.getProvider(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Solicitar presupuesto a un proveedor' })
  async requestQuote(@CurrentUser() user: AuthUser, @Body() dto: RequestQuoteDto) {
    return this.servicesService.requestQuote(user.id, dto);
  }

  @Post('bookings/:id/quote')
  @ApiOperation({ summary: 'Proveedor responde con presupuesto' })
  @HttpCode(HttpStatus.OK)
  async submitQuote(
    @CurrentUser() user: AuthUser,
    @Param('id') bookingId: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.servicesService.submitQuote(user.id, bookingId, dto.amount);
  }

  @Post('bookings/:id/accept')
  @ApiOperation({ summary: 'Cliente acepta presupuesto' })
  @HttpCode(HttpStatus.OK)
  async acceptQuote(@CurrentUser() user: AuthUser, @Param('id') bookingId: string) {
    return this.servicesService.acceptQuote(user.id, bookingId);
  }

  @Post('bookings/:id/complete')
  @ApiOperation({ summary: 'Proveedor marca servicio como completado' })
  @HttpCode(HttpStatus.OK)
  async complete(@CurrentUser() user: AuthUser, @Param('id') bookingId: string) {
    return this.servicesService.completeBooking(user.id, bookingId);
  }

  @Post('bookings/:id/review')
  @ApiOperation({ summary: 'Cliente deja reseña del servicio' })
  async submitReview(
    @CurrentUser() user: AuthUser,
    @Param('id') bookingId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.servicesService.submitReview(user.id, bookingId, dto.rating, dto.comment);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Listar mis reservas' })
  async getMyBookings(@CurrentUser() user: AuthUser) {
    return this.servicesService.getMyBookings(user.id);
  }

  // ═══ PROVIDER ACCOUNT — Onboarding completo del prestador ═══════════════

  @Get('provider/me')
  @ApiOperation({ summary: 'Mi perfil de prestador (null si no me registré)' })
  async getMyProviderProfile(@CurrentUser() user: AuthUser) {
    return this.servicesService.getMyProviderProfile(user.id);
  }

  @Get('provider/me/onboarding')
  @ApiOperation({ summary: 'Estado de mi onboarding (qué pasos faltan)' })
  async getMyOnboarding(@CurrentUser() user: AuthUser) {
    return this.servicesService.getOnboardingStatus(user.id);
  }

  @Post('provider/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear o actualizar mi perfil básico de prestador (eleva rol a PROVIDER)' })
  async upsertMyProviderProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertProviderProfileDto,
  ) {
    return this.servicesService.upsertMyProviderProfile(user.id, dto);
  }

  @Patch('provider/me/personal-data')
  @ApiOperation({ summary: 'Cargar mis datos personales / fiscales (DNI/CUIT)' })
  async updatePersonalData(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProviderPersonalDataDto,
  ) {
    return this.servicesService.updatePersonalData(user.id, dto);
  }

  @Patch('provider/me/payout-account')
  @ApiOperation({ summary: 'Configurar cuenta donde recibo los pagos (CBU/CVU/MP)' })
  async updatePayoutAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProviderPayoutAccountDto,
  ) {
    return this.servicesService.updatePayoutAccount(user.id, dto);
  }

  // ─── KYC (identidad) ──────────────────────────────────────────────────

  @Post('provider/me/kyc/id-front')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir foto del DNI/CUIT frente' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: docStorage,
      fileFilter: docFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
    }),
  )
  async uploadIdFront(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const url = `/uploads/providers/${file.filename}`;
    return this.servicesService.setKycDocument(user.id, 'ID_FRONT', url);
  }

  @Post('provider/me/kyc/id-back')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir foto del DNI/CUIT dorso' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: docStorage,
      fileFilter: docFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadIdBack(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const url = `/uploads/providers/${file.filename}`;
    return this.servicesService.setKycDocument(user.id, 'ID_BACK', url);
  }

  @Post('provider/me/kyc/selfie')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir selfie con DNI en mano (prueba de vida)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: docStorage,
      fileFilter: docFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadSelfie(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const url = `/uploads/providers/${file.filename}`;
    return this.servicesService.setKycDocument(user.id, 'SELFIE', url);
  }

  @Post('provider/me/kyc/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar KYC a revisión del equipo' })
  async submitKyc(@CurrentUser() user: AuthUser) {
    return this.servicesService.submitKycForReview(user.id);
  }

  // ─── Matrícula profesional ────────────────────────────────────────────

  @Patch('provider/me/license')
  @ApiOperation({ summary: 'Cargar datos de matrícula (número, ente, vencimiento)' })
  async updateLicense(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProviderLicenseDto,
  ) {
    return this.servicesService.updateLicense(user.id, dto);
  }

  @Post('provider/me/license/document')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir foto/PDF de la matrícula' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: docStorage,
      fileFilter: docFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadLicense(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const url = `/uploads/providers/${file.filename}`;
    return this.servicesService.setLicenseDocument(user.id, url);
  }

  @Post('provider/me/license/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar matrícula a revisión' })
  async submitLicense(@CurrentUser() user: AuthUser) {
    return this.servicesService.submitLicenseForReview(user.id);
  }

  // ─── Portfolio (galería de trabajos realizados) ───────────────────────

  @Post('provider/me/portfolio')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Agregar foto al portfolio (trabajo realizado, antes/después, etc.)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: docStorage,
      fileFilter: (_req, file, cb) => {
        // En portfolio sólo imágenes — no tiene sentido PDF de trabajo.
        const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Solo JPG/PNG/WEBP'), ok);
      },
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async addPortfolioPhoto(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const url = `/uploads/providers/${file.filename}`;
    return this.servicesService.addPortfolioPhoto(user.id, url);
  }

  @Delete('provider/me/portfolio')
  @ApiOperation({ summary: 'Eliminar una foto del portfolio (pasar url en el body)' })
  async removePortfolioPhoto(@CurrentUser() user: AuthUser, @Body() body: { url: string }) {
    if (!body?.url) throw new BadRequestException('Falta el url');
    return this.servicesService.removePortfolioPhoto(user.id, body.url);
  }

  // ─── Seguro ───────────────────────────────────────────────────────────

  @Patch('provider/me/insurance')
  @ApiOperation({ summary: 'Cargar datos de seguro de responsabilidad civil' })
  async updateInsurance(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProviderInsuranceDto,
  ) {
    return this.servicesService.updateInsurance(user.id, dto);
  }

  // ═══ ADMIN — revisar y aprobar prestadores ══════════════════════════════

  @Get('admin/providers/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: prestadores con KYC o matrícula pendientes de revisión' })
  @ApiQuery({ name: 'filter', enum: ['KYC', 'LICENSE', 'ALL'], required: false })
  async adminListPending(@Query('filter') filter?: 'KYC' | 'LICENSE' | 'ALL') {
    return this.servicesService.adminListPendingProviders(filter ?? 'ALL');
  }

  @Post('admin/providers/:id/kyc/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: aprobar o rechazar KYC del prestador' })
  async adminReviewKyc(
    @CurrentUser() user: AuthUser,
    @Param('id') providerId: string,
    @Body() dto: AdminReviewProviderDto,
  ) {
    return this.servicesService.adminReviewKyc(user.id, providerId, dto);
  }

  @Post('admin/providers/:id/license/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: aprobar o rechazar matrícula' })
  async adminReviewLicense(
    @CurrentUser() user: AuthUser,
    @Param('id') providerId: string,
    @Body() dto: AdminReviewProviderDto,
  ) {
    return this.servicesService.adminReviewLicense(user.id, providerId, dto);
  }

  @Post('admin/providers/:id/payout/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: marcar cuenta de pago como verificada' })
  async adminVerifyPayout(
    @Param('id') providerId: string,
    @Body() body: { verified: boolean },
  ) {
    return this.servicesService.adminVerifyPayout(providerId, body.verified ?? true);
  }
}
