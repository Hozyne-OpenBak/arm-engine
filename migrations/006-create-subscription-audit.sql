-- Migration to create 'subscription_audit' table
CREATE TABLE subscription_audit (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- created, updated, cancelled, payment_failed, etc.
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_plan VARCHAR(50),
    new_plan VARCHAR(50),
    stripe_event_id VARCHAR(255),
    stripe_event_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for audit queries
CREATE INDEX idx_subscription_audit_subscription ON subscription_audit(subscription_id);
CREATE INDEX idx_subscription_audit_user ON subscription_audit(user_id);
CREATE INDEX idx_subscription_audit_event_type ON subscription_audit(event_type);
CREATE INDEX idx_subscription_audit_created_at ON subscription_audit(created_at DESC);
CREATE INDEX idx_subscription_audit_stripe_event ON subscription_audit(stripe_event_id);

-- Add comments for documentation
COMMENT ON TABLE subscription_audit IS 'Audit trail for all subscription changes and webhook events';
COMMENT ON COLUMN subscription_audit.event_type IS 'Type of event: created, updated, cancelled, payment_failed, etc.';
COMMENT ON COLUMN subscription_audit.stripe_event_id IS 'Stripe event ID (evt_xxx) for webhook-triggered changes';
COMMENT ON COLUMN subscription_audit.metadata IS 'Additional event data in JSON format';
