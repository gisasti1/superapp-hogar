import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_ROUNDS = 6; // 3 idas y vueltas. Después de eso cancelar o confirmar.

export interface CreateVisitDto {
  propertyId: string;
  proposedDate: string;   // ISO datetime
  message?: string;
}

export interface CounterVisitDto {
  proposedDate: string;
  message?: string;
}

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  /** El interesado propone una visita. */
  async createVisit(visitorId: string, dto: CreateVisitDto) {
    if (!dto.propertyId) throw new BadRequestException('propertyId requerido');
    const proposed = new Date(dto.proposedDate);
    if (Number.isNaN(proposed.getTime())) throw new BadRequestException('Fecha inválida');
    if (proposed.getTime() < Date.now() + 30 * 60 * 1000) {
      throw new BadRequestException('La fecha tiene que ser al menos 30 minutos en el futuro');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: { id: true, ownerId: true, isActive: true },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    if (!property.isActive) throw new BadRequestException('La propiedad no está disponible');
    if (property.ownerId === visitorId) throw new BadRequestException('No podés pedirte una visita a tu propia propiedad');

    return this.prisma.propertyVisit.create({
      data: {
        propertyId:   dto.propertyId,
        visitorId,
        ownerId:      property.ownerId,
        proposedDate: proposed,
        proposedBy:   visitorId,
        message:      dto.message?.trim() || null,
        status:       'PROPOSED',
        rounds:       1,
      },
    });
  }

  /** Cualquiera de los dos contrapropone otra fecha. */
  async counterPropose(userId: string, visitId: string, dto: CounterVisitDto) {
    const visit = await this.loadVisit(userId, visitId);
    if (!['PROPOSED', 'COUNTER_PROPOSED'].includes(visit.status)) {
      throw new BadRequestException(`No se puede contraproponer en estado ${visit.status}`);
    }
    if (visit.proposedBy === userId) {
      throw new BadRequestException('Tu última propuesta sigue pendiente — esperá la respuesta del otro lado');
    }
    if (visit.rounds >= MAX_ROUNDS) {
      throw new BadRequestException('Demasiadas idas y vueltas — confirmá o cancelá');
    }
    const proposed = new Date(dto.proposedDate);
    if (Number.isNaN(proposed.getTime())) throw new BadRequestException('Fecha inválida');
    if (proposed.getTime() < Date.now() + 30 * 60 * 1000) {
      throw new BadRequestException('La fecha tiene que ser al menos 30 minutos en el futuro');
    }

    return this.prisma.propertyVisit.update({
      where: { id: visitId },
      data:  {
        proposedDate: proposed,
        proposedBy:   userId,
        message:      dto.message?.trim() || null,
        status:       'COUNTER_PROPOSED',
        rounds:       { increment: 1 },
      },
    });
  }

  /** Confirmar la última propuesta (sólo puede el otro lado, no el que la propuso). */
  async confirm(userId: string, visitId: string) {
    const visit = await this.loadVisit(userId, visitId);
    if (!['PROPOSED', 'COUNTER_PROPOSED'].includes(visit.status)) {
      throw new BadRequestException(`No se puede confirmar en estado ${visit.status}`);
    }
    if (visit.proposedBy === userId) {
      throw new BadRequestException('Esperá que el otro lado confirme tu propuesta');
    }
    return this.prisma.propertyVisit.update({
      where: { id: visitId },
      data:  { status: 'CONFIRMED', confirmedAt: new Date() },
    });
  }

  async reject(userId: string, visitId: string, reason?: string) {
    const visit = await this.loadVisit(userId, visitId);
    if (visit.status === 'COMPLETED') throw new BadRequestException('La visita ya fue completada');
    return this.prisma.propertyVisit.update({
      where: { id: visitId },
      data:  { status: 'REJECTED', cancelledAt: new Date(), cancelReason: reason?.trim() || null },
    });
  }

  async cancel(userId: string, visitId: string, reason?: string) {
    const visit = await this.loadVisit(userId, visitId);
    if (!['PROPOSED', 'COUNTER_PROPOSED', 'CONFIRMED'].includes(visit.status)) {
      throw new BadRequestException(`No se puede cancelar en estado ${visit.status}`);
    }
    return this.prisma.propertyVisit.update({
      where: { id: visitId },
      data:  { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason?.trim() || null },
    });
  }

  /** Mis visitas (como interesado y como dueño). */
  async listMine(userId: string) {
    return this.prisma.propertyVisit.findMany({
      where: { OR: [{ visitorId: userId }, { ownerId: userId }] },
      orderBy: [{ status: 'asc' }, { proposedDate: 'asc' }],
      include: {
        property: { select: { id: true, address: true, city: true, images: { take: 1 } } },
        visitor:  { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        owner:    { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  /** Horarios ocupados (CONFIRMED + PROPOSED activas) de una propiedad para mostrar en calendario. */
  async slotsForProperty(propertyId: string) {
    return this.prisma.propertyVisit.findMany({
      where: { propertyId, status: { in: ['PROPOSED', 'COUNTER_PROPOSED', 'CONFIRMED'] } },
      select: { id: true, proposedDate: true, status: true },
      orderBy: { proposedDate: 'asc' },
    });
  }

  /* ── helper ── */
  private async loadVisit(userId: string, id: string) {
    const v = await this.prisma.propertyVisit.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Visita no encontrada');
    if (v.visitorId !== userId && v.ownerId !== userId) {
      throw new ForbiddenException('No participás en esta visita');
    }
    return v;
  }
}
