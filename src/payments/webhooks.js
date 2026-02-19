const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const { getUserByStripeId, updateUserSubscriptionStatus } = require('../auth/userHelper');

exports.handleStripeWebhooks = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'customer.subscription.created': {
      const subscription = event.data.object;
      const user = await getUserByStripeId(subscription.customer);
      await updateUserSubscriptionStatus(user.id, subscription.id, subscription.plan.id);
      break;
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
      break;
    }
    case 'payment_intent.failed': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent failed: ${paymentIntent.id}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const user = await getUserByStripeId(subscription.customer);
      await updateUserSubscriptionStatus(user.id, null, null);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};