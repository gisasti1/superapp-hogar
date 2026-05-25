import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Para garantizar unicidad de "1 conversación por par de usuarios",
 * siempre guardamos participant1 < participant2 (orden lexicográfico).
 * Así el unique constraint funciona sin duplicar dirección.
 */
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra o crea la conversación 1:1 entre dos usuarios. Si se pasa contractId
   * o rentalRequestId, queda asociada como contexto. No es estrictamente 1 por par
   * (puede haber 1 por par+contractId distinto), pero en práctica el frontend va
   * a usar siempre la misma.
   */
  async getOrCreate(
    userId: string,
    otherUserId: string,
    opts: { contractId?: string; rentalRequestId?: string } = {},
  ) {
    if (userId === otherUserId) {
      throw new BadRequestException('No podés chatear con vos mismo.');
    }
    const [p1, p2] = orderedPair(userId, otherUserId);

    // Validar que el otro usuario existe
    const other = await this.prisma.user.findUnique({ where: { id: otherUserId } });
    if (!other) throw new NotFoundException('Usuario no encontrado.');

    // Validar contexto opcional
    if (opts.contractId) {
      const c = await this.prisma.contract.findUnique({ where: { id: opts.contractId } });
      if (!c) throw new NotFoundException('Contrato no encontrado.');
      if (![c.tenantId, c.landlordId].includes(userId) || ![c.tenantId, c.landlordId].includes(otherUserId)) {
        throw new ForbiddenException('Ambos usuarios deben ser parte del contrato.');
      }
    }

    return this.prisma.conversation.upsert({
      where: {
        participant1Id_participant2Id_contractId: {
          participant1Id: p1,
          participant2Id: p2,
          contractId: opts.contractId ?? null as any,
        },
      },
      update: {},
      create: {
        participant1Id: p1,
        participant2Id: p2,
        contractId: opts.contractId,
        rentalRequestId: opts.rentalRequestId,
      },
    });
  }

  /**
   * Bandeja de entrada: conversaciones del usuario ordenadas por último mensaje.
   * Incluye al otro participante (nombre + email) y el contexto opcional.
   */
  async listForUser(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participant1: { select: { id: true, firstName: true, lastName: true } },
        participant2: { select: { id: true, firstName: true, lastName: true } },
        contract: {
          select: { id: true, property: { select: { address: true } } },
        },
        _count: {
          select: {
            messages: {
              where: {
                readAt: null,
                NOT: { senderId: userId },  // solo cuento los mensajes que YO no leí
              },
            },
          },
        },
      },
    });
    // Normalizo para que el front siempre reciba "other" en vez de averiguar
    return convos.map(c => ({
      id: c.id,
      contractId: c.contractId,
      rentalRequestId: c.rentalRequestId,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      unreadCount: c._count.messages,
      contract: c.contract,
      other: c.participant1Id === userId ? c.participant2 : c.participant1,
    }));
  }

  async getById(userId: string, conversationId: string) {
    const c = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: { select: { id: true, firstName: true, lastName: true } },
        participant2: { select: { id: true, firstName: true, lastName: true } },
        contract: {
          select: { id: true, property: { select: { address: true, city: true } } },
        },
      },
    });
    if (!c) throw new NotFoundException('Conversación no encontrada.');
    if (![c.participant1Id, c.participant2Id].includes(userId)) {
      throw new ForbiddenException('No tenés acceso a esta conversación.');
    }
    return {
      id: c.id,
      contractId: c.contractId,
      contract: c.contract,
      other: c.participant1Id === userId ? c.participant2 : c.participant1,
    };
  }

  async listMessages(userId: string, conversationId: string, opts: { since?: Date } = {}) {
    const c = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participant1Id: true, participant2Id: true },
    });
    if (!c) throw new NotFoundException('Conversación no encontrada.');
    if (![c.participant1Id, c.participant2Id].includes(userId)) {
      throw new ForbiddenException('No tenés acceso a esta conversación.');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(opts.since ? { createdAt: { gt: opts.since } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    // Marcar como leídos los recibidos en este fetch (read receipts simples)
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        readAt: null,
        NOT: { senderId: userId },
      },
      data: { readAt: new Date() },
    });

    return messages;
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) throw new BadRequestException('El mensaje no puede estar vacío.');
    if (trimmed.length > 4000) throw new BadRequestException('Mensaje demasiado largo (máx 4000 caracteres).');

    const c = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participant1Id: true, participant2Id: true },
    });
    if (!c) throw new NotFoundException('Conversación no encontrada.');
    if (![c.participant1Id, c.participant2Id].includes(userId)) {
      throw new ForbiddenException('No podés mandar mensajes en esta conversación.');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId: userId, content: trimmed },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: trimmed.slice(0, 140),
        },
      }),
    ]);
    return message;
  }

  /**
   * Cuenta total de mensajes no leídos del usuario.
   * Lo usa la campanita del header para mostrar badge global.
   */
  async unreadCount(userId: string): Promise<{ total: number }> {
    const total = await this.prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    });
    return { total };
  }
}
