import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';

type PrismaMock = {
  payment: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  contract: { findMany: jest.Mock };
};

let prisma: PrismaMock;
let service: PaymentsService;
let mp: { createPreference: jest.Mock };

beforeEach(async () => {
  prisma = {
    payment: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    contract: { findMany: jest.fn() },
  };
  mp = { createPreference: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      PaymentsService,
      { provide: PrismaService, useValue: prisma },
      { provide: MercadoPagoService, useValue: mp },
      { provide: ConfigService, useValue: { get: jest.fn() } },
      { provide: EventEmitter2, useValue: { emit: jest.fn() } },
    ],
  }).compile();
  service = module.get(PaymentsService);
});

describe('PaymentsService', () => {
  describe('listByUser', () => {
    it('busca pagos donde el usuario es payer o receiver', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      await service.listByUser('u-1');
      const where = prisma.payment.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ OR: [{ payerId: 'u-1' }, { receiverId: 'u-1' }] });
    });
  });

  describe('getById', () => {
    it('rechaza pago inexistente', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getById('no-existe', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el usuario no es payer ni receiver', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p-1', payerId: 'tenant-1', receiverId: 'landlord-1',
      });
      await expect(service.getById('p-1', 'otro-user')).rejects.toThrow(ForbiddenException);
    });

    it('devuelve el pago si el usuario es payer', async () => {
      const p = { id: 'p-1', payerId: 'tenant-1', receiverId: 'landlord-1' };
      prisma.payment.findUnique.mockResolvedValue(p);
      expect(await service.getById('p-1', 'tenant-1')).toEqual(p);
    });

    it('devuelve el pago si el usuario es receiver', async () => {
      const p = { id: 'p-1', payerId: 'tenant-1', receiverId: 'landlord-1' };
      prisma.payment.findUnique.mockResolvedValue(p);
      expect(await service.getById('p-1', 'landlord-1')).toEqual(p);
    });
  });

  describe('createPaymentPreference', () => {
    it('rechaza si el pago no existe', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.createPaymentPreference('no', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el usuario no es el payer (solo el payer puede iniciar el pago)', async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: 'p-1', payerId: 'tenant-1' });
      await expect(service.createPaymentPreference('p-1', 'otro')).rejects.toThrow(ForbiddenException);
    });

    it('devuelve initPoint cuando el payer inicia el pago', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p-1', payerId: 'tenant-1', amount: 100, type: 'RENT',
      });
      mp.createPreference.mockResolvedValue({ id: 'pref-1', initPoint: 'https://mp.test/pay' });
      prisma.payment.update.mockResolvedValue({});

      const r = await service.createPaymentPreference('p-1', 'tenant-1');
      expect(r.initPoint).toBe('https://mp.test/pay');
    });
  });
});
