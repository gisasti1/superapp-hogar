import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { RequestQuoteDto } from './dto/request-quote.dto';

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
    },
  ) {
    const provider = await this.prisma.provider.upsert({
      where: { userId },
      update: {
        businessName: dto.businessName,
        category: dto.category,
        description: dto.description,
        cities: dto.cities,
        isActive: dto.isActive ?? true,
      },
      create: {
        userId,
        businessName: dto.businessName,
        category: dto.category,
        description: dto.description,
        cities: dto.cities,
        isActive: true,
      },
    });

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
}
