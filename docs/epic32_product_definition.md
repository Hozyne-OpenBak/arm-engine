# Epic #32: Full Self-Service Commercial Platform

## Overview
Epic #32 focuses on transforming ARM Engine from backend-capable SaaS to a fully self-serve, user-facing commercial platform. This involves building the public-facing website, front-end integration, and the necessary UI components to enable users to sign up, subscribe, and access the service autonomously.

## Phases

### Phase 1: Public Website Foundation
- **Deliverables:**
  - Landing page / marketing site
  - Navigation structure
  - Responsive design
  - Static pages: About, Pricing overview, Contact
- **Dependencies:** None

### Phase 2: User Authentication UI
- **Deliverables:**
  - Signup form (connects to backend auth API)
  - Login form
  - Password reset flow UI
  - Form validation and error handling
- **Dependencies:** Backend authentication API (Epic #31), Phase 1

### Phase 3: Pricing & Checkout Flow
- **Deliverables:**
  - Pricing page (display 3 plans: Free Trial, Basic, Pro)
  - Plan selection UI
  - Stripe Checkout integration (client-side)
  - Success/failure redirect handling
  - Connect to backend subscription API
- **Dependencies:** Stripe integration backend (Epic #31), Phase 1

### Phase 4: Customer Billing Dashboard
- **Deliverables:**
  - View current plan
  - View payment history
  - Upgrade/downgrade plans
  - Cancel subscription
  - Update payment method
  - Connect to backend APIs
- **Dependencies:** Backend subscription API (Epic #31), Phase 2, Phase 3

### Phase 5: Webhook Robustness & Testing
- **Deliverables:**
  - Idempotency keys for webhooks
  - Retry logic for failed events
  - Event logging
  - End-to-end testing (signup → provisioning → access)
  - Security audit
- **Dependencies:** Phase 3, backend webhook framework (Epic #31)

## User Journey Flow Diagram

1. User visits the public website.
2. User signs up (via UI).
3. User selects a pricing plan.
4. User enters payment details via Stripe Checkout.
5. System provisions a tenant automatically.
6. User accesses ARM Engine platform.

## Technical Architecture

- **Frontend:**
  - React framework with TypeScript
  - Hosted on Vercel (for rapid deployment and scaling)
  - Stripe Checkout for payments (handled client-side)
- **Backend Integration:**
  - Secure API calls with Axios
  - Authentication, subscription, and provisioning handled by ARM Engine backend (Node.js)

## Success Metrics

- Conversion rate for signup-complete users: ≥ 20%
- System uptime: ≥ 99.9%
- Test coverage: ≥ 90%
- Security vulnerabilities: Zero critical issues

## Risks and Mitigations

- **Security breaches due to frontend vulnerabilities:**
  - Mitigation: Penetration testing, OWASP compliance
- **Payment flow failures:**
  - Mitigation: Stripe webhook retries, thorough testing
- **Delays in API integration:**
  - Mitigation: Parallel development of frontend and backend teams