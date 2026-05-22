import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { MercadoPagoService } from './mercadopago.service';
import { ClaudeService } from './claude.service';

@Global()
@Module({
  providers: [S3Service, MercadoPagoService, ClaudeService],
  exports: [S3Service, MercadoPagoService, ClaudeService],
})
export class CommonServicesModule {}
