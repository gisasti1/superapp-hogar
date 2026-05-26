import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertAgencyDto {
  agencyName: string;
  cuit?: string;
  licenseNumber?: string;
  licenseAuthority?: string;
  licenseExpiry?: string;   // ISO date string
  description?: string;
  cities?: string[];
  phone?: string;
  website?: string;
}

@Injectable()
export class RealtorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Obtener o crear el perfil de agencia del usuario autenticado */
  async getMyAgency(userId: string) {
    return this.prisma.realEstateAgency.findUnique({
      where: { userId },
    });
  }

  /** Upsert — crea o actualiza el perfil de agencia */
  async upsertMyAgency(userId: string, dto: UpsertAgencyDto) {
    if (!dto.agencyName?.trim()) {
      throw new BadRequestException('El nombre de la agencia es obligatorio');
    }

    const data = {
      agencyName: dto.agencyName.trim(),
      cuit: dto.cuit?.trim() || null,
      licenseNumber: dto.licenseNumber?.trim() || null,
      licenseAuthority: dto.licenseAuthority?.trim() || null,
      licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
      description: dto.description?.trim() || null,
      cities: dto.cities ?? [],
      phone: dto.phone?.trim() || null,
      website: dto.website?.trim() || null,
    };

    return this.prisma.realEstateAgency.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  /** Propiedades publicadas de la agencia */
  async getMyListings(userId: string) {
    return this.prisma.property.findMany({
      where: { ownerId: userId },
      include: {
        listing: true,
        _count: { select: { rentalRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Contratos donde la agencia es el landlord */
  async getMyContracts(userId: string) {
    return this.prisma.contract.findMany({
      where: { landlordId: userId },
      include: {
        property: { select: { address: true, city: true } },
        tenant: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Subir logo de agencia */
  async updateLogo(userId: string, logoUrl: string) {
    const agency = await this.prisma.realEstateAgency.findUnique({ where: { userId } });
    if (!agency) throw new NotFoundException('Perfil de agencia no encontrado. Completá los datos primero.');
    return this.prisma.realEstateAgency.update({
      where: { userId },
      data: { logoUrl },
    });
  }

  /** Recomputa listingCount en la agencia (se llama después de publicar/despublicar) */
  async refreshListingCount(userId: string) {
    const count = await this.prisma.property.count({
      where: {
        ownerId: userId,
        listing: { isPublished: true },
      },
    });
    await this.prisma.realEstateAgency.updateMany({
      where: { userId },
      data: { listingCount: count },
    });
  }
}
