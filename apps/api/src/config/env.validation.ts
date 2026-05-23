import { z } from 'zod';

/**
 * Schema de variables de entorno. Validamos al arranque y abortamos
 * si faltan obligatorias o están mal formadas. Mejor fallar rápido
 * que descubrir el error en producción cuando el primer request entra.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL es requerido')
    .refine(v => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL debe empezar con postgres:// o postgresql://',
    }),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Integradores externos — todos opcionales (caen en modo mock si faltan)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z.string().optional(),

  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  MP_ACCESS_TOKEN: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),

  RENAPER_API_KEY: z.string().optional(),
  RENAPER_BASE_URL: z.string().url().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),

  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().optional(),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_USER_ID: z.string().optional(),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_RSA_PRIVATE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): Env {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Output muy claro de qué falta — el deploy va a fallar acá si algo está mal
    const issues = result.error.issues
      .map(i => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error('\n❌ Variables de entorno inválidas:\n' + issues + '\n');
    throw new Error('Configuración inválida. Revisá tu .env');
  }

  // Warnings útiles en prod
  if (result.data.NODE_ENV === 'production') {
    const warnings: string[] = [];
    if (!result.data.AWS_S3_BUCKET) warnings.push('AWS_S3_BUCKET no seteado: uploads van a mock');
    if (!result.data.MP_ACCESS_TOKEN) warnings.push('MP_ACCESS_TOKEN no seteado: pagos en mock');
    if (!result.data.SENDGRID_API_KEY) warnings.push('SENDGRID_API_KEY no seteado: emails sólo en logs');
    if (warnings.length) {
      // eslint-disable-next-line no-console
      console.warn('\n⚠️  Atención en producción:\n' + warnings.map(w => `  • ${w}`).join('\n') + '\n');
    }
  }

  return result.data;
}
