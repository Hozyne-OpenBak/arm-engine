import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface PricingTier {
  id: number;
  name: string;
  stripePriceId: string;
  price: number;
  currency: string;
  billingInterval: string;
  features: string[];
  displayOrder: number;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

/**
 * Fetch all pricing tiers
 */
export const getPricingTiers = async (): Promise<PricingTier[]> => {
  const response = await apiClient.get('/pricing');
  return response.data.data;
};

/**
 * Create a Stripe Checkout session
 */
export const createCheckoutSession = async (priceId: string): Promise<CheckoutSession> => {
  const response = await apiClient.post('/checkout/session', { priceId });
  return response.data.data;
};

/**
 * Get checkout session status
 */
export const getCheckoutSession = async (sessionId: string): Promise<any> => {
  const response = await apiClient.get(`/checkout/session/${sessionId}`);
  return response.data.data;
};

export default apiClient;
