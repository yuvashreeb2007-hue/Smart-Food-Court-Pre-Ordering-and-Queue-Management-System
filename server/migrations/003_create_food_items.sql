-- Migration 003: Create food_items table
CREATE TABLE IF NOT EXISTS food_items (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    image_path VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT true,
    stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    preparation_time_minutes INT NOT NULL DEFAULT 10 CHECK (preparation_time_minutes >= 0),
    is_vegetarian BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category_id);
CREATE INDEX IF NOT EXISTS idx_food_items_available ON food_items(is_available);
CREATE INDEX IF NOT EXISTS idx_food_items_deleted ON food_items(deleted_at);
