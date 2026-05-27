import { Module } from '@nestjs/common';
import { SupportController, AdminSupportController } from './support.controller';
import { SupportService }    from './support.service';
import { PrismaService }     from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [SupportController, AdminSupportController],
  providers:   [SupportService, PrismaService],
  exports:     [SupportService],
})
export class SupportModule {}
