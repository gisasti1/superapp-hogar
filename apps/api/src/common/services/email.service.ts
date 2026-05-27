import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Servicio para enviar emails transaccionales y de campaña.
 *
 * En prod usa SendGrid (https://sendgrid.com) — el free tier permite 100
 * emails/día. Si SENDGRID_API_KEY no está configurada, cae a modo MOCK
 * que loguea el email pero no manda nada, así dev/staging funcionan sin
 * credenciales reales.
 *
 * Para usar SendGrid real:
 *   1. Crear cuenta en sendgrid.com
 *   2. Verificar el dominio remitente (Settings → Sender Authentication)
 *   3. Crear API key con permisos "Mail Send"
 *   4. Setear en Render:
 *      SENDGRID_API_KEY=SG.xxxxx
 *      SENDGRID_FROM_EMAIL=noreply@tu-dominio.com (debe ser uno verificado)
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** texto plano (siempre incluido como fallback) */
  text: string;
  /** opcional — HTML con el contenido formateado */
  html?: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  errors: Array<{ to: string; error: string }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.sendgrid.apiKey');
    this.fromEmail = this.config.get<string>('app.sendgrid.fromEmail') ?? 'noreply@superapphogar.com';
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      this.logger.warn('SENDGRID_API_KEY no configurada → EmailService en modo MOCK (no manda emails)');
    }
  }

  /**
   * Manda un solo email.
   * @returns true si se mandó (o se mockeó), false si SendGrid lo rechazó.
   */
  async send(msg: EmailMessage): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`[MOCK email] to=${msg.to} subject="${msg.subject}"`);
      return true;
    }

    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: this.fromEmail, name: 'Habitta' },
          subject: msg.subject,
          content: [
            { type: 'text/plain', value: msg.text },
            ...(msg.html ? [{ type: 'text/html', value: msg.html }] : []),
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`SendGrid ${res.status} para ${msg.to}: ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Error mandando email a ${msg.to}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Manda en lote con concurrencia controlada para no triggerear rate-limits
   * de SendGrid (free tier: 100 req/s). Usamos batches de 10 paralelos.
   */
  async sendBulk(
    messages: EmailMessage[],
    opts: { concurrency?: number; onProgress?: (sent: number, total: number) => void } = {},
  ): Promise<BulkSendResult> {
    const concurrency = opts.concurrency ?? 10;
    const result: BulkSendResult = { sent: 0, failed: 0, errors: [] };

    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(m => this.send(m)));
      settled.forEach((s, idx) => {
        if (s.status === 'fulfilled' && s.value === true) {
          result.sent++;
        } else {
          result.failed++;
          const errMsg = s.status === 'rejected' ? String(s.reason) : 'SendGrid rechazó';
          result.errors.push({ to: batch[idx].to, error: errMsg });
        }
      });
      opts.onProgress?.(result.sent + result.failed, messages.length);
    }

    return result;
  }

  /** Devuelve true si el servicio está conectado a SendGrid real. */
  isReal(): boolean {
    return this.enabled;
  }
}
