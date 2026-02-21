# Phase 3: Pricing & Checkout Flow - Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account with API keys
- Environment variables configured

## Environment Variables

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/arm_engine

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000

# Frontend API URL
REACT_APP_API_URL=http://localhost:3001/api

# Authentication (from Phase 2)
JWT_SECRET=your-jwt-secret
```

## Database Setup

1. **Run migrations:**
   ```bash
   psql -d arm_engine -f migrations/001-create-users.sql
   psql -d arm_engine -f migrations/002-create-subscriptions.sql
   psql -d arm_engine -f migrations/003-create-tenants.sql
   psql -d arm_engine -f migrations/004-add-stripe-fields-subscriptions.sql
   psql -d arm_engine -f migrations/005-create-pricing-tiers.sql
   psql -d arm_engine -f migrations/006-create-subscription-audit.sql
   ```

2. **Create Stripe products:**
   - Go to Stripe Dashboard → Products
   - Create 3 products: Starter ($9.99), Professional ($29.99), Enterprise ($99.99)
   - Copy the `price_id` and `prod_id` for each

3. **Update seed data:**
   - Edit `migrations/007-seed-pricing-tiers.sql`
   - Replace placeholder IDs with actual Stripe IDs
   - Run: `psql -d arm_engine -f migrations/007-seed-pricing-tiers.sql`

## Stripe Webhook Setup

1. **Local development (using Stripe CLI):**
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
   Copy the webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

2. **Production:**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy webhook signing secret to production environment

## Backend Setup

1. **Install dependencies:**
   ```bash
   npm install stripe express express-rate-limit pg
   ```

2. **Register routes** (in your main Express app):
   ```javascript
   const pricingRoutes = require('./backend/pricing/routes');
   const checkoutRoutes = require('./backend/checkout/routes');
   const webhookRoutes = require('./backend/payments/webhook-routes');

   app.use('/api/pricing', pricingRoutes);
   app.use('/api/checkout', checkoutRoutes);
   app.use('/api/webhooks', webhookRoutes);
   ```

3. **Start backend:**
   ```bash
   node server.js  # or npm run dev
   ```

## Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install axios react-router-dom
   ```

2. **Add routes** (in your App.tsx):
   ```tsx
   import { BrowserRouter, Routes, Route } from 'react-router-dom';
   import PricingPage from './pages/PricingPage';
   import CheckoutSuccess from './pages/CheckoutSuccess';

   function App() {
     return (
       <BrowserRouter>
         <Routes>
           <Route path="/pricing" element={<PricingPage />} />
           <Route path="/checkout/success" element={<CheckoutSuccess />} />
         </Routes>
       </BrowserRouter>
     );
   }
   ```

3. **Start frontend:**
   ```bash
   npm start
   ```

## Testing

### Manual Testing Checklist

- [ ] Pricing page loads and displays all tiers
- [ ] Clicking "Select Plan" redirects to login if not authenticated
- [ ] Clicking "Select Plan" when authenticated redirects to Stripe Checkout
- [ ] Completing checkout redirects to success page
- [ ] Success page displays subscription details
- [ ] Webhook events are received and processed
- [ ] Database records are created correctly
- [ ] Audit trail is logged

### Test Cards (Stripe Test Mode)

- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

## Monitoring

### Key Metrics to Track

- Pricing API response times (target: <200ms)
- Checkout session creation success rate (target: >99%)
- Webhook delivery success rate (target: >95%)
- Database query performance

### Alerts to Configure

- Pricing API errors (rate > 1%)
- Checkout API errors (rate > 1%)
- Webhook delivery failures
- Database connection failures

## Troubleshooting

### Pricing page not loading
- Check API endpoint is reachable: `curl http://localhost:3001/api/pricing`
- Verify database connection
- Check CORS configuration

### Checkout redirect fails
- Verify user is authenticated (JWT token in localStorage)
- Check Stripe API key is valid
- Verify pricing tier exists in database

### Webhooks not received
- Confirm webhook secret matches Stripe Dashboard
- Verify endpoint URL is publicly accessible
- Check webhook signature verification logic
- View webhook logs in Stripe Dashboard

### Database errors
- Ensure all migrations have run
- Check foreign key constraints
- Verify user has necessary permissions

## Next Steps

After Phase 3 is deployed:
1. Monitor webhook delivery for 48 hours
2. Gather user feedback on pricing page UX
3. Begin Phase 4: Customer Billing Dashboard
4. Plan Phase 5: Webhook Robustness & Testing

---

**Phase 3 Status:** Backend + Frontend complete | Testing + Deployment in progress
**Last Updated:** 2026-02-20
