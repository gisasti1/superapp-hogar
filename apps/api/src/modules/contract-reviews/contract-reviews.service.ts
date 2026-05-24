import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractReviewDto } from './dto/create-review.dto';

@Injectable()
export class ContractReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear reseña sobre la contraparte en un contrato.
   * Reglas:
   * - Sólo tenant o landlord del contrato pueden reseñar
   * - El contrato debe estar TERMINATED, EXPIRED o ACTIVE (no permitimos reseñar drafts)
   * - Cada parte sólo escribe UNA reseña (enforced por @@unique)
   */
  async create(authorId: string, contractId: string, dto: CreateContractReviewDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { tenantId: true, landlordId: true, status: true },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado.');

    if (![contract.tenantId, contract.landlordId].includes(authorId)) {
      throw new ForbiddenException('Sólo las partes del contrato pueden reseñar.');
    }
    if (!['ACTIVE', 'TERMINATED', 'EXPIRED'].includes(contract.status)) {
      throw new BadRequestException('Sólo se puede reseñar contratos activos, terminados o vencidos.');
    }

    // El target es "el otro"
    const targetId = authorId === contract.tenantId ? contract.landlordId : contract.tenantId;
    const targetRole = authorId === contract.tenantId ? 'LANDLORD' : 'TENANT';

    try {
      return await this.prisma.contractReview.create({
        data: {
          contractId,
          authorId,
          targetId,
          targetRole,
          rating: dto.rating,
          comment: dto.comment,
          ratingDetails: dto.ratingDetails as any,
        },
      });
    } catch (e: any) {
      // Prisma P2002 = unique constraint violation
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya escribiste una reseña para este contrato.');
      }
      throw e;
    }
  }

  /**
   * Listar reseñas de un contrato (las ven ambas partes y admin).
   */
  async listByContract(userId: string, role: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { tenantId: true, landlordId: true },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado.');
    if (role !== 'ADMIN' && ![contract.tenantId, contract.landlordId].includes(userId)) {
      throw new ForbiddenException('No tenés acceso a este contrato.');
    }
    return this.prisma.contractReview.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Reseñas recibidas por un usuario + el promedio.
   * Lo usa el perfil público para mostrar "Carlos · ★ 4.5 (12 reseñas)".
   */
  async listForUser(userId: string) {
    const reviews = await this.prisma.contractReview.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { firstName: true, lastName: true } },
        contract: { select: { property: { select: { address: true, city: true } } } },
      },
    });
    const avg = reviews.length === 0
      ? 0
      : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return {
      reviews,
      total: reviews.length,
      averageRating: Math.round(avg * 10) / 10,
    };
  }
}
