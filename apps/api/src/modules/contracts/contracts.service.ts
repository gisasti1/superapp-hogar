import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DocuSignService } from './docusign.service';
import { S3Service } from '../../common/services/s3.service';
import { CreateContractDto } from './dto/create-contract.dto';
import type { Contract } from '@superapp/database';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docuSign: DocuSignService,
    private readonly s3: S3Service,
  ) {}

  async create(userId: string, dto: CreateContractDto) {
    // Verify the property exists and belongs to the requesting user (landlord)
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('Solo el propietario puede crear contratos para esta propiedad.');
    }

    const tenant = await this.prisma.user.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Inquilino no encontrado.');

    return this.prisma.contract.create({
      data: {
        propertyId: dto.propertyId,
        tenantId: dto.tenantId,
        landlordId: userId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        monthlyAmount: dto.monthlyAmount,
        depositAmount: dto.depositAmount,
        currency: dto.currency ?? 'ARS',
        status: 'DRAFT',
      },
      include: {
        property: { select: { address: true, city: true } },
        tenant: { select: { firstName: true, lastName: true, email: true } },
        landlord: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async getById(id: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        property: true,
        tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true } },
        signatures: true,
      },
    });

    if (!contract) throw new NotFoundException('Contrato no encontrado.');
    if (contract.tenantId !== userId && contract.landlordId !== userId) {
      throw new ForbiddenException('Sin acceso a este contrato.');
    }

    return contract;
  }

  async listByUser(userId: string) {
    return this.prisma.contract.findMany({
      where: {
        OR: [{ tenantId: userId }, { landlordId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { address: true, city: true } },
        tenant: { select: { firstName: true, lastName: true } },
        landlord: { select: { firstName: true, lastName: true } },
        signatures: { select: { userId: true, role: true, signedAt: true } },
      },
    });
  }

  async saveContent(contractId: string, userId: string, customContent: string, templateId?: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato no encontrado.');
    if (contract.landlordId !== userId && contract.tenantId !== userId) {
      throw new ForbiddenException('Solo las partes del contrato pueden editarlo.');
    }
    if (contract.status !== 'DRAFT') {
      throw new BadRequestException('Solo se puede editar el texto de contratos en borrador.');
    }
    return this.prisma.contract.update({
      where: { id: contractId },
      data: {
        customContent,
        ...(templateId ? { templateId } : {}),
      },
    });
  }

  async sign(contractId: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { signatures: true },
    });

    if (!contract) throw new NotFoundException('Contrato no encontrado.');

    const isTenant = contract.tenantId === userId;
    const isLandlord = contract.landlordId === userId;

    if (!isTenant && !isLandlord) {
      throw new ForbiddenException('Solo las partes del contrato pueden firmarlo.');
    }

    if (
      ['SIGNED', 'ACTIVE', 'TERMINATED', 'EXPIRED'].includes(contract.status)
    ) {
      throw new BadRequestException('El contrato ya fue firmado o está en un estado final.');
    }

    const alreadySigned = contract.signatures.find((s) => s.userId === userId);
    if (alreadySigned) {
      throw new BadRequestException('Ya firmaste este contrato.');
    }

    const role = isTenant ? 'TENANT' : 'LANDLORD';

    await this.prisma.contractSignature.create({
      data: {
        contractId,
        userId,
        role,
      },
    });

    // Check if both parties have now signed
    const allSignatures = await this.prisma.contractSignature.findMany({
      where: { contractId },
    });

    const tenantSigned = allSignatures.some(
      (s) => s.userId === contract.tenantId,
    );
    const landlordSigned = allSignatures.some(
      (s) => s.userId === contract.landlordId,
    );

    if (tenantSigned && landlordSigned) {
      const pdfBuffer = await this.generatePdf(contract);
      const pdfHash = crypto
        .createHash('sha256')
        .update(pdfBuffer)
        .digest('hex');

      const pdfKey = `contracts/${contractId}/contract-${Date.now()}.pdf`;
      const pdfUrl = await this.s3.uploadFile(pdfBuffer, pdfKey, 'application/pdf');

      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          pdfUrl,
          pdfHash,
        },
      });
    } else {
      // At least one party signed — move to PENDING_SIGNATURES if still DRAFT
      if (contract.status === 'DRAFT') {
        await this.prisma.contract.update({
          where: { id: contractId },
          data: { status: 'PENDING_SIGNATURES' },
        });
      }
    }

    return this.getById(contractId, userId);
  }

  async generatePdf(contract: Contract): Promise<Buffer> {
    const lines = [
      'SUPERAPP HOGAR - CONTRATO DE LOCACIÓN',
      '='.repeat(50),
      `ID de Contrato: ${contract.id}`,
      `Propiedad ID: ${contract.propertyId}`,
      `Inquilino ID: ${contract.tenantId}`,
      `Propietario ID: ${contract.landlordId}`,
      `Fecha de inicio: ${contract.startDate.toISOString().split('T')[0]}`,
      `Fecha de fin: ${contract.endDate.toISOString().split('T')[0]}`,
      `Monto mensual: ${contract.currency} ${contract.monthlyAmount}`,
      `Depósito: ${contract.currency} ${contract.depositAmount}`,
      `Estado: ${contract.status}`,
      '',
      'Conforme a lo establecido en los artículos 1187-1226 del Código Civil y Comercial',
      'de la Nación Argentina (Ley 26.994) y el DNU 70/2023.',
      '',
      `Generado el: ${new Date().toISOString()}`,
    ];

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  async getContractPdf(id: string, userId: string): Promise<Buffer> {
    const contract = await this.getById(id, userId);

    if (contract.pdfUrl) {
      // In production would fetch from S3; return regenerated for now
    }

    return this.generatePdf(contract);
  }

  getContractTemplate() {
    return {
      templateId: 'standard-residential-v1',
      title: 'Contrato Estándar de Locación Residencial',
      description:
        'Template base conforme al CCyC arts. 1187-1226 y DNU 70/2023',
      clauses: [
        'Objeto del contrato',
        'Plazo de la locación',
        'Precio y forma de pago',
        'Depósito en garantía',
        'Obligaciones del locatario',
        'Obligaciones del locador',
        'Rescisión anticipada',
        'Jurisdicción',
      ],
    };
  }
}
