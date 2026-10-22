import pg from 'pg';
import { env } from '../config/env.js';
import { getBusinessDate } from '../config/timezone.js';

export interface TokenAllocation {
  tokenNumber: number;
  businessDate: string;
}

/**
 * Concurrency-safe daily token allocation.
 * Must be executed within an active PostgreSQL transaction using a dedicated PoolClient.
 * 
 * Acquires an exclusive row-level lock on daily_tokens for the business date,
 * ensuring sequential tokens (101, 102, ...) with zero duplicate tokens under high concurrency.
 */
export async function allocateDailyToken(client: pg.PoolClient): Promise<TokenAllocation> {
  const businessDate = getBusinessDate();
  const tokenStart = env.TOKEN_START; // Default 101

  // Atomic INSERT ... ON CONFLICT DO UPDATE with row lock
  const result = await client.query<{ last_token: number }>(
    `INSERT INTO daily_tokens (business_date, last_token, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (business_date)
     DO UPDATE SET 
       last_token = daily_tokens.last_token + 1,
       updated_at = NOW()
     RETURNING last_token;`,
    [businessDate, tokenStart]
  );

  return {
    tokenNumber: result.rows[0].last_token,
    businessDate,
  };
}
