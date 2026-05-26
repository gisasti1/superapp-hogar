import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { RequestQuoteDto } from './dto/request-quote.dto';
import {
  CATEGORIES_REQUIRING_LICENSE,
  UpdateProviderPersonalDataDto,
  UpdateProviderPayoutAccountDto,
  UpdateProviderLicenseDto,
  UpdateProviderInsuranceDto,
  AdminReviewProviderDto,
} from './dto/provider-profile.dto';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  async searchProviders(category?: string, city?: string, page = 1) {
    const skip = (page - 1) * DEFAULT_PAGE_SIZE;

    const where: {
      isActive: boolean;
      isVerified: boolean;
      category?: string;
      cities?: { has: string };
    } = {
      isActive: true,
      isVerified: true,
    };

    if (category) where.category = category;
    if (city) where.cities = { has: city };

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: DEFAULT_PAGE_SIZE,
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers,
      pagination: {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / DEFAULT_PAGE_SIZE),
      },
    };
  }

  async getProvider(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!provider) throw new NotFoundException('Proveedor no encontrado.');
    return provider;
  }

  async requestQuote(userId: string, dto: RequestQuoteDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado.');
    if (!provider.isActive) throw new BadRequestException('El proveedor no está disponible.');

    return this.prisma.booking.create({
      data: {
        userId,
        providerId: dto.providerId,
        category: dto.category,
        description: dto.description,
        address: dto.address,
        status: 'REQUESTED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      include: {
        provider: { select: { businessName: true, category: true } },
      },
    });
  }

  async submitQuote(providerId: string, bookingId: string, amount: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reserva no encontrada.');

    const provider = await this.prisma.provider.findUnique({ where: { id: booking.providerId } });
    if (!provider || provider.userId !== providerId) {
      throw new ForbiddenException('Solo el proveedor asignado puede enviar un presupuesto.');
    }

    if (booking.status !== 'REQUESTED') {
      throw new BadRequestException('La reserva no está en estado REQUESTED.');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'QUOTED', amount },
    });
  }

  async acceptQuote(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada.');
    if (booking.userId !== userId) throw new ForbiddenException('Sin acceso a esta reserva.');
    if (booking.status !== 'QUOTED') {
      throw new BadRequestException('La reserva no está en estado QUOTED.');
    }

    const preference = await this.mercadoPago.createPreference({
      title: `Servicio ${booking.category} - ${bookingId.substring(0, 8)}`,
      amount: Number(booking.amount ?? 0),
      currency: 'ARS',
      externalReference: `service:${bookingId}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        payerId: userId,
        receiverId: booking.provider.userId,
        amount: booking.amount ?? 0,
        currency: 'ARS',
        type: 'SERVICE',
        status: 'PENDING',
        dueDate: new Date(),
        mpPreference: preference.id,
      },
    });

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'ACCEPTED' },
    });

    return { booking: updatedBooking, payment, initPoint: preference.initPoint };
  }

  async completeBooking(providerUserId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada.');
    if (booking.provider.userId !== providerUserId) {
      throw new ForbiddenException('Solo el proveedor puede marcar la reserva como completada.');
    }
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('La reserva no puede completarse en su estado actual.');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async submitReview(userId: string, bookingId: string, rating: number, comment?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada.');
    if (booking.userId !== userId) throw new ForbiddenException('Solo el cliente puede dejar una reseña.');
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Solo se puede reseñar una reserva completada.');
    }

    const existingReview = await this.prisma.review.findUnique({ where: { bookingId } });
    if (existingReview) throw new BadRequestException('Ya dejaste una reseña para esta reserva.');

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('El rating debe estar entre 1 y 5.');
    }

    const review = await this.prisma.review.create({
      data: {
        bookingId,
        reviewerId: userId,
        providerId: booking.providerId,
        rating,
        comment,
      },
    });

    // Recalculate provider rating
    const aggregate = await this.prisma.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.provider.update({
      where: { id: booking.providerId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count.rating,
      },
    });

    return review;
  }

  async getMyBookings(userId: string) {
    // Determine if user is a provider or customer
    const provider = await this.prisma.provider.findUnique({ where: { userId } });

    if (provider) {
      return this.prisma.booking.findMany({
        where: { providerId: provider.id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          review: true,
        },
      });
    }

    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: { select: { businessName: true, category: true, rating: true } },
        review: true,
      },
    });
  }

  // ─── Provider Profile (registrarse como prestador) ──────────────────────

  /**
   * Mi perfil de Provider (si existe). Si no, devuelve null.
   * El front lo usa para saber si mostrar "Registrate como prestador" o
   * "Editar mi perfil de prestador".
   */
  async getMyProviderProfile(userId: string) {
    return this.prisma.provider.findUnique({
      where: { userId },
    });
  }

  /**
   * Crear o actualizar el perfil de Provider. Al crear, eleva el rol del
   * usuario a PROVIDER (igual que cuando publica un inmueble lo elevamos
   * a LANDLORD). Mantenemos role=LANDLORD si ya lo era para no perder
   * permisos de propietario.
   */
  async upsertMyProviderProfile(
    userId: string,
    dto: {
      businessName: string;
      category: string;
      description?: string;
      cities: string[];
      isActive?: boolean;
      yearsOfExperience?: number;
      hasInsurance?: boolean;
      emergency24h?: boolean;
      hourlyRate?: number;
      calloutFee?: number;
      serviceRadiusKm?: number;
    },
  ) {
    // Si la categoría requiere matrícula y todavía no existe el provider,
    // arrancamos con licenseStatus=PENDING para que el onboarding sepa que
    // tiene que cargarla. Si la categoría no la requiere, queda NOT_REQUIRED.
    const requiresLicense = (CATEGORIES_REQUIRING_LICENSE as readonly string[]).includes(dto.category);

    const provider = await this.prisma.provider.upsert({
      where: { userId },
      update: {
        businessName: dto.businessName,
        category: dto.category,
        description: dto.description,
        cities: dto.cities,
        isActive: dto.isActive ?? true,
        yearsOfExperience: dto.yearsOfExperience,
        hasInsurance: dto.hasInsurance,
        emergency24h: dto.emergency24h,
        hourlyRate: dto.hourlyRate,
        calloutFee: dto.calloutFee,
        serviceRadiusKm: dto.serviceRadiusKm,
        // Si cambia la categoría a una que requiere matrícula y el status
        // estaba en NOT_REQUIRED, lo subimos a PENDING. Al revés, si pasa
        // a una categoría que no la pide, lo bajamos a NOT_REQUIRED.
        // (No tocamos si ya está VERIFIED/UNDER_REVIEW para no perder el progreso).
      },
      create: {
        userId,
        businessName: dto.businessName,
        category: dto.category,
        description: dto.description,
        cities: dto.cities,
        isActive: true,
        yearsOfExperience: dto.yearsOfExperience,
        hasInsurance: dto.hasInsurance ?? false,
        emergency24h: dto.emergency24h ?? false,
        hourlyRate: dto.hourlyRate,
        calloutFee: dto.calloutFee,
        serviceRadiusKm: dto.serviceRadiusKm,
        licenseStatus: requiresLicense ? 'PENDING' : 'NOT_REQUIRED',
      },
    });

    // Reajustar licenseStatus si cambió la categoría y todavía no está validada.
    const safeToReset = ['NOT_REQUIRED', 'PENDING'];
    if (safeToReset.includes(provider.licenseStatus)) {
      const expected = requiresLicense ? 'PENDING' : 'NOT_REQUIRED';
      if (provider.licenseStatus !== expected) {
        await this.prisma.provider.update({
          where: { id: provider.id },
          data: { licenseStatus: expected as 'PENDING' | 'NOT_REQUIRED' },
        });
      }
    }

    // Elevar a PROVIDER si era TENANT. Si era LANDLORD lo dejamos como está
    // — un mismo usuario puede ser propietario Y prestador (caso de un
    // arquitecto que alquila propiedades y también ofrece reformas).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'TENANT') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: 'PROVIDER' },
      });
    }

    return provider;
  }

  // ─── Datos personales / fiscales del prestador ──────────────────────────

  async updatePersonalData(userId: string, dto: UpdateProviderPersonalDataDto) {
    const provider = await this.getProviderOrThrow(userId);

    // Si el documentType es DNI, exigimos birthDate (para verificación posterior).
    if (dto.documentType === 'DNI' && !dto.birthDate && !provider.birthDate) {
      throw new BadRequestException('Para DNI necesitamos también la fecha de nacimiento');
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        contactPhone: dto.contactPhone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  // ─── Cuenta de pagos ────────────────────────────────────────────────────

  async updatePayoutAccount(userId: string, dto: UpdateProviderPayoutAccountDto) {
    const provider = await this.getProviderOrThrow(userId);

    // Validación cruzada por método de cobro.
    if (dto.payoutMethod === 'BANK_TRANSFER' && !dto.cbu) {
      throw new BadRequestException('Para transferencia bancaria necesitamos el CBU');
    }
    if (dto.payoutMethod === 'CVU' && !dto.cvu) {
      throw new BadRequestException('Para cuenta virtual necesitamos el CVU');
    }
    if (dto.payoutMethod === 'MERCADOPAGO' && !dto.mpAccountId) {
      throw new BadRequestException('Para Mercado Pago necesitamos el ID de cuenta');
    }
    if (dto.payoutMethod !== 'MERCADOPAGO' && !dto.bankAccountHolder) {
      throw new BadRequestException('Falta el titular de la cuenta');
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        payoutMethod: dto.payoutMethod,
        cbu: dto.payoutMethod === 'BANK_TRANSFER' ? dto.cbu : null,
        cvu: dto.payoutMethod === 'CVU' ? dto.cvu : null,
        bankAlias: dto.bankAlias,
        bankName: dto.bankName,
        bankAccountHolder: dto.bankAccountHolder,
        bankAccountHolderId: dto.bankAccountHolderId,
        mpAccountId: dto.payoutMethod === 'MERCADOPAGO' ? dto.mpAccountId : null,
        // Cualquier cambio en la cuenta invalida la verificación admin previa.
        payoutVerified: false,
      },
    });
  }

  // ─── KYC: subida de documentos y envío a revisión ──────────────────────

  async setKycDocument(
    userId: string,
    type: 'ID_FRONT' | 'ID_BACK' | 'SELFIE',
    url: string,
  ) {
    const provider = await this.getProviderOrThrow(userId);
    const data: Record<string, unknown> = {};
    if (type === 'ID_FRONT') data.idDocumentFrontUrl = url;
    if (type === 'ID_BACK') data.idDocumentBackUrl = url;
    if (type === 'SELFIE') data.selfieUrl = url;

    // Si estaba REJECTED y subió algo nuevo, vuelve a PENDING.
    if (provider.kycStatus === 'NOT_STARTED' || provider.kycStatus === 'REJECTED') {
      data.kycStatus = 'PENDING';
      data.kycRejectionReason = null;
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data,
    });
  }

  async submitKycForReview(userId: string) {
    const provider = await this.getProviderOrThrow(userId);

    if (!provider.idDocumentFrontUrl || !provider.idDocumentBackUrl || !provider.selfieUrl) {
      throw new BadRequestException('Faltan documentos: necesitamos DNI frente, dorso y selfie');
    }
    if (!provider.documentType || !provider.documentNumber) {
      throw new BadRequestException('Antes cargá tus datos personales (documento)');
    }
    if (provider.kycStatus === 'VERIFIED') {
      throw new BadRequestException('Tu KYC ya está verificado');
    }
    if (provider.kycStatus === 'UNDER_REVIEW') {
      throw new BadRequestException('Tu KYC ya está en revisión, esperá la respuesta del equipo');
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        kycStatus: 'UNDER_REVIEW',
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
    });
  }

  // ─── Matrícula profesional ──────────────────────────────────────────────

  async updateLicense(userId: string, dto: UpdateProviderLicenseDto) {
    const provider = await this.getProviderOrThrow(userId);

    const requires = (CATEGORIES_REQUIRING_LICENSE as readonly string[]).includes(provider.category);
    if (!requires) {
      throw new BadRequestException(
        `Tu categoría (${provider.category}) no requiere matrícula profesional`,
      );
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        licenseNumber: dto.licenseNumber,
        licenseAuthority: dto.licenseAuthority,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
      },
    });
  }

  async setLicenseDocument(userId: string, url: string) {
    const provider = await this.getProviderOrThrow(userId);

    if (provider.licenseStatus === 'NOT_REQUIRED') {
      throw new BadRequestException('Tu categoría no requiere matrícula');
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        licenseDocumentUrl: url,
        // Si lo había rechazado y vuelve a subir, lo dejamos en PENDING.
        licenseStatus:
          provider.licenseStatus === 'REJECTED' || provider.licenseStatus === 'EXPIRED'
            ? 'PENDING'
            : provider.licenseStatus,
        licenseRejectionReason: null,
      },
    });
  }

  async submitLicenseForReview(userId: string) {
    const provider = await this.getProviderOrThrow(userId);

    if (provider.licenseStatus === 'NOT_REQUIRED') {
      throw new BadRequestException('Tu categoría no requiere matrícula');
    }
    if (!provider.licenseNumber || !provider.licenseAuthority || !provider.licenseDocumentUrl) {
      throw new BadRequestException('Cargá número, ente y foto de la matrícula antes de enviar');
    }
    if (provider.licenseStatus === 'VERIFIED') {
      throw new BadRequestException('Tu matrícula ya está verificada');
    }
    if (provider.licenseStatus === 'UNDER_REVIEW') {
      throw new BadRequestException('Tu matrícula ya está en revisión');
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        licenseStatus: 'UNDER_REVIEW',
        licenseSubmittedAt: new Date(),
        licenseRejectionReason: null,
      },
    });
  }

  // ─── Seguro ─────────────────────────────────────────────────────────────

  async updateInsurance(userId: string, dto: UpdateProviderInsuranceDto) {
    const provider = await this.getProviderOrThrow(userId);

    if (dto.hasInsurance && (!dto.insuranceProvider || !dto.insurancePolicyNumber)) {
      throw new BadRequestException(
        'Si marcás que tenés seguro, completá aseguradora y número de póliza',
      );
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        hasInsurance: dto.hasInsurance,
        insuranceProvider: dto.hasInsurance ? dto.insuranceProvider : null,
        insurancePolicyNumber: dto.hasInsurance ? dto.insurancePolicyNumber : null,
        insuranceExpiry: dto.hasInsurance && dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
      },
    });
  }

  // ─── Vista de progreso de onboarding ────────────────────────────────────

  async getOnboardingStatus(userId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) return { exists: false };

    const requiresLicense = (CATEGORIES_REQUIRING_LICENSE as readonly string[]).includes(provider.category);
    const hasPayoutAccount = Boolean(
      (provider.payoutMethod === 'BANK_TRANSFER' && provider.cbu) ||
      (provider.payoutMethod === 'CVU' && provider.cvu) ||
      (provider.payoutMethod === 'MERCADOPAGO' && provider.mpAccountId),
    );

    const steps = {
      basicProfile: Boolean(provider.businessName && provider.cities.length > 0),
      personalData: Boolean(provider.documentType && provider.documentNumber),
      payoutAccount: hasPayoutAccount,
      kyc: provider.kycStatus === 'VERIFIED',
      license: !requiresLicense || provider.licenseStatus === 'VERIFIED',
    };
    const complete = Object.values(steps).every(Boolean);

    return {
      exists: true,
      provider,
      steps,
      complete,
      requiresLicense,
      // Lo que el front muestra como "% completado".
      progress: Math.round((Object.values(steps).filter(Boolean).length / 5) * 100),
    };
  }

  // ─── Admin: revisar / aprobar ──────────────────────────────────────────

  async adminListPendingProviders(filter?: 'KYC' | 'LICENSE' | 'ALL') {
    const where: Record<string, unknown> = {};
    if (filter === 'KYC') where.kycStatus = 'UNDER_REVIEW';
    else if (filter === 'LICENSE') where.licenseStatus = 'UNDER_REVIEW';
    else {
      where.OR = [
        { kycStatus: 'UNDER_REVIEW' },
        { licenseStatus: 'UNDER_REVIEW' },
      ];
    }

    return this.prisma.provider.findMany({
      where,
      orderBy: [{ kycSubmittedAt: 'asc' }, { licenseSubmittedAt: 'asc' }],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });
  }

  async adminReviewKyc(adminId: string, providerId: string, dto: AdminReviewProviderDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Prestador no encontrado');

    if (provider.kycStatus !== 'UNDER_REVIEW') {
      throw new BadRequestException(`El KYC no está en revisión (estado actual: ${provider.kycStatus})`);
    }

    if (dto.action === 'REJECT' && !dto.reason?.trim()) {
      throw new BadRequestException('Para rechazar necesitamos un motivo (será visible al prestador)');
    }

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        kycStatus: dto.action === 'APPROVE' ? 'VERIFIED' : 'REJECTED',
        kycReviewedAt: new Date(),
        kycReviewedById: adminId,
        kycRejectionReason: dto.action === 'REJECT' ? dto.reason : null,
      },
    });

    await this.recomputeIsVerified(providerId);
    return updated;
  }

  async adminReviewLicense(adminId: string, providerId: string, dto: AdminReviewProviderDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Prestador no encontrado');

    if (provider.licenseStatus !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        `La matrícula no está en revisión (estado actual: ${provider.licenseStatus})`,
      );
    }

    if (dto.action === 'REJECT' && !dto.reason?.trim()) {
      throw new BadRequestException('Para rechazar necesitamos un motivo');
    }

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        licenseStatus: dto.action === 'APPROVE' ? 'VERIFIED' : 'REJECTED',
        licenseReviewedAt: new Date(),
        licenseReviewedById: adminId,
        licenseRejectionReason: dto.action === 'REJECT' ? dto.reason : null,
      },
    });

    await this.recomputeIsVerified(providerId);
    return updated;
  }

  // ─── Portfolio: fotos de trabajos anteriores ────────────────────────────

  async addPortfolioPhoto(userId: string, url: string) {
    const provider = await this.getProviderOrThrow(userId);

    if (provider.portfolioPhotos.length >= 12) {
      throw new BadRequestException('Máximo 12 fotos en el portfolio. Borrá alguna antes de subir más.');
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: { portfolioPhotos: { push: url } },
    });
  }

  async removePortfolioPhoto(userId: string, url: string) {
    const provider = await this.getProviderOrThrow(userId);
    return this.prisma.provider.update({
      where: { id: provider.id },
      data: { portfolioPhotos: provider.portfolioPhotos.filter(p => p !== url) },
    });
  }

  async adminVerifyPayout(providerId: string, verified: boolean) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Prestador no encontrado');

    return this.prisma.provider.update({
      where: { id: providerId },
      data: { payoutVerified: verified },
    });
  }

  // ─── Helpers internos ──────────────────────────────────────────────────

  private async getProviderOrThrow(userId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) {
      throw new NotFoundException(
        'Primero creá tu perfil básico de prestador (POST /services/provider/me)',
      );
    }
    return provider;
  }

  /**
   * isVerified = KYC verificado AND (matrícula verificada OR no requerida).
   * Se llama después de cada acción de admin para mantenerlo sincronizado.
   * Esa bandera es la que filtra en la búsqueda pública del marketplace.
   */
  private async recomputeIsVerified(providerId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return;

    const kycOk = provider.kycStatus === 'VERIFIED';
    const licenseOk =
      provider.licenseStatus === 'VERIFIED' || provider.licenseStatus === 'NOT_REQUIRED';

    await this.prisma.provider.update({
      where: { id: providerId },
      data: { isVerified: kycOk && licenseOk },
    });
  }
}
