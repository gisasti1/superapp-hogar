import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';

export interface UpsertExternalRentalDto {
  landlordName:   string;
  landlordPhone?: string;
  landlordEmail?: string;
  landlordCbu?:   string;
  address:        string;
  city:           string;
  province?:      string;
  monthlyAmount:  number;
  currency?:      string;
  depositAmount?: number;
  dueDay?:        number;          // 1-28
  startDate:      string;          // ISO
  endDate:        string;          // ISO
  notes?:         string;
}

export interface RegisterPaymentDto {
  period:      string;             // "YYYY-MM"
  amount:      number;
  currency?:   string;
  paidAt:      string;             // ISO
  method?:     'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'OTHER';
  receiptUrl?: string;
  note?:       string;
}

@Injectable()
export class MyRentalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receipts: ReceiptsService,
  ) {}

  /* ── Contrato externo ─────────────────────────────────────────────── */

  async getMyRental(userId: string) {
    const rental = await this.prisma.externalRental.findUnique({
      where: { userId },
      include: {
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    return rental;
  }

  async upsertMyRental(userId: string, dto: UpsertExternalRentalDto) {
    if (!dto.landlordName?.trim()) {
      throw new BadRequestException('El nombre del propietario es obligatorio');
    }
    if (!dto.address?.trim()) {
      throw new BadRequestException('La dirección del inmueble es obligatoria');
    }
    if (!(dto.monthlyAmount > 0)) {
      throw new BadRequestException('El monto mensual debe ser mayor a 0');
    }
    const start = new Date(dto.startDate);
    const end   = new Date(dto.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (end <= start) {
      throw new BadRequestException('La fecha de fin debe ser posterior al inicio');
    }
    const dueDay = dto.dueDay ?? 10;
    if (dueDay < 1 || dueDay > 28) {
      throw new BadRequestException('El día de vencimiento debe estar entre 1 y 28');
    }

    const data = {
      landlordName:  dto.landlordName.trim(),
      landlordPhone: dto.landlordPhone?.trim() || null,
      landlordEmail: dto.landlordEmail?.trim() || null,
      landlordCbu:   dto.landlordCbu?.trim() || null,
      address:       dto.address.trim(),
      city:          dto.city.trim(),
      province:      dto.province?.trim() || null,
      monthlyAmount: dto.monthlyAmount,
      currency:      dto.currency ?? 'ARS',
      depositAmount: dto.depositAmount ?? null,
      dueDay,
      startDate:     start,
      endDate:       end,
      notes:         dto.notes?.trim() || null,
      isActive:      true,
    };

    // marcar al usuario como selfManagedRental si todavía no lo está
    await this.prisma.user.update({
      where: { id: userId },
      data:  { selfManagedRental: true },
    });

    return this.prisma.externalRental.upsert({
      where:  { userId },
      create: { ...data, userId },
      update: data,
    });
  }

  async deleteMyRental(userId: string) {
    const rental = await this.prisma.externalRental.findUnique({ where: { userId } });
    if (!rental) throw new NotFoundException('No tenés contrato externo cargado');
    await this.prisma.externalRental.delete({ where: { userId } });
    return { ok: true };
  }

  /* ── Pagos ────────────────────────────────────────────────────────── */

  async listPayments(userId: string) {
    const rental = await this.prisma.externalRental.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!rental) return [];
    return this.prisma.externalPayment.findMany({
      where:   { rentalId: rental.id },
      orderBy: { paidAt: 'desc' },
    });
  }

  async registerPayment(userId: string, dto: RegisterPaymentDto) {
    const rental = await this.prisma.externalRental.findUnique({
      where: { userId },
      select: { id: true, currency: true, monthlyAmount: true },
    });
    if (!rental) {
      throw new BadRequestException('Primero cargá los datos de tu contrato externo');
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dto.period)) {
      throw new BadRequestException('Período inválido. Formato esperado: YYYY-MM');
    }
    if (!(dto.amount > 0)) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    const paidAt = new Date(dto.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      throw new BadRequestException('Fecha de pago inválida');
    }

    const dup = await this.prisma.externalPayment.findUnique({
      where: { rentalId_period: { rentalId: rental.id, period: dto.period } },
    });
    if (dup) {
      throw new ConflictException(`Ya hay un pago registrado para ${dto.period}`);
    }

    const payment = await this.prisma.externalPayment.create({
      data: {
        rentalId:   rental.id,
        period:     dto.period,
        amount:     dto.amount,
        currency:   dto.currency ?? rental.currency,
        paidAt,
        method:     dto.method ?? 'TRANSFER',
        receiptUrl: dto.receiptUrl ?? null,
        note:       dto.note?.trim() || null,
      },
    });

    // Emitir recibo. La contraparte (landlord externo) NO tiene cuenta —
    // queda como receptor "fantasma" con su nombre del contrato externo.
    const full = await this.prisma.externalRental.findUnique({
      where:   { userId },
      include: { user: { select: { firstName: true, lastName: true, dni: true } } },
    });
    if (full) {
      this.receipts.emit({
        payerId:      userId,
        payerName:    `${full.user.firstName} ${full.user.lastName}`,
        payerDni:     full.user.dni,
        receiverId:   null,
        receiverName: full.landlordName,
        sourceType:   'EXTERNAL_PAYMENT',
        sourceId:     payment.id,
        amount:       Number(payment.amount),
        currency:     payment.currency,
        paidAt:       payment.paidAt,
        method:       (payment.method as any) ?? 'TRANSFER',
        description:  `Alquiler ${dto.period} — ${full.address}`,
      }).catch(() => { /* no falla el pago si la emisión falla */ });
    }
    return payment;
  }

  async deletePayment(userId: string, paymentId: string) {
    const payment = await this.prisma.externalPayment.findUnique({
      where:   { id: paymentId },
      include: { rental: true },
    });
    if (!payment || payment.rental.userId !== userId) {
      throw new NotFoundException('Pago no encontrado');
    }
    await this.prisma.externalPayment.delete({ where: { id: paymentId } });
    return { ok: true };
  }
}
