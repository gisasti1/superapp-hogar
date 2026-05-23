import { Module } from '@nestjs/common';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonServicesModule } from '../../common/services/common-services.module';

@Module({
  imports: [CommonServicesModule],
  controllers: [PremiumController],
  providers: [PremiumService, PrismaService],
  exports: [PremiumService],
})
export class PremiumModule {}
