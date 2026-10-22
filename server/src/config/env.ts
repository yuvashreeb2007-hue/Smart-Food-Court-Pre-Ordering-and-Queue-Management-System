import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL environment variable is required',
  }).min(1, 'DATABASE_URL cannot be empty'),
  SESSION_SECRET: z.string({
    required_error: 'SESSION_SECRET environment variable is required',
  }).min(32, 'SESSION_SECRET must be at least 32 characters long for security'),
  SEED_CASHIER_EMAIL: z.string().email().default('cashier@foodcourt.internal'),
  SEED_CASHIER_PASSWORD: z.string().min(8, 'SEED_CASHIER_PASSWORD must be at least 8 characters').default('CashierSecurePass2026!'),
  SEED_MANAGER_EMAIL: z.string().email().default('manager@foodcourt.internal'),
  SEED_MANAGER_PASSWORD: z.string().min(8, 'SEED_MANAGER_PASSWORD must be at least 8 characters').default('ManagerSecurePass2026!'),
  BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),
  TOKEN_START: z.coerce.number().default(101),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(5242880), // 5MB
  PAYMENT_PROVIDER: z.string().default('pending'),
  PAYMENT_KEY_ID: z.string().optional().default(''),
  PAYMENT_KEY_SECRET: z.string().optional().default(''),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(''),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingKeys = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n  - ');
    console.error(`\n[FATAL] Environment variable validation failed:\n  - ${missingKeys}\n`);
    console.error('Please configure the required environment variables in server/.env (see .env.example).\n');
  } else {
    console.error('[FATAL] Failed to parse environment variables:', error);
  }
  process.exit(1);
}

export const env = parsedEnv;
