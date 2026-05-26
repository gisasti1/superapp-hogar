import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [MarketingController, CampaignsController],
  providers: [MarketingService, CampaignsService, PrismaService],
  exports: [MarketingService, CampaignsService],
})
export class MarketingModule {}
