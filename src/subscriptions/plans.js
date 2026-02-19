const plans = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price: 0,
    features: ['Basic feature set'],
    trial_days: 14
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 10,
    features: ['Basic feature set', 'Priority support'],
    trial_days: 0
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    features: ['Pro feature set', 'Priority support', 'Advanced analytics'],
    trial_days: 0
  }
];

module.exports = plans;