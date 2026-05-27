import { Module } from '@nestjs/common';
import { RentalRequestsController } from './rental-requests.controller';
import { RentalRequestsService } from './rental-requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RentalRequestsController],
  providers: [RentalRequestsService, PrismaService],
  exports: [RentalRequestsService],
})
export class RentalRequestsModule {}
