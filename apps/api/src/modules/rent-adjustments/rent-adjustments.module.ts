import { Module } from '@nestjs/common';
import { RentAdjustmentsController } from './rent-adjustments.controller';
import { RentAdjustmentsService } from './rent-adjustments.service';
import { BcraService } from './bcra.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [RentAdjustmentsController],
  providers: [RentAdjustmentsService, BcraService, PrismaService],
  exports: [RentAdjustmentsService],
})
export class RentAdjustmentsModule {}
