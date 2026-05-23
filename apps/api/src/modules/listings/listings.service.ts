import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: SearchListingsDto) {
    const page = filters.page ?? 1;
    const skip = (page - 1) * DEFAULT_PAGE_SIZE;

    const propertyWhere: {
      isActive: boolean;
      city?: { contains: string; mode: 'insensitive' };
      rooms?: { gte: number };
      monthlyRent?: { lte: number };
      expenses?: { lte: number };
      currency?: string;
      petsAllowed?: boolean;
      amenities?: { hasEvery: string[] };
    } = { isActive: true };

    if (filters.city) propertyWhere.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.minRooms !== undefined) propertyWhere.rooms = { gte: filters.minRooms };
    if (filters.maxRent !== undefined) propertyWhere.monthlyRent = { lte: filters.maxRent };
    if (filters.maxExpenses !== undefined) propertyWhere.expenses = { lte: filters.maxExpenses };
    if (filters.currency) propertyWhere.currency = filters.currency;
    if (filters.petsAllowed !== undefined) propertyWhere.petsAllowed = filters.petsAllowed;
    if (filters.amenities?.length) propertyWhere.amenities = { hasEvery: filters.amenities };

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: {
          isPublished: true,
          property: propertyWhere,
        },
        skip,
        take: DEFAULT_PAGE_SIZE,
        orderBy: { views: 'desc' },
        include: {
          property: {
            include: { images: { orderBy: { order: 'asc' }, take: 1 } },
          },
        },
      }),
      this.prisma.listing.count({
        where: {
          isPublished: true,
          property: propertyWhere,
        },
      }),
    ]);

    return {
      data: listings,
      pagination: {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / DEFAULT_PAGE_SIZE),
      },
    };
  }

  async getById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            images: { orderBy: { order: 'asc' } },
            owner: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!listing) throw new NotFoundException('Publicación no encontrada.');

    // Increment views asynchronously
    this.incrementViews(id).catch(() => null);

    return listing;
  }

  async createProperty(userId: string, dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        ownerId: userId,
        address: dto.address,
        city: dto.city,
        province: dto.province ?? 'Buenos Aires',
        rooms: dto.rooms,
        bathrooms: dto.bathrooms,
        squareMeters: dto.squareMeters,
        monthlyRent: dto.monthlyRent,
        expenses: dto.expenses,
        currency: dto.currency ?? 'ARS',
        description: dto.description,
        petsAllowed: dto.petsAllowed ?? false,
        amenities: dto.amenities ?? [],
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async updateProperty(userId: string, id: string, dto: Partial<CreatePropertyDto>) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('No tenés permiso para editar esta propiedad.');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        ...(dto.address && { address: dto.address }),
        ...(dto.city && { city: dto.city }),
        ...(dto.province && { province: dto.province }),
        ...(dto.rooms !== undefined && { rooms: dto.rooms }),
        ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
        ...(dto.squareMeters !== undefined && { squareMeters: dto.squareMeters }),
        ...(dto.monthlyRent !== undefined && { monthlyRent: dto.monthlyRent }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async publishListing(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('No tenés permiso para publicar esta propiedad.');
    }

    const existing = await this.prisma.listing.findUnique({ where: { propertyId } });

    if (existing) {
      return this.prisma.listing.update({
        where: { propertyId },
        data: { isPublished: true },
      });
    }

    return this.prisma.listing.create({
      data: {
        propertyId,
        title: `${property.rooms} ambientes en ${property.city}`,
        isPublished: true,
      },
    });
  }

  async getMyProperties(userId: string) {
    return this.prisma.property.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        listing: { select: { id: true, isPublished: true, views: true } },
      },
    });
  }

  async incrementViews(listingId: string) {
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { views: { increment: 1 } },
    });
  }

  async unpublishListing(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { listing: true },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('No podés despublicar esta propiedad.');
    }
    if (!property.listing) {
      return { isPublished: false };
    }
    return this.prisma.listing.update({
      where: { id: property.listing.id },
      data: { isPublished: false },
    });
  }

  async deleteProperty(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { contracts: { where: { status: { in: ['ACTIVE', 'PENDING_SIGNATURES', 'SIGNED'] } } } },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('No podés eliminar esta propiedad.');
    }
    if (property.contracts.length > 0) {
      throw new ForbiddenException(
        'No podés eliminar una propiedad con contratos activos. Primero finalizá los contratos.',
      );
    }
    // Soft delete: marca isActive=false y despublica el listing
    await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id: propertyId },
        data: { isActive: false },
      }),
      this.prisma.listing.updateMany({
        where: { propertyId },
        data: { isPublished: false },
      }),
    ]);
    return { deleted: true };
  }

  async addImages(userId: string, propertyId: string, urls: string[]) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: { select: { order: true } } },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('No podés editar esta propiedad.');
    }

    const startOrder = Math.max(0, ...property.images.map(i => i.order + 1));
    const created = await this.prisma.$transaction(
      urls.map((url, i) =>
        this.prisma.propertyImage.create({
          data: { propertyId, url, order: startOrder + i },
        }),
      ),
    );
    return { uploaded: created.length, images: created };
  }

  async deleteImage(userId: string, propertyId: string, imageId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');
    if (property.ownerId !== userId) {
      throw new ForbiddenException('No podés editar esta propiedad.');
    }

    await this.prisma.propertyImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }
}
