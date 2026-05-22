import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface MediationProposalResult {
  legalFramework: string;
  analysis: string;
  suggestion: string;
  commitments: string[];
  deadlineDays: number;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.anthropic.apiKey');
    this.model = this.config.get<string>('app.anthropic.model') ?? 'claude-sonnet-4-6';
    this.isMock = !this.apiKey;
    if (this.isMock) {
      this.logger.warn('ANTHROPIC_API_KEY not configured — ClaudeService running in mock mode');
    }
  }

  async generateMediationProposal(params: {
    tenantStatement: string;
    landlordStatement: string;
    category: string;
    jurisprudence: string[];
  }): Promise<MediationProposalResult> {
    if (this.isMock) {
      this.logger.debug('[MOCK] generateMediationProposal');
      return {
        legalFramework:
          'CCyC Arts. 1187-1226 — Locación de inmuebles. DNU 70/2023 — Desregulación económica.',
        analysis:
          'Ambas partes presentaron sus declaraciones. Según el marco normativo vigente, el conflicto requiere una resolución equitativa que contemple los derechos de ambas partes.',
        suggestion:
          'Se recomienda un acuerdo de pago en cuotas o la restitución parcial del depósito, según corresponda a la naturaleza del conflicto.',
        commitments: [
          'El inquilino se compromete a cumplir con los plazos acordados.',
          'El propietario se compromete a respetar los derechos del inquilino.',
          'Ambas partes acuerdan no iniciar acciones legales durante el período de cumplimiento.',
        ],
        deadlineDays: 15,
      };
    }

    const systemPrompt =
      'Sos un mediador experto en derecho de alquileres argentino. ' +
      'Conocés el CCyC arts. 1187-1226 y el DNU 70/2023. ' +
      'Analizás el caso con objetividad y proponés soluciones equitativas.';

    const userPrompt = `
Categoría del conflicto: ${params.category}

Declaración del inquilino:
${params.tenantStatement}

Declaración del propietario:
${params.landlordStatement}

Jurisprudencia relevante:
${params.jurisprudence.join('\n')}

Generá una propuesta de mediación en formato JSON con la siguiente estructura:
{
  "legalFramework": "artículos y normas aplicables",
  "analysis": "análisis objetivo del caso",
  "suggestion": "propuesta de solución",
  "commitments": ["compromiso 1", "compromiso 2", "..."],
  "deadlineDays": 15
}
`;

    const requestBody = JSON.stringify({
      model: this.model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const responseText = await this.anthropicRequest(requestBody);

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]) as MediationProposalResult;
      return parsed;
    } catch {
      this.logger.error('Failed to parse Claude response, using fallback');
      return {
        legalFramework: 'CCyC Arts. 1187-1226',
        analysis: responseText.substring(0, 500),
        suggestion: 'Ver análisis completo',
        commitments: ['Cumplir con el acuerdo en el plazo establecido'],
        deadlineDays: 15,
      };
    }
  }

  private anthropicRequest(body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { content: Array<{ text: string }> };
            const text = parsed?.content?.[0]?.text ?? '';
            resolve(text);
          } catch {
            reject(new Error(`Failed to parse Anthropic response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
