import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock helper para PrismaService — cada test inyecta los mocks que necesita.
type PrismaMock = {
  user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  session: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock };
  auditLog: { create: jest.Mock };
  $transaction: jest.Mock;
};

const prismaMock = (): PrismaMock => ({
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  session: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn((cb: (p: unknown) => unknown) => cb(prisma)),
});

let prisma: PrismaMock;
let service: AuthService;
let jwt: JwtService;
let config: ConfigService;

beforeEach(async () => {
  prisma = prismaMock();
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: prisma },
      {
        provide: JwtService,
        useValue: {
          signAsync: jest.fn().mockResolvedValue('fake.jwt.token'),
          verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', email: 'a@b.com', role: 'TENANT' }),
        },
      },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) => {
            const cfg: Record<string, string> = {
              'app.jwt.secret': 'test-secret',
              'app.jwt.expiresIn': '15m',
              'app.jwt.refreshSecret': 'test-refresh-secret',
              'app.jwt.refreshExpiresIn': '7d',
              'app.webUrl': 'http://localhost:3000',
            };
            return cfg[key];
          }),
        },
      },
    ],
  }).compile();

  service = module.get(AuthService);
  jwt = module.get(JwtService);
  config = module.get(ConfigService);
});

describe('AuthService', () => {
  describe('register', () => {
    it('rechaza email duplicado con ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'existe@test.com' });

      await expect(
        service.register({
          email: 'existe@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          phone: '+5491100000000',
          address: 'Calle Falsa 123',
          city: 'Buenos Aires',
          role: 'TENANT' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea usuario nuevo con password hasheado y genera tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u-new',
        email: 'nuevo@test.com',
        firstName: 'Nuevo',
        lastName: 'Test',
        role: 'TENANT',
        createdAt: new Date(),
      });
      prisma.session.create.mockResolvedValue({});

      const result = await service.register({
        email: 'nuevo@test.com',
        password: 'Password123!',
        firstName: 'Nuevo',
        lastName: 'Test',
        phone: '+5491100000000',
        address: 'Calle Falsa 123',
        city: 'Buenos Aires',
        role: 'TENANT' as any,
      });

      expect(result.user.email).toBe('nuevo@test.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // El password hasheado nunca debe coincidir con el plano
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('Password123!');
      expect(createCall.data.passwordHash.startsWith('$2')).toBe(true); // bcrypt prefix
    });
  });

  describe('validateUser', () => {
    it('devuelve null si el email no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const user = await service.validateUser('noexiste@test.com', 'anything');
      expect(user).toBeNull();
    });

    it('devuelve null si la password es incorrecta', async () => {
      const hash = await bcrypt.hash('CorrectPass1!', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1', email: 'a@b.com', passwordHash: hash, isActive: true, role: 'TENANT',
      });
      const user = await service.validateUser('a@b.com', 'WrongPass1!');
      expect(user).toBeNull();
    });

    it('devuelve usuario si la password es correcta', async () => {
      const hash = await bcrypt.hash('Pass123!', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1', email: 'a@b.com', passwordHash: hash, isActive: true, role: 'TENANT',
      });
      const user = await service.validateUser('a@b.com', 'Pass123!');
      expect(user).toMatchObject({ id: 'u-1', email: 'a@b.com', role: 'TENANT' });
    });

    it('rechaza usuario inactivo', async () => {
      const hash = await bcrypt.hash('Pass123!', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1', email: 'a@b.com', passwordHash: hash, isActive: false, role: 'TENANT',
      });
      const user = await service.validateUser('a@b.com', 'Pass123!');
      expect(user).toBeNull();
    });
  });

  describe('forgotPassword', () => {
    it('responde el mismo mensaje incluso si el email no existe (anti-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const r = await service.forgotPassword('noexiste@test.com');
      expect(r.message).toContain('Si el email está registrado');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('genera y persiste un token con TTL 1h cuando el email existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'a@b.com' });
      prisma.user.update.mockResolvedValue({});

      await service.forgotPassword('a@b.com');

      expect(prisma.user.update).toHaveBeenCalled();
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.resetToken).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex
      expect(updateCall.data.resetTokenExp).toBeInstanceOf(Date);

      const diffMs = updateCall.data.resetTokenExp.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(59 * 60 * 1000); // ≥ 59 minutos
      expect(diffMs).toBeLessThanOrEqual(60 * 60 * 1000 + 100); // ≤ 1 hora
    });
  });

  describe('resetPassword', () => {
    it('rechaza token inexistente con UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword('badtoken', 'NewPass1!')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza token expirado con UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        resetToken: 'valid-but-old',
        resetTokenExp: new Date(Date.now() - 1000), // expirado hace 1 segundo
      });
      await expect(service.resetPassword('valid-but-old', 'NewPass1!')).rejects.toThrow(UnauthorizedException);
    });

    it('actualiza password, limpia el token y borra todas las sesiones', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        resetToken: 'valid-token',
        resetTokenExp: new Date(Date.now() + 3600000),
      });
      prisma.user.update.mockResolvedValue({});
      prisma.session.deleteMany.mockResolvedValue({ count: 3 });

      const r = await service.resetPassword('valid-token', 'NewPass1!');

      expect(r.message).toContain('Contraseña actualizada');

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).not.toBe('NewPass1!');
      expect(updateCall.data.passwordHash.startsWith('$2')).toBe(true);
      expect(updateCall.data.resetToken).toBeNull();
      expect(updateCall.data.resetTokenExp).toBeNull();

      // Por seguridad invalidamos sesiones existentes
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    });
  });
});
