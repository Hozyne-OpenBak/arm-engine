---
agent_id: architect
product_id: arm_engine
phase: mvp
decision_type: proposal
confidence: 0.90
risk_score: 53
budget_impact_usd: 0
escalate_to: null
artifacts:
  - type: technical_architecture_document
    path: docs/phase3_technical_design.md
    summary: Technical architecture for Stripe Checkout integration and subscription management
---

# Technical Architecture - Phase 3: Pricing & Checkout Flow

## Executive Summary

Phase 3 integrates Stripe Checkout for subscription management, enabling users to select plans, complete payment via Stripe's PCI-compliant hosted checkout, and receive subscription activation. This phase builds on Phase 2 authentication and connects to Epic #31 backend infrastructure.

**Risk Score:** 53/100 (MODERATE - no escalation required)  
**Confidence:** 0.90  
**Budget Impact:** $0 USD upfront, variable Stripe transaction fees (2.9% + $0.30)

---

## A. Stripe Checkout Integration Design

### Checkout Session Flow

```
[User on /pricing page]
    ↓ Clicks "Subscribe" button for plan (e.g., "Basic")
    ↓
[Authentication Check]
    ├─ Not authenticated → Redirect to /login?returnTo=/pricing&plan=basic
    └─ Authenticated (JWT in localStorage) → Continue
    ↓
[Frontend: Create Checkout Session]
    ↓ POST /api/subscriptions/create-checkout-session
    ↓ Body: { planId: "basic" }
    ↓ Headers: Authorization: Bearer <JWT>
    ↓
[Backend: Session Creation (Epic #31 endpoint)]
    ↓ Validates JWT, extracts userId
    ↓ Validates planId exists in plans
    ↓ Creates Stripe Checkout Session via Stripe API
    ↓ Returns { sessionId: "cs_test_...", checkoutUrl: "https://checkout.stripe.com/..." }
    ↓
[Frontend: Redirect to Stripe]
    ↓ Uses Stripe.js: stripe.redirectToCheckout({ sessionId })
    ↓ User leaves our site, enters Stripe-hosted checkout
    ↓
[User on Stripe Checkout Page]
    ↓ Enters payment details (card number, expiration, CVC)
    ↓ Stripe validates payment
    ↓
[Payment Processing]
    ├─ Success → Stripe redirects to: /checkout/success?session_id=cs_test_...
    └─ Cancel → Stripe redirects to: /checkout/cancel
    ↓
[Webhook (Async, Backend-Only)]
    ↓ Stripe sends webhook: POST /api/payments/webhook
    ↓ Event: checkout.session.completed, payment_intent.succeeded
    ↓ Backend validates signature, processes subscription
    ↓ Backend provisions tenant (Kubernetes namespace)
    ↓ Backend updates subscription status in database
```

### API Integration Points

**Backend Endpoint (Already Exists from Epic #31):**
- `POST /api/subscriptions/create-checkout-session`
  - Input: `{ planId: string }` (userId extracted from JWT)
  - Output: `{ sessionId: string, checkoutUrl: string }`
  - Authentication: Requires valid JWT
  - Validation: planId must exist, user must not have active subscription

**Frontend API Client (New Method):**
```typescript
// services/api.ts
export const subscriptionsAPI = {
  createCheckoutSession: (planId: string) => 
    api.post('/api/subscriptions/create-checkout-session', { planId }),
};
```

### Stripe.js Library Integration

**Installation:**
```bash
npm install @stripe/stripe-js
```

**Usage:**
```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

// In CheckoutButton component:
const stripe = await stripePromise;
const { sessionId } = await subscriptionsAPI.createCheckoutSession(planId);
await stripe.redirectToCheckout({ sessionId });
```

### Security Considerations

**Publishable Key Exposure:**
- Stripe publishable key (pk_test_... or pk_live_...) is SAFE to expose in frontend
- Public by design, scoped to Stripe account
- Only allows client-side operations (redirect to checkout)
- Cannot access sensitive data or perform unauthorized actions
- Store in `REACT_APP_STRIPE_PUBLISHABLE_KEY` environment variable

**Session Creation Security:**
- Backend creates checkout sessions (prevents price manipulation)
- JWT authentication required (only authenticated users can checkout)
- Backend validates plan ID and pricing (no trust of client input)
- Amount/price determined by backend, not client
- Session IDs short-lived (expire after 24 hours)

**Webhook Security (Backend - Already Implemented in Epic #31):**
- Webhook signature validation prevents spoofing
- Uses Stripe webhook signing secret (server-side only)
- Frontend never interacts with webhooks directly

**PCI Compliance:**
- No card data touches our frontend or backend
- Stripe Checkout handles all payment input (PCI DSS compliant)
- Our frontend only handles redirect logic
- Production requires HTTPS (Vercel provides by default)

---

## B. Subscription Plan Data Model Alignment

### Backend Plans (from Epic #31)

```javascript
// backend/subscriptions/plans.js
const PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0, // cents
    priceDisplay: '$0',
    features: [
      'Basic ARM deployment',
      '1 environment',
      'Community support'
    ]
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 2900, // $29.00
    priceDisplay: '$29',
    interval: 'month',
    features: [
      'Advanced ARM workflows',
      '5 environments',
      'Email support',
      'Basic monitoring'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9900, // $99.00
    priceDisplay: '$99',
    interval: 'month',
    features: [
      'Enterprise ARM features',
      'Unlimited environments',
      'Priority support',
      'Advanced monitoring',
      'Custom integrations'
    ],
    popular: true
  }
};
```

### Frontend Plan Display Options

**Option 1: API Endpoint (Recommended)**
- Backend exposes: `GET /api/subscriptions/plans`
- Frontend fetches plans on /pricing page load
- Ensures frontend/backend always in sync
- Allows dynamic plan updates without frontend deployment

**Option 2: Hardcoded Frontend (Acceptable for Phase 3)**
- Frontend hardcodes plan data matching backend exactly
- Simpler implementation, no additional API call
- Requires frontend deployment to update plans
- Must maintain strict alignment with backend

**Recommendation for Phase 3:** Use Option 2 (hardcoded) for speed, migrate to Option 1 in Phase 4 or 5.

---

## C. Frontend Flow Diagram

### User Journey: Plan Selection → Payment → Confirmation

```
┌─────────────────────────────────────────────────────────────┐
│ /pricing Page (Enhanced from Phase 1)                       │
│ - Display 3 plan cards: Free, Basic, Pro                    │
│ - Each card shows: name, price, features, Subscribe button  │
└─────────────────────────┬───────────────────────────────────┘
                          │ User clicks "Subscribe to Basic"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ CheckoutButton Component                                     │
│ - Check if authenticated (useAuth hook)                     │
│   ├─ Not authenticated → Redirect to /login?returnTo=...    │
│   └─ Authenticated → Continue                                │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Create Checkout Session                                      │
│ - Show loading state ("Processing...")                       │
│ - POST /api/subscriptions/create-checkout-session           │
│ - Receive { sessionId, checkoutUrl }                         │
│   ├─ Success → Continue                                      │
│   └─ Error → Show error message + retry button               │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Redirect to Stripe Checkout                                  │
│ - stripe.redirectToCheckout({ sessionId })                   │
│ - User leaves our site                                       │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stripe Checkout Page (Stripe-hosted)                         │
│ - User enters payment details                                │
│ - Stripe validates card                                      │
│ - Stripe processes payment                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
        Payment Success      Payment Cancel/Fail
                │                   │
                ↓                   ↓
┌───────────────────────────┐  ┌──────────────────────────┐
│ /checkout/success         │  │ /checkout/cancel          │
│ - Extract session_id      │  │ - Show cancel message     │
│ - Show success message    │  │ - Link to /pricing        │
│ - "Payment successful!    │  │ - "Payment canceled.      │
│   Your subscription is    │  │   Try again anytime."     │
│   being activated."       │  │                           │
│ - Redirect to /dashboard  │  │                           │
│   after 3 seconds         │  │                           │
└───────────────────────────┘  └──────────────────────────┘
```

### Error Handling Scenarios

**Scenario 1: Network error during session creation**
- Show error message: "Failed to connect. Please check your internet and try again."
- Provide "Retry" button
- Log error to console for debugging

**Scenario 2: Invalid plan ID**
- Backend returns 400 error
- Show error: "Invalid plan selected. Please refresh and try again."
- Log error

**Scenario 3: User already has active subscription**
- Backend returns 409 conflict
- Show message: "You already have an active subscription. Visit your dashboard."
- Provide link to /dashboard

**Scenario 4: Stripe redirect fails**
- Show error: "Failed to redirect to checkout. Please try again or contact support."
- Provide retry button and support link

**Scenario 5: Invalid session_id on success page**
- Show error: "Invalid payment session. If you completed payment, check your dashboard."
- Provide link to /dashboard and /pricing

---

## D. Webhook Confirmation UX Behavior

### Backend Webhook Flow (Epic #31 - Already Implemented)

1. Stripe sends webhook event to `POST /api/payments/webhook`
2. Backend validates webhook signature (security)
3. Backend processes event:
   - `checkout.session.completed` → Create subscription in database
   - `payment_intent.succeeded` → Mark payment as successful
   - `customer.subscription.created` → Provision tenant (Kubernetes)
4. Backend updates subscription status
5. Provisioning completes asynchronously (5-30 seconds typically)

### Frontend UX Options Analysis

**Option 1: Passive UX (Recommended for Phase 3)**
- **Success page displays:** "Payment successful! Your subscription is being activated."
- **No polling or real-time updates**
- **Redirect to /dashboard after 3 seconds**
- **Dashboard shows:** "Setting up your subscription..." if provisioning incomplete
- **Provisioning completes async** (webhook triggers backend)
- **Pros:** Simple, no polling overhead, works with slow webhooks
- **Cons:** User doesn't see real-time progress

**Option 2: Active Polling**
- Success page polls backend: `GET /api/subscriptions/status?sessionId=...`
- Poll every 2 seconds for up to 30 seconds
- Display progress indicator or loading animation
- Once provisioning complete, show "Your subscription is active!"
- **Pros:** Real-time feedback, better UX
- **Cons:** Adds backend polling endpoint, increased server load

**Option 3: WebSocket/SSE (Future Enhancement)**
- Real-time updates via WebSocket or Server-Sent Events
- Push notification when provisioning complete
- **Pros:** Best UX, instant feedback
- **Cons:** Most complex, requires WebSocket infrastructure

**Decision for Phase 3:** **Option 1 (Passive UX)**

**Rationale:**
- Simplest implementation (no polling endpoint needed)
- Webhook processing is async anyway (typically 5-30 seconds)
- User doesn't need to wait on success page
- Dashboard can show provisioning status (future enhancement)
- Minimizes technical debt for Phase 3
- Can upgrade to Option 2 in Phase 4 if needed

### Success Page Implementation

```typescript
// pages/CheckoutSuccess.tsx
- Extract session_id from URL query params
- Validate session_id format
- Display success message
- Show "Redirecting to dashboard..." after 2 seconds
- Redirect to /dashboard after 3 seconds
- If no session_id: show error + link to dashboard
```

---

## E. Component Architecture

### New Components

**1. CheckoutButton Component**
- **Path:** `frontend/src/components/checkout/CheckoutButton.tsx`
- **Props:** `{ planId: string, planName: string }`
- **Responsibilities:**
  - Check authentication status (useAuth)
  - Handle "Subscribe" button click
  - Show loading state during session creation
  - Call `subscriptionsAPI.createCheckoutSession(planId)`
  - Redirect to Stripe Checkout on success
  - Display error messages on failure
- **State:** `loading`, `error`
- **Dependencies:** useAuth, subscriptionsAPI, @stripe/stripe-js

**2. PricingPlans Component**
- **Path:** `frontend/src/components/checkout/PricingPlans.tsx`
- **Props:** None (or optional: `plans` if fetched from API)
- **Responsibilities:**
  - Display plan cards (Free, Basic, Pro)
  - Render plan details (name, price, features)
  - Integrate CheckoutButton for each paid plan
  - Highlight "Popular" plan (Pro)
- **State:** None (or `plans` if fetched from API)
- **Dependencies:** CheckoutButton

**3. CheckoutSuccess Page**
- **Path:** `frontend/src/pages/CheckoutSuccess.tsx`
- **Props:** None (reads URL params)
- **Responsibilities:**
  - Extract session_id from URL
  - Display success message
  - Show countdown/redirect message
  - Auto-redirect to /dashboard after 3 seconds
  - Handle missing/invalid session_id
- **State:** `countdown`
- **Dependencies:** MainLayout, useNavigate, useSearchParams

**4. CheckoutCancel Page**
- **Path:** `frontend/src/pages/CheckoutCancel.tsx`
- **Props:** None
- **Responsibilities:**
  - Display cancel message
  - Provide link back to /pricing
  - Encourage user to try again
- **State:** None
- **Dependencies:** MainLayout, Link

### Updated Components

**1. pages/Pricing.tsx**
- **Current:** Displays static pricing cards (from Phase 1)
- **Update:** Integrate PricingPlans component with CheckoutButton
- **Change:** Replace static "Get Started" links with functional CheckoutButton

**2. App.tsx**
- **Current:** Routes for Phase 1 + Phase 2 pages
- **Update:** Add routes for /checkout/success and /checkout/cancel

---

## F. API Service Updates

### Add to services/api.ts

```typescript
// Existing: authAPI
// New: subscriptionsAPI

export const subscriptionsAPI = {
  /**
   * Create Stripe Checkout session for plan subscription
   * Requires authentication (JWT in Authorization header)
   */
  createCheckoutSession: (planId: string) => 
    api.post('/api/subscriptions/create-checkout-session', { planId }),

  /**
   * Get available subscription plans
   * Optional: if backend exposes this endpoint
   */
  getPlans: () => 
    api.get('/api/subscriptions/plans'),

  /**
   * Get current user's subscription status
   * Optional: for dashboard display
   */
  getSubscriptionStatus: () => 
    api.get('/api/subscriptions/status'),
};
```

### Error Handling

```typescript
// In CheckoutButton component:
try {
  const response = await subscriptionsAPI.createCheckoutSession(planId);
  const { sessionId } = response.data;
  
  const stripe = await stripePromise;
  const { error } = await stripe.redirectToCheckout({ sessionId });
  
  if (error) {
    setError(error.message);
  }
} catch (err: any) {
  if (err.response?.status === 401) {
    // User not authenticated
    navigate(`/login?returnTo=/pricing&plan=${planId}`);
  } else if (err.response?.status === 409) {
    // User already has subscription
    setError('You already have an active subscription.');
  } else {
    setError('Failed to start checkout. Please try again.');
  }
}
```

---

## G. TypeScript Interfaces

### New Types File: frontend/src/types/subscription.ts

```typescript
/**
 * Subscription plan definition
 */
export interface Plan {
  id: string; // 'free' | 'basic' | 'pro'
  name: string; // 'Free Trial', 'Basic', 'Pro'
  price: number; // cents (0, 2900, 9900)
  priceDisplay: string; // '$0', '$29', '$99'
  interval?: string; // 'month' for paid plans
  features: string[];
  popular?: boolean; // highlight Pro plan
}

/**
 * Request to create Stripe Checkout session
 */
export interface CheckoutSessionRequest {
  planId: string;
}

/**
 * Response from create checkout session
 */
export interface CheckoutSessionResponse {
  sessionId: string; // Stripe session ID (cs_test_...)
  checkoutUrl: string; // Full Stripe Checkout URL
}

/**
 * User's subscription status
 */
export interface SubscriptionStatus {
  active: boolean;
  planId: string | null;
  status: 'active' | 'provisioning' | 'canceled' | 'past_due' | 'none';
  currentPeriodEnd?: string; // ISO date
}

/**
 * Checkout button props
 */
export interface CheckoutButtonProps {
  planId: string;
  planName: string;
  disabled?: boolean;
}
```

---

## H. Environment Variables

### New Frontend Variables

Add to `frontend/.env.example`:

```bash
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51H...  # Stripe publishable key
REACT_APP_CHECKOUT_SUCCESS_URL=http://localhost:3001/checkout/success  # Local dev
REACT_APP_CHECKOUT_CANCEL_URL=http://localhost:3001/checkout/cancel    # Local dev

# For production (.env.production):
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_51H...
# REACT_APP_CHECKOUT_SUCCESS_URL=https://yourdomain.com/checkout/success
# REACT_APP_CHECKOUT_CANCEL_URL=https://yourdomain.com/checkout/cancel
```

### Backend Variables (Already Exist from Epic #31)

```bash
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Note:** Backend variables are server-side only, never exposed to frontend.

---

## I. Routes Integration

### New Routes in App.tsx

```typescript
// Add to frontend/src/App.tsx
<Route path="/checkout/success" element={<CheckoutSuccess />} />
<Route path="/checkout/cancel" element={<CheckoutCancel />} />
```

### Updated Routes

```typescript
// Current routes (Phase 1 + Phase 2):
<Route path="/" element={<Landing />} />
<Route path="/about" element={<About />} />
<Route path="/pricing" element={<Pricing />} />  // Enhanced in Phase 3
<Route path="/contact" element={<Contact />} />
<Route path="/signup" element={<Signup />} />
<Route path="/login" element={<Login />} />
<Route path="/password-reset" element={<PasswordReset />} />
<Route path="/password-reset/:token" element={<PasswordReset />} />

// New in Phase 3:
<Route path="/checkout/success" element={<CheckoutSuccess />} />
<Route path="/checkout/cancel" element={<CheckoutCancel />} />
```

### Route Protection

- `/pricing` - Public (no auth required)
- `/checkout/success` - Public (Stripe redirects here)
- `/checkout/cancel` - Public (Stripe redirects here)
- Checkout button checks auth before creating session

---

## J. Risk Assessment

### Risk Score Calculation: 53/100

**Component Risks:**

1. **Stripe API Integration** (+18)
   - External dependency on Stripe API availability
   - API version changes could break integration
   - Mitigation: Use stable Stripe API version (2023-10-16), monitor changelog

2. **Payment Processing** (+12)
   - Financial transactions carry inherent risk
   - Incorrect pricing could result in revenue loss
   - Mitigation: Backend controls all pricing, thorough testing in Stripe test mode

3. **Webhook Security** (+12)
   - Webhook spoofing could trigger unauthorized provisioning
   - Mitigation: Signature validation (already implemented in Epic #31)

4. **Client-Side Checkout** (+8)
   - Stripe.js integration complexity
   - Redirect flow could fail in edge cases
   - Mitigation: PCI scope minimized (Stripe hosts checkout), error handling for redirect failures

5. **Frontend State Management** (+3)
   - Simple state (loading, error) with low complexity
   - Mitigation: Clear error messages, retry mechanisms

**Total Risk Score: 53/100 (MODERATE)**

**Escalation Decision:** `escalate_to: null` (risk < 70, proceed to implementation)

### Mitigation Strategies

- **Stripe API Stability:** Use versioned API, monitor Stripe announcements
- **Webhook Delays:** Async provisioning with user-friendly messaging
- **Session Expiration:** 24-hour expiry sufficient, error handling on success page
- **Price Sync:** Backend as source of truth, frontend displays match
- **Auth Persistence:** JWT in localStorage survives redirects

---

## K. Budget Impact

**Upfront Costs:** $0 USD

**Variable Costs:**
- Stripe transaction fees: 2.9% + $0.30 per successful charge
- Example: $29 Basic plan → $1.14 fee (net $27.86)
- Example: $99 Pro plan → $3.17 fee (net $95.83)

**Infrastructure Costs:** $0 additional
- Vercel free tier sufficient for Phase 3 frontend
- Backend already deployed (Epic #31)

**Development Time Estimate:** 8-12 hours
- Architecture review: 1 hour
- Implementation: 5-7 hours
- Testing (Stripe test mode): 2-3 hours
- Documentation: 1 hour

---

## L. Acceptance Criteria Mapping (Issue #45)

**1. ✅ Stripe Checkout integration (client-side)**
- Stripe.js library installed and configured
- Checkout session creation via backend API
- Redirect to Stripe-hosted checkout page
- PCI compliance delegated to Stripe
- Publishable key safely exposed in frontend

**2. ✅ Subscription plan selection UI**
- Enhanced /pricing page with functional Subscribe buttons
- Plan data aligned with backend (Free, Basic, Pro)
- CheckoutButton component handles plan selection
- Authentication check before checkout

**3. ✅ Payment success/failure handling**
- Success page: /checkout/success (displays confirmation, redirects to dashboard)
- Cancel page: /checkout/cancel (displays message, links back to pricing)
- Session ID extraction and validation
- Error handling for invalid sessions

**4. ✅ Webhook confirmation display**
- Passive UX approach (no polling)
- Success page shows "subscription being activated" message
- Async backend provisioning via webhooks
- Dashboard shows provisioning status (future enhancement)

---

## M. Implementation Phases

### Phase 3.1: Core Checkout Flow (Priority 1)
- Install @stripe/stripe-js dependency
- Create CheckoutButton component
- Add subscriptionsAPI.createCheckoutSession method
- Implement CheckoutSuccess and CheckoutCancel pages
- Update App.tsx with new routes
- Configure environment variables
- Test in Stripe test mode

### Phase 3.2: UX Enhancement (Priority 2)
- Loading states during session creation
- Error messages and retry logic
- Success page polish (countdown timer, animations)
- Cancel page messaging improvements
- Mobile responsiveness testing

### Phase 3.3: Testing & Validation (Priority 3)
- End-to-end flow testing (test mode)
- Webhook integration testing (backend)
- Error scenario testing (network failures, invalid plans, etc.)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing

---

## N. File Structure

```
frontend/
├── src/
│   ├── types/
│   │   ├── auth.ts (existing)
│   │   └── subscription.ts (new)
│   ├── utils/
│   │   └── validation.ts (existing)
│   ├── services/
│   │   └── api.ts (update with subscriptionsAPI)
│   ├── components/
│   │   ├── auth/ (existing)
│   │   ├── checkout/ (new)
│   │   │   ├── CheckoutButton.tsx
│   │   │   └── PricingPlans.tsx
│   │   ├── Navigation.tsx (existing)
│   │   └── Footer.tsx (existing)
│   ├── pages/
│   │   ├── Landing.tsx (existing)
│   │   ├── About.tsx (existing)
│   │   ├── Pricing.tsx (update)
│   │   ├── Contact.tsx (existing)
│   │   ├── Signup.tsx (existing)
│   │   ├── Login.tsx (existing)
│   │   ├── PasswordReset.tsx (existing)
│   │   ├── CheckoutSuccess.tsx (new)
│   │   └── CheckoutCancel.tsx (new)
│   ├── contexts/
│   │   └── AuthContext.tsx (existing)
│   ├── layouts/
│   │   └── MainLayout.tsx (existing)
│   └── App.tsx (update routes)
├── .env.example (update)
└── package.json (update dependencies)

docs/
└── phase3_technical_design.md (this file)
```

---

## O. Dependencies

### New Frontend Dependencies

```json
{
  "dependencies": {
    "@stripe/stripe-js": "^2.4.0"
  }
}
```

**Installation:**
```bash
cd frontend
npm install @stripe/stripe-js
```

### Backend Dependencies (Already Installed from Epic #31)

```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

---

## P. Constraints Verification

**Epic #32 Constraints:**
- ✅ No breaking changes to backend (uses existing Epic #31 APIs)
- ✅ Multi-tenant security maintained (webhook validation, JWT auth)
- ✅ CI coverage consideration (frontend component tests)
- ✅ TypeScript throughout (all new files use TypeScript)

**Technical Constraints:**
- ✅ Stripe publishable key safe for frontend exposure
- ✅ PCI compliance via Stripe-hosted checkout
- ✅ Webhook security via signature validation (backend)
- ✅ Session creation server-side (prevents price manipulation)
- ✅ HTTPS required for production (Vercel provides)

---

## Q. Next Actions After Architecture Approval

### Immediate (Architecture Complete)
1. ✅ Architecture document complete and reviewed
2. Route to Lead Engineer for implementation planning

### Implementation Flow
1. Lead Engineer implements Phase 3.1 (core checkout flow)
2. Lead Engineer implements Phase 3.2 (UX enhancements)
3. QA validates Stripe test mode integration
4. Lead Engineer implements Phase 3.3 (testing & validation)
5. QA validates end-to-end flow
6. DevOps verifies environment variables configured
7. Create PR, merge to main
8. Proceed to Phase 4 (Customer Billing Dashboard)

### Success Criteria for Phase 3 Completion
- ✅ User can select plan on /pricing
- ✅ User can complete payment via Stripe Checkout
- ✅ Success page displays and redirects to dashboard
- ✅ Cancel page displays and links back to pricing
- ✅ Webhook processes payment and provisions tenant (backend)
- ✅ Build succeeds, TypeScript clean
- ✅ No PCI compliance violations
- ✅ 0 blocking defects in QA

---

## Confidence Justification

**Confidence: 0.90**

**Factors Supporting High Confidence:**
- Backend infrastructure proven (Epic #31 complete and tested)
- Stripe API well-documented and stable
- PCI compliance delegated to Stripe (reduces risk)
- Similar patterns already implemented in Phase 2 (auth flow)
- Clear requirements and acceptance criteria
- Passive UX approach simplifies implementation

**Factors Limiting Confidence:**
- External dependency on Stripe API availability (mitigated by Stripe's 99.99% SLA)
- Webhook processing timing variability (mitigated by async provisioning)
- First-time Stripe.js integration in this project (mitigated by comprehensive documentation)

**Overall:** High confidence in successful implementation with minimal risk.

---

## Summary

Phase 3 architecture delivers a secure, PCI-compliant Stripe Checkout integration with minimal risk (53/100). The passive UX approach balances simplicity and user experience while leveraging Epic #31's proven backend infrastructure. No escalation required; green light for implementation.
