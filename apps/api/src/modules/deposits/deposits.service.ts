import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';

// Annual yield rate divided by 12 months
const MONTHLY_YIELD_RATE = 0.40 / 12;

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  async deposit(userId: string, contractId: string, amount: number) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new NotFoundException('Contrato no encontrado.');
    if (contract.tenantId !== userId) {
      throw new ForbiddenException('Solo el inquilino puede depositar la garantía.');
    }

    const existing = await this.prisma.deposit.findUnique({ where: { contractId } });
    if (existing) {
      throw new BadRequestException('Ya existe un depósito para este contrato.');
    }

    const preference = await this.mercadoPago.createPreference({
      title: `Depósito en Garantía - Contrato ${contractId.substring(0, 8)}`,
      amount,
      currency: contract.currency,
      externalReference: `deposit:${contractId}`,
    });

    const depositRecord = await this.prisma.$transaction(async (tx) => {
      const dep = await tx.deposit.create({
        data: {
          contractId,
          userId,
          amount,
          currency: contract.currency,
          status: 'HELD',
        },
      });

      await tx.ledgerEntry.create({
        data: {
          depositId: dep.id,
          description: 'Depósito inicial en garantía',
          credit: amount,
          debit: 0,
          balance: amount,
        },
      });

      await tx.payment.create({
        data: {
          contractId,
          payerId: userId,
          receiverId: contract.landlordId,
          amount,
          currency: contract.currency,
          type: 'DEPOSIT',
          status: 'PENDING',
          dueDate: new Date(),
          mpPreference: preference.id,
        },
      });

      return dep;
    });

    return {
      deposit: depositRecord,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
    };
  }

  async getBalance(userId: string, contractId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { contractId },
      include: {
        ledgerEntries: { orderBy: { createdAt: 'asc' } },
        contract: { select: { tenantId: true, landlordId: true } },
      },
    });

    if (!deposit) throw new NotFoundException('Depósito no encontrado.');

    const { tenantId, landlordId } = deposit.contract;
    if (userId !== tenantId && userId !== landlordId) {
      throw new ForbiddenException('Sin acceso a este depósito.');
    }

    return deposit;
  }

  async releaseDeposit(depositId: string, requesterId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        contract: true,
        ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!deposit) throw new NotFoundException('Depósito no encontrado.');

    const { tenantId, landlordId } = deposit.contract;
    if (requesterId !== tenantId && requesterId !== landlordId) {
      throw new ForbiddenException('Sin acceso a este depósito.');
    }

    if (!['HELD', 'PARTIALLY_RELEASED'].includes(deposit.status)) {
      throw new BadRequestException('El depósito no puede liberarse en su estado actual.');
    }

    // For simplicity: create the debit ledger entry and update status
    // In production, both parties would need to confirm via separate calls
    const lastBalance = deposit.ledgerEntries[0]?.balance ?? deposit.amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.create({
        data: {
          depositId: deposit.id,
          description: `Liberación de depósito solicitada por ${requesterId}`,
          debit: Number(lastBalance),
          credit: 0,
          balance: 0,
        },
      });

      await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      });
    });

    this.logger.log(`Deposit ${depositId} released by ${requesterId}`);
    return { released: true, depositId };
  }

  @Cron('0 0 1 * *')
  async calculateYield() {
    this.logger.log('Calculating monthly yield for active deposits...');

    const activeDeposits = await this.prisma.deposit.findMany({
      where: { status: { in: ['HELD', 'PARTIALLY_RELEASED'] } },
      include: {
        ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    let processed = 0;
    for (const deposit of activeDeposits) {
      const currentBalance = deposit.ledgerEntries[0]?.balance ?? deposit.amount;
      const yieldAmount = Number(currentBalance) * MONTHLY_YIELD_RATE;

      if (yieldAmount <= 0) continue;

      const newBalance = Number(currentBalance) + yieldAmount;

      await this.prisma.$transaction(async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            depositId: deposit.id,
            description: `Rendimiento mensual TNA 40% (${(MONTHLY_YIELD_RATE * 100).toFixed(4)}%)`,
            credit: yieldAmount,
            debit: 0,
            balance: newBalance,
          },
        });

        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            yieldEarned: Number(deposit.yieldEarned) + yieldAmount,
          },
        });
      });

      processed++;
    }

    this.logger.log(`Yield calculated for ${processed} deposits`);
    return { processed };
  }
}
