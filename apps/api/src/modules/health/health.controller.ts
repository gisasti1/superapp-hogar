import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

const STARTED_AT = Date.now();

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Endpoint para health checks de load balancers / orquestadores.
   * Devuelve 200 con status=ok si la DB responde, 503 si no.
   */
  @Get()
  @ApiOperation({ summary: 'Estado del servicio y dependencias' })
  async check() {
    let dbOk = false;
    let dbLatencyMs = 0;
    try {
      const t0 = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - t0;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const uptimeMs = Date.now() - STARTED_AT;
    const status = dbOk ? 'ok' : 'degraded';

    return {
      status,
      version: process.env.APP_VERSION ?? '0.1.0',
      uptimeMs,
      uptime: humanizeUptime(uptimeMs),
      timestamp: new Date().toISOString(),
      checks: {
        database: { ok: dbOk, latencyMs: dbLatencyMs },
      },
    };
  }
}

function humanizeUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}
