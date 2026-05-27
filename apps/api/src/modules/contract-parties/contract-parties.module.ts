import { Module } from '@nestjs/common';
import { ContractPartiesController } from './contract-parties.controller';
import { ContractPartiesService }    from './contract-parties.service';
import { PrismaService }             from '../../prisma/prisma.service';
import { NotificationsModule }       from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [ContractPartiesController],
  providers:   [ContractPartiesService, PrismaService],
  exports:     [ContractPartiesService],
})
export class ContractPartiesModule {}
