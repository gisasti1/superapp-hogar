import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ── Usuarios ────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@superapphogar.com' },
    update: {},
    create: {
      email: 'admin@superapphogar.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'SuperApp',
      role: UserRole.ADMIN,
      subscription: { create: { plan: 'PREMIUM', status: 'ACTIVE' } },
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
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
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
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
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
    },
  });

  // ── Propiedades publicadas ──────────────────────────────────────────
  const PROPERTIES = [
    {
      id: 'seed-property-1',
      address: 'Av. Corrientes 1234, Piso 3 Dto B',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      rooms: 2,
      bathrooms: 1,
      squareMeters: 65,
      monthlyRent: 350000,
      expenses: 38000,
      description: 'Departamento luminoso en Palermo, cerca del subte B. Cocina equipada, balcón con vista al parque.',
      title: 'Hermoso 2 ambientes en Palermo',
      petsAllowed: true,
      amenities: ['balcony', 'laundry', 'doorman'],
      latitude: -34.6037,
      longitude: -58.3816,
    },
    {
      id: 'seed-property-2',
      address: 'Av. Cabildo 2400, Piso 5 Dto A',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      rooms: 3,
      bathrooms: 2,
      squareMeters: 90,
      monthlyRent: 520000,
      expenses: 65000,
      description: 'Amplio 3 ambientes en Belgrano. Edificio con amenities: pileta, gimnasio, parrilla.',
      title: '3 ambientes con amenities en Belgrano',
      petsAllowed: false,
      amenities: ['pool', 'gym', 'bbq', 'parking', 'doorman', 'laundry'],
      latitude: -34.5615,
      longitude: -58.4567,
    },
    {
      id: 'seed-property-3',
      address: 'Calle 50 entre 12 y 13',
      city: 'La Plata',
      province: 'Buenos Aires',
      rooms: 1,
      bathrooms: 1,
      squareMeters: 40,
      monthlyRent: 220000,
      expenses: 18000,
      description: 'Monoambiente ideal para estudiantes. A 3 cuadras de la UNLP.',
      title: 'Monoambiente cerca de la UNLP',
      petsAllowed: false,
      amenities: ['laundry'],
      latitude: -34.9215,
      longitude: -57.9545,
    },
    {
      id: 'seed-property-4',
      address: 'Av. Colón 580, Torre 2 Dto 1402',
      city: 'Córdoba',
      province: 'Córdoba',
      rooms: 2,
      bathrooms: 1,
      squareMeters: 70,
      monthlyRent: 290000,
      expenses: 42000,
      description: 'Departamento moderno en Nueva Córdoba con vista panorámica.',
      title: '2 ambientes en Nueva Córdoba',
      petsAllowed: true,
      amenities: ['pool', 'gym', 'parking', 'balcony'],
      latitude: -31.4135,
      longitude: -64.1811,
    },
    {
      id: 'seed-property-5',
      address: 'San Martín 1234',
      city: 'Mendoza',
      province: 'Mendoza',
      rooms: 4,
      bathrooms: 2,
      squareMeters: 130,
      monthlyRent: 680000,
      expenses: 0,
      description: 'Casa con jardín y cochera. Barrio tranquilo, cerca de bodegas.',
      title: 'Casa familiar con jardín',
      petsAllowed: true,
      amenities: ['parking', 'garden', 'bbq'],
      latitude: -32.8908,
      longitude: -68.8272,
    },
  ];

  for (const p of PROPERTIES) {
    const { title, ...propertyData } = p;
    await prisma.property.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...propertyData,
        ownerId: landlord.id,
        currency: 'ARS',
        listing: { create: { title, isPublished: true } },
      },
    });
  }

  // ── Contrato activo (firmado) entre el landlord y tenant ───────────
  const contract = await prisma.contract.upsert({
    where: { id: 'seed-contract-1' },
    update: {},
    create: {
      id: 'seed-contract-1',
      propertyId: 'seed-property-1',
      tenantId: tenant.id,
      landlordId: landlord.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2028-01-01'),
      monthlyAmount: 350000,
      depositAmount: 350000,
      currency: 'ARS',
      status: 'ACTIVE',
      signedAt: new Date('2025-12-28'),
      pdfUrl: 'https://example.com/contracts/seed-contract-1.pdf',
      signatures: {
        create: [
          { userId: tenant.id, role: 'TENANT', signedAt: new Date('2025-12-28') },
          { userId: landlord.id, role: 'LANDLORD', signedAt: new Date('2025-12-28') },
        ],
      },
    },
  });

  // ── Pagos del contrato (algunos pagados, uno pendiente) ────────────
  const PAYMENTS = [
    { id: 'seed-payment-1', dueDate: new Date('2026-01-05'), paidAt: new Date('2026-01-04'), status: 'PAID' as const },
    { id: 'seed-payment-2', dueDate: new Date('2026-02-05'), paidAt: new Date('2026-02-03'), status: 'PAID' as const },
    { id: 'seed-payment-3', dueDate: new Date('2026-03-05'), paidAt: new Date('2026-03-05'), status: 'PAID' as const },
    { id: 'seed-payment-4', dueDate: new Date('2026-04-05'), paidAt: new Date('2026-04-06'), status: 'PAID' as const },
    { id: 'seed-payment-5', dueDate: new Date('2026-05-05'), paidAt: new Date('2026-05-05'), status: 'PAID' as const },
    { id: 'seed-payment-6', dueDate: new Date('2026-06-05'), paidAt: null, status: 'PENDING' as const },
  ];

  for (const pay of PAYMENTS) {
    await prisma.payment.upsert({
      where: { id: pay.id },
      update: {},
      create: {
        id: pay.id,
        contractId: contract.id,
        payerId: tenant.id,
        receiverId: landlord.id,
        amount: 350000,
        currency: 'ARS',
        type: 'RENT',
        status: pay.status,
        dueDate: pay.dueDate,
        paidAt: pay.paidAt,
      },
    });
  }

  // ── Depósito en garantía ───────────────────────────────────────────
  await prisma.deposit.upsert({
    where: { contractId: contract.id },
    update: {},
    create: {
      contractId: contract.id,
      userId: tenant.id,
      amount: 350000,
      currency: 'ARS',
      status: 'HELD',
      depositedAt: new Date('2025-12-28'),
      ledgerEntries: {
        create: [
          { description: 'Depósito inicial recibido', credit: 350000, debit: 0, balance: 350000 },
        ],
      },
    },
  });

  // ── Caso de mediación de ejemplo (resuelto) ────────────────────────
  await prisma.mediationCase.upsert({
    where: { id: 'seed-case-1' },
    update: {},
    create: {
      id: 'seed-case-1',
      contractId: contract.id,
      openedById: tenant.id,
      category: 'REPAIRS',
      status: 'RESOLVED',
      summary: 'Pérdida de agua en el baño que el propietario tardó en reparar.',
      resolvedAt: new Date('2026-03-15'),
      statements: {
        create: [
          { userId: tenant.id, content: 'El baño tiene una pérdida que ya reporté hace 3 semanas y no fue reparada.' },
          { userId: landlord.id, content: 'Contacté al plomero pero tuvo demoras. Ya está en agenda para esta semana.' },
        ],
      },
    },
  });

  // ── Notificaciones para el inquilino ───────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: tenant.id, type: 'PAYMENT_DUE', title: 'Próximo pago', body: 'Tu pago de junio vence el 5/6.', isRead: false },
      { userId: tenant.id, type: 'CONTRACT_SIGNED', title: 'Contrato firmado', body: 'Tu contrato está activo hasta 2028-01-01.', isRead: true },
      { userId: tenant.id, type: 'MEDIATION_UPDATE', title: 'Caso resuelto', body: 'Tu reclamo por reparaciones fue resuelto.', isRead: true },
      { userId: landlord.id, type: 'PAYMENT_RECEIVED', title: 'Pago recibido', body: 'Ana pagó el alquiler de mayo.', isRead: false },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Seed completo:');
  console.log('  • 3 usuarios (admin/propietario/inquilino — password: Password123!)');
  console.log('  • 5 propiedades publicadas en distintas ciudades');
  console.log('  • 1 contrato firmado con 6 pagos + depósito + mediación + notificaciones');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
