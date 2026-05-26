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

  // ── Prestador 1: Pedro González — Gasista matriculado (ENARGAS) ────
  const pedro = await prisma.user.upsert({
    where: { email: 'pedro@prestadores.com' },
    update: {},
    create: {
      email: 'pedro@prestadores.com',
      passwordHash,
      firstName: 'Pedro',
      lastName: 'González',
      nickname: 'Pedrito',
      phone: '+5491155667788',
      role: UserRole.PROVIDER,
      marketingEmailConsent: true,
      marketingSmsConsent: true,
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
    },
  });

  await prisma.provider.upsert({
    where: { userId: pedro.id },
    update: {},
    create: {
      userId: pedro.id,
      businessName: 'Pedro González — Gasista Matriculado',
      category: 'GAS',
      description:
        'Instalaciones y reparaciones de gas natural y envasado. Matriculado ENARGAS. ' +
        'Más de 10 años de experiencia en CABA y GBA. Atención de urgencias 24hs.',
      cities: ['Buenos Aires', 'Lanús', 'Avellaneda', 'Lomas de Zamora'],
      rating: 4.8,
      reviewCount: 37,
      isVerified: true,
      isActive: true,
      documentType: 'CUIT',
      documentNumber: '20345678901',
      contactPhone: '+5491155667788',
      payoutMethod: 'BANK_TRANSFER',
      cbu: '0720025888000012345674',
      bankName: 'Santander',
      bankAlias: 'PEDRO.GAS.CABA',
      bankAccountHolder: 'Pedro González',
      bankAccountHolderId: '20345678901',
      payoutVerified: true,
      kycStatus: 'VERIFIED',
      kycSubmittedAt: new Date('2026-01-10'),
      kycReviewedAt: new Date('2026-01-12'),
      licenseStatus: 'VERIFIED',
      licenseNumber: 'MAT-ENARGAS-00123456',
      licenseAuthority: 'ENARGAS',
      licenseExpiry: new Date('2027-12-31'),
      licenseSubmittedAt: new Date('2026-01-10'),
      licenseReviewedAt: new Date('2026-01-12'),
      yearsOfExperience: 11,
      hasInsurance: true,
      insuranceProvider: 'Federación Patronal',
      insurancePolicyNumber: 'FP-RC-2026-004421',
      insuranceExpiry: new Date('2026-12-31'),
      emergency24h: true,
      hourlyRate: 8500,
      calloutFee: 4000,
      serviceRadiusKm: 30,
      onboardingCompleted: true,
    },
  });

  // ── Prestadora 2: Lucía Fernández — Limpieza del hogar ─────────────
  const lucia = await prisma.user.upsert({
    where: { email: 'lucia@prestadores.com' },
    update: {},
    create: {
      email: 'lucia@prestadores.com',
      passwordHash,
      firstName: 'Lucía',
      lastName: 'Fernández',
      nickname: 'Lu',
      phone: '+5491133445566',
      role: UserRole.PROVIDER,
      marketingEmailConsent: true,
      marketingSmsConsent: false,
      subscription: { create: { plan: 'PREMIUM', status: 'ACTIVE' } },
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
    },
  });

  const luciaProvider = await prisma.provider.upsert({
    where: { userId: lucia.id },
    update: {},
    create: {
      userId: lucia.id,
      businessName: 'Lu Hogar — Limpieza Profesional',
      category: 'CLEANER',
      description:
        'Servicio de limpieza profunda, mantenimiento y orden para hogares y oficinas. ' +
        'También mudanzas y post-obra. Productos incluidos. Trabajo en equipo de 2 personas.',
      cities: ['Buenos Aires', 'Vicente López', 'San Isidro'],
      rating: 4.9,
      reviewCount: 94,
      isVerified: true,
      isActive: true,
      documentType: 'DNI',
      documentNumber: '33987654',
      contactPhone: '+5491133445566',
      payoutMethod: 'CVU',
      cvu: '0000003100025678901234',
      bankAlias: 'LU.HOGAR.MP',
      bankAccountHolder: 'Lucía Fernández',
      bankAccountHolderId: '27339876543',
      payoutVerified: true,
      kycStatus: 'VERIFIED',
      kycSubmittedAt: new Date('2025-11-05'),
      kycReviewedAt: new Date('2025-11-07'),
      licenseStatus: 'NOT_REQUIRED',
      yearsOfExperience: 6,
      hasInsurance: false,
      emergency24h: false,
      hourlyRate: 4500,
      calloutFee: 0,
      serviceRadiusKm: 20,
      onboardingCompleted: true,
    },
  });

  // ── Bookings y reviews de los prestadores ─────────────────────────
  const bookingGas = await prisma.booking.upsert({
    where: { id: 'seed-booking-1' },
    update: {},
    create: {
      id: 'seed-booking-1',
      userId: tenant.id,
      providerId: (await prisma.provider.findUnique({ where: { userId: pedro.id } }))!.id,
      category: 'GAS',
      description: 'Reparación de pérdida de gas en cocina y revisión de calefón.',
      address: 'Av. Corrientes 1234, Piso 3 Dto B, CABA',
      status: 'COMPLETED',
      scheduledAt: new Date('2026-03-20T09:00:00'),
      completedAt: new Date('2026-03-20T11:30:00'),
      amount: 21000,
    },
  });

  await prisma.review.upsert({
    where: { bookingId: bookingGas.id },
    update: {},
    create: {
      bookingId: bookingGas.id,
      reviewerId: tenant.id,
      providerId: (await prisma.provider.findUnique({ where: { userId: pedro.id } }))!.id,
      rating: 5,
      comment:
        '¡Excelente! Vino puntual, explicó todo bien y dejó todo impecable. Muy recomendable.',
    },
  });

  const bookingClean = await prisma.booking.upsert({
    where: { id: 'seed-booking-2' },
    update: {},
    create: {
      id: 'seed-booking-2',
      userId: landlord.id,
      providerId: luciaProvider.id,
      category: 'CLEANER',
      description: 'Limpieza profunda de departamento entre inquilinos (post-contrato).',
      address: 'Av. Cabildo 2400, Piso 5 Dto A, Buenos Aires',
      status: 'COMPLETED',
      scheduledAt: new Date('2026-04-02T08:00:00'),
      completedAt: new Date('2026-04-02T13:00:00'),
      amount: 27000,
    },
  });

  await prisma.review.upsert({
    where: { bookingId: bookingClean.id },
    update: {},
    create: {
      bookingId: bookingClean.id,
      reviewerId: landlord.id,
      providerId: luciaProvider.id,
      rating: 5,
      comment:
        'El departamento quedó como nuevo. Muy profesional, puntual y con materiales propios. La voy a contratar de nuevo.',
    },
  });

  // Booking pendiente: inquilino pide limpieza
  await prisma.booking.upsert({
    where: { id: 'seed-booking-3' },
    update: {},
    create: {
      id: 'seed-booking-3',
      userId: tenant.id,
      providerId: luciaProvider.id,
      category: 'CLEANER',
      description: 'Limpieza de verano para el departamento de Palermo.',
      address: 'Av. Corrientes 1234, Piso 3 Dto B, CABA',
      status: 'ACCEPTED',
      scheduledAt: new Date('2026-06-10T10:00:00'),
      amount: 22000,
    },
  });

  // ── Inmobiliaria / Gestora de alquileres ───────────────────────────
  // Cuenta REALTOR con suscripción REALTOR. En la app puede publicar
  // propiedades como si fuera propietario (owner) y gestionar contratos
  // en nombre de sus clientes.
  const agencia = await prisma.user.upsert({
    where: { email: 'contacto@inmobiliaria-delvalle.com' },
    update: {},
    create: {
      email: 'contacto@inmobiliaria-delvalle.com',
      passwordHash,
      firstName: 'Inmobiliaria',
      lastName: 'Del Valle',
      nickname: 'Del Valle',
      phone: '+5491144556677',
      role: UserRole.REALTOR,
      marketingEmailConsent: true,
      marketingSmsConsent: true,
      subscription: { create: { plan: 'REALTOR', status: 'ACTIVE' } },
      verification: { create: { status: 'VERIFIED', verifiedAt: new Date() } },
    },
  });

  // Propiedades gestionadas por la inmobiliaria
  const AGENCY_PROPERTIES = [
    {
      id: 'seed-property-6',
      address: 'Av. Santa Fe 3200, Piso 8 Dto C',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      rooms: 2,
      bathrooms: 1,
      squareMeters: 58,
      monthlyRent: 480000,
      expenses: 55000,
      description:
        'Impecable 2 ambientes en Palermo Hollywood. Contrafrente silencioso, cocina integrada, '  +
        'piso flotante, baño reformado. Edificio con portería 24hs.',
      title: '2 ambientes Palermo Hollywood — gestión Del Valle',
      petsAllowed: false,
      amenities: ['doorman', 'laundry', 'elevator'],
      latitude: -34.5874,
      longitude: -58.4271,
    },
    {
      id: 'seed-property-7',
      address: 'Ugarteche 3150, Piso 2',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      rooms: 3,
      bathrooms: 2,
      squareMeters: 95,
      monthlyRent: 720000,
      expenses: 90000,
      description:
        'Luminoso PH en Palermo, planta alta con terraza privada de 20m². ' +
        '3 ambientes separados, baño completo + toilette. Ideal familias o home office.',
      title: 'PH con terraza en Palermo — gestión Del Valle',
      petsAllowed: true,
      amenities: ['balcony', 'parking', 'elevator'],
      latitude: -34.5842,
      longitude: -58.4204,
    },
  ];

  for (const p of AGENCY_PROPERTIES) {
    const { title, ...propertyData } = p;
    await prisma.property.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...propertyData,
        ownerId: agencia.id,
        currency: 'ARS',
        listing: { create: { title, isPublished: true } },
      },
    });
  }

  // ── Notificaciones adicionales ─────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: pedro.id,
        type: 'BOOKING_ACCEPTED',
        title: 'Reseña recibida',
        body: 'Ana dejó una reseña de 5 estrellas por la reparación de gas.',
        isRead: false,
      },
      {
        userId: lucia.id,
        type: 'BOOKING_ACCEPTED',
        title: 'Nueva reserva confirmada',
        body: 'Tenés una limpieza programada para el 10/06.',
        isRead: false,
      },
      {
        userId: agencia.id,
        type: 'LISTING_PUBLISHED',
        title: 'Publicaciones activas',
        body: 'Tus 2 propiedades están publicadas y visibles.',
        isRead: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Seed completo:');
  console.log('  • 6 usuarios (admin / propietario / inquilino / 2 prestadores / inmobiliaria — password: Password123!)');
  console.log('  • 7 propiedades publicadas (5 del propietario + 2 de la inmobiliaria)');
  console.log('  • 1 contrato firmado con 6 pagos + depósito + mediación');
  console.log('  • 3 bookings (2 completados con review, 1 aceptado pendiente)');
  console.log('  • Pedro González: gasista ENARGAS verificado (GAS)');
  console.log('  • Lucía Fernández: limpieza profesional verificada (CLEANER)');
  console.log('  • Inmobiliaria Del Valle: gestora de alquileres (REALTOR)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
