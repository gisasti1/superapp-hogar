import { Injectable, Logger } from '@nestjs/common';

/**
 * Cliente para la API pública del BCRA (Estadísticas v3).
 * Endpoint: https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias
 *
 * Variables relevantes:
 * - ICL: idVariable=40 (Índice para Contratos de Locación)
 * - IPC: idVariable=27 (Inflación mensual, podemos acumular)
 *
 * En modo mock (sin BCRA_API_DISABLED=true), devuelve datos sintéticos
 * estables para que la app funcione sin red. En producción usa BCRA real.
 *
 * Docs oficiales: https://www.bcra.gob.ar/Catalogo/api.asp
 */
@Injectable()
export class BcraService {
  private readonly logger = new Logger(BcraService.name);
  private readonly disabled = process.env.BCRA_API_DISABLED === 'true';

  private readonly variables = {
    ICL: 40,
    IPC: 27,
  };

  /**
   * Devuelve el valor del índice ICL en una fecha dada (o el más cercano disponible).
   */
  async getIclValue(date: Date): Promise<number> {
    return this.getVariableValue(this.variables.ICL, date);
  }

  async getIpcValue(date: Date): Promise<number> {
    return this.getVariableValue(this.variables.IPC, date);
  }

  /**
   * Calcula el multiplicador entre dos fechas para un índice.
   * Ej: si ICL pasó de 100 → 175 → multiplicador = 1.75 (+75%).
   */
  async getMultiplier(
    index: 'ICL' | 'IPC' | 'ICL_IPC_MIX',
    fromDate: Date,
    toDate: Date,
  ): Promise<{ multiplier: number; snapshot: Record<string, unknown> }> {
    if (index === 'ICL_IPC_MIX') {
      const icl = await this.getMultiplier('ICL', fromDate, toDate);
      const ipc = await this.getMultiplier('IPC', fromDate, toDate);
      const mult = (icl.multiplier + ipc.multiplier) / 2;
      return {
        multiplier: Number(mult.toFixed(4)),
        snapshot: { mode: 'ICL_IPC_MIX', icl: icl.snapshot, ipc: ipc.snapshot },
      };
    }

    const fromValue = index === 'ICL'
      ? await this.getIclValue(fromDate)
      : await this.getIpcValue(fromDate);
    const toValue = index === 'ICL'
      ? await this.getIclValue(toDate)
      : await this.getIpcValue(toDate);

    if (fromValue <= 0) return { multiplier: 1, snapshot: { error: 'invalid_from_value' } };

    return {
      multiplier: Number((toValue / fromValue).toFixed(4)),
      snapshot: {
        index,
        fromDate: fromDate.toISOString().slice(0, 10),
        fromValue,
        toDate: toDate.toISOString().slice(0, 10),
        toValue,
        source: this.disabled ? 'mock' : 'bcra',
      },
    };
  }

  private async getVariableValue(idVariable: number, date: Date): Promise<number> {
    if (this.disabled) {
      return this.mockValue(idVariable, date);
    }
    try {
      const dateStr = date.toISOString().slice(0, 10);
      // El endpoint acepta rango — pedimos los últimos 30 días previos para tener algo
      const desde = new Date(date);
      desde.setDate(desde.getDate() - 30);
      const url = `https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/${idVariable}?desde=${desde.toISOString().slice(0,10)}&hasta=${dateStr}&limit=10`;

      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`BCRA respondió ${res.status}`);
      const json = (await res.json()) as { results?: Array<{ valor: number }> };
      const results = json?.results ?? [];
      if (!results.length) throw new Error('Sin datos en BCRA');
      // El más cercano a la fecha pedida (último del rango)
      return Number(results[results.length - 1].valor);
    } catch (err) {
      this.logger.warn(`BCRA fallback a mock para variable ${idVariable}: ${(err as Error).message}`);
      return this.mockValue(idVariable, date);
    }
  }

  /**
   * Valor sintético determinístico — exponencial 4% mensual desde 2020.
   * Sirve para demo/test sin acoplar al BCRA real.
   */
  private mockValue(idVariable: number, date: Date): number {
    const baseDate = new Date('2020-01-01');
    const months = (date.getFullYear() - baseDate.getFullYear()) * 12 + (date.getMonth() - baseDate.getMonth());
    const baseValue = idVariable === 27 ? 100 : 50;  // IPC arranca en 100, ICL en 50
    const monthlyRate = 0.04;  // 4% mensual aprox
    return Number((baseValue * Math.pow(1 + monthlyRate, Math.max(0, months))).toFixed(4));
  }
}
