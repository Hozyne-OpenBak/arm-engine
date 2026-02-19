import React from 'react';

const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'Free Trial',
      price: '$0',
      period: '14 days',
      features: [
        'Full platform access',
        '1 tenant instance',
        'Community support',
        'Basic features',
        'No credit card required'
      ],
      cta: 'Start Free Trial'
    },
    {
      name: 'Basic',
      price: '$29',
      period: 'per month',
      features: [
        'Everything in Free Trial',
        '5 tenant instances',
        'Email support',
        'Standard features',
        'SSL certificates included'
      ],
      cta: 'Get Started',
      highlighted: true
    },
    {
      name: 'Pro',
      price: '$99',
      period: 'per month',
      features: [
        'Everything in Basic',
        'Unlimited tenant instances',
        'Priority support',
        'Advanced features',
        'Custom integrations',
        'Dedicated account manager'
      ],
      cta: 'Contact Sales'
    }
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">
            Start with a free trial and upgrade as you grow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                plan.highlighted ? 'ring-2 ring-blue-600 transform scale-105' : ''
              }`}
            >
              <div className={`px-6 py-8 ${plan.highlighted ? 'bg-blue-600 text-white' : ''}`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`ml-2 ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                    / {plan.period}
                  </span>
                </div>
              </div>
              
              <div className="px-6 py-8">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg
                        className="h-6 w-6 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>All plans include 14-day money-back guarantee</p>
          <p className="mt-2">Need a custom enterprise plan? <a href="/contact" className="text-blue-600 hover:underline">Contact us</a></p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
