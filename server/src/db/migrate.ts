import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

export async function runMigrations(): Promise<{ total: number; applied: number }> {
  logger.info('Starting database migration runner...');

  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch applied migrations
    const appliedResult = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY id ASC'
    );
    const appliedSet = new Set(appliedResult.rows.map(r => r.name));

    // Read and sort migration files
    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    let newlyAppliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.debug(`Migration already applied: ${file}`);
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Run each migration in an atomic transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`Successfully applied migration: ${file}`);
        newlyAppliedCount++;
      } catch (migrationError: any) {
        await client.query('ROLLBACK');
        logger.error(`Migration failed on file ${file}. Transaction rolled back.`, {
          error: migrationError.message,
        });
        throw migrationError;
      }
    }

    logger.info(`Migrations complete. Total files: ${files.length}, newly applied: ${newlyAppliedCount}.`);
    return { total: files.length, applied: newlyAppliedCount };
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: tsx src/db/migrate.ts
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations()
    .then(() => {
      logger.info('Database is up to date.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration execution failed', { error: err.message });
      process.exit(1);
    });
}
