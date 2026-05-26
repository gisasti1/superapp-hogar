import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPrismaWhere, SegmentFilters } from './segment-filters';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Segmentos ──────────────────────────────────────────────────────────

  /**
   * Calcula el size actual del segmento sin guardar nada. Se usa al
   * configurar filtros para mostrar "X usuarios coinciden" en vivo.
   */
  async previewSegment(filters: SegmentFilters): Promise<{ count: number }> {
    const where = buildPrismaWhere(filters);
    const count = await this.prisma.user.count({ where });
    return { count };
  }

  async listSegments() {
    return this.prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { campaigns: true } },
      },
    });
  }

  async getSegment(id: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        campaigns: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    // Refrescar count y guardarlo
    const where = buildPrismaWhere(segment.filters as SegmentFilters);
    const count = await this.prisma.user.count({ where });
    await this.prisma.segment.update({
      where: { id },
      data: { lastCount: count, lastCountAt: new Date() },
    });

    return { ...segment, lastCount: count, lastCountAt: new Date() };
  }

  /**
   * Lista los usuarios del segmento (paginado, máx 200 por request).
   * Útil para previsualizar a quién se le va a mandar la campaña.
   */
  async listSegmentUsers(id: string, opts: { page?: number; size?: number } = {}) {
    const segment = await this.prisma.segment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    const page = opts.page ?? 1;
    const size = Math.min(opts.size ?? 50, 200);
    const where = buildPrismaWhere(segment.filters as SegmentFilters);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          city: true, occupation: true, marketingEmailConsent: true,
          marketingSmsConsent: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, size, pages: Math.ceil(total / size) };
  }

  async createSegment(createdById: string, dto: { name: string; description?: string; filters: SegmentFilters }) {
    if (!dto.name?.trim()) throw new BadRequestException('Falta el nombre del segmento');

    // Pre-calcular count para guardarlo de una
    const where = buildPrismaWhere(dto.filters);
    const count = await this.prisma.user.count({ where });

    return this.prisma.segment.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        filters: dto.filters as any,
        lastCount: count,
        lastCountAt: new Date(),
        createdById,
      },
    });
  }

  async updateSegment(id: string, dto: { name?: string; description?: string; filters?: SegmentFilters }) {
    const segment = await this.prisma.segment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    const data: Record<string, any> = {};
    if (dto.name?.trim()) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim();

    if (dto.filters) {
      const where = buildPrismaWhere(dto.filters);
      data.filters = dto.filters;
      data.lastCount = await this.prisma.user.count({ where });
      data.lastCountAt = new Date();
    }

    return this.prisma.segment.update({ where: { id }, data });
  }

  async deleteSegment(id: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id },
      include: { _count: { select: { campaigns: true } } },
    });
    if (!segment) throw new NotFoundException('Segmento no encontrado');
    if (segment._count.campaigns > 0) {
      throw new BadRequestException(
        `El segmento tiene ${segment._count.campaigns} campaña(s). Borrá las campañas primero.`,
      );
    }
    await this.prisma.segment.delete({ where: { id } });
    return { deleted: true };
  }
}
