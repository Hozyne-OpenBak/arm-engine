const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../utils/db');

/**
 * Create a Stripe Checkout session for subscription
 * Requires authentication
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user.id; // From JWT middleware

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID is required'
      });
    }

    // Verify the price exists in our database
    const priceResult = await db.query(
      'SELECT id, stripe_price_id FROM pricing_tiers WHERE stripe_price_id = $1 AND is_active = true',
      [priceId]
    );

    if (priceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid price ID'
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    const userResult = await db.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0]?.stripe_customer_id) {
      stripeCustomerId = userResult.rows[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const user = await db.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );
      
      const customer = await stripe.customers.create({
        email: user.rows[0].email,
        metadata: { userId: userId.toString() }
      });

      // Save customer ID to database
      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userId]
      );

      stripeCustomerId = customer.id;
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: userId.toString()
      }
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
};

/**
 * Get checkout session details
 * Requires authentication
 */
exports.getCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify this session belongs to the current user
    if (session.metadata.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to checkout session'
      });
    }

    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customer: session.customer,
        subscription: session.subscription
      }
    });
  } catch (error) {
    console.error('Error fetching checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checkout session'
    });
  }
};
