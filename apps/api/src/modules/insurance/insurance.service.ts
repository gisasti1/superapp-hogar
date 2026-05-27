import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { FinaerService } from './finaer.service';
import { QuoteRequestDto } from './dto/quote-request.dto';

@Injectable()
export class InsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finaer: FinaerService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  async quote(userId: string, dto: QuoteRequestDto) {
    return this.finaer.getQuotes({
      propertyAddress: dto.propertyAddress,
      city: dto.city,
      monthlyRent: dto.monthlyRent,
      currency: dto.currency,
      contractMonths: dto.contractMonths,
      tenantDni: dto.tenantDni,
    });
  }

  async selectQuote(userId: string, quoteExternalId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { tenantId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!contract) {
      throw new NotFoundException('No se encontró un contrato activo para el usuario.');
    }

    const existing = await this.prisma.policy.findUnique({
      where: { contractId: contract.id },
    });
    if (existing) return existing;

    return this.prisma.policy.create({
      data: {
        contractId: contract.id,
        userId,
        providerId: quoteExternalId,
        policyNumber: `POL-${Date.now()}`,
        status: 'QUOTED',
        monthlyPremium: 0,
        coverageAmount: 0,
        currency: contract.currency,
        startDate: contract.startDate,
        endDate: contract.endDate,
        externalId: quoteExternalId,
      },
    });
  }

  async payPolicy(userId: string, policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) throw new NotFoundException('Póliza no encontrada.');
    if (policy.userId !== userId) throw new ForbiddenException('Sin acceso a esta póliza.');
    if (policy.status !== 'QUOTED') {
      throw new BadRequestException('La póliza no está en estado QUOTED.');
    }

    const preference = await this.mercadoPago.createPreference({
      title: `Seguro de Garantía - ${policy.policyNumber}`,
      amount: Number(policy.monthlyPremium),
      currency: policy.currency,
      externalReference: `insurance:${policy.id}`,
    });

    await this.prisma.payment.create({
      data: {
        policyId: policy.id,
        payerId: userId,
        amount: policy.monthlyPremium,
        currency: policy.currency,
        type: 'INSURANCE_PREMIUM',
        status: 'PENDING',
        dueDate: new Date(),
        mpPreference: preference.id,
      },
    });

    return { initPoint: preference.initPoint, sandboxInitPoint: preference.sandboxInitPoint };
  }

  async getPolicyPdf(userId: string, policyId: string): Promise<Buffer> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) throw new NotFoundException('Póliza no encontrada.');
    if (policy.userId !== userId) throw new ForbiddenException('Sin acceso a esta póliza.');

    const lines = [
      'HABITTA - PÓLIZA DE SEGURO DE GARANTÍA',
      '='.repeat(50),
      `Número de póliza: ${policy.policyNumber}`,
      `Estado: ${policy.status}`,
      `Prima mensual: ${policy.currency} ${policy.monthlyPremium}`,
      `Cobertura: ${policy.currency} ${policy.coverageAmount}`,
      `Vigencia: ${policy.startDate.toISOString().split('T')[0]} al ${policy.endDate.toISOString().split('T')[0]}`,
      `Proveedor ID: ${policy.providerId}`,
      '',
      'Generado automáticamente por habitta.',
    ];

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  async getMyPolicies(userId: string) {
    return this.prisma.policy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        contract: {
          select: { id: true, propertyId: true, startDate: true, endDate: true },
        },
      },
    });
  }
}
