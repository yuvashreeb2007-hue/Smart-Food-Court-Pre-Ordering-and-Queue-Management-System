import { env } from './env.js';

/**
 * Returns current business date formatted as YYYY-MM-DD in the configured business timezone (Asia/Kolkata).
 */
export function getBusinessDate(date: Date = new Date(), timeZone: string = env.BUSINESS_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current timestamp in ISO string representation.
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
