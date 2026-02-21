import React, { useEffect, useState } from 'react';
import { getPricingTiers, createCheckoutSession, PricingTier } from '../../api/client';
import PricingCard from '../../components/pricing/PricingCard';
import './PricingPage.css';

const PricingPage: React.FC = () => {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricingTiers();
  }, []);

  const loadPricingTiers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPricingTiers();
      setTiers(data);
    } catch (err: any) {
      setError('Failed to load pricing information. Please try again later.');
      console.error('Error loading pricing tiers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (stripePriceId: string) => {
    try {
      setCheckoutLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      if (!token) {
        // Redirect to login
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      // Create checkout session
      const session = await createCheckoutSession(stripePriceId);
      
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate checkout. Please try again.');
      console.error('Error creating checkout session:', err);
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="pricing-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading pricing information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        <div className="pricing-header">
          <h1>Choose Your Plan</h1>
          <p>Select the perfect plan for your needs</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="error-dismiss">×</button>
          </div>
        )}

        <div className="pricing-grid">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              onSelect={handleSelectPlan}
              isLoading={checkoutLoading}
            />
          ))}
        </div>

        {tiers.length === 0 && !loading && (
          <div className="empty-state">
            <p>No pricing plans available at the moment.</p>
            <button onClick={loadPricingTiers} className="btn-retry">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
