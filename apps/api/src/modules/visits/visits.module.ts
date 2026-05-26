import { Module } from '@nestjs/common';
import { VisitsController } from './visits.controller';
import { VisitsService }    from './visits.service';
import { PrismaService }    from '../../prisma/prisma.service';

@Module({
  controllers: [VisitsController],
  providers:   [VisitsService, PrismaService],
  exports:     [VisitsService],
})
export class VisitsModule {}
