# Implementation Notes for Phase 2 of Epic #31

## Stripe Setup
To integrate with Stripe, the following environment variables must be configured in the `.env` file:

- **STRIPE_SECRET_KEY**: Your Stripe secret key.
- **STRIPE_PUBLISHABLE_KEY**: Your Stripe publishable key.
- **STRIPE_WEBHOOK_SECRET**: Webhook secret to verify Stripe webhook events.
- **STRIPE_PRICE_FREE_TRIAL**: Price ID for the Free Trial plan (from the Stripe dashboard).
- **STRIPE_PRICE_BASIC**: Price ID for the Basic plan (from the Stripe dashboard).
- **STRIPE_PRICE_PRO**: Price ID for the Pro plan (from the Stripe dashboard).

Ensure you are using Stripe test mode keys for development.

### Stripe Webhook Configuration
The Stripe webhook endpoint configured in this implementation is:

```
POST /api/webhooks/stripe
```

In the Stripe dashboard, set up a Webhook for test and production environments and subscribe to the following events:

- `customer.subscription.created`
- `payment_intent.succeeded`
- `payment_intent.failed`
- `customer.subscription.deleted`

Ensure the Webhook signing secret is updated in the `.env` file.

## Subscription Endpoints
Endpoints are protected with Phase 1 JWT middleware. Ensure valid tokens are provided in the `Authorization` header.

### Endpoints:

1. **POST /api/subscriptions/create**
   - Create a new subscription or upgrade the current subscription.
   
2. **POST /api/subscriptions/upgrade**
   - Upgrade to a higher plan.

3. **GET /api/subscriptions/current**
   - Retrieve details of the user's current subscription (plan and status).

4. **POST /api/subscriptions/cancel**
   - Cancel the user's subscription.

## Linking Subscriptions to Users
User subscriptions are linked via the `user_id` foreign key. On Stripe customer creation, the `user_id` is stored in the `metadata` field of the customer for easy lookup during webhook events.

**Dependencies on Phase 1:**
- `JWT middleware`: Protect subscription routes.
- `User model`: The user database model is used for customer lookup and subscription management.

## Automated Plan Management
Upon receiving webhook events from Stripe:

1. **Trial Management**: Trial expiration or transition to Basic/Pro is handled by checking the subscription status.
2. **Active/Cancelled Subscriptions**: Updates to the user's subscription status are managed via `customer.subscription.created` and `customer.subscription.deleted` events.
3. **Payment Success/Failure**: Logged for audit purposes. Notifications can be sent or integrated later.

## Testing

- **Test Coverage**: Subscription flows (create, upgrade, cancel, fetch current) and Stripe integration are covered with `jest` and `supertest`. Mock responses are used for Stripe APIs.

- **Run Tests**: Use the command:
  ```
  npm test
  ```