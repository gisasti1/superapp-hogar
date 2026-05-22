import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DocuSignEnvelope {
  envelopeId: string;
  signingUrl: string;
}

@Injectable()
export class DocuSignService {
  private readonly logger = new Logger(DocuSignService.name);
  private readonly integrationKey: string | undefined;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.integrationKey =
      this.config.get<string>('app.docusign.integrationKey') ??
      process.env['DOCUSIGN_INTEGRATION_KEY'];
    this.isMock = !this.integrationKey;
    if (this.isMock) {
      this.logger.warn(
        'DOCUSIGN_INTEGRATION_KEY not configured — DocuSignService running in mock mode',
      );
    }
  }

  async createEnvelope(params: {
    contractId: string;
    signerEmail: string;
    signerName: string;
    documentBase64: string;
    documentName: string;
  }): Promise<DocuSignEnvelope> {
    if (this.isMock) {
      const envelopeId = `mock-envelope-${Date.now()}`;
      this.logger.debug(`[MOCK] createEnvelope → ${envelopeId}`);
      return {
        envelopeId,
        signingUrl: `https://mock-docusign.localhost/signing?envelopeId=${envelopeId}&contractId=${params.contractId}`,
      };
    }

    // Real DocuSign API integration would go here
    throw new Error('DocuSign real integration not implemented — set DOCUSIGN_INTEGRATION_KEY');
  }
}
