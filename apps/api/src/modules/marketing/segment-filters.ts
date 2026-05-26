/**
 * Define el shape de los filtros que un segmento puede tener.
 * Estos filtros se persisten como JSON en Segment.filters y se traducen
 * a un Prisma where en runtime al calcular el segmento.
 *
 * Mantener este shape lo más simple y plano posible — los filtros
 * complejos no escalan en JSON-as-where (ej: rangos de fechas).
 */
export interface SegmentFilters {
  // Demografía
  role?: 'TENANT' | 'LANDLORD' | 'PROVIDER' | 'REALTOR' | 'ADMIN';
  city?: string;          // contains, case-insensitive
  province?: string;
  nationality?: string;
  ageMin?: number;        // años, calculado desde dateOfBirth
  ageMax?: number;

  // Profesional / económico
  occupation?: string;    // contains
  employmentType?: 'EMPLOYEE' | 'SELF_EMPLOYED' | 'FREELANCER' | 'BUSINESS_OWNER'
    | 'STUDENT' | 'RETIRED' | 'UNEMPLOYED' | 'OTHER';
  minIncome?: number;
  maxIncome?: number;

  // Estilo de vida
  maritalStatus?: 'SINGLE' | 'IN_RELATIONSHIP' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'PREFER_NOT_TO_SAY';
  hasPets?: boolean;
  smoker?: boolean;

  // Compliance
  emailConsent?: boolean;
  smsConsent?: boolean;

  // Activity
  verified?: boolean;     // verification.status === 'VERIFIED'
  subscription?: 'FREE' | 'PREMIUM' | 'REALTOR';
}

/**
 * Traduce los filtros a un Prisma where para User.
 * Los rangos de edad se traducen a rangos de dateOfBirth (hoy - X años).
 */
export function buildPrismaWhere(f: SegmentFilters): Record<string, any> {
  const where: Record<string, any> = {
    isActive: true,
  };

  if (f.role) where.role = f.role;
  if (f.province) where.province = { contains: f.province, mode: 'insensitive' };
  if (f.city) where.city = { contains: f.city, mode: 'insensitive' };
  if (f.nationality) where.nationality = { contains: f.nationality, mode: 'insensitive' };
  if (f.occupation) where.occupation = { contains: f.occupation, mode: 'insensitive' };
  if (f.employmentType) where.employmentType = f.employmentType;
  if (f.maritalStatus) where.maritalStatus = f.maritalStatus;
  if (typeof f.hasPets === 'boolean') where.hasPets = f.hasPets;
  if (typeof f.smoker === 'boolean') where.smoker = f.smoker;
  if (typeof f.emailConsent === 'boolean') where.marketingEmailConsent = f.emailConsent;
  if (typeof f.smsConsent === 'boolean') where.marketingSmsConsent = f.smsConsent;

  // Rangos numéricos
  if (f.minIncome != null || f.maxIncome != null) {
    where.monthlyIncome = {};
    if (f.minIncome != null) where.monthlyIncome.gte = f.minIncome;
    if (f.maxIncome != null) where.monthlyIncome.lte = f.maxIncome;
  }

  // Edad → traducir a dateOfBirth (más viejo que ageMax años, más joven que ageMin)
  // ej: ageMin=25 → dateOfBirth <= hoy - 25 años
  //     ageMax=45 → dateOfBirth >= hoy - 45 años (o sea, no nació antes de hoy - 45a)
  if (f.ageMin != null || f.ageMax != null) {
    where.dateOfBirth = {};
    const now = new Date();
    if (f.ageMin != null) {
      where.dateOfBirth.lte = new Date(now.getFullYear() - f.ageMin, now.getMonth(), now.getDate());
    }
    if (f.ageMax != null) {
      where.dateOfBirth.gte = new Date(now.getFullYear() - f.ageMax - 1, now.getMonth(), now.getDate());
    }
  }

  // Verificación
  if (typeof f.verified === 'boolean') {
    if (f.verified) {
      where.verification = { is: { status: 'VERIFIED' } };
    } else {
      where.OR = [
        { verification: null },
        { verification: { is: { status: { not: 'VERIFIED' } } } },
      ];
    }
  }

  // Suscripción
  if (f.subscription) {
    where.subscription = { is: { plan: f.subscription, status: 'ACTIVE' } };
  }

  return where;
}
