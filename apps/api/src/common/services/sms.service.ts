import { Injectable, Logger } from '@nestjs/common';

/**
 * Servicio para mandar SMS de campaña/notificación.
 *
 * En prod usa Twilio (https://twilio.com). Si TWILIO_* no están seteadas
 * cae a modo MOCK que loguea pero no manda.
 *
 * Para usar Twilio real:
 *   1. Crear cuenta en twilio.com
 *   2. Comprar un número (~$1/mes) — debe ser AR para evitar penalidades
 *      de spam con números yankees mandando a Argentina
 *   3. Setear en Render:
 *      TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *      TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *      TWILIO_FROM_NUMBER=+5491155556666
 *
 * Costos referenciales: SMS a AR ~ $0.075 USD por mensaje (2025).
 */

export interface SmsMessage {
  /** Número en formato E.164: +5491155667788 */
  to: string;
  body: string;
}

export interface BulkSmsResult {
  sent: number;
  failed: number;
  errors: Array<{ to: string; error: string }>;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid = process.env.TWILIO_ACCOUNT_SID;
  private readonly authToken = process.env.TWILIO_AUTH_TOKEN;
  private readonly fromNumber = process.env.TWILIO_FROM_NUMBER;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = !!this.accountSid && !!this.authToken && !!this.fromNumber;
    if (!this.enabled) {
      this.logger.warn('Twilio no configurado → SmsService en modo MOCK (no manda SMS)');
    }
  }

  async send(msg: SmsMessage): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`[MOCK sms] to=${msg.to} body="${msg.body.slice(0, 60)}..."`);
      return true;
    }

    try {
      const params = new URLSearchParams({
        To: msg.to,
        From: this.fromNumber!,
        Body: msg.body,
      });
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Twilio ${res.status} para ${msg.to}: ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Error mandando SMS a ${msg.to}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Bulk con concurrencia baja (5) — Twilio tiene rate limits estrictos
   * en cuentas trial.
   */
  async sendBulk(
    messages: SmsMessage[],
    opts: { concurrency?: number; onProgress?: (sent: number, total: number) => void } = {},
  ): Promise<BulkSmsResult> {
    const concurrency = opts.concurrency ?? 5;
    const result: BulkSmsResult = { sent: 0, failed: 0, errors: [] };

    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(m => this.send(m)));
      settled.forEach((s, idx) => {
        if (s.status === 'fulfilled' && s.value === true) {
          result.sent++;
        } else {
          result.failed++;
          const errMsg = s.status === 'rejected' ? String(s.reason) : 'Twilio rechazó';
          result.errors.push({ to: batch[idx].to, error: errMsg });
        }
      });
      opts.onProgress?.(result.sent + result.failed, messages.length);
    }

    return result;
  }

  isReal(): boolean {
    return this.enabled;
  }
}
