import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { buildPrismaWhere, SegmentFilters } from './segment-filters';

/**
 * CampaignsService — orquesta el envío de campañas (email/SMS) a los
 * usuarios de un segmento.
 *
 * Flujo de envío:
 *   1. Validar que la campaña esté en DRAFT.
 *   2. Resolver el segmento → lista de usuarios.
 *   3. Filtrar por consentimiento del canal (email/SMS) — CRÍTICO por Ley 25.326.
 *   4. Mandar en lote vía EmailService o SmsService.
 *   5. Actualizar sentCount/failedCount + status=SENT.
 *
 * El envío es síncrono por simplicidad. Para volúmenes > 1000 conviene
 * mandarlo a una cola (BullMQ) pero por ahora con bulk de SendGrid alcanza.
 */
@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────

  async list() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { id: true, name: true, lastCount: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async get(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        segment: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return campaign;
  }

  async create(
    createdById: string,
    dto: {
      name: string;
      segmentId: string;
      channel: 'EMAIL' | 'SMS';
      subject?: string;
      body: string;
    },
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Falta el nombre');
    if (!dto.body?.trim()) throw new BadRequestException('Falta el contenido');
    if (dto.channel === 'EMAIL' && !dto.subject?.trim()) {
      throw new BadRequestException('Las campañas de email requieren asunto');
    }
    if (dto.channel === 'SMS' && dto.body.length > 160) {
      throw new BadRequestException(
        `SMS muy largo (${dto.body.length} caracteres). Máximo 160 para evitar segmentación y cobros extra.`,
      );
    }

    const segment = await this.prisma.segment.findUnique({ where: { id: dto.segmentId } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    return this.prisma.campaign.create({
      data: {
        name: dto.name.trim(),
        segmentId: dto.segmentId,
        channel: dto.channel,
        subject: dto.subject?.trim(),
        body: dto.body.trim(),
        status: 'DRAFT',
        createdById,
      },
    });
  }

  async update(
    id: string,
    dto: { name?: string; subject?: string; body?: string; segmentId?: string },
  ) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden editar campañas en estado DRAFT');
    }

    if (campaign.channel === 'SMS' && dto.body && dto.body.length > 160) {
      throw new BadRequestException('SMS muy largo (máximo 160 caracteres).');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        subject: dto.subject?.trim(),
        body: dto.body?.trim(),
        segmentId: dto.segmentId,
      },
    });
  }

  async remove(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status === 'SENT') {
      throw new BadRequestException(
        'No se pueden borrar campañas enviadas (queda como histórico). Podés "Cancelar" para ocultarla.',
      );
    }
    await this.prisma.campaign.delete({ where: { id } });
    return { deleted: true };
  }

  async cancel(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status === 'SENT') {
      throw new BadRequestException('No podés cancelar una campaña ya enviada');
    }
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ─── Preview de destinatarios (antes de enviar) ────────────────────────

  /**
   * Calcula a cuántos usuarios LLEGARÍA la campaña ahora mismo:
   * 1. Los que entran al segmento
   * 2. Que además tienen consentimiento para el canal
   * 3. Que tienen email/teléfono válido
   *
   * Esto puede ser menor que segment.lastCount porque algunos usuarios
   * del segmento podrían no tener consentimiento para el canal específico.
   */
  async preview(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { segment: true },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const where = buildPrismaWhere(campaign.segment.filters as SegmentFilters);

    // Filtro adicional por consentimiento + contacto válido del canal
    if (campaign.channel === 'EMAIL') {
      where.marketingEmailConsent = true;
      where.email = { not: null };
    } else {
      where.marketingSmsConsent = true;
      where.phone = { not: null };
    }

    const reachable = await this.prisma.user.count({ where });
    const inSegment = campaign.segment.lastCount ?? 0;

    return {
      inSegment,
      reachable,
      filtered: inSegment - reachable,
      channel: campaign.channel,
    };
  }

  // ─── Envío real ────────────────────────────────────────────────────────

  /**
   * Manda la campaña. NO se puede revertir.
   *
   * @param confirmedReachable cuántos destinatarios el admin vio en el preview.
   *   Si difiere (porque alguien tildó/destildó consentimiento entre el preview
   *   y el envío), abortamos y le pedimos que confirme de nuevo.
   */
  async send(id: string, confirmedReachable?: number) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { segment: true },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException(`La campaña está en ${campaign.status}, no se puede enviar`);
    }

    // Recalcular destinatarios + filtrar por consentimiento.
    const where: Record<string, any> = buildPrismaWhere(campaign.segment.filters as SegmentFilters);
    if (campaign.channel === 'EMAIL') {
      where.marketingEmailConsent = true;
      where.email = { not: null };
    } else {
      where.marketingSmsConsent = true;
      where.phone = { not: null };
    }

    const recipients = await this.prisma.user.findMany({
      where,
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true, nickname: true,
      },
    });

    if (recipients.length === 0) {
      throw new BadRequestException(
        'No hay destinatarios con consentimiento para este canal. La campaña no se enviará.',
      );
    }

    // Safety check: si el admin confirmó N destinatarios y ahora son distintos
    // (típicamente porque alguien actualizó su consentimiento), abortar.
    if (
      typeof confirmedReachable === 'number' &&
      Math.abs(recipients.length - confirmedReachable) > 0
    ) {
      throw new BadRequestException(
        `El número de destinatarios cambió (${confirmedReachable} → ${recipients.length}). ` +
        'Refrescá la página y volvé a confirmar.',
      );
    }

    this.logger.log(
      `Enviando campaña "${campaign.name}" (${campaign.channel}) a ${recipients.length} destinatarios`,
    );

    let result: { sent: number; failed: number };

    if (campaign.channel === 'EMAIL') {
      const messages = recipients
        .filter(r => r.email)
        .map(r => ({
          to: r.email!,
          subject: campaign.subject ?? campaign.name,
          text: this.personalize(campaign.body, r),
          // Convertir saltos de línea en <br> para el HTML version.
          html: this.personalize(campaign.body, r).replace(/\n/g, '<br>'),
        }));
      const bulkResult = await this.emailService.sendBulk(messages);
      result = { sent: bulkResult.sent, failed: bulkResult.failed };
    } else {
      const messages = recipients
        .filter(r => r.phone)
        .map(r => ({
          to: r.phone!,
          body: this.personalize(campaign.body, r),
        }));
      const bulkResult = await this.smsService.sendBulk(messages);
      result = { sent: bulkResult.sent, failed: bulkResult.failed };
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentCount: result.sent,
        failedCount: result.failed,
        sentAt: new Date(),
      },
    });

    this.logger.log(`Campaña "${campaign.name}" enviada: ${result.sent} OK, ${result.failed} fallaron`);

    return {
      ...updated,
      mockMode: campaign.channel === 'EMAIL'
        ? !this.emailService.isReal()
        : !this.smsService.isReal(),
    };
  }

  /**
   * Reemplaza variables {{firstName}}, {{nickname}}, {{name}} en el body.
   * Mantenerlo simple — no es un motor de templates Liquid, sólo placeholders.
   */
  private personalize(
    template: string,
    user: { firstName: string; lastName: string; nickname: string | null },
  ): string {
    return template
      .replace(/\{\{firstName\}\}/gi, user.firstName)
      .replace(/\{\{lastName\}\}/gi, user.lastName)
      .replace(/\{\{nickname\}\}/gi, user.nickname ?? user.firstName)
      .replace(/\{\{name\}\}/gi, user.nickname ?? user.firstName);
  }
}
