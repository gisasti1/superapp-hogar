import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BcraService } from './bcra.service';

type IndexType = 'ICL' | 'IPC' | 'ICL_IPC_MIX' | 'CUSTOM';

@Injectable()
export class RentAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcra: BcraService,
  ) {}

  /**
   * Lista los ajustes históricos de un contrato.
   */
  async listForContract(userId: string, role: string, contractId: string) {
    await this.ensureAccess(userId, role, contractId);
    return this.prisma.rentAdjustment.findMany({
      where: { contractId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Previsualiza el ajuste sin aplicarlo. Útil para mostrar al usuario
   * "Tu alquiler de $350.000 pasaría a $612.500 (+75% según ICL)".
   */
  async preview(
    userId: string,
    role: string,
    contractId: string,
    index: IndexType,
    fromDateISO?: string,
  ) {
    const contract = await this.ensureAccess(userId, role, contractId);

    const fromDate = fromDateISO ? new Date(fromDateISO) : new Date(contract.startDate);
    const toDate = new Date();

    if (toDate <= fromDate) {
      throw new BadRequestException('La fecha desde debe ser anterior a hoy.');
    }
    if (index === 'CUSTOM') {
      throw new BadRequestException('Para CUSTOM hay que enviar el multiplicador manualmente vía /apply.');
    }

    const { multiplier, snapshot } = await this.bcra.getMultiplier(index, fromDate, toDate);
    const previousAmount = Number(contract.monthlyAmount);
    const newAmount = Number((previousAmount * multiplier).toFixed(2));
    const increasePct = Number(((multiplier - 1) * 100).toFixed(2));

    return {
      index,
      fromDate: fromDate.toISOString().slice(0, 10),
      toDate: toDate.toISOString().slice(0, 10),
      previousAmount,
      newAmount,
      multiplier,
      increasePct,
      snapshot,
    };
  }

  /**
   * Aplicar ajuste — sólo el propietario o admin.
   * Si index=CUSTOM, requiere multiplier manual.
   * Crea RentAdjustment y actualiza Contract.monthlyAmount.
   */
  async apply(
    userId: string,
    role: string,
    contractId: string,
    dto: {
      index: IndexType;
      fromDate?: string;
      effectiveFrom?: string;
      multiplier?: number;
      periodLabel?: string;
    },
  ) {
    const contract = await this.ensureAccess(userId, role, contractId);

    // Sólo propietario o admin pueden aplicar
    if (role !== 'ADMIN' && contract.landlordId !== userId) {
      throw new ForbiddenException('Sólo el propietario puede aplicar ajustes.');
    }
    if (!['ACTIVE', 'SIGNED'].includes(contract.status)) {
      throw new BadRequestException('Sólo se ajustan contratos ACTIVE o SIGNED.');
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const previousAmount = Number(contract.monthlyAmount);
    let multiplier: number;
    let snapshot: Record<string, unknown>;
    let periodLabel = dto.periodLabel;

    if (dto.index === 'CUSTOM') {
      if (!dto.multiplier || dto.multiplier <= 0) {
        throw new BadRequestException('Para CUSTOM hay que pasar multiplier > 0.');
      }
      multiplier = Number(dto.multiplier);
      snapshot = { mode: 'CUSTOM', appliedBy: userId };
      periodLabel = periodLabel ?? 'CUSTOM';
    } else {
      const fromDate = dto.fromDate ? new Date(dto.fromDate) : new Date(contract.startDate);
      const r = await this.bcra.getMultiplier(dto.index, fromDate, effectiveFrom);
      multiplier = r.multiplier;
      snapshot = r.snapshot;
      periodLabel = periodLabel ?? `${fromDate.toISOString().slice(0,7)} → ${effectiveFrom.toISOString().slice(0,7)}`;
    }

    const newAmount = Number((previousAmount * multiplier).toFixed(2));

    // Aplicar en transacción: crear adjustment + actualizar contrato
    const [adjustment] = await this.prisma.$transaction([
      this.prisma.rentAdjustment.create({
        data: {
          contractId,
          index: dto.index as any,
          multiplier,
          previousAmount,
          newAmount,
          periodLabel,
          effectiveFrom,
          indexSnapshot: snapshot as any,
        },
      }),
      this.prisma.contract.update({
        where: { id: contractId },
        data: { monthlyAmount: newAmount },
      }),
    ]);
    return adjustment;
  }

  private async ensureAccess(userId: string, role: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato no encontrado.');
    if (role !== 'ADMIN' && ![contract.tenantId, contract.landlordId].includes(userId)) {
      throw new ForbiddenException('No tenés acceso a este contrato.');
    }
    return contract;
  }
}
