import { Module } from '@nestjs/common';
import { ContractReviewsController } from './contract-reviews.controller';
import { ContractReviewsService } from './contract-reviews.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ContractReviewsController],
  providers: [ContractReviewsService, PrismaService],
  exports: [ContractReviewsService],
})
export class ContractReviewsModule {}
