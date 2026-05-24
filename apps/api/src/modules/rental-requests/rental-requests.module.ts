import { Module } from '@nestjs/common';
import { RentalRequestsController } from './rental-requests.controller';
import { RentalRequestsService } from './rental-requests.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [RentalRequestsController],
  providers: [RentalRequestsService, PrismaService],
  exports: [RentalRequestsService],
})
export class RentalRequestsModule {}
