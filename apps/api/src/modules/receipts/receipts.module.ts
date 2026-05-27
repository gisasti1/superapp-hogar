import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService }    from './receipts.service';
import { PrismaService }      from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [ReceiptsController],
  providers:   [ReceiptsService, PrismaService],
  exports:     [ReceiptsService],
})
export class ReceiptsModule {}
