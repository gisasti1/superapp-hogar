import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DocuSignService } from './docusign.service';
import { S3Service } from '../../common/services/s3.service';

type PrismaMock = {
  contract: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  property: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  contractSignature: { create: jest.Mock; findUnique: jest.Mock };
  payment: { createMany: jest.Mock };
  $transaction: jest.Mock;
};

const prismaMock = (): PrismaMock => ({
  contract: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  property: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  contractSignature: { create: jest.fn(), findUnique: jest.fn() },
  payment: { createMany: jest.fn() },
  $transaction: jest.fn(),
});

let prisma: PrismaMock;
let service: ContractsService;

beforeEach(async () => {
  prisma = prismaMock();
  const module = await Test.createTestingModule({
    providers: [
      ContractsService,
      { provide: PrismaService, useValue: prisma },
      { provide: DocuSignService, useValue: { createEnvelope: jest.fn().mockResolvedValue('env-1') } },
      { provide: S3Service, useValue: { uploadFile: jest.fn().mockResolvedValue('https://s3.mock/file') } },
      { provide: ConfigService, useValue: { get: jest.fn() } },
      { provide: EventEmitter2, useValue: { emit: jest.fn() } },
    ],
  }).compile();
  service = module.get(ContractsService);
});

describe('ContractsService', () => {
  describe('getById', () => {
    it('rechaza si el contrato no existe', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.getById('no-existe', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el usuario no es parte del contrato', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: 'c-1', tenantId: 'tenant-1', landlordId: 'landlord-1',
      });
      await expect(service.getById('c-1', 'otro-user')).rejects.toThrow(ForbiddenException);
    });

    it('devuelve el contrato si el usuario es tenant', async () => {
      const c = { id: 'c-1', tenantId: 'tenant-1', landlordId: 'landlord-1' };
      prisma.contract.findUnique.mockResolvedValue(c);
      const r = await service.getById('c-1', 'tenant-1');
      expect(r).toEqual(c);
    });

    it('devuelve el contrato si el usuario es landlord', async () => {
      const c = { id: 'c-1', tenantId: 'tenant-1', landlordId: 'landlord-1' };
      prisma.contract.findUnique.mockResolvedValue(c);
      const r = await service.getById('c-1', 'landlord-1');
      expect(r).toEqual(c);
    });
  });

  describe('listByUser', () => {
    it('busca contratos donde el usuario es tenant o landlord', async () => {
      prisma.contract.findMany.mockResolvedValue([]);
      await service.listByUser('u-1');
      const call = prisma.contract.findMany.mock.calls[0][0];
      expect(call.where).toEqual({
        OR: [{ tenantId: 'u-1' }, { landlordId: 'u-1' }],
      });
    });
  });
});
