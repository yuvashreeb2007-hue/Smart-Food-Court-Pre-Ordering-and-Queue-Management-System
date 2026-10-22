-- Migration 004: Create daily_tokens table
CREATE TABLE IF NOT EXISTS daily_tokens (
    business_date DATE PRIMARY KEY,
    last_token INT NOT NULL DEFAULT 100 CHECK (last_token >= 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
