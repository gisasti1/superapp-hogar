import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@superapphogar.com' },
    update: {},
    create: {
      email: 'admin@superapphogar.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'SuperApp',
      role: UserRole.ADMIN,
      subscription: { create: { plan: 'PREMIUM', status: 'ACTIVE' } },
    },
  });

  const landlord = await prisma.user.upsert({
    where: { email: 'propietario@test.com' },
    update: {},
    create: {
      email: 'propietario@test.com',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'Propietario',
      phone: '+5491112345678',
      role: UserRole.LANDLORD,
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
    },
  });

  const tenant = await prisma.user.upsert({
    where: { email: 'inquilino@test.com' },
    update: {},
    create: {
      email: 'inquilino@test.com',
      passwordHash,
      firstName: 'Ana',
      lastName: 'Inquilina',
      phone: '+5491187654321',
      role: UserRole.TENANT,
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
    },
  });

  const property = await prisma.property.upsert({
    where: { id: 'seed-property-1' },
    update: {},
    create: {
      id: 'seed-property-1',
      ownerId: landlord.id,
      address: 'Av. Corrientes 1234, Piso 3 Dto B',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      rooms: 2,
      bathrooms: 1,
      squareMeters: 65,
      monthlyRent: 350000,
      currency: 'ARS',
      description: 'Departamento luminoso en Palermo, cerca del subte B.',
    },
  });

  console.log({ admin: admin.email, landlord: landlord.email, tenant: tenant.email, property: property.id });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
