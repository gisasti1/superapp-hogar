import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export const SUPPORT_CATEGORIES = [
  'ACCOUNT', 'PAYMENTS', 'CONTRACTS', 'LISTINGS',
  'SERVICES', 'TECHNICAL', 'SUGGESTION', 'OTHER',
] as const;
export type SupportCategory = typeof SUPPORT_CATEGORIES[number];

export interface CreateTicketDto {
  category:     SupportCategory;
  subCategory?: string;
  subject:      string;
  body:         string;
}

export interface AdminUpdateTicketDto {
  status?:       'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
  priority?:     'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedToId?: string | null;
  internalNote?: string | null;
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ─── User side ──────────────────────────────────────────────────────── */

  async createTicket(userId: string, dto: CreateTicketDto) {
    if (!SUPPORT_CATEGORIES.includes(dto.category as SupportCategory)) {
      throw new BadRequestException('Categoría inválida');
    }
    if (!dto.subject?.trim() || dto.subject.length < 3) {
      throw new BadRequestException('El asunto debe tener al menos 3 caracteres');
    }
    if (!dto.body?.trim() || dto.body.length < 10) {
      throw new BadRequestException('Contanos un poco más — mínimo 10 caracteres');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        category:    dto.category,
        subCategory: dto.subCategory?.trim() || null,
        subject:     dto.subject.trim(),
        body:        dto.body.trim(),
      },
    });
    // El primer "mensaje" es el body del ticket mismo — lo guardamos también
    // como SupportMessage para que el hilo arranque con esa entrada visible.
    await this.prisma.supportMessage.create({
      data: {
        ticketId:   ticket.id,
        authorId:   userId,
        authorRole: 'USER',
        body:       dto.body.trim(),
        readByUser: true,
      },
    });

    // Notif a todos los admins del equipo (si hay).
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    for (const a of admins) {
      this.notifications.send({
        userId: a.id,
        title:  '📩 Nuevo ticket de soporte',
        body:   `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim() +
                ` abrió "${ticket.subject}" (${ticket.category})`,
        type:   'SUPPORT_TICKET_CREATED',
        data:   { ticketId: ticket.id, route: `/admin/support/${ticket.id}` },
      }).catch(() => {});
    }
    return ticket;
  }

  async listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async getMine(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!ticket || ticket.userId !== userId) throw new NotFoundException('Ticket no encontrado');
    // Marcar mensajes de admin como leídos por user
    await this.prisma.supportMessage.updateMany({
      where: { ticketId: id, authorRole: 'ADMIN', readByUser: false },
      data:  { readByUser: true },
    });
    return ticket;
  }

  async reply(userId: string, ticketId: string, body: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.userId !== userId) throw new NotFoundException('Ticket no encontrado');
    if (['CLOSED'].includes(ticket.status)) throw new BadRequestException('El ticket está cerrado');
    if (!body?.trim()) throw new BadRequestException('El mensaje no puede estar vacío');

    const msg = await this.prisma.supportMessage.create({
      data: {
        ticketId, authorId: userId, authorRole: 'USER',
        body:       body.trim(),
        readByUser: true,
      },
    });
    // Si estaba WAITING_USER, vuelve a IN_PROGRESS
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data:  { status: ticket.status === 'WAITING_USER' ? 'IN_PROGRESS' : ticket.status, updatedAt: new Date() },
    });
    // Notif al admin asignado (si lo hay)
    if (ticket.assignedToId) {
      this.notifications.send({
        userId: ticket.assignedToId,
        title:  '💬 Respuesta del usuario',
        body:   `El usuario respondió en "${ticket.subject}".`,
        type:   'SUPPORT_USER_REPLY',
        data:   { ticketId, route: `/admin/support/${ticketId}` },
      }).catch(() => {});
    }
    return msg;
  }

  /* ─── Admin side ─────────────────────────────────────────────────────── */

  async adminList(opts: { status?: string; category?: string; priority?: string; search?: string } = {}) {
    const where: any = {};
    if (opts.status   && opts.status   !== 'ALL') where.status   = opts.status;
    if (opts.category && opts.category !== 'ALL') where.category = opts.category;
    if (opts.priority && opts.priority !== 'ALL') where.priority = opts.priority;
    if (opts.search) {
      const q = opts.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { body:    { contains: q, mode: 'insensitive' } },
        { user:    { firstName: { contains: q, mode: 'insensitive' } } },
        { user:    { lastName:  { contains: q, mode: 'insensitive' } } },
        { user:    { email:     { contains: q, mode: 'insensitive' } } },
      ];
    }
    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: {
        user:       { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count:     { select: { messages: true } },
      },
    });
    // Agregados rápidos
    const counts = {
      open:        await this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      inProgress:  await this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      waitingUser: await this.prisma.supportTicket.count({ where: { status: 'WAITING_USER' } }),
      resolved:    await this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      urgent:      await this.prisma.supportTicket.count({ where: { priority: 'URGENT', status: { not: 'CLOSED' } } }),
    };
    return { tickets, counts };
  }

  async adminGet(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user:       { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true, createdAt: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    // Mark all user msgs as read by admin
    await this.prisma.supportMessage.updateMany({
      where: { ticketId: id, authorRole: 'USER', readByAdmin: false },
      data:  { readByAdmin: true },
    });
    return ticket;
  }

  async adminUpdate(adminId: string, id: string, dto: AdminUpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    const data: any = {};
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED') data.resolvedAt = new Date();
      if (dto.status === 'CLOSED')   data.closedAt   = new Date();
    }
    if (dto.priority)         data.priority     = dto.priority;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.internalNote !== undefined) data.internalNote = dto.internalNote;

    const updated = await this.prisma.supportTicket.update({ where: { id }, data });

    // Si pasó a RESOLVED, notificar al usuario
    if (dto.status === 'RESOLVED') {
      this.notifications.send({
        userId: ticket.userId,
        title:  '✅ Tu consulta fue resuelta',
        body:   `Marcamos como resuelta tu consulta "${ticket.subject}". Si todavía no se solucionó, podés respondernos.`,
        type:   'SUPPORT_RESOLVED',
        data:   { ticketId: id, route: `/support/${id}` },
      }).catch(() => {});
    }
    return updated;
  }

  async adminReply(adminId: string, ticketId: string, body: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    if (!body?.trim()) throw new BadRequestException('El mensaje no puede estar vacío');

    const msg = await this.prisma.supportMessage.create({
      data: {
        ticketId, authorId: adminId, authorRole: 'ADMIN',
        body:        body.trim(),
        readByAdmin: true,
      },
    });
    // Auto-asignar + cambiar a IN_PROGRESS la primera vez
    const newStatus = ticket.status === 'OPEN' || ticket.status === 'WAITING_USER' ? 'IN_PROGRESS' : ticket.status;
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data:  {
        status:       newStatus,
        assignedToId: ticket.assignedToId ?? adminId,
        updatedAt:    new Date(),
      },
    });
    // Notif al usuario
    this.notifications.send({
      userId: ticket.userId,
      title:  '💬 Soporte respondió tu consulta',
      body:   `Tenés una respuesta nueva en "${ticket.subject}".`,
      type:   'SUPPORT_ADMIN_REPLY',
      data:   { ticketId, route: `/support/${ticketId}` },
    }).catch(() => {});
    return msg;
  }
}
