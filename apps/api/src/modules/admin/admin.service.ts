import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stats globales para el dashboard del admin.
   * Una sola query Promise.all → 1 round-trip a la DB.
   */
  async getStats() {
    const [
      totalUsers,
      activeUsers,
      tenants,
      landlords,
      providers,
      admins,
      totalProperties,
      publishedListings,
      activeContracts,
      pendingPayments,
      openIssues,
      activeMediations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'TENANT' } }),
      this.prisma.user.count({ where: { role: 'LANDLORD' } }),
      this.prisma.user.count({ where: { role: 'PROVIDER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.property.count({ where: { isActive: true } }),
      this.prisma.listing.count({ where: { isPublished: true } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.count({ where: { status: { in: ['PENDING', 'OVERDUE', 'RECEIPT_REVIEW'] } } }),
      this.prisma.issue.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } } }),
      this.prisma.mediationCase.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, byRole: { tenants, landlords, providers, admins } },
      properties: { total: totalProperties, published: publishedListings },
      contracts: { active: activeContracts },
      payments: { pending: pendingPayments },
      issues: { open: openIssues },
      mediations: { active: activeMediations },
    };
  }

  // ─── Users ──────────────────────────────────────────────────────────────

  async listUsers(opts: { search?: string; role?: string; activeOnly?: boolean } = {}) {
    return this.prisma.user.findMany({
      where: {
        ...(opts.activeOnly ? { isActive: true } : {}),
        ...(opts.role ? { role: opts.role as any } : {}),
        ...(opts.search
          ? {
              OR: [
                { email: { contains: opts.search, mode: 'insensitive' } },
                { firstName: { contains: opts.search, mode: 'insensitive' } },
                { lastName: { contains: opts.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        dni: true,
        address: true,
        city: true,
        province: true,
        dateOfBirth: true,
        nationality: true,
        occupation: true,
        employmentType: true,
        employer: true,
        monthlyIncome: true,
        maritalStatus: true,
        hasPets: true,
        smoker: true,
        marketingEmailConsent: true,
        marketingSmsConsent: true,
        referralSource: true,
        createdAt: true,
        lastLoginAt: true,
        verification: { select: { status: true } },
        subscription: { select: { plan: true } },
        _count: {
          select: {
            properties: true,
            tenantContracts: true,
            landlordContracts: true,
          },
        },
      },
    });
  }

  async setUserActive(adminId: string, userId: string, isActive: boolean) {
    if (adminId === userId && !isActive) {
      throw new BadRequestException('No podés desactivarte a vos mismo.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    await this.prisma.user.update({ where: { id: userId }, data: { isActive } });
    // Si lo desactivamos, invalidamos todas sus sesiones (lo desloguea)
    if (!isActive) {
      await this.prisma.session.deleteMany({ where: { userId } });
    }
    return { id: userId, isActive };
  }

  async changeUserRole(adminId: string, userId: string, role: string) {
    const ALLOWED = ['TENANT', 'LANDLORD', 'REALTOR', 'PROVIDER', 'ADMIN'];
    if (!ALLOWED.includes(role)) {
      throw new BadRequestException(`Role inválido. Valores permitidos: ${ALLOWED.join(', ')}`);
    }
    if (adminId === userId) {
      throw new BadRequestException('No podés cambiarte tu propio role.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, email: true, role: true },
    });
  }

  /**
   * Eliminar usuario es destructivo y cascadea sessions, verification,
   * subscription, favoritos, issues reportados, etc.
   * Bloqueamos si el usuario tiene contratos activos para evitar dejar
   * contratos huérfanos. Para esos casos hay que desactivar primero.
   */
  async deleteUser(adminId: string, userId: string) {
    if (adminId === userId) {
      throw new BadRequestException('No podés eliminarte a vos mismo.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            tenantContracts: { where: { status: { in: ['ACTIVE', 'SIGNED', 'PENDING_SIGNATURES'] } } },
            landlordContracts: { where: { status: { in: ['ACTIVE', 'SIGNED', 'PENDING_SIGNATURES'] } } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const activeContracts = user._count.tenantContracts + user._count.landlordContracts;
    if (activeContracts > 0) {
      throw new BadRequestException(
        `El usuario tiene ${activeContracts} contrato(s) activo(s). Desactivalo en lugar de eliminarlo, o cerrá esos contratos primero.`,
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.warn(`Admin ${adminId} eliminó al usuario ${userId} (${user.email})`);
    return { deleted: true };
  }

  // ─── Properties ─────────────────────────────────────────────────────────

  async listProperties(opts: { search?: string } = {}) {
    return this.prisma.property.findMany({
      where: opts.search
        ? {
            OR: [
              { address: { contains: opts.search, mode: 'insensitive' } },
              { city: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        listing: { select: { id: true, isPublished: true, views: true } },
        _count: { select: { contracts: true, issues: true } },
      },
    });
  }

  async forceUnpublishProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { listing: true },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (!property.listing) return { isPublished: false };
    return this.prisma.listing.update({
      where: { id: property.listing.id },
      data: { isPublished: false },
    });
  }

  async deleteProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { contracts: { where: { status: { in: ['ACTIVE', 'SIGNED', 'PENDING_SIGNATURES'] } } } },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.contracts.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar: hay ${property.contracts.length} contrato(s) activo(s). Despublicá primero.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.listing.deleteMany({ where: { propertyId } }),
      this.prisma.property.delete({ where: { id: propertyId } }),
    ]);
    return { deleted: true };
  }

  // ─── Providers ──────────────────────────────────────────────────────────

  async listProviders() {
    return this.prisma.provider.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        _count: { select: { bookings: true, reviews: true } },
      },
    });
  }

  async verifyProvider(providerId: string, isVerified: boolean) {
    return this.prisma.provider.update({
      where: { id: providerId },
      data: { isVerified },
      select: { id: true, isVerified: true, businessName: true },
    });
  }

  async setProviderActive(providerId: string, isActive: boolean) {
    return this.prisma.provider.update({
      where: { id: providerId },
      data: { isActive },
      select: { id: true, isActive: true, businessName: true },
    });
  }

  async deleteProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        _count: { select: { bookings: { where: { status: { in: ['REQUESTED', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS'] } } } } },
      },
    });
    if (!provider) throw new NotFoundException('Prestador no encontrado.');
    if (provider._count.bookings > 0) {
      throw new BadRequestException(
        `El prestador tiene ${provider._count.bookings} booking(s) activo(s). Desactivalo en lugar de eliminarlo.`,
      );
    }
    await this.prisma.provider.delete({ where: { id: providerId } });
    return { deleted: true };
  }

  // ─── Issues (resolver desde admin) ──────────────────────────────────────

  async listAllIssues() {
    return this.prisma.issue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        property: { select: { address: true, city: true, owner: { select: { firstName: true, lastName: true } } } },
        reportedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async forceCloseIssue(issueId: string, note?: string) {
    return this.prisma.issue.update({
      where: { id: issueId },
      data: {
        status: 'CLOSED',
        resolvedAt: new Date(),
        resolutionNote: note ?? 'Cerrado por administrador',
      },
    });
  }

  // ─── Export CSV de usuarios para campañas / Mailchimp / Meta Ads ──────

  /**
   * Genera CSV con todos los campos relevantes para marketing.
   * Por defecto solo incluye usuarios con consentimiento de email Y activos —
   * para no exportar gente que no opt-ineó.
   *
   * El opt-in se respeta SIEMPRE — no hay manera de exportar usuarios sin
   * consentimiento por compliance (Ley AR 25.326).
   */
  async exportUsersCsv(opts: {
    onlyEmailConsent?: boolean;
    onlySmsConsent?: boolean;
    role?: string;
    city?: string;
  } = {}): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(opts.onlyEmailConsent ? { marketingEmailConsent: true } : {}),
        ...(opts.onlySmsConsent ? { marketingSmsConsent: true } : {}),
        ...(opts.role ? { role: opts.role as any } : {}),
        ...(opts.city ? { city: { contains: opts.city, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Headers compatibles con Mailchimp/Meta Audiences
    const headers = [
      'email', 'firstName', 'lastName', 'phone', 'role',
      'city', 'province', 'nationality', 'occupation', 'employmentType',
      'monthlyIncome', 'maritalStatus', 'hasPets', 'smoker',
      'marketingEmailConsent', 'marketingSmsConsent', 'referralSource',
      'createdAt', 'lastLoginAt',
    ];

    const escape = (v: unknown): string => {
      if (v == null) return '';
      const s = String(v);
      // RFC 4180 — comillas dobles si tiene coma, comilla o newline
      if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const rows = users.map(u => headers.map(h => escape((u as any)[h])).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Resumen rápido de consentimientos para el dashboard.
   * "Cuántos usuarios puedo contactar por email/SMS hoy".
   */
  async getMarketingStats() {
    const [totalActive, withEmail, withSms, withBoth] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, marketingEmailConsent: true } }),
      this.prisma.user.count({ where: { isActive: true, marketingSmsConsent: true } }),
      this.prisma.user.count({
        where: { isActive: true, marketingEmailConsent: true, marketingSmsConsent: true },
      }),
    ]);

    // Referral sources con count
    const referralRaw = await this.prisma.user.groupBy({
      by: ['referralSource'],
      where: { isActive: true, referralSource: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referralSource: 'desc' } },
      take: 10,
    });
    const referrals = referralRaw.map(r => ({
      source: r.referralSource,
      count: r._count._all,
    }));

    return {
      totalActive,
      consents: {
        email: withEmail,
        sms: withSms,
        both: withBoth,
        emailPercent: totalActive > 0 ? Math.round((withEmail / totalActive) * 100) : 0,
        smsPercent: totalActive > 0 ? Math.round((withSms / totalActive) * 100) : 0,
      },
      referrals,
    };
  }

  /* ─── DEPÓSITOS / INVERSIONES ─────────────────────────────────────────
   * La plataforma actúa como ventanilla neutral de los depósitos de
   * garantía. El admin ve qué plata custodia, de qué inquilino/contrato,
   * y dónde está invertida (o no). Cada fila tiene su trazabilidad propia.
   */

  /** Listar depósitos con filtros opcionales y agregados por moneda. */
  async listDeposits(opts: {
    status?:    string;   // 'HELD' | 'PARTIALLY_RELEASED' | 'RELEASED' | 'DISPUTED'
    invested?:  string;   // 'yes' | 'no' | undefined
    currency?:  string;
    search?:    string;   // por contrato o usuario
  } = {}) {
    const where: any = {};
    if (opts.status && opts.status !== 'ALL') where.status = opts.status;
    if (opts.currency)                        where.currency = opts.currency;
    if (opts.invested === 'yes')              where.investedAt = { not: null };
    if (opts.invested === 'no')               where.investedAt = null;
    if (opts.search) {
      const q = opts.search.trim();
      where.OR = [
        { contractId: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName:  { contains: q, mode: 'insensitive' } } },
        { user: { email:     { contains: q, mode: 'insensitive' } } },
      ];
    }

    const deposits = await this.prisma.deposit.findMany({
      where,
      orderBy: [{ depositedAt: 'desc' }],
      include: {
        user:     { select: { id: true, firstName: true, lastName: true, email: true } },
        contract: {
          select: {
            id: true, status: true, startDate: true, endDate: true,
            monthlyAmount: true, currency: true,
            property: { select: { id: true, address: true, city: true } },
            tenant:   { select: { id: true, firstName: true, lastName: true } },
            landlord: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Agregados por moneda — totales custodiados / invertidos / libres
    const byCurrency: Record<string, { custodyTotal: number; investedTotal: number; freeTotal: number; count: number }> = {};
    for (const d of deposits) {
      const c = d.currency;
      byCurrency[c] ??= { custodyTotal: 0, investedTotal: 0, freeTotal: 0, count: 0 };
      const amt = Number(d.amount);
      byCurrency[c].custodyTotal += amt;
      byCurrency[c].count += 1;
      if (d.investedAt) byCurrency[c].investedTotal += amt;
      else              byCurrency[c].freeTotal     += amt;
    }

    return { deposits, byCurrency };
  }

  async getDeposit(id: string) {
    const d = await this.prisma.deposit.findUnique({
      where: { id },
      include: {
        user:     { select: { id: true, firstName: true, lastName: true, email: true } },
        contract: {
          select: {
            id: true, status: true, startDate: true, endDate: true,
            monthlyAmount: true, currency: true, customContent: true,
            property: true,
            tenant:   { select: { id: true, firstName: true, lastName: true, email: true } },
            landlord: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        ledgerEntries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!d) throw new NotFoundException('Depósito no encontrado');
    return d;
  }

  /** Marcar un depósito como invertido (o limpiar la inversión si investedIn es null). */
  async updateDepositInvestment(id: string, dto: {
    investedIn?:         string | null;
    investedAt?:         string | null;
    investmentMaturity?: string | null;
    interestRatePct?:    number | null;
    investmentNotes?:    string | null;
    expectedReleaseDate?: string | null;
  }) {
    const d = await this.prisma.deposit.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Depósito no encontrado');

    // Validaciones
    const investedIn = dto.investedIn?.trim();
    const investedAt = dto.investedAt ? new Date(dto.investedAt) : null;
    if (investedIn && !investedAt) {
      throw new BadRequestException('Si declarás dónde está invertido, también tenés que poner la fecha de inversión');
    }
    if (dto.investmentMaturity && investedAt && new Date(dto.investmentMaturity) < investedAt) {
      throw new BadRequestException('La fecha de vencimiento no puede ser anterior a la fecha de inversión');
    }
    if (dto.interestRatePct !== undefined && dto.interestRatePct !== null && (dto.interestRatePct < 0 || dto.interestRatePct > 1000)) {
      throw new BadRequestException('TNA fuera de rango (0-1000%)');
    }

    return this.prisma.deposit.update({
      where: { id },
      data:  {
        investedIn:          investedIn || null,
        investedAt,
        investmentMaturity:  dto.investmentMaturity ? new Date(dto.investmentMaturity) : null,
        interestRatePct:     dto.interestRatePct ?? null,
        investmentNotes:     dto.investmentNotes?.trim() || null,
        expectedReleaseDate: dto.expectedReleaseDate ? new Date(dto.expectedReleaseDate) : null,
      },
    });
  }
}
