import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole, VerificationStatus } from '@superapp/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Genera un token de reset y lo persiste con TTL 1h.
   * Devuelve siempre 200 (no revela si el email existe — anti-enumeration).
   * En desarrollo loguea el link a la consola del API.
   * En producción mandaría email vía Sendgrid.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExp: expires },
      });

      const webUrl = this.config.get<string>('app.webUrl') ?? 'http://localhost:3000';
      const link = `${webUrl}/reset-password?token=${token}`;

      // TODO: mandar email real vía Sendgrid cuando haya SENDGRID_API_KEY
      this.logger.warn(`📧 Reset link para ${email}: ${link}`);
    }

    return {
      message: 'Si el email está registrado, vas a recibir un link para resetear tu contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    // Invalidar todas las sesiones existentes por seguridad
    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    return { message: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.' };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        role: dto.role as unknown as import('@superapp/database').UserRole,
        verification: {
          create: { status: 'PENDING' },
        },
        subscription: {
          create: { plan: 'FREE', status: 'ACTIVE' },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        role: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        resource: 'user',
        resourceId: user.id,
        newValue: { email: user.email, role: user.role },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role as unknown as UserRole);
    return { user, ...tokens };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    return user;
  }

  async login(userId: string, email: string, role: string, userAgent?: string, ipAddress?: string) {
    const tokens = await this.generateTokens(userId, email, role as UserRole);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: tokens.refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_LOGIN',
        resource: 'session',
        ipAddress,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        verification: { select: { status: true } },
        subscription: { select: { plan: true, status: true } },
      },
    });

    return { user, ...tokens };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Sesión expirada');
    }

    const tokens = await this.generateTokens(
      session.user.id,
      session.user.email,
      session.user.role as unknown as UserRole,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        verification: { select: { status: true, verifiedAt: true } },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('app.jwt.secret'),
        expiresIn: this.config.get('app.jwt.expiresIn'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('app.jwt.refreshSecret'),
        expiresIn: this.config.get('app.jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
