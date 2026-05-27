import { Module } from '@nestjs/common';
import { MyRentalController } from './my-rental.controller';
import { MyRentalService }    from './my-rental.service';
import { PrismaService }      from '../../prisma/prisma.service';
import { ReceiptsModule }     from '../receipts/receipts.module';

@Module({
  imports:     [ReceiptsModule],
  controllers: [MyRentalController],
  providers:   [MyRentalService, PrismaService],
  exports:     [MyRentalService],
})
export class MyRentalModule {}
