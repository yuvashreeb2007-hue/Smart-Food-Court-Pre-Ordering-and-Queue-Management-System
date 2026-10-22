import { env } from '../config/env.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'secret',
  'session',
  'token',
  'authorization',
  'cookie',
  'credentials',
  'key_secret',
  'webhook_secret',
  'seed_cashier_password',
  'seed_manager_password',
]);

function sanitize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = sanitize(v);
    }
  }
  return result;
}

function formatLog(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta) {
    return `${base} ${JSON.stringify(sanitize(meta))}`;
  }
  return base;
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(formatLog('info', message, meta));
  },
  warn(message: string, meta?: any) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message: string, meta?: any) {
    console.error(formatLog('error', message, meta));
  },
  debug(message: string, meta?: any) {
    if (env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  },
};
