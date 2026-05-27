import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Búsqueda global por palabras clave en toda la app.
 * Devuelve resultados agrupados por tipo: properties, providers, contracts,
 * templates, support tickets, etc.
 *
 * Es per-user (no expone datos privados de otros usuarios):
 *   - Properties / providers / templates → públicos
 *   - Contracts / tickets / receipts     → sólo donde el user participa
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, q: string) {
    const term = q.trim();
    if (term.length < 2) {
      return { query: q, total: 0, groups: [] };
    }
    const TAKE = 6; // top-N por categoría
    const contains = { contains: term, mode: 'insensitive' as const };

    const [properties, providers, contracts, templates, tickets, receipts] = await Promise.all([
      // ── Inmuebles publicados ────────────────────────────────
      this.prisma.property.findMany({
        where: {
          isActive: true,
          listing: { isPublished: true },
          OR: [
            { address:     contains },
            { city:        contains },
            { description: contains },
          ],
        },
        select: { id: true, address: true, city: true, monthlyRent: true, currency: true, rooms: true, bathrooms: true },
        take: TAKE,
      }),

      // ── Prestadores de servicios ────────────────────────────
      this.prisma.provider.findMany({
        where: {
          isActive: true,
          OR: [
            { businessName: contains },
            { description:  contains },
            { category:     contains },
            { cities:       { has: term } },
          ],
        },
        select: {
          id: true, businessName: true, category: true, cities: true,
          rating: true, isVerified: true,
        },
        take: TAKE,
      }),

      // ── Mis contratos ───────────────────────────────────────
      this.prisma.contract.findMany({
        where: {
          OR: [{ tenantId: userId }, { landlordId: userId }],
          AND: [{
            OR: [
              { id:            contains },
              { property:      { address: contains } },
              { property:      { city:    contains } },
            ],
          }],
        },
        select: {
          id: true, status: true, monthlyAmount: true, currency: true,
          property: { select: { address: true, city: true } },
        },
        take: TAKE,
      }),

      // ── Plantillas de contrato (públicas + mías) ────────────
      this.prisma.contractTemplate.findMany({
        where: {
          isActive: true,
          OR: [
            { title:       contains },
            { description: contains },
          ],
          AND: [{
            OR: [
              { isBuiltIn: true },
              { createdById: userId },
            ],
          }],
        },
        select: { id: true, title: true, type: true, isBuiltIn: true },
        take: TAKE,
      }),

      // ── Mis tickets de soporte ──────────────────────────────
      this.prisma.supportTicket.findMany({
        where: {
          userId,
          OR: [
            { subject: contains },
            { body:    contains },
          ],
        },
        select: { id: true, subject: true, status: true, category: true, updatedAt: true },
        take: TAKE,
      }),

      // ── Mis recibos por número ──────────────────────────────
      this.prisma.paymentReceipt.findMany({
        where: {
          OR: [{ payerId: userId }, { receiverId: userId }],
          number: contains,
        },
        select: { id: true, number: true, amount: true, currency: true, sourceType: true, paidAt: true },
        take: TAKE,
      }),
    ]);

    const groups = [
      {
        key:   'properties',
        title: 'Inmuebles',
        icon:  '🏘️',
        items: properties.map(p => ({
          id: p.id, title: p.address, subtitle: `${p.city} · ${p.rooms}amb · ${p.bathrooms}b`,
          meta: `$${Number(p.monthlyRent).toLocaleString('es-AR')} ${p.currency}/mes`,
          href: `/listings/${p.id}`,
        })),
      },
      {
        key:   'providers',
        title: 'Servicios',
        icon:  '🔧',
        items: providers.map(p => ({
          id: p.id, title: p.businessName,
          subtitle: `${p.category}${p.cities?.length ? ` · ${p.cities.slice(0,2).join(', ')}` : ''}`,
          meta: p.isVerified ? '✓ Verificado' : (p.rating ? `⭐ ${Number(p.rating).toFixed(1)}` : ''),
          href: `/services/${p.id}`,
        })),
      },
      {
        key:   'contracts',
        title: 'Mis contratos',
        icon:  '📄',
        items: contracts.map(c => ({
          id: c.id, title: c.property?.address ?? c.id,
          subtitle: `${c.property?.city ?? ''} · ${c.status}`,
          meta: `$${Number(c.monthlyAmount).toLocaleString('es-AR')} ${c.currency}/mes`,
          href: `/contracts/${c.id}`,
        })),
      },
      {
        key:   'templates',
        title: 'Plantillas',
        icon:  '📋',
        items: templates.map(t => ({
          id: t.id, title: t.title,
          subtitle: t.type,
          meta: t.isBuiltIn ? 'Sistema' : 'Tuya',
          href: `/contracts/templates/${t.id}`,
        })),
      },
      {
        key:   'tickets',
        title: 'Mis consultas',
        icon:  '✉️',
        items: tickets.map(t => ({
          id: t.id, title: t.subject,
          subtitle: t.category,
          meta: t.status,
          href: `/support/${t.id}`,
        })),
      },
      {
        key:   'receipts',
        title: 'Mis recibos',
        icon:  '🧾',
        items: receipts.map(r => ({
          id: r.id, title: r.number,
          subtitle: r.sourceType,
          meta: `$${Number(r.amount).toLocaleString('es-AR')} ${r.currency}`,
          href: `/receipts`,
        })),
      },
    ].filter(g => g.items.length > 0);

    const total = groups.reduce((s, g) => s + g.items.length, 0);
    return { query: q, total, groups };
  }
}
