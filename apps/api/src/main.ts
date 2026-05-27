import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { AppModule } from './app.module';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
  });

  // Security headers — más estrictos en prod
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              // permitir imágenes propias + OpenStreetMap tiles
              'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://*.unpkg.com'],
              'connect-src': ["'self'", 'https://*.tile.openstreetmap.org'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // para servir /uploads
    }),
  );
  app.use(compression());

  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  // Swagger sólo en non-prod (en prod queda detrás de auth o se desactiva)
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Habitta API')
      .setDescription('API del MVP de SuperApp del Hogar')
      .setVersion(process.env.APP_VERSION ?? '0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API ${isProd ? '(production)' : '(dev)'} en puerto ${port}`);
  if (!isProd) logger.log(`📚 Swagger en http://localhost:${port}/api/docs`);
  logger.log(`🌐 CORS allow-origins: ${origins.join(', ')}`);
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('❌ Bootstrap falló:', err);
  process.exit(1);
});
