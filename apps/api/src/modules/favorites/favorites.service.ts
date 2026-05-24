import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista las propiedades favoritas del usuario con el listing y la primera foto.
   * El cliente las usa para renderizar la página /favorites.
   */
  async list(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
            listing: { select: { id: true, isPublished: true } },
          },
        },
      },
    });
    return favorites;
  }

  /**
   * Devuelve sólo los IDs de propiedades favoriteadas. Lo usa el detalle de
   * listing para saber si pintar el corazón lleno o vacío sin traer todo el objeto.
   */
  async listIds(userId: string): Promise<string[]> {
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return favs.map(f => f.propertyId);
  }

  async add(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Propiedad no encontrada.');

    // upsert idempotente — si ya está, no rompe
    return this.prisma.favorite.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      update: {},
      create: { userId, propertyId },
    });
  }

  async remove(userId: string, propertyId: string) {
    // Si no existe el favorito no es error — la acción es idempotente
    await this.prisma.favorite.deleteMany({
      where: { userId, propertyId },
    });
    return { removed: true };
  }

  /**
   * Toggle es lo que más vamos a llamar desde la UI: un solo endpoint que
   * agrega o quita según corresponda. Devuelve el estado final.
   */
  async toggle(userId: string, propertyId: string): Promise<{ favorited: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.add(userId, propertyId);
    return { favorited: true };
  }
}
