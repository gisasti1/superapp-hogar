import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { SubscriptionPlan } from '@superapp/database';

const PLANS = [
  {
    id: SubscriptionPlan.FREE,
    name: 'Plan Gratuito',
    price: 0,
    currency: 'ARS',
    description: 'Acceso básico a la plataforma',
    features: [
      'Búsqueda de propiedades',
      'Hasta 1 contrato activo',
      'Soporte por email',
    ],
  },
  {
    id: SubscriptionPlan.PREMIUM,
    name: 'Plan Premium',
    price: 5990,
    currency: 'ARS',
    description: 'Acceso completo con todas las funcionalidades',
    features: [
      'Contratos ilimitados',
      'Mediación con IA incluida',
      'Seguro de garantía con descuento',
      'Soporte prioritario',
      'Gestión de proveedores',
    ],
  },
  {
    id: SubscriptionPlan.REALTOR,
    name: 'Plan Inmobiliaria',
    price: 19990,
    currency: 'ARS',
    description: 'Para inmobiliarias y gestores profesionales',
    features: [
      'Todo el Plan Premium',
      'Hasta 100 propiedades',
      'Panel de analytics',
      'API acceso',
      'Soporte dedicado',
    ],
  },
];

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  getPlans() {
    return PLANS;
  }

  async subscribe(userId: string, plan: SubscriptionPlan) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    if (plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('El plan FREE no requiere suscripción.');
    }

    const selectedPlan = PLANS.find((p) => p.id === plan);
    if (!selectedPlan) throw new BadRequestException('Plan no válido.');

    const mpSub = await this.mercadoPago.createSubscription({
      reason: selectedPlan.name,
      externalReference: `subscription:${userId}:${plan}`,
      payerEmail: user.email,
      autoRecurring: {
        frequency: 1,
        frequencyType: 'months',
        transactionAmount: selectedPlan.price,
        currencyId: selectedPlan.currency,
      },
      backUrl: `${process.env['APP_URL'] ?? 'http://localhost:3000'}/premium/callback`,
    });

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'TRIALING',
        mpSubscriptionId: mpSub.id,
      },
      create: {
        userId,
        plan,
        status: 'TRIALING',
        mpSubscriptionId: mpSub.id,
      },
    });

    return { redirectUrl: mpSub.initPoint, subscriptionId: mpSub.id };
  }

  async handleWebhook(body: Record<string, unknown>) {
    this.logger.log(`Premium webhook: ${JSON.stringify(body)}`);

    const type = body['type'] as string | undefined;
    const action = body['action'] as string | undefined;

    if (type !== 'subscription_preapproval') return { received: true };

    const dataId = (body['data'] as Record<string, unknown>)?.['id'] as string | undefined;
    if (!dataId) return { received: true };

    const subscription = await this.prisma.subscription.findFirst({
      where: { mpSubscriptionId: dataId },
    });
    if (!subscription) return { received: true };

    let newStatus: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | undefined;

    switch (action) {
      case 'subscription_preapproval.authorized':
        newStatus = 'ACTIVE';
        break;
      case 'subscription_preapproval.cancelled':
        newStatus = 'CANCELLED';
        break;
      case 'subscription_preapproval.payment_failed':
        newStatus = 'PAST_DUE';
        break;
    }

    if (newStatus) {
      const now = new Date();
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus,
          currentPeriodStart: newStatus === 'ACTIVE' ? now : undefined,
          currentPeriodEnd:
            newStatus === 'ACTIVE'
              ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
              : undefined,
          cancelledAt: newStatus === 'CANCELLED' ? now : undefined,
        },
      });
    }

    return { received: true };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) throw new NotFoundException('Suscripción no encontrada.');
    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('La suscripción ya está cancelada.');
    }

    if (subscription.mpSubscriptionId) {
      await this.mercadoPago.cancelSubscription(subscription.mpSubscriptionId).catch((err: Error) => {
        this.logger.warn(`Failed to cancel MP subscription: ${err.message}`);
      });
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        plan: SubscriptionPlan.FREE,
      },
    });

    return { cancelled: true };
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) throw new NotFoundException('Suscripción no encontrada.');
    return subscription;
  }

  async checkPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) return false;
    return (
      subscription.status === 'ACTIVE' &&
      subscription.plan !== SubscriptionPlan.FREE
    );
  }
}
