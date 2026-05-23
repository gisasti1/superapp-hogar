import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-in-prod',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET ?? 'superapp-hogar-dev',
  },

  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN,
    publicKey: process.env.MP_PUBLIC_KEY,
    webhookSecret: process.env.MP_WEBHOOK_SECRET,
  },

  renaper: {
    apiKey: process.env.RENAPER_API_KEY,
    baseUrl: process.env.RENAPER_BASE_URL ?? 'https://api.renaper.gob.ar',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@superapphogar.com',
  },
}));
