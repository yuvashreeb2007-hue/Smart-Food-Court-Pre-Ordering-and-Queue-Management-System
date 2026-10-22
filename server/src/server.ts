import { app } from './app.js';
import { env } from './config/env.js';
import { checkDbConnection, closePool } from './db/pool.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT;

async function startServer() {
  // Check database health on boot
  const dbHealth = await checkDbConnection();
  if (!dbHealth.healthy) {
    logger.error('Database connection failed on startup. Server halting.', { error: dbHealth.error });
    process.exit(1);
  }

  logger.info('Database connection established successfully', { latencyMs: dbHealth.latencyMs });

  const server = app.listen(PORT, () => {
    logger.info(`Smart Food Court API Server listening on port ${PORT}`, {
      environment: env.NODE_ENV,
      apiUrl: `http://localhost:${PORT}/api/v1`,
      healthEndpoint: `http://localhost:${PORT}/api/v1/health`,
      corsAllowedOrigin: env.CLIENT_ORIGIN,
      timezone: env.BUSINESS_TIMEZONE,
    });
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await closePool();
        logger.info('Database connections closed cleanly');
        process.exit(0);
      } catch (err: any) {
        logger.error('Error during database pool shutdown', { error: err.message });
        process.exit(1);
      }
    });

    // Force exit after 10s if shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing termination.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
