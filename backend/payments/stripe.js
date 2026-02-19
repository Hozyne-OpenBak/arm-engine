const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialize Stripe customer
exports.createCustomer = async (email, userId) => {
  const customer = await stripe.customers.create({
    email,
    metadata: { userId }
  });
  return customer.id;
};

// Create a subscription
exports.createSubscription = async (customerId, planId, paymentMethodId) => {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env[`STRIPE_PRICE_${planId.toUpperCase()}`] }],
    expand: ['latest_invoice.payment_intent']
  });
  
  return subscription;
};

// Update subscription plan
exports.updateSubscription = async (subscriptionId, planId) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    items: [{ price: process.env[`STRIPE_PRICE_${planId.toUpperCase()}`] }],
  });
  return subscription;
};

// Cancel a subscription
exports.cancelSubscription = async (subscriptionId) => {
  const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
  return deletedSubscription;
};