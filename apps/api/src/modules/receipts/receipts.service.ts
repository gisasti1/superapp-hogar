import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type ReceiptSourceType = 'CONTRACT_PAYMENT' | 'EXTERNAL_PAYMENT' | 'BILLS_MONTHLY' | 'OTHER';
export type ReceiptMethod     = 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'CARD' | 'AUTO_DEBIT' | 'OTHER';

export interface EmitReceiptDto {
  payerId?:     string | null;
  receiverId?:  string | null;
  payerName?:   string;
  receiverName?: string;
  payerDni?:    string | null;
  receiverDni?: string | null;
  sourceType:   ReceiptSourceType;
  sourceId?:    string | null;
  amount:       number;
  currency?:    string;
  paidAt:       Date;
  method?:      ReceiptMethod | null;
  description?: string;
  breakdown?:   any;
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Emite un recibo. Idempotente por sourceType+sourceId: si ya existe lo devuelve. */
  async emit(dto: EmitReceiptDto) {
    // Idempotencia
    if (dto.sourceId) {
      const existing = await this.prisma.paymentReceipt.findFirst({
        where: { sourceType: dto.sourceType, sourceId: dto.sourceId },
      });
      if (existing) return existing;
    }

    // Si no me pasaron nombres, los busco
    let payerName    = dto.payerName?.trim();
    let receiverName = dto.receiverName?.trim();
    let payerDni     = dto.payerDni;
    let receiverDni  = dto.receiverDni;
    if (!payerName && dto.payerId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.payerId }, select: { firstName: true, lastName: true, dni: true } });
      payerName = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Desconocido';
      payerDni  = payerDni ?? u?.dni ?? null;
    }
    if (!receiverName && dto.receiverId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.receiverId }, select: { firstName: true, lastName: true, dni: true } });
      receiverName = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Desconocido';
      receiverDni  = receiverDni ?? u?.dni ?? null;
    }
    payerName    = payerName    || 'Sin identificar';
    receiverName = receiverName || 'Sin identificar';

    // Número correlativo R-YYYYMM-XXXXXXXX
    const now    = new Date();
    const ym     = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const id     = randomUUID();
    const number = `R-${ym}-${id.slice(0, 8).toUpperCase()}`;

    // Hash sha256 del payload canónico (orden estable, sin emittedAt para que sea reproducible)
    const payload = {
      number,
      payerName, receiverName, payerDni, receiverDni,
      sourceType:  dto.sourceType,
      sourceId:    dto.sourceId ?? null,
      amount:      Number(dto.amount),
      currency:    dto.currency ?? 'ARS',
      paidAt:      new Date(dto.paidAt).toISOString(),
      method:      dto.method ?? null,
      description: dto.description ?? null,
      breakdown:   dto.breakdown ?? null,
    };
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const receipt = await this.prisma.paymentReceipt.create({
      data: {
        id, number,
        payerId:     dto.payerId    ?? null,
        receiverId:  dto.receiverId ?? null,
        payerName,   receiverName,
        payerDni:    payerDni    ?? null,
        receiverDni: receiverDni ?? null,
        sourceType:  dto.sourceType,
        sourceId:    dto.sourceId ?? null,
        amount:      dto.amount,
        currency:    dto.currency ?? 'ARS',
        paidAt:      new Date(dto.paidAt),
        method:      dto.method ?? null,
        description: dto.description ?? null,
        breakdown:   dto.breakdown ?? undefined,
        payloadHash,
      },
    });

    // Notif al receptor si tiene cuenta
    if (dto.receiverId) {
      this.notifications.send({
        userId: dto.receiverId,
        title:  '📩 Recibiste un comprobante de pago',
        body:   `${payerName} te pagó ${this.fmtMoney(receipt.amount, receipt.currency)} — ${receipt.description ?? 'pago registrado'}.`,
        type:   'RECEIPT_ISSUED',
        data:   { receiptId: receipt.id, number: receipt.number, route: `/receipts/${receipt.id}` },
      }).catch(() => {});
    }
    return receipt;
  }

  /** Listar mis recibos (como payer o receiver). */
  async listMine(userId: string) {
    return this.prisma.paymentReceipt.findMany({
      where:   { OR: [{ payerId: userId }, { receiverId: userId }] },
      orderBy: { emittedAt: 'desc' },
    });
  }

  async getById(userId: string, id: string) {
    const r = await this.prisma.paymentReceipt.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recibo no encontrado');
    if (r.payerId !== userId && r.receiverId !== userId) {
      throw new ForbiddenException('No tenés acceso a este recibo');
    }
    return r;
  }

  /** Verificación pública por hash — sin auth. Devuelve solo metadata segura. */
  async verifyByHash(hash: string) {
    const r = await this.prisma.paymentReceipt.findUnique({ where: { payloadHash: hash } });
    if (!r) return { valid: false };
    return {
      valid:        true,
      number:       r.number,
      emittedAt:    r.emittedAt,
      payerName:    r.payerName,
      receiverName: r.receiverName,
      amount:       Number(r.amount),
      currency:     r.currency,
      paidAt:       r.paidAt,
      sourceType:   r.sourceType,
      description:  r.description,
    };
  }

  /** Genera el "PDF" del recibo como texto plano (mismo patrón que contracts). */
  async generateReceiptText(userId: string, id: string): Promise<Buffer> {
    const r = await this.getById(userId, id);
    return this.renderReceipt(r);
  }

  private renderReceipt(r: any): Buffer {
    const sep   = '═'.repeat(60);
    const line  = '─'.repeat(60);
    const dash  = '·'.repeat(60);
    const txt   = [
      sep,
      '        SUPERAPP HOGAR — COMPROBANTE DE PAGO',
      sep,
      '',
      `N° de recibo:   ${r.number}`,
      `Emitido:        ${new Date(r.emittedAt).toLocaleString('es-AR')}`,
      `Tipo:           ${this.sourceLabel(r.sourceType)}`,
      ...(r.sourceId ? [`Referencia:     ${r.sourceId}`] : []),
      '',
      line,
      'PARTES',
      line,
      `Pagador:        ${r.payerName}${r.payerDni ? ` — DNI ${r.payerDni}` : ''}`,
      `Receptor:       ${r.receiverName}${r.receiverDni ? ` — DNI ${r.receiverDni}` : ''}`,
      '',
      line,
      'PAGO',
      line,
      `Monto:          ${this.fmtMoney(r.amount, r.currency)}`,
      `Fecha de pago:  ${new Date(r.paidAt).toLocaleDateString('es-AR')}`,
      ...(r.method ? [`Método:         ${this.methodLabel(r.method)}`] : []),
      ...(r.description ? [`Concepto:       ${r.description}`] : []),
      '',
      ...(Array.isArray(r.breakdown) && r.breakdown.length > 0 ? [
        line, 'DESGLOSE', line,
        ...r.breakdown.map((b: any) => `· ${b.label.padEnd(30)} ${this.fmtMoney(b.amount, r.currency).padStart(20)}`),
        '',
      ] : []),
      dash,
      `Hash sha256:    ${r.payloadHash}`,
      `Verificación:   https://superapp-hogar/verify/${r.payloadHash}`,
      dash,
      '',
      'Este comprobante es un recibo NO fiscal emitido por la plataforma',
      'SuperApp Hogar y vale como prueba civil del pago entre las partes.',
      'No reemplaza factura AFIP si la ley lo exige.',
      '',
      sep,
    ];
    return Buffer.from(txt.join('\n'), 'utf-8');
  }

  private fmtMoney(n: number | string | any, c = 'ARS') {
    return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
  }
  private sourceLabel(s: string) {
    return ({
      CONTRACT_PAYMENT: 'Pago de contrato',
      EXTERNAL_PAYMENT: 'Pago de alquiler externo',
      BILLS_MONTHLY:    'Pago mensual con desglose',
      OTHER:            'Otro',
    } as Record<string, string>)[s] ?? s;
  }
  private methodLabel(m: string) {
    return ({
      CASH:        'Efectivo',
      TRANSFER:    'Transferencia bancaria',
      MERCADOPAGO: 'Mercado Pago',
      CARD:        'Tarjeta',
      AUTO_DEBIT:  'Débito automático',
      OTHER:       'Otro',
    } as Record<string, string>)[m] ?? m;
  }
}
