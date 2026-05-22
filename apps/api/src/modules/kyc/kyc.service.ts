import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RenaperService } from './renaper.service';
import { KYC_FACIAL_MATCH_THRESHOLD } from '@superapp/shared';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renaper: RenaperService,
  ) {}

  async startVerification(userId: string) {
    const existing = await this.prisma.verification.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    return this.prisma.verification.create({
      data: { userId, status: 'PENDING' },
    });
  }

  async uploadDni(userId: string, frontUrl: string, backUrl: string) {
    const verification = await this.getOrCreate(userId);

    return this.prisma.verification.update({
      where: { id: verification.id },
      data: {
        dniFrontUrl: frontUrl,
        dniBackUrl: backUrl,
        status: 'IN_PROGRESS',
      },
    });
  }

  async uploadSelfie(userId: string, selfieUrl: string) {
    const verification = await this.getOrCreate(userId);

    return this.prisma.verification.update({
      where: { id: verification.id },
      data: { selfieUrl },
    });
  }

  async validateWithRenaper(userId: string) {
    const verification = await this.prisma.verification.findUnique({ where: { userId } });

    if (!verification) {
      throw new NotFoundException('Verificación no encontrada. Iniciá el proceso primero.');
    }

    if (!verification.dniFrontUrl || !verification.selfieUrl) {
      throw new BadRequestException(
        'Debés subir el DNI y la selfie antes de validar con RENAPER.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.dni) {
      throw new BadRequestException('El usuario no tiene un DNI registrado.');
    }

    const result = await this.renaper.validate(
      user.dni,
      verification.selfieUrl,
      verification.dniFrontUrl,
    );

    const newStatus =
      result.facialMatchScore >= KYC_FACIAL_MATCH_THRESHOLD ? 'VERIFIED' : 'REJECTED';

    return this.prisma.verification.update({
      where: { id: verification.id },
      data: {
        renaperResult: result.rawResponse,
        facialMatchScore: result.facialMatchScore,
        status: newStatus,
        verifiedAt: newStatus === 'VERIFIED' ? new Date() : null,
        rejectedReason:
          newStatus === 'REJECTED'
            ? `Puntaje de coincidencia facial insuficiente: ${result.facialMatchScore.toFixed(2)}`
            : null,
      },
    });
  }

  async getStatus(userId: string) {
    const verification = await this.prisma.verification.findUnique({ where: { userId } });
    if (!verification) {
      throw new NotFoundException('No se encontró un proceso de verificación para este usuario.');
    }
    return verification;
  }

  private async getOrCreate(userId: string) {
    const existing = await this.prisma.verification.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.verification.create({ data: { userId, status: 'PENDING' } });
  }
}
