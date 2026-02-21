-- Seed data for pricing tiers
-- Note: Update stripe_price_id and stripe_product_id with actual Stripe IDs after creating products in Stripe Dashboard

-- Basic Plan
INSERT INTO pricing_tiers (
  name, 
  stripe_price_id, 
  stripe_product_id, 
  price_cents, 
  currency, 
  billing_interval, 
  features, 
  display_order,
  is_active
) VALUES (
  'Starter',
  'price_REPLACE_WITH_ACTUAL_STRIPE_PRICE_ID_1',
  'prod_REPLACE_WITH_ACTUAL_STRIPE_PRODUCT_ID_1',
  999,  -- $9.99
  'usd',
  'monthly',
  '["Up to 5 repositories", "Daily dependency scans", "Basic email notifications", "Community support"]'::jsonb,
  1,
  true
) ON CONFLICT (stripe_price_id) DO NOTHING;

-- Pro Plan
INSERT INTO pricing_tiers (
  name,
  stripe_price_id,
  stripe_product_id,
  price_cents,
  currency,
  billing_interval,
  features,
  display_order,
  is_active
) VALUES (
  'Professional',
  'price_REPLACE_WITH_ACTUAL_STRIPE_PRICE_ID_2',
  'prod_REPLACE_WITH_ACTUAL_STRIPE_PRODUCT_ID_2',
  2999,  -- $29.99
  'usd',
  'monthly',
  '["Up to 25 repositories", "Real-time dependency scans", "Priority email & Slack notifications", "Advanced security alerts", "Priority support"]'::jsonb,
  2,
  true
) ON CONFLICT (stripe_price_id) DO NOTHING;

-- Enterprise Plan
INSERT INTO pricing_tiers (
  name,
  stripe_price_id,
  stripe_product_id,
  price_cents,
  currency,
  billing_interval,
  features,
  display_order,
  is_active
) VALUES (
  'Enterprise',
  'price_REPLACE_WITH_ACTUAL_STRIPE_PRICE_ID_3',
  'prod_REPLACE_WITH_ACTUAL_STRIPE_PRODUCT_ID_3',
  9999,  -- $99.99
  'usd',
  'monthly',
  '["Unlimited repositories", "Real-time dependency scans", "Multi-channel notifications", "Advanced security & compliance reports", "Custom integrations", "Dedicated support", "SLA guarantee"]'::jsonb,
  3,
  true
) ON CONFLICT (stripe_price_id) DO NOTHING;

-- Verify inserted data
SELECT name, price_cents / 100.0 AS price_usd, billing_interval, is_active 
FROM pricing_tiers 
ORDER BY display_order;
