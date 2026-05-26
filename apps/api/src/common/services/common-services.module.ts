import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { MercadoPagoService } from './mercadopago.service';
import { ClaudeService } from './claude.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [S3Service, MercadoPagoService, ClaudeService, EmailService, SmsService],
  exports: [S3Service, MercadoPagoService, ClaudeService, EmailService, SmsService],
})
export class CommonServicesModule {}
