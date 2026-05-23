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
      // No tirar 404 — el usuario nuevo aún no inició KYC; devolver estado por defecto.
      return { status: 'PENDING' as const, verifiedAt: null };
    }
    return verification;
  }

  /**
   * Verificación rápida pensada para entornos de DEMO / desarrollo:
   * el usuario sólo declara su DNI y el sistema lo marca como VERIFIED
   * sin requerir subir DNI ni selfie. Bloqueada cuando hay API key real
   * de RENAPER configurada (ahí debe usarse el flujo completo).
   */
  async quickVerify(userId: string, dni: string) {
    if (process.env.RENAPER_API_KEY) {
      throw new BadRequestException(
        'Verificación rápida deshabilitada en producción. Usá el flujo con DNI + selfie.',
      );
    }
    if (!/^\d{7,9}$/.test(dni)) {
      throw new BadRequestException('DNI inválido. Debe contener entre 7 y 9 dígitos.');
    }

    // Verificar que ningún otro usuario ya tenga ese DNI
    const existing = await this.prisma.user.findFirst({
      where: { dni, NOT: { id: userId } },
    });
    if (existing) {
      throw new BadRequestException('Ese DNI ya está registrado en otra cuenta.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { dni },
    });

    const verification = await this.getOrCreate(userId);

    return this.prisma.verification.update({
      where: { id: verification.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        facialMatchScore: 0.99,
        renaperResult: { mode: 'quick-verify', timestamp: new Date().toISOString() },
        rejectedReason: null,
      },
    });
  }

  private async getOrCreate(userId: string) {
    const existing = await this.prisma.verification.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.verification.create({ data: { userId, status: 'PENDING' } });
  }
}
