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
}
