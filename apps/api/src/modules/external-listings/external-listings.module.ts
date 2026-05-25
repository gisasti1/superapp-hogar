import { Module } from '@nestjs/common';
import { ExternalListingsController } from './external-listings.controller';
import { MercadoLibreService } from './mercadolibre.service';

@Module({
  controllers: [ExternalListingsController],
  providers: [MercadoLibreService],
  exports: [MercadoLibreService],
})
export class ExternalListingsModule {}
