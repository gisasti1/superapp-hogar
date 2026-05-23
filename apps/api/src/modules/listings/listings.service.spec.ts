import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaMock = {
  listing: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock; update: jest.Mock; upsert: jest.Mock };
  property: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  propertyImage: { create: jest.Mock; delete: jest.Mock };
  $transaction: jest.Mock;
};

const prismaMock = (): PrismaMock => ({
  listing: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  property: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  propertyImage: { create: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
});

let prisma: PrismaMock;
let service: ListingsService;

beforeEach(async () => {
  prisma = prismaMock();
  const module: TestingModule = await Test.createTestingModule({
    providers: [ListingsService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  service = module.get(ListingsService);
});

describe('ListingsService', () => {
  describe('search', () => {
    it('filtra por ciudad (case insensitive con contains)', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(0);

      await service.search({ city: 'BUENOS aires' });

      const findCall = prisma.listing.findMany.mock.calls[0][0];
      expect(findCall.where.property.city).toEqual({ contains: 'BUENOS aires', mode: 'insensitive' });
    });

    it('aplica todos los filtros avanzados en el where', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(0);

      await service.search({
        minRooms: 2,
        maxRent: 500000,
        maxExpenses: 50000,
        petsAllowed: true,
        amenities: ['pool', 'gym'],
      });

      const where = prisma.listing.findMany.mock.calls[0][0].where.property;
      expect(where.rooms).toEqual({ gte: 2 });
      expect(where.monthlyRent).toEqual({ lte: 500000 });
      expect(where.expenses).toEqual({ lte: 50000 });
      expect(where.petsAllowed).toBe(true);
      expect(where.amenities).toEqual({ hasEvery: ['pool', 'gym'] });
    });

    it('pagina correctamente (page 2 = skip 20)', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(45);

      const r = await service.search({ page: 2 });

      expect(prisma.listing.findMany.mock.calls[0][0].skip).toBe(20);
      expect(r.pagination.page).toBe(2);
      expect(r.pagination.total).toBe(45);
      expect(r.pagination.totalPages).toBe(3);
    });
  });

  describe('createProperty', () => {
    it('crea propiedad con amenities, mascotas y coordenadas', async () => {
      prisma.property.create.mockResolvedValue({ id: 'new-prop' });

      await service.createProperty('owner-1', {
        address: 'Calle 123',
        city: 'CABA',
        rooms: 2,
        bathrooms: 1,
        squareMeters: 60,
        monthlyRent: 300000,
        petsAllowed: true,
        amenities: ['pool', 'gym'],
        latitude: -34.6,
        longitude: -58.4,
      });

      const data = prisma.property.create.mock.calls[0][0].data;
      expect(data.ownerId).toBe('owner-1');
      expect(data.petsAllowed).toBe(true);
      expect(data.amenities).toEqual(['pool', 'gym']);
      expect(data.latitude).toBe(-34.6);
      expect(data.longitude).toBe(-58.4);
    });

    it('aplica defaults cuando faltan campos opcionales', async () => {
      prisma.property.create.mockResolvedValue({ id: 'new-prop' });

      await service.createProperty('owner-1', {
        address: 'X', city: 'X', rooms: 1, bathrooms: 1, squareMeters: 30, monthlyRent: 100000,
      } as any);

      const data = prisma.property.create.mock.calls[0][0].data;
      expect(data.province).toBe('Buenos Aires');
      expect(data.currency).toBe('ARS');
      expect(data.petsAllowed).toBe(false);
      expect(data.amenities).toEqual([]);
    });
  });

  describe('publishListing', () => {
    it('rechaza si la propiedad no existe', async () => {
      prisma.property.findUnique.mockResolvedValue(null);
      await expect(service.publishListing('u-1', 'no-existe')).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el usuario no es el dueño', async () => {
      prisma.property.findUnique.mockResolvedValue({ id: 'p-1', ownerId: 'otro-user' });
      await expect(service.publishListing('u-1', 'p-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addImages', () => {
    it('rechaza si el usuario no es el dueño', async () => {
      prisma.property.findUnique.mockResolvedValue({ ownerId: 'otro', images: [] });
      await expect(
        service.addImages('user-1', 'prop-1', ['/uploads/x.jpg']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('asigna order incremental empezando desde max(existentes)+1', async () => {
      prisma.property.findUnique.mockResolvedValue({
        ownerId: 'user-1',
        images: [{ order: 0 }, { order: 1 }, { order: 2 }],
      });
      prisma.$transaction.mockImplementation((promises: any) => Promise.all(promises));
      prisma.propertyImage.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'img-' + data.order, ...data }),
      );

      const r = await service.addImages('user-1', 'prop-1', ['/u/a.jpg', '/u/b.jpg']);

      expect(r.uploaded).toBe(2);
      // los nuevos deben tener order 3 y 4 (max=2, +1 = 3)
      const calls = prisma.propertyImage.create.mock.calls;
      expect(calls[0][0].data.order).toBe(3);
      expect(calls[1][0].data.order).toBe(4);
    });
  });

  describe('deleteImage', () => {
    it('rechaza si la propiedad no existe', async () => {
      prisma.property.findUnique.mockResolvedValue(null);
      await expect(service.deleteImage('u', 'p', 'i')).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el usuario no es el dueño', async () => {
      prisma.property.findUnique.mockResolvedValue({ ownerId: 'otro' });
      await expect(service.deleteImage('user-1', 'p-1', 'img-1')).rejects.toThrow(ForbiddenException);
    });

    it('elimina la imagen si el dueño coincide', async () => {
      prisma.property.findUnique.mockResolvedValue({ ownerId: 'user-1' });
      prisma.propertyImage.delete.mockResolvedValue({ id: 'img-1' });

      const r = await service.deleteImage('user-1', 'p-1', 'img-1');

      expect(r.deleted).toBe(true);
      expect(prisma.propertyImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
    });
  });
});
