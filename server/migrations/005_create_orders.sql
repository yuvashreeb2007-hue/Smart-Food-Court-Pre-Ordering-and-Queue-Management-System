-- Migration 005: Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('online', 'offline')),
    token_number INT NOT NULL CHECK (token_number >= 101),
    business_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ordered', 'preparing', 'ready', 'completed')) DEFAULT 'ordered',
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('upi', 'cash', 'card')),
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
    qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    qr_used BOOLEAN NOT NULL DEFAULT false,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_orders_daily_token UNIQUE (business_date, token_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_qr_token ON orders(qr_token);
