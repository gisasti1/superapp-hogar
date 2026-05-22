import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { RenaperService } from './renaper.service';

@Module({
  controllers: [KycController],
  providers: [KycService, RenaperService],
  exports: [KycService],
})
export class KycModule {}
