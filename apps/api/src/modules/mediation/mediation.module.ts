import { Module } from '@nestjs/common';
import { MediationController } from './mediation.controller';
import { MediationService } from './mediation.service';

@Module({
  controllers: [MediationController],
  providers: [MediationService],
  exports: [MediationService],
})
export class MediationModule {}
