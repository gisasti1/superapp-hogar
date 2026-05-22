import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface RenaperValidationResult {
  valid: boolean;
  firstName: string;
  lastName: string;
  facialMatchScore: number;
  rawResponse: object;
}

@Injectable()
export class RenaperService {
  private readonly logger = new Logger(RenaperService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.renaper.apiKey');
    this.baseUrl = this.config.get<string>('app.renaper.baseUrl') ?? 'https://api.renaper.gob.ar';
    this.isMock = !this.apiKey;
    if (this.isMock) {
      this.logger.warn('RENAPER_API_KEY not configured — RenaperService running in mock mode');
    }
  }

  async validate(
    dni: string,
    selfieUrl: string,
    dniFrontUrl: string,
  ): Promise<RenaperValidationResult> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] validate DNI=${dni}`);
      const mockScore = 0.9 + Math.random() * 0.09; // 0.90-0.99
      return {
        valid: true,
        firstName: 'MOCK',
        lastName: 'USUARIO',
        facialMatchScore: mockScore,
        rawResponse: {
          mock: true,
          dni,
          selfieUrl,
          dniFrontUrl,
          score: mockScore,
        },
      };
    }

    const body = JSON.stringify({ dni, selfieUrl, dniFrontUrl });
    const url = new URL('/v1/validate', this.baseUrl);

    const data = await this.renaperRequest<{
      valid: boolean;
      firstName: string;
      lastName: string;
      facialMatchScore: number;
      rawResponse: object;
    }>(url.hostname, url.pathname, body);

    return data;
  }

  private renaperRequest<T>(hostname: string, path: string, body: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        path,
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error(`Failed to parse RENAPER response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
