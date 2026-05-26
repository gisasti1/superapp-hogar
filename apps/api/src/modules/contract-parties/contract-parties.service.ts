import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface InviteCoSignerDto {
  email: string;
  side:  'TENANT' | 'LANDLORD'; // del mismo lado que el invitador
}

@Injectable()
export class ContractPartiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve a primary + cosigners de cada lado, indicando quién soy yo. */
  async listForContract(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where:   { id: contractId },
      include: {
        tenant:    { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        landlord:  { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        parties:   {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
        },
      },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    this.assertParticipant(userId, contract);

    const buildSide = (side: 'TENANT' | 'LANDLORD') => {
      const primary = side === 'TENANT' ? contract.tenant : contract.landlord;
      const cosigners = contract.parties.filter(p => p.side === side && p.role === 'COSIGNER');
      return {
        primary: { ...primary, role: 'PRIMARY' as const, side, status: 'ACCEPTED' as const, isMe: primary.id === userId },
        cosigners: cosigners.map(c => ({
          id:           c.id,
          userId:       c.userId,
          invitedEmail: c.invitedEmail,
          user:         c.user,
          role:         'COSIGNER' as const,
          side,
          status:       c.status,
          invitedAt:    c.invitedAt,
          acceptedAt:   c.acceptedAt,
          isMe:         c.userId === userId,
          inviteToken:  c.invitedById === userId ? c.inviteToken : undefined,
        })),
      };
    };

    return { tenant: buildSide('TENANT'), landlord: buildSide('LANDLORD') };
  }

  /** Invitar a otra persona a co-firmar el contrato (del mismo lado que vos). */
  async invite(userId: string, contractId: string, dto: InviteCoSignerDto) {
    if (!dto.email?.trim()) throw new BadRequestException('Email obligatorio');
    if (!['TENANT', 'LANDLORD'].includes(dto.side)) throw new BadRequestException('side inválido');
    const email = dto.email.trim().toLowerCase();

    const contract = await this.prisma.contract.findUnique({
      where:   { id: contractId },
      include: { parties: true },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    if (contract.status === 'SIGNED' || contract.status === 'ACTIVE') {
      throw new BadRequestException('No se pueden agregar co-firmantes a un contrato ya firmado/activo');
    }

    // Sólo el primary del lado puede invitar (o un cosigner ACCEPTED de ese lado)
    const mySide = this.resolveMySide(userId, contract, dto.side);
    if (!mySide) throw new ForbiddenException('No podés invitar co-firmantes a un lado que no es el tuyo');

    // ¿Es un usuario existente?
    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    // ¿Ya está como party?
    const dup = contract.parties.find(p =>
      (existingUser && p.userId === existingUser.id) ||
      (p.invitedEmail?.toLowerCase() === email),
    );
    if (dup) throw new ConflictException('Esa persona ya está invitada a este contrato');

    // ¿Es el primary del lado contrario? evitar conflictos
    if (existingUser?.id === contract.tenantId && dto.side === 'LANDLORD') {
      throw new BadRequestException('Esa persona ya es el inquilino del contrato');
    }
    if (existingUser?.id === contract.landlordId && dto.side === 'TENANT') {
      throw new BadRequestException('Esa persona ya es el propietario del contrato');
    }

    return this.prisma.contractParty.create({
      data: {
        contractId,
        userId:       existingUser?.id ?? null,
        invitedEmail: email,
        side:         dto.side,
        role:         'COSIGNER',
        invitedById:  userId,
        status:       'INVITED',
      },
    });
  }

  /** Aceptar invitación con token (usuario logueado o vía link público). */
  async accept(userId: string, contractId: string, token: string) {
    const party = await this.prisma.contractParty.findUnique({ where: { inviteToken: token } });
    if (!party || party.contractId !== contractId) throw new NotFoundException('Invitación no válida');
    if (party.status !== 'INVITED') throw new BadRequestException(`La invitación está en estado ${party.status}`);

    // Si la invitación todavía no estaba linkeada a un userId (era solo por email),
    // la conectamos al usuario actual SI el email coincide.
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) throw new NotFoundException('Usuario no encontrado');
    if (!party.userId && party.invitedEmail?.toLowerCase() !== me.email.toLowerCase()) {
      throw new ForbiddenException('Esta invitación fue para otro email');
    }
    if (party.userId && party.userId !== userId) {
      throw new ForbiddenException('Esta invitación fue para otro usuario');
    }

    return this.prisma.contractParty.update({
      where: { id: party.id },
      data:  { userId, status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  async decline(userId: string, contractId: string, token: string) {
    const party = await this.prisma.contractParty.findUnique({ where: { inviteToken: token } });
    if (!party || party.contractId !== contractId) throw new NotFoundException('Invitación no válida');
    if (party.status !== 'INVITED') throw new BadRequestException(`La invitación está en estado ${party.status}`);
    return this.prisma.contractParty.update({
      where: { id: party.id },
      data:  { status: 'DECLINED', declinedAt: new Date() },
    });
  }

  /** El primary del lado puede quitar un co-firmante invitado o ACCEPTED. */
  async remove(userId: string, contractId: string, partyId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    const party    = await this.prisma.contractParty.findUnique({ where: { id: partyId } });
    if (!party || party.contractId !== contractId) throw new NotFoundException('Party no encontrada');

    const iAmPrimary = this.resolveMySide(userId, contract, party.side as 'TENANT' | 'LANDLORD') === 'PRIMARY';
    const iAmTheParty = party.userId === userId;
    if (!iAmPrimary && !iAmTheParty) {
      throw new ForbiddenException('Sólo el titular del lado o el propio co-firmante pueden quitarlo');
    }

    return this.prisma.contractParty.update({
      where: { id: partyId },
      data:  { status: 'REMOVED' },
    });
  }

  /* ── helpers ── */

  private assertParticipant(userId: string, contract: any) {
    if (
      contract.tenantId === userId || contract.landlordId === userId ||
      contract.parties?.some((p: any) => p.userId === userId && p.status === 'ACCEPTED')
    ) return;
    throw new ForbiddenException('No participás en este contrato');
  }

  /**
   * Devuelve 'PRIMARY' si el usuario es el primary del lado, 'COSIGNER' si es
   * un cosigner ACCEPTED del lado, null si no pertenece al lado.
   */
  private resolveMySide(userId: string, contract: any, side: 'TENANT' | 'LANDLORD'): 'PRIMARY' | 'COSIGNER' | null {
    const primaryId = side === 'TENANT' ? contract.tenantId : contract.landlordId;
    if (primaryId === userId) return 'PRIMARY';
    const co = contract.parties?.find((p: any) =>
      p.side === side && p.userId === userId && p.status === 'ACCEPTED',
    );
    return co ? 'COSIGNER' : null;
  }
}
