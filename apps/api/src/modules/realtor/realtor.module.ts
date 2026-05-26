import { Module } from '@nestjs/common';
import { RealtorController } from './realtor.controller';
import { RealtorService } from './realtor.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [RealtorController],
  providers: [RealtorService, PrismaService],
  exports: [RealtorService],
})
export class RealtorModule {}
