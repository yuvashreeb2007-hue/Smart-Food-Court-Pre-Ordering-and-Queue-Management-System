-- Migration 008: Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    payment_reference VARCHAR(255),
    status VARCHAR(20) NOT NULL CHECK (status IN ('recorded', 'processing', 'confirmed', 'failed')) DEFAULT 'recorded',
    refund_type VARCHAR(20) NOT NULL CHECK (refund_type IN ('in_person_cash', 'electronic')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_manager ON refunds(manager_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
