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
        data: (dto.data ?? {}) as object,
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

  /* ─── Visitas ──────────────────────────────────────────────────────── */

  async notifyVisitProposed(ownerId: string, visitId: string, propertyAddress: string, fromName: string, when: Date) {
    return this.send({
      userId: ownerId,
      title: '📅 Te pidieron una visita',
      body:  `${fromName} quiere visitar ${propertyAddress} el ${fmtWhen(when)}. Confirmá o proponé otra fecha.`,
      type:  'VISIT_PROPOSED',
      data:  { visitId, route: '/visits' },
    });
  }

  async notifyVisitCounter(toUserId: string, visitId: string, propertyAddress: string, fromName: string, when: Date) {
    return this.send({
      userId: toUserId,
      title: '↻ Contraoferta de visita',
      body:  `${fromName} propuso otra fecha para visitar ${propertyAddress}: ${fmtWhen(when)}.`,
      type:  'VISIT_COUNTER_PROPOSED',
      data:  { visitId, route: '/visits' },
    });
  }

  async notifyVisitConfirmed(toUserId: string, visitId: string, propertyAddress: string, when: Date) {
    return this.send({
      userId: toUserId,
      title: '✅ Visita confirmada',
      body:  `La visita a ${propertyAddress} quedó confirmada para el ${fmtWhen(when)}.`,
      type:  'VISIT_CONFIRMED',
      data:  { visitId, route: '/visits' },
    });
  }

  async notifyVisitCancelled(toUserId: string, visitId: string, propertyAddress: string, byName: string, reason?: string | null) {
    return this.send({
      userId: toUserId,
      title: '❌ Visita cancelada',
      body:  `${byName} canceló la visita a ${propertyAddress}${reason ? ` — ${reason}` : ''}.`,
      type:  'VISIT_CANCELLED',
      data:  { visitId, route: '/visits' },
    });
  }

  /* ─── Contraofertas (RentalRequest) ────────────────────────────────── */

  async notifyRentalCounter(toUserId: string, requestId: string, fromName: string, amount?: number) {
    return this.send({
      userId: toUserId,
      title: '💬 Nueva contraoferta',
      body:  amount
        ? `${fromName} hizo una contraoferta de $${amount.toLocaleString('es-AR')}/mes.`
        : `${fromName} ajustó las condiciones de la solicitud.`,
      type:  'RENTAL_COUNTER_OFFERED',
      data:  { requestId, route: '/rental-requests' },
    });
  }

  async notifyRentalApproved(toUserId: string, requestId: string, propertyAddress: string) {
    return this.send({
      userId: toUserId,
      title: '✅ Solicitud aprobada',
      body:  `Tu solicitud para ${propertyAddress} fue aprobada. Ya pueden generar el contrato.`,
      type:  'RENTAL_APPROVED',
      data:  { requestId, route: '/rental-requests' },
    });
  }

  async notifyRentalRejected(toUserId: string, requestId: string, propertyAddress: string, reason?: string | null) {
    return this.send({
      userId: toUserId,
      title: '❌ Solicitud rechazada',
      body:  `Tu solicitud para ${propertyAddress} fue rechazada${reason ? ` — ${reason}` : ''}.`,
      type:  'RENTAL_REJECTED',
      data:  { requestId, route: '/rental-requests' },
    });
  }

  /* ─── Co-firmantes ─────────────────────────────────────────────────── */

  async notifyCoSignerInvited(toUserId: string, contractId: string, partyId: string, fromName: string, side: string) {
    return this.send({
      userId: toUserId,
      title: '📩 Te invitaron a co-firmar un contrato',
      body:  `${fromName} te invitó a sumarte como ${side === 'TENANT' ? 'inquilino' : 'propietario'} en un contrato.`,
      type:  'COSIGNER_INVITED',
      data:  { contractId, partyId, route: `/contracts/${contractId}` },
    });
  }

  async notifyCoSignerAccepted(toUserId: string, contractId: string, name: string) {
    return this.send({
      userId: toUserId,
      title: '✅ Co-firmante aceptó',
      body:  `${name} aceptó la invitación y ya está integrado al contrato.`,
      type:  'COSIGNER_ACCEPTED',
      data:  { contractId, route: `/contracts/${contractId}` },
    });
  }

  async notifyCoSignerDeclined(toUserId: string, contractId: string, who: string) {
    return this.send({
      userId: toUserId,
      title: 'ℹ️ Co-firmante rechazó',
      body:  `${who} rechazó la invitación a co-firmar.`,
      type:  'COSIGNER_DECLINED',
      data:  { contractId, route: `/contracts/${contractId}` },
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

/** "vie 30 ene, 15:00" — para mostrar fechas en notifs */
function fmtWhen(d: Date) {
  return d.toLocaleString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}
