import { Request, Response } from 'express';
import { checkDbConnection } from '../db/pool.js';
import { env } from '../config/env.js';
import { getBusinessDate } from '../config/timezone.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const dbHealth = await checkDbConnection();

  const isHealthy = dbHealth.healthy;
  const status = isHealthy ? 200 : 503;

  res.status(status).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    businessDate: getBusinessDate(),
    businessTimezone: env.BUSINESS_TIMEZONE,
    database: {
      connected: dbHealth.healthy,
      latencyMs: dbHealth.latencyMs,
    },
  });
}
