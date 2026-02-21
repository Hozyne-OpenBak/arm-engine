import React from 'react';
import { PricingTier } from '../../api/client';
import './PricingCard.css';

interface PricingCardProps {
  tier: PricingTier;
  onSelect: (stripePriceId: string) => void;
  isLoading: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ tier, onSelect, isLoading }) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(price);
  };

  const formatInterval = (interval: string) => {
    return interval === 'monthly' ? 'month' : 'year';
  };

  return (
    <div className="pricing-card">
      <div className="pricing-card-header">
        <h3 className="pricing-card-title">{tier.name}</h3>
        <div className="pricing-card-price">
          <span className="price-amount">{formatPrice(tier.price, tier.currency)}</span>
          <span className="price-interval">/{formatInterval(tier.billingInterval)}</span>
        </div>
      </div>
      
      <div className="pricing-card-features">
        <ul>
          {tier.features.map((feature, index) => (
            <li key={index}>
              <span className="feature-checkmark">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="pricing-card-action">
        <button
          className="btn-select-plan"
          onClick={() => onSelect(tier.stripePriceId)}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Select Plan'}
        </button>
      </div>
    </div>
  );
};

export default PricingCard;
