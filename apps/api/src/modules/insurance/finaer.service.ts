import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface FinaerQuoteResult {
  providerId: string;
  providerName: string;
  monthlyPremium: number;
  totalPremium: number;
  coverageAmount: number;
  coverageMonths: number;
  currency: 'ARS' | 'USD';
  externalQuoteId: string;
}

@Injectable()
export class FinaerService {
  private readonly logger = new Logger(FinaerService.name);
  private readonly apiKey: string | undefined;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.finaer.apiKey') ?? process.env['FINAER_API_KEY'];
    this.isMock = !this.apiKey;
    if (this.isMock) {
      this.logger.warn('FINAER_API_KEY not configured — FinaerService running in mock mode');
    }
  }

  async getQuotes(params: {
    propertyAddress: string;
    city: string;
    monthlyRent: number;
    currency: string;
    contractMonths: number;
    tenantDni: string;
  }): Promise<FinaerQuoteResult[]> {
    if (this.isMock) {
      this.logger.debug('[MOCK] getQuotes');
      const monthlyRent = params.monthlyRent;
      return [
        {
          providerId: 'finaer-basic',
          providerName: 'Finaer Básico',
          monthlyPremium: Math.round(monthlyRent * 0.03),
          totalPremium: Math.round(monthlyRent * 0.03 * params.contractMonths),
          coverageAmount: monthlyRent * 3,
          coverageMonths: params.contractMonths,
          currency: params.currency as 'ARS' | 'USD',
          externalQuoteId: `mock-finaer-basic-${Date.now()}`,
        },
        {
          providerId: 'finaer-premium',
          providerName: 'Finaer Premium',
          monthlyPremium: Math.round(monthlyRent * 0.05),
          totalPremium: Math.round(monthlyRent * 0.05 * params.contractMonths),
          coverageAmount: monthlyRent * 6,
          coverageMonths: params.contractMonths,
          currency: params.currency as 'ARS' | 'USD',
          externalQuoteId: `mock-finaer-premium-${Date.now()}`,
        },
        {
          providerId: 'experta-seguros',
          providerName: 'Experta Seguros',
          monthlyPremium: Math.round(monthlyRent * 0.04),
          totalPremium: Math.round(monthlyRent * 0.04 * params.contractMonths),
          coverageAmount: monthlyRent * 4,
          coverageMonths: params.contractMonths,
          currency: params.currency as 'ARS' | 'USD',
          externalQuoteId: `mock-experta-${Date.now()}`,
        },
      ];
    }

    const body = JSON.stringify(params);
    return this.finaerRequest<FinaerQuoteResult[]>('POST', '/v1/quotes', body);
  }

  private finaerRequest<T>(method: string, path: string, body?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.finaer.com.ar',
        path,
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
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
            reject(new Error(`Failed to parse Finaer response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
