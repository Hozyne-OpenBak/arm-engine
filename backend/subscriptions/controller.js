const plans = require('./plans');
const stripe = require('../payments/stripe');
const { getUserById } = require('../auth/userHelper'); // Assuming helper from Phase 1

// Create subscription (new user or upgrade plan)
exports.createSubscription = async (req, res) => {
  const { planId, paymentMethodId } = req.body;
  const userId = req.user.id; // From JWT middleware

  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ message: 'Invalid plan selected' });

  try {
    const user = await getUserById(userId);
    const stripeCustomerId = user.stripeCustomerId || await stripe.createCustomer(user.email, userId);

    if (!user.stripeCustomerId) {
      // Update user with new Stripe Customer ID
      await user.updateStripeCustomerId(stripeCustomerId);
    }

    const subscription = await stripe.createSubscription(stripeCustomerId, plan.id, paymentMethodId);
    return res.status(201).json({ subscription });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating subscription', error });
  }
};

// Upgrade subscription plan
exports.upgradeSubscription = async (req, res) => {
  const { planId } = req.body;
  const userId = req.user.id; // From JWT middleware

  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ message: 'Invalid plan selected' });

  try {
    const user = await getUserById(userId);
    const existingSubscriptionId = user.subscriptionId; // Assuming saved in user model

    const updatedSubscription = await stripe.updateSubscription(existingSubscriptionId, plan.id);
    return res.status(200).json({ subscription: updatedSubscription });
  } catch (error) {
    return res.status(500).json({ message: 'Error upgrading subscription', error });
  }
};

// Get current subscription details
exports.getCurrentSubscription = async (req, res) => {
  const userId = req.user.id; // From JWT middleware

  try {
    const user = await getUserById(userId);
    return res.status(200).json({ subscriptionId: user.subscriptionId, plan: user.plan });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching subscription', error });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  const userId = req.user.id; // From JWT middleware

  try {
    const user = await getUserById(userId);
    await stripe.cancelSubscription(user.subscriptionId);

    // Update user to remove subscription ID
    await user.updateSubscriptionId(null);
    return res.status(200).json({ message: 'Subscription canceled' });
  } catch (error) {
    return res.status(500).json({ message: 'Error canceling subscription', error });
  }
};