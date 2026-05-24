import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIssueDto, UpdateIssueStatusDto } from './dto/create-issue.dto';

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear issue. Requiere que el usuario esté relacionado con la propiedad:
   * - Inquilino activo en un contrato sobre la propiedad
   * - Propietario de la propiedad
   * No queremos que cualquiera reporte issues en propiedades ajenas.
   */
  async create(userId: string, propertyId: string, dto: CreateIssueDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        contracts: {
          where: {
            tenantId: userId,
            status: { in: ['ACTIVE', 'SIGNED'] },
          },
          select: { id: true },
        },
      },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');

    const isOwner = property.ownerId === userId;
    const isActiveTenant = property.contracts.length > 0;
    if (!isOwner && !isActiveTenant) {
      throw new ForbiddenException(
        'Sólo el propietario o un inquilino activo pueden reportar issues en esta propiedad.',
      );
    }

    // Si el inquilino no especifica contratos pero tiene uno activo, lo asociamos automáticamente
    const contractId = dto.contractId ?? property.contracts[0]?.id;

    return this.prisma.issue.create({
      data: {
        propertyId,
        contractId,
        reportedById: userId,
        title: dto.title,
        description: dto.description,
        category: (dto.category as any) ?? 'OTHER',
        priority: (dto.priority as any) ?? 'MEDIUM',
        photos: dto.photos ?? [],
        status: 'OPEN',
      },
    });
  }

  /**
   * Lista issues visibles para el usuario:
   * - Propietario: todos los issues de sus propiedades
   * - Inquilino: sólo los que reportó él
   * - Admin: ve todos
   */
  async listForUser(userId: string, role: string) {
    if (role === 'ADMIN') {
      return this.prisma.issue.findMany({
        orderBy: { createdAt: 'desc' },
        include: this.includeForList(),
      });
    }
    return this.prisma.issue.findMany({
      where: {
        OR: [
          { reportedById: userId },
          { property: { ownerId: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: this.includeForList(),
    });
  }

  async getById(userId: string, role: string, issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        property: { include: { owner: { select: { firstName: true, lastName: true } } } },
        reportedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!issue) throw new NotFoundException('Issue no encontrado.');

    const canView = role === 'ADMIN'
      || issue.reportedById === userId
      || issue.property.ownerId === userId;
    if (!canView) throw new ForbiddenException('No tenés acceso a este issue.');

    return issue;
  }

  /**
   * Actualizar status. Sólo puede cambiar:
   * - Propietario (todo)
   * - Inquilino que lo reportó (sólo cerrarlo o reabrirlo)
   * - Admin (todo)
   */
  async updateStatus(userId: string, role: string, issueId: string, dto: UpdateIssueStatusDto) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { property: { select: { ownerId: true } } },
    });
    if (!issue) throw new NotFoundException('Issue no encontrado.');

    const isOwner = issue.property.ownerId === userId;
    const isReporter = issue.reportedById === userId;
    const isAdmin = role === 'ADMIN';

    if (!isOwner && !isReporter && !isAdmin) {
      throw new ForbiddenException('No podés actualizar este issue.');
    }
    // El reporter sólo puede cerrarlo o cambiarlo a OPEN si fue resuelto pero no lo vio
    if (isReporter && !isOwner && !isAdmin && !['CLOSED', 'OPEN'].includes(dto.status)) {
      throw new ForbiddenException('Sólo el propietario puede mover el estado intermedio.');
    }

    return this.prisma.issue.update({
      where: { id: issueId },
      data: {
        status: dto.status as any,
        resolutionNote: dto.resolutionNote,
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(dto.status) ? new Date() : null,
      },
    });
  }

  private includeForList() {
    return {
      property: { select: { id: true, address: true, city: true } },
      reportedBy: { select: { firstName: true, lastName: true } },
    };
  }
}
