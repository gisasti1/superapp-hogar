import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';

export const BILL_CATEGORIES = [
  'RENT', 'EXPENSES', 'ELECTRIC', 'GAS', 'WATER',
  'ABL', 'INTERNET', 'CABLE', 'INSURANCE', 'OTHER',
] as const;
export type BillCategory = typeof BILL_CATEGORIES[number];

export interface UpsertBillDto {
  id?:        string;
  category:   BillCategory;
  label:      string;
  amount:     number;
  currency?:  string;
  dueDay?:    number;
  isEnabled?: boolean;
  notes?:     string;
  sortOrder?: number;
  // Medio de pago default y débito automático
  paymentMethod?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'CARD' | 'AUTO_DEBIT' | null;
  autoDebit?: boolean;
}

export interface FreezeBillDto {
  // Hasta cuándo congelar — uno u otro, no ambos
  until?:  string; // ISO date
  months?: number; // 1..12
}

export interface PayMonthDto {
  period:  string;       // YYYY-MM
  paidAt:  string;       // ISO
  method?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'OTHER';
  note?:   string;
  // Si se mandan, son overrides puntuales del monto del item para este mes.
  // Ej: { "<billId>": 25500 } para registrar la luz de mayo en $25.500.
  overrides?: Record<string, number>;
  // Items a excluir solo este mes (sin tocar isEnabled)
  skip?:      string[];
}

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receipts: ReceiptsService,
  ) {}

  /* ─── Items recurrentes ─────────────────────────────────────────────── */

  async listBills(userId: string) {
    const bills = await this.prisma.monthlyBill.findMany({
      where:   { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // Si nunca tuvo presupuesto, devolvemos también el "template" sugerido
    // (no se persiste hasta que el usuario active al menos uno).
    if (bills.length === 0) {
      return { bills: [], suggested: this.defaultTemplate(userId) };
    }
    return { bills, suggested: [] };
  }

  /** Crea/actualiza un item del presupuesto del usuario actual. */
  async upsertBill(userId: string, dto: UpsertBillDto) {
    if (!BILL_CATEGORIES.includes(dto.category)) {
      throw new BadRequestException('Categoría inválida');
    }
    if (!dto.label?.trim()) {
      throw new BadRequestException('El nombre del concepto es obligatorio');
    }
    if (!(dto.amount >= 0)) {
      throw new BadRequestException('El monto debe ser >= 0');
    }
    if (dto.dueDay !== undefined && dto.dueDay !== null && (dto.dueDay < 1 || dto.dueDay > 31)) {
      throw new BadRequestException('El día de vencimiento debe estar entre 1 y 31');
    }

    const data = {
      category:      dto.category,
      label:         dto.label.trim(),
      amount:        dto.amount,
      currency:      dto.currency  ?? 'ARS',
      dueDay:        dto.dueDay    ?? null,
      isEnabled:     dto.isEnabled ?? true,
      notes:         dto.notes?.trim() || null,
      sortOrder:     dto.sortOrder ?? 0,
      paymentMethod: dto.paymentMethod ?? null,
      autoDebit:     dto.autoDebit ?? false,
    };

    if (dto.id) {
      const existing = await this.prisma.monthlyBill.findUnique({ where: { id: dto.id } });
      if (!existing || existing.userId !== userId) {
        throw new NotFoundException('Concepto no encontrado');
      }
      return this.prisma.monthlyBill.update({ where: { id: dto.id }, data });
    }
    return this.prisma.monthlyBill.create({ data: { ...data, userId } });
  }

  async toggleBill(userId: string, id: string, isEnabled: boolean) {
    const bill = await this.prisma.monthlyBill.findUnique({ where: { id } });
    if (!bill || bill.userId !== userId) throw new NotFoundException('Concepto no encontrado');
    return this.prisma.monthlyBill.update({ where: { id }, data: { isEnabled } });
  }

  /**
   * Congela un item hasta `until` o por `months` meses.
   * Si pasás `months: 0` o `until: null` se descongela.
   */
  async freezeBill(userId: string, id: string, dto: FreezeBillDto) {
    const bill = await this.prisma.monthlyBill.findUnique({ where: { id } });
    if (!bill || bill.userId !== userId) throw new NotFoundException('Concepto no encontrado');

    const until = this.resolveFreezeUntil(dto);
    return this.prisma.monthlyBill.update({
      where: { id },
      data:  { frozenUntil: until },
    });
  }

  /** Congelar / descongelar TODOS los items habilitados del usuario. */
  async freezeAll(userId: string, dto: FreezeBillDto) {
    const until = this.resolveFreezeUntil(dto);
    const result = await this.prisma.monthlyBill.updateMany({
      where: { userId, isEnabled: true },
      data:  { frozenUntil: until },
    });
    return { affected: result.count, frozenUntil: until };
  }

  private resolveFreezeUntil(dto: FreezeBillDto): Date | null {
    if (dto.until === null || dto.months === 0) return null;
    if (dto.until) {
      const d = new Date(dto.until);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Fecha de descongelamiento inválida');
      return d;
    }
    if (dto.months !== undefined) {
      if (dto.months < 0 || dto.months > 24) {
        throw new BadRequestException('months debe estar entre 0 y 24');
      }
      const d = new Date();
      d.setMonth(d.getMonth() + dto.months);
      return d;
    }
    throw new BadRequestException('Tenés que mandar `until` o `months`');
  }

  async deleteBill(userId: string, id: string) {
    const bill = await this.prisma.monthlyBill.findUnique({ where: { id } });
    if (!bill || bill.userId !== userId) throw new NotFoundException('Concepto no encontrado');
    await this.prisma.monthlyBill.delete({ where: { id } });
    return { ok: true };
  }

  /** Hidratar el presupuesto inicial: alquiler del contrato externo + categorías comunes en off. */
  async seedFromRental(userId: string) {
    const existing = await this.prisma.monthlyBill.count({ where: { userId } });
    if (existing > 0) {
      throw new ConflictException('Ya tenés un presupuesto cargado');
    }
    const rental = await this.prisma.externalRental.findUnique({ where: { userId } });

    const seed: any[] = [];
    if (rental) {
      seed.push({
        userId, category: 'RENT', label: 'Alquiler', currency: rental.currency,
        amount: rental.monthlyAmount, dueDay: rental.dueDay,
        isEnabled: true, sortOrder: 0,
      });
    }
    // Resto: pre-cargados en OFF para que el usuario solo prenda lo que paga
    const off: Array<[string,string,number]> = [
      ['EXPENSES', 'Expensas',  10],
      ['ELECTRIC', 'Luz',       15],
      ['GAS',      'Gas',       20],
      ['WATER',    'Agua',      25],
      ['ABL',      'ABL',       28],
      ['INTERNET', 'Internet',  5],
      ['CABLE',    'Cable / TV', 5],
      ['INSURANCE','Seguro hogar', 10],
    ];
    off.forEach(([cat, label, dueDay], idx) => {
      seed.push({
        userId, category: cat, label, currency: 'ARS',
        amount: 0, dueDay, isEnabled: false, sortOrder: idx + 1,
      });
    });

    await this.prisma.monthlyBill.createMany({ data: seed });
    return this.listBills(userId);
  }

  private defaultTemplate(_userId: string) {
    return [
      { category: 'RENT',      label: 'Alquiler',     amount: 0, dueDay: 10, isEnabled: false },
      { category: 'EXPENSES',  label: 'Expensas',     amount: 0, dueDay: 10, isEnabled: false },
      { category: 'ELECTRIC',  label: 'Luz',          amount: 0, dueDay: 15, isEnabled: false },
      { category: 'GAS',       label: 'Gas',          amount: 0, dueDay: 20, isEnabled: false },
      { category: 'WATER',     label: 'Agua',         amount: 0, dueDay: 25, isEnabled: false },
      { category: 'ABL',       label: 'ABL',          amount: 0, dueDay: 28, isEnabled: false },
      { category: 'INTERNET',  label: 'Internet',     amount: 0, dueDay: 5,  isEnabled: false },
      { category: 'CABLE',     label: 'Cable / TV',   amount: 0, dueDay: 5,  isEnabled: false },
      { category: 'INSURANCE', label: 'Seguro hogar', amount: 0, dueDay: 10, isEnabled: false },
    ];
  }

  /* ─── Pago mensual completo ────────────────────────────────────────── */

  async listMonthlyPayments(userId: string) {
    return this.prisma.monthlyPayment.findMany({
      where:   { userId },
      orderBy: { period: 'desc' },
    });
  }

  async payMonth(userId: string, dto: PayMonthDto) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dto.period)) {
      throw new BadRequestException('Período inválido. Formato esperado: YYYY-MM');
    }
    const paidAt = new Date(dto.paidAt);
    if (Number.isNaN(paidAt.getTime())) throw new BadRequestException('Fecha inválida');

    const dup = await this.prisma.monthlyPayment.findUnique({
      where: { userId_period: { userId, period: dto.period } },
    });
    if (dup) throw new ConflictException(`Ya pagaste el mes ${dto.period}`);

    const bills = await this.prisma.monthlyBill.findMany({
      where: { userId, isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const skipSet = new Set(dto.skip ?? []);
    const now = new Date();
    const items = bills
      .filter(b => !skipSet.has(b.id))
      // Items congelados (frozenUntil > now) NO suman al pago del mes
      .filter(b => !b.frozenUntil || b.frozenUntil <= now)
      .map(b => {
        const amount = dto.overrides?.[b.id] !== undefined ? Number(dto.overrides[b.id]) : Number(b.amount);
        return {
          billId:        b.id,
          category:      b.category,
          label:         b.label,
          amount,
          paymentMethod: b.paymentMethod ?? null,
          autoDebit:     b.autoDebit,
        };
      });
    const total = items.reduce((sum, it) => sum + Number(it.amount), 0);
    if (total <= 0) {
      throw new BadRequestException('El total del mes es 0 — activá al menos un concepto con monto');
    }

    const payment = await this.prisma.monthlyPayment.create({
      data: {
        userId,
        period:    dto.period,
        total,
        currency:  bills[0]?.currency ?? 'ARS',
        breakdown: items,
        paidAt,
        method:    dto.method ?? 'TRANSFER',
        note:      dto.note?.trim() || null,
      },
    });

    // Recibo del Particular (auto-emitido sin contraparte ya que no hay
    // un receiver registrado en este flujo; queda como "constancia personal")
    this.receipts.emit({
      payerId:      userId,
      sourceType:   'BILLS_MONTHLY',
      sourceId:     payment.id,
      amount:       total,
      currency:     payment.currency,
      paidAt:       payment.paidAt,
      method:       (payment.method as any) ?? 'TRANSFER',
      description:  `Presupuesto mensual ${dto.period}`,
      breakdown:    items,
    }).catch(() => {});
    return payment;
  }

  async deleteMonthlyPayment(userId: string, id: string) {
    const p = await this.prisma.monthlyPayment.findUnique({ where: { id } });
    if (!p || p.userId !== userId) throw new NotFoundException('Pago no encontrado');
    await this.prisma.monthlyPayment.delete({ where: { id } });
    return { ok: true };
  }
}
