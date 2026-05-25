import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { CommonServicesModule } from './common/services/common-services.module';
import { AuthModule } from './modules/auth/auth.module';
import { KycModule } from './modules/kyc/kyc.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MediationModule } from './modules/mediation/mediation.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { ServicesModule } from './modules/services/services.module';
import { ListingsModule } from './modules/listings/listings.module';
import { PremiumModule } from './modules/premium/premium.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { IssuesModule } from './modules/issues/issues.module';
import { RentalRequestsModule } from './modules/rental-requests/rental-requests.module';
import { ContractReviewsModule } from './modules/contract-reviews/contract-reviews.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { RentAdjustmentsModule } from './modules/rent-adjustments/rent-adjustments.module';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      // /uploads/* sirve archivos guardados localmente. En dev local apunta
      // a la raíz del repo; en producción usa /tmp (filesystem ephemeral).
      // Para uploads persistentes en prod hay que migrar a S3/R2 (ya hay
      // adapter S3Service listo en common/services/).
      rootPath:
        process.env.UPLOADS_ROOT_DIR ??
        (process.env.NODE_ENV === 'production'
          ? '/tmp/superapp-uploads'
          : join(process.cwd(), '..', '..', '.local-uploads')),
      serveRoot: '/uploads',
      serveStaticOptions: { fallthrough: true },
    }),
    PrismaModule,
    CommonServicesModule,
    AuthModule,
    KycModule,
    InsuranceModule,
    ContractsModule,
    PaymentsModule,
    MediationModule,
    DepositsModule,
    ServicesModule,
    ListingsModule,
    PremiumModule,
    NotificationsModule,
    HealthModule,
    FavoritesModule,
    IssuesModule,
    RentalRequestsModule,
    ContractReviewsModule,
    ConversationsModule,
    RentAdjustmentsModule,
  ],
})
export class AppModule {}
