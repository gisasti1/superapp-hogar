/**
 * Seed mínimo para producción.
 * Crea solamente el usuario admin si no existe. Tomá la password
 * desde ADMIN_PASSWORD env var; si no está, falla y aborta.
 *
 * Uso:
 *   ADMIN_EMAIL="admin@tu-dominio.com" ADMIN_PASSWORD="..." \
 *   ADMIN_FIRST_NAME="Nombre" ADMIN_LAST_NAME="Apellido" \
 *   ts-node prisma/seed.prod.ts
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME ?? 'SuperApp';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL y ADMIN_PASSWORD son requeridos.');
    console.error('   Uso: ADMIN_EMAIL="x@y.com" ADMIN_PASSWORD="..." ts-node prisma/seed.prod.ts');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD debe tener al menos 12 caracteres.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin ${email} ya existe — no se crea de nuevo.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.ADMIN,
      subscription: { create: { plan: 'PREMIUM', status: 'ACTIVE' } },
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
    },
  });

  console.log(`✓ Admin creado: ${admin.email} (id: ${admin.id})`);
  console.log('  Ahora podés entrar a la app y empezar a usar el sistema.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
