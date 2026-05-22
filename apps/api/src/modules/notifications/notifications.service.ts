import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SendNotificationDto {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        data: dto.data ?? {},
      },
    });

    // Envío push via Expo Push API (no requiere credenciales extra)
    await this.sendExpoPush(dto.userId, dto.title, dto.body, dto.data).catch(err =>
      this.logger.warn(`Push failed for user ${dto.userId}: ${err.message}`),
    );

    return notification;
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async list(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { items, total, page, pages: Math.ceil(total / take), unreadCount };
  }

  // ─── Helpers de dominio ────────────────────────────────────────────────────

  async notifyPaymentDue(userId: string, amount: number, dueDate: Date) {
    return this.send({
      userId,
      title: 'Pago próximo a vencer',
      body: `Tenés un pago de $${amount.toLocaleString('es-AR')} que vence el ${dueDate.toLocaleDateString('es-AR')}.`,
      type: 'PAYMENT_DUE',
      data: { dueDate: dueDate.toISOString() },
    });
  }

  async notifyContractSignatureRequired(userId: string, contractId: string) {
    return this.send({
      userId,
      title: 'Contrato listo para firmar',
      body: 'Tenés un contrato de locación esperando tu firma digital.',
      type: 'CONTRACT_SIGNATURE_REQUIRED',
      data: { contractId },
    });
  }

  async notifyMediationUpdate(userId: string, caseId: string, message: string) {
    return this.send({
      userId,
      title: 'Actualización en tu caso de mediación',
      body: message,
      type: 'MEDIATION_UPDATE',
      data: { caseId },
    });
  }

  async notifyKycResult(userId: string, approved: boolean) {
    return this.send({
      userId,
      title: approved ? '✅ Identidad verificada' : '❌ Verificación rechazada',
      body: approved
        ? 'Tu identidad fue verificada exitosamente. Ya podés acceder a todas las funciones.'
        : 'No pudimos verificar tu identidad. Revisá las instrucciones e intentá de nuevo.',
      type: 'KYC_RESULT',
      data: { approved },
    });
  }

  // ─── Expo Push ─────────────────────────────────────────────────────────────

  private async sendExpoPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    // Los push tokens se guardarían en una tabla push_tokens (a implementar en Sprint 6+)
    // Por ahora loggeamos sin crashear
    this.logger.log(`[PUSH] → user:${userId} | ${title}: ${body}`, data);
  }
}
