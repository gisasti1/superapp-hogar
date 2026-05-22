import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { DocuSignService } from './docusign.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, DocuSignService],
  exports: [ContractsService],
})
export class ContractsModule {}
