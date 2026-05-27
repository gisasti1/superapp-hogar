import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService }    from './bills.service';
import { PrismaService }   from '../../prisma/prisma.service';
import { ReceiptsModule }  from '../receipts/receipts.module';

@Module({
  imports:     [ReceiptsModule],
  controllers: [BillsController],
  providers:   [BillsService, PrismaService],
  exports:     [BillsService],
})
export class BillsModule {}
