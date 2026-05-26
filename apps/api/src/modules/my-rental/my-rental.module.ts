import { Module } from '@nestjs/common';
import { MyRentalController } from './my-rental.controller';
import { MyRentalService }    from './my-rental.service';
import { PrismaService }      from '../../prisma/prisma.service';

@Module({
  controllers: [MyRentalController],
  providers:   [MyRentalService, PrismaService],
  exports:     [MyRentalService],
})
export class MyRentalModule {}
