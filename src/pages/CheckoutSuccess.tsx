import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getCheckoutSession } from '../../api/client';
import './CheckoutSuccess.css';

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      loadSessionDetails(sessionId);
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [searchParams]);

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const data = await getCheckoutSession(sessionId);
      setSession(data);
    } catch (err) {
      setError('Failed to load session details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Verifying your subscription...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-card error-card">
            <div className="icon-circle error-icon">✗</div>
            <h1>Something went wrong</h1>
            <p>{error}</p>
            <Link to="/pricing" className="btn-primary">
              Back to Pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-card success-card">
          <div className="icon-circle success-icon">✓</div>
          <h1>Subscription Successful!</h1>
          <p className="success-message">
            Thank you for subscribing. Your account has been activated.
          </p>

          {session && (
            <div className="session-details">
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value status-badge">
                  {session.paymentStatus}
                </span>
              </div>
              {session.subscription && (
                <div className="detail-row">
                  <span className="detail-label">Subscription ID:</span>
                  <span className="detail-value">{session.subscription}</span>
                </div>
              )}
            </div>
          )}

          <div className="action-buttons">
            <Link to="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
