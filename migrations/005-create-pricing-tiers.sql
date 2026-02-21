-- Migration to create 'pricing_tiers' table
CREATE TABLE pricing_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_product_id VARCHAR(255) NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    billing_interval VARCHAR(20) NOT NULL, -- monthly, yearly, etc.
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX idx_pricing_tiers_active ON pricing_tiers(is_active);
CREATE INDEX idx_pricing_tiers_stripe_price ON pricing_tiers(stripe_price_id);

-- Add comments for documentation
COMMENT ON TABLE pricing_tiers IS 'Product pricing tiers and plans for subscription management';
COMMENT ON COLUMN pricing_tiers.price_cents IS 'Price in cents to avoid floating point issues';
COMMENT ON COLUMN pricing_tiers.features IS 'JSON array of feature descriptions for the tier';
COMMENT ON COLUMN pricing_tiers.display_order IS 'Order for displaying tiers on pricing page';
