import { Module } from '@nestjs/common';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { FinaerService } from './finaer.service';

@Module({
  controllers: [InsuranceController],
  providers: [InsuranceService, FinaerService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
