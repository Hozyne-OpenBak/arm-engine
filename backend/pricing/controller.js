const db = require('../utils/db');

/**
 * Get all active pricing tiers
 * Public endpoint - no authentication required
 */
exports.getPricingTiers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id, name, stripe_price_id, price_cents, currency, 
        billing_interval, features, display_order
       FROM pricing_tiers 
       WHERE is_active = true 
       ORDER BY display_order ASC, price_cents ASC`
    );

    const tiers = result.rows.map(tier => ({
      id: tier.id,
      name: tier.name,
      stripePriceId: tier.stripe_price_id,
      price: tier.price_cents / 100, // Convert cents to dollars
      currency: tier.currency,
      billingInterval: tier.billing_interval,
      features: tier.features,
      displayOrder: tier.display_order
    }));

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    console.error('Error fetching pricing tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing tiers'
    });
  }
};

/**
 * Get a specific pricing tier by ID
 * Public endpoint - no authentication required
 */
exports.getPricingTier = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT 
        id, name, stripe_price_id, price_cents, currency, 
        billing_interval, features, display_order
       FROM pricing_tiers 
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pricing tier not found'
      });
    }

    const tier = result.rows[0];
    res.json({
      success: true,
      data: {
        id: tier.id,
        name: tier.name,
        stripePriceId: tier.stripe_price_id,
        price: tier.price_cents / 100,
        currency: tier.currency,
        billingInterval: tier.billing_interval,
        features: tier.features,
        displayOrder: tier.display_order
      }
    });
  } catch (error) {
    console.error('Error fetching pricing tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing tier'
    });
  }
};
