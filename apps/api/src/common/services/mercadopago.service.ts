import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface MPPreference {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface MPSubscriptionResult {
  id: string;
  status: string;
  initPoint: string;
}

export interface MPWebhookEvent {
  action: string;
  type: string;
  data: { id: string };
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string | undefined;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('app.mercadoPago.accessToken');
    this.isMock = !this.accessToken;
    if (this.isMock) {
      this.logger.warn('MP_ACCESS_TOKEN not configured — MercadoPagoService running in mock mode');
    }
  }

  async createPreference(params: {
    title: string;
    amount: number;
    currency: string;
    externalReference: string;
    notificationUrl?: string;
    backUrls?: { success: string; failure: string; pending: string };
  }): Promise<MPPreference> {
    if (this.isMock) {
      const mockId = `mock-pref-${Date.now()}`;
      this.logger.debug(`[MOCK] createPreference → ${mockId}`);
      return {
        id: mockId,
        initPoint: `https://mock-mp.localhost/checkout?preference_id=${mockId}`,
        sandboxInitPoint: `https://sandbox.mock-mp.localhost/checkout?preference_id=${mockId}`,
      };
    }

    const body = JSON.stringify({
      items: [
        {
          title: params.title,
          unit_price: params.amount,
          quantity: 1,
          currency_id: params.currency,
        },
      ],
      external_reference: params.externalReference,
      notification_url: params.notificationUrl,
      back_urls: params.backUrls,
    });

    const data = await this.mpRequest<{ id: string; init_point: string; sandbox_init_point: string }>(
      'POST',
      '/checkout/preferences',
      body,
    );

    return {
      id: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    };
  }

  async createSubscription(params: {
    preapprovalPlanId?: string;
    reason: string;
    externalReference: string;
    payerEmail: string;
    autoRecurring: {
      frequency: number;
      frequencyType: 'months' | 'days';
      transactionAmount: number;
      currencyId: string;
    };
    backUrl: string;
  }): Promise<MPSubscriptionResult> {
    if (this.isMock) {
      const mockId = `mock-sub-${Date.now()}`;
      this.logger.debug(`[MOCK] createSubscription → ${mockId}`);
      return {
        id: mockId,
        status: 'pending',
        initPoint: `https://mock-mp.localhost/subscriptions?preapproval_id=${mockId}`,
      };
    }

    const body = JSON.stringify({
      reason: params.reason,
      external_reference: params.externalReference,
      payer_email: params.payerEmail,
      auto_recurring: {
        frequency: params.autoRecurring.frequency,
        frequency_type: params.autoRecurring.frequencyType,
        transaction_amount: params.autoRecurring.transactionAmount,
        currency_id: params.autoRecurring.currencyId,
      },
      back_url: params.backUrl,
      status: 'pending',
    });

    const data = await this.mpRequest<{ id: string; status: string; init_point: string }>(
      'POST',
      '/preapproval',
      body,
    );

    return { id: data.id, status: data.status, initPoint: data.init_point };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] cancelSubscription → ${subscriptionId}`);
      return;
    }
    await this.mpRequest('PUT', `/preapproval/${subscriptionId}`, JSON.stringify({ status: 'cancelled' }));
  }

  async getPayment(paymentId: string): Promise<{ status: string; externalReference: string }> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getPayment → ${paymentId}`);
      return { status: 'approved', externalReference: paymentId };
    }

    const data = await this.mpRequest<{ status: string; external_reference: string }>(
      'GET',
      `/v1/payments/${paymentId}`,
    );
    return { status: data.status, externalReference: data.external_reference };
  }

  private mpRequest<T>(method: string, path: string, body?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mercadopago.com',
        path,
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error(`Failed to parse MP response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
