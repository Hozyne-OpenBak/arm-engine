const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { handleWebhook } = require('./webhooks');

/**
 * Stripe webhook endpoint
 * IMPORTANT: This route needs raw body, not JSON parsed
 * Configure this in your Express app setup
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Pass verified event to handler
  // Convert body back to JSON for handler
  req.body = event;
  await handleWebhook(req, res);
});

module.exports = router;
