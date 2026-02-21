const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../utils/db');
const { provisionTenant } = require('../provisioning/controller');

/**
 * Handle Stripe webhook events
 * Signature verification is performed in the route middleware
 */
async function handleWebhook(req, res) {
  const event = req.body;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle completed checkout session
 */
async function handleCheckoutCompleted(session) {
  const userId = parseInt(session.metadata.userId);
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Update user with Stripe customer ID if not already set
  await db.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customerId, userId]
  );

  // Audit log
  await logSubscriptionEvent(null, userId, 'checkout_completed', {
    stripe_event_id: session.id,
    stripe_event_type: 'checkout.session.completed',
    session_id: session.id,
    subscription_id: subscriptionId
  });
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0].price.id;
  const status = subscription.status;

  // Get user ID from customer
  const userResult = await db.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`User not found for customer ${customerId}`);
  }

  const userId = userResult.rows[0].id;

  // Get plan name from pricing tiers
  const priceResult = await db.query(
    'SELECT name FROM pricing_tiers WHERE stripe_price_id = $1',
    [priceId]
  );

  const planName = priceResult.rows[0]?.name || 'unknown';

  // Create subscription record
  const result = await db.query(
    `INSERT INTO subscriptions 
     (user_id, plan, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, start_date)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
     RETURNING id`,
    [userId, planName, status, customerId, subscriptionId, priceId]
  );

  const dbSubscriptionId = result.rows[0].id;

  // Audit log
  await logSubscriptionEvent(dbSubscriptionId, userId, 'created', {
    stripe_event_id: subscription.id,
    stripe_event_type: 'customer.subscription.created',
    new_status: status,
    new_plan: planName
  });

  // Trigger provisioning if subscription is active
  if (status === 'active') {
    await provisionTenant({
      subscriptionId: dbSubscriptionId,
      userId: userId
    });
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const priceId = subscription.items.data[0].price.id;

  // Get existing subscription from database
  const existingResult = await db.query(
    'SELECT id, user_id, status AS old_status, plan AS old_plan FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  if (existingResult.rows.length === 0) {
    console.error(`Subscription not found in database: ${subscriptionId}`);
    return;
  }

  const dbSubscription = existingResult.rows[0];

  // Get new plan name
  const priceResult = await db.query(
    'SELECT name FROM pricing_tiers WHERE stripe_price_id = $1',
    [priceId]
  );

  const newPlanName = priceResult.rows[0]?.name || 'unknown';

  // Update subscription
  await db.query(
    `UPDATE subscriptions 
     SET status = $1, plan = $2, stripe_price_id = $3, updated_at = CURRENT_TIMESTAMP
     WHERE stripe_subscription_id = $4`,
    [status, newPlanName, priceId, subscriptionId]
  );

  // Audit log
  await logSubscriptionEvent(dbSubscription.id, dbSubscription.user_id, 'updated', {
    stripe_event_id: subscription.id,
    stripe_event_type: 'customer.subscription.updated',
    old_status: dbSubscription.old_status,
    new_status: status,
    old_plan: dbSubscription.old_plan,
    new_plan: newPlanName
  });
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id;

  // Get existing subscription
  const result = await db.query(
    'SELECT id, user_id, status AS old_status, plan AS old_plan FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  if (result.rows.length === 0) {
    console.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  const dbSubscription = result.rows[0];

  // Update subscription status to cancelled
  await db.query(
    `UPDATE subscriptions 
     SET status = 'cancelled', end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
     WHERE stripe_subscription_id = $1`,
    [subscriptionId]
  );

  // Audit log
  await logSubscriptionEvent(dbSubscription.id, dbSubscription.user_id, 'cancelled', {
    stripe_event_id: subscription.id,
    stripe_event_type: 'customer.subscription.deleted',
    old_status: dbSubscription.old_status,
    new_status: 'cancelled'
  });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  // Log successful payment
  const result = await db.query(
    'SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  if (result.rows.length > 0) {
    const subscription = result.rows[0];
    await logSubscriptionEvent(subscription.id, subscription.user_id, 'payment_succeeded', {
      stripe_event_id: invoice.id,
      stripe_event_type: 'invoice.paid',
      amount: invoice.amount_paid,
      currency: invoice.currency
    });
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  // Log failed payment
  const result = await db.query(
    'SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  if (result.rows.length > 0) {
    const subscription = result.rows[0];
    await logSubscriptionEvent(subscription.id, subscription.user_id, 'payment_failed', {
      stripe_event_id: invoice.id,
      stripe_event_type: 'invoice.payment_failed',
      amount: invoice.amount_due,
      currency: invoice.currency,
      error: invoice.last_payment_error?.message
    });
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSucceeded(paymentIntent) {
  // Trigger provisioning if metadata contains subscription info
  const { subscriptionId, tenantId } = paymentIntent.metadata || {};
  
  if (subscriptionId && tenantId) {
    await provisionTenant({
      subscriptionId,
      tenantId
    });
  }
}

/**
 * Log subscription event to audit table
 */
async function logSubscriptionEvent(subscriptionId, userId, eventType, metadata) {
  const { stripe_event_id, stripe_event_type, old_status, new_status, old_plan, new_plan, ...rest } = metadata || {};

  await db.query(
    `INSERT INTO subscription_audit 
     (subscription_id, user_id, event_type, old_status, new_status, old_plan, new_plan, stripe_event_id, stripe_event_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      subscriptionId,
      userId,
      eventType,
      old_status || null,
      new_status || null,
      old_plan || null,
      new_plan || null,
      stripe_event_id || null,
      stripe_event_type || null,
      JSON.stringify(rest)
    ]
  );
}

module.exports = {
  handleWebhook
};
