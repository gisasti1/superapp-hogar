import { Module } from '@nestjs/common';
import { ContractTemplatesController } from './contract-templates.controller';
import { ContractTemplatesService } from './contract-templates.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ContractTemplatesController],
  providers: [ContractTemplatesService, PrismaService],
  exports: [ContractTemplatesService],
})
export class ContractTemplatesModule {}
