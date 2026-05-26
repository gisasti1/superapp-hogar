import { Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BUILT_IN_TEMPLATES } from './templates.seed';

export interface CreateTemplateDto {
  title: string;
  description?: string;
  type?: string;
  content: string;
}

export interface FillTemplateDto {
  templateId?: string;      // si quieren usar una plantilla base
  customContent?: string;   // o pasar texto libre ya editado
  landlordName: string;
  landlordDni: string;
  landlordAddress: string;
  tenantName: string;
  tenantDni: string;
  tenantAddress: string;
  address: string;
  city: string;
  province?: string;
  rooms?: number;
  startDate: string;        // ISO date
  endDate: string;
  monthlyRent: number;
  currency: string;
  deposit: number;
  today?: string;           // ISO date, defaults to now
}

@Injectable()
export class ContractTemplatesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** Seed las plantillas built-in si no existen todavía */
  async onModuleInit() {
    for (const tpl of BUILT_IN_TEMPLATES) {
      await this.prisma.contractTemplate.upsert({
        where: { id: tpl.id },
        update: { title: tpl.title, description: tpl.description, content: tpl.content },
        create: tpl,
      });
    }
  }

  // ─── Listado ────────────────────────────────────────────────────────

  async list(type?: string) {
    return this.prisma.contractTemplate.findMany({
      where: {
        isActive: true,
        ...(type ? { type } : {}),
      },
      select: {
        id: true, title: true, description: true, type: true,
        isBuiltIn: true, createdById: true, createdAt: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async get(id: string) {
    const tpl = await this.prisma.contractTemplate.findFirst({
      where: { id, isActive: true },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    return tpl;
  }

  // ─── CRUD (plantillas de usuario) ───────────────────────────────────

  async create(userId: string, dto: CreateTemplateDto) {
    return this.prisma.contractTemplate.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'RESIDENTIAL',
        content: dto.content,
        isBuiltIn: false,
        createdById: userId,
      },
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateTemplateDto>) {
    const tpl = await this.prisma.contractTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    if (tpl.isBuiltIn) throw new ForbiddenException('Las plantillas del sistema no se pueden editar. Creá una copia primero.');
    if (tpl.createdById !== userId) throw new ForbiddenException('No podés editar una plantilla que no creaste');
    return this.prisma.contractTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const tpl = await this.prisma.contractTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    if (tpl.isBuiltIn) throw new ForbiddenException('No se pueden eliminar las plantillas del sistema');
    if (tpl.createdById !== userId) throw new ForbiddenException('No podés eliminar una plantilla que no creaste');
    return this.prisma.contractTemplate.update({ where: { id }, data: { isActive: false } });
  }

  /** Duplicar una plantilla built-in para editarla */
  async duplicate(id: string, userId: string) {
    const tpl = await this.get(id);
    return this.prisma.contractTemplate.create({
      data: {
        title: `${tpl.title} (copia)`,
        description: tpl.description,
        type: tpl.type,
        content: tpl.content,
        isBuiltIn: false,
        createdById: userId,
      },
    });
  }

  // ─── Fill (rellenar variables con datos reales) ─────────────────────

  /**
   * Toma el contenido de una plantilla (o texto custom) y reemplaza
   * todos los {{placeholder}} con los datos del contrato.
   * Devuelve el texto final listo para mostrar / guardar en el contrato.
   */
  async fillTemplate(dto: FillTemplateDto): Promise<string> {
    let content: string;

    if (dto.customContent) {
      content = dto.customContent;
    } else if (dto.templateId) {
      const tpl = await this.get(dto.templateId);
      content = tpl.content;
    } else {
      throw new NotFoundException('Debés proporcionar templateId o customContent');
    }

    const today = dto.today
      ? new Date(dto.today).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const fmt = (n: number, cur: string) =>
      `${cur} ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const vars: Record<string, string> = {
      '{{landlordName}}':    dto.landlordName,
      '{{landlordDni}}':     dto.landlordDni,
      '{{landlordAddress}}': dto.landlordAddress,
      '{{tenantName}}':      dto.tenantName,
      '{{tenantDni}}':       dto.tenantDni,
      '{{tenantAddress}}':   dto.tenantAddress,
      '{{address}}':         dto.address,
      '{{city}}':            dto.city,
      '{{province}}':        dto.province ?? dto.city,
      '{{rooms}}':           dto.rooms?.toString() ?? '—',
      '{{startDate}}':       new Date(dto.startDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      '{{endDate}}':         new Date(dto.endDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      '{{monthlyRent}}':     dto.monthlyRent.toLocaleString('es-AR'),
      '{{currency}}':        dto.currency,
      '{{deposit}}':         dto.deposit.toLocaleString('es-AR'),
      '{{today}}':           today,
    };

    let result = content;
    for (const [key, val] of Object.entries(vars)) {
      result = result.replaceAll(key, val);
    }
    return result;
  }
}
