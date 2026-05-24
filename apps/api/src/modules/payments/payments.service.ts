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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  async listByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        OR: [{ payerId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        contract: { select: { id: true, propertyId: true } },
        payer: { select: { firstName: true, lastName: true, email: true } },
        receiver: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async getById(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        contract: { select: { id: true, propertyId: true } },
        payer: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado.');
    if (payment.payerId !== userId && payment.receiverId !== userId) {
      throw new ForbiddenException('Sin acceso a este pago.');
    }

    return payment;
  }

  async createPaymentPreference(paymentId: string, userId: string): Promise<{ initPoint: string }> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    if (payment.payerId !== userId) throw new ForbiddenException('Sin acceso a este pago.');

    const preference = await this.mercadoPago.createPreference({
      title: `Pago de ${payment.type} - ${payment.id.substring(0, 8)}`,
      amount: Number(payment.amount),
      currency: payment.currency,
      externalReference: `payment:${payment.id}`,
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { mpPreference: preference.id, status: 'PROCESSING' },
    });

    return { initPoint: preference.initPoint };
  }

  async handleWebhook(body: Record<string, unknown>, signature: string) {
    this.logger.log(`MP Webhook received: ${JSON.stringify(body)}`);

    const action = body['action'] as string | undefined;
    const type = body['type'] as string | undefined;

    if (type !== 'payment' || action !== 'payment.updated') {
      return { received: true };
    }

    const dataId = (body['data'] as Record<string, unknown>)?.['id'] as string | undefined;
    if (!dataId) return { received: true };

    const mpPayment = await this.mercadoPago.getPayment(dataId).catch(() => null);
    if (!mpPayment) return { received: true };

    const externalRef = mpPayment.externalReference;
    if (!externalRef?.startsWith('payment:')) return { received: true };

    const paymentId = externalRef.replace('payment:', '');

    const newStatus = this.mapMpStatus(mpPayment.status);

    await this.prisma.payment.updateMany({
      where: {
        OR: [{ id: paymentId }, { mpPreference: dataId }],
      },
      data: {
        status: newStatus,
        mpPaymentId: dataId,
        paidAt: newStatus === 'PAID' ? new Date() : undefined,
      },
    });

    return { received: true };
  }

  @Cron('0 9 5 * *')
  async generateMonthlyInvoices() {
    this.logger.log('Generating monthly rent invoices...');

    const now = new Date();
    const activeContracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'SIGNED'] },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    let created = 0;
    for (const contract of activeContracts) {
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 10);

      const exists = await this.prisma.payment.findFirst({
        where: {
          contractId: contract.id,
          type: 'RENT',
          dueDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      });

      if (!exists) {
        await this.prisma.payment.create({
          data: {
            contractId: contract.id,
            payerId: contract.tenantId,
            receiverId: contract.landlordId,
            amount: contract.monthlyAmount,
            currency: contract.currency,
            type: 'RENT',
            status: 'PENDING',
            dueDate,
          },
        });
        created++;
      }
    }

    this.logger.log(`Generated ${created} monthly invoices`);
    return { created };
  }

  // ─── Comprobante manual ──────────────────────────────────────────────────

  /**
   * El inquilino sube un comprobante (foto de transferencia / depósito bancario).
   * El pago queda en RECEIPT_REVIEW hasta que el propietario o admin lo confirma.
   */
  async uploadReceipt(userId: string, paymentId: string, receiptUrl: string, note?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.payerId !== userId) {
      throw new ForbiddenException('Sólo el pagador puede subir un comprobante.');
    }
    if (payment.status === 'PAID') {
      throw new BadRequestException('El pago ya está marcado como pagado.');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptUrl,
        receiptNote: note,
        receiptUploadedAt: new Date(),
        status: 'RECEIPT_REVIEW',
        rejectedReason: null,
      },
    });
  }

  async approveReceipt(reviewerId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { contract: { select: { landlordId: true } } },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'RECEIPT_REVIEW') {
      throw new BadRequestException('Sólo se pueden aprobar pagos en RECEIPT_REVIEW.');
    }
    const isAuthorizedReviewer =
      payment.receiverId === reviewerId ||
      payment.contract?.landlordId === reviewerId;
    if (!isAuthorizedReviewer) {
      throw new ForbiddenException('Sólo el propietario receptor puede aprobar el comprobante.');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        approvedById: reviewerId,
        approvedAt: new Date(),
      },
    });
  }

  async rejectReceipt(reviewerId: string, paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { contract: { select: { landlordId: true } } },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'RECEIPT_REVIEW') {
      throw new BadRequestException('Sólo se pueden rechazar pagos en RECEIPT_REVIEW.');
    }
    if (payment.receiverId !== reviewerId && payment.contract?.landlordId !== reviewerId) {
      throw new ForbiddenException('Sólo el propietario receptor puede rechazar el comprobante.');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PENDING',  // vuelve a pendiente, el inquilino puede resubir
        rejectedReason: reason,
      },
    });
  }

  private mapMpStatus(mpStatus: string): 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'OVERDUE' {
    switch (mpStatus) {
      case 'approved':
        return 'PAID';
      case 'pending':
      case 'in_process':
        return 'PROCESSING';
      case 'rejected':
      case 'cancelled':
        return 'FAILED';
      case 'refunded':
      case 'charged_back':
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }
}
