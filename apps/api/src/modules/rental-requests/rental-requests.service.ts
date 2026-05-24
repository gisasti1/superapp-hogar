import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRentalRequestDto, RespondRentalRequestDto } from './dto/create-rental-request.dto';

@Injectable()
export class RentalRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El inquilino postula a una propiedad publicada. No queremos:
   * - Que el dueño se postule a su propia propiedad
   * - Que un inquilino tenga 2 solicitudes pendientes activas sobre la misma propiedad
   * - Que se postule a una propiedad sin listing publicado
   */
  async create(tenantId: string, propertyId: string, dto: CreateRentalRequestDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { listing: { select: { isPublished: true } } },
    });
    if (!property || !property.isActive) {
      throw new NotFoundException('Propiedad no encontrada o inactiva.');
    }
    if (!property.listing?.isPublished) {
      throw new BadRequestException('Esta propiedad no está publicada.');
    }
    if (property.ownerId === tenantId) {
      throw new BadRequestException('No podés postular a tu propia propiedad.');
    }

    // Evitar duplicados activos
    const existing = await this.prisma.rentalRequest.findFirst({
      where: {
        propertyId,
        tenantId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existing) {
      throw new BadRequestException('Ya tenés una solicitud activa para esta propiedad.');
    }

    return this.prisma.rentalRequest.create({
      data: {
        propertyId,
        tenantId,
        landlordId: property.ownerId,
        message: dto.message,
        proposedStartDate: dto.proposedStartDate ? new Date(dto.proposedStartDate) : null,
        proposedMonths: dto.proposedMonths,
        status: 'PENDING',
      },
    });
  }

  /**
   * Lista solicitudes visibles para el usuario:
   * - Inquilino: las que él envió
   * - Propietario: las recibidas para sus propiedades
   * - Admin: todas
   */
  async list(userId: string, role: string) {
    if (role === 'ADMIN') {
      return this.prisma.rentalRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: this.includeForList(),
      });
    }
    return this.prisma.rentalRequest.findMany({
      where: {
        OR: [{ tenantId: userId }, { landlordId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: this.includeForList(),
    });
  }

  async getById(userId: string, role: string, id: string) {
    const req = await this.prisma.rentalRequest.findUnique({
      where: { id },
      include: {
        property: { include: { images: { take: 1, orderBy: { order: 'asc' } } } },
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        contract: { select: { id: true, status: true } },
      },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada.');
    if (role !== 'ADMIN' && req.tenantId !== userId && req.landlordId !== userId) {
      throw new ForbiddenException('No tenés acceso a esta solicitud.');
    }
    return req;
  }

  async approve(landlordId: string, id: string, dto: RespondRentalRequestDto) {
    return this.respond(landlordId, id, 'APPROVED', dto.response);
  }

  async reject(landlordId: string, id: string, dto: RespondRentalRequestDto) {
    return this.respond(landlordId, id, 'REJECTED', dto.response);
  }

  async cancel(tenantId: string, id: string) {
    const req = await this.prisma.rentalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada.');
    if (req.tenantId !== tenantId) {
      throw new ForbiddenException('Sólo podés cancelar tus propias solicitudes.');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Sólo se pueden cancelar solicitudes PENDING.');
    }
    return this.prisma.rentalRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private async respond(
    landlordId: string,
    id: string,
    status: 'APPROVED' | 'REJECTED',
    response?: string,
  ) {
    const req = await this.prisma.rentalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada.');
    if (req.landlordId !== landlordId) {
      throw new ForbiddenException('Sólo el propietario puede responder.');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Sólo se pueden responder solicitudes PENDING.');
    }
    return this.prisma.rentalRequest.update({
      where: { id },
      data: {
        status,
        response,
        respondedAt: new Date(),
      },
    });
  }

  private includeForList() {
    return {
      property: {
        select: {
          id: true, address: true, city: true, monthlyRent: true, currency: true,
          images: { take: 1, orderBy: { order: 'asc' as const } },
        },
      },
      tenant: { select: { id: true, firstName: true, lastName: true } },
      landlord: { select: { id: true, firstName: true, lastName: true } },
      contract: { select: { id: true, status: true } },
    };
  }
}
