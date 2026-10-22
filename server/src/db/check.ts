import { pool, checkDbConnection, closePool } from './pool.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('Performing PostgreSQL database connection check...');
  const health = await checkDbConnection();

  if (!health.healthy) {
    logger.error('Database connection failed', { error: health.error });
    process.exit(1);
  }

  const tablesResult = await pool.query<{ table_name: string }>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const migrationsResult = await pool.query<{ count: string }>(`
    SELECT count(*) AS count FROM schema_migrations;
  `).catch(() => ({ rows: [{ count: '0' }] }));

  logger.info('Database connection verified successfully', {
    healthy: true,
    latencyMs: health.latencyMs,
    tablesCount: tablesResult.rowCount,
    appliedMigrations: parseInt(migrationsResult.rows[0].count, 10),
  });

  await closePool();
  process.exit(0);
}

main().catch((err) => {
  logger.error('Database check encountered an error', { error: err.message });
  process.exit(1);
});
