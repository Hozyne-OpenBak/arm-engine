const request = require('supertest');
const app = require('../src/app');
const stripeMock = require('./stripe-mock');

describe('Stripe Integration Tests', () => {
  beforeAll(() => stripeMock.initialize());
  afterAll(() => stripeMock.teardown());

  test('Create Stripe customer and subscription', async () => {
    stripeMock.mockCustomerCreation();
    stripeMock.mockSubscriptionCreation();

    const res = await request(app)
      .post('/api/subscriptions/create')
      .set('Authorization', `Bearer test-jwt`)
      .send({ planId: 'basic', paymentMethodId: 'pm_test' });

    expect(res.statusCode).toBe(201);
    expect(res.body.subscription).toBeTruthy();
  });

  test('Handle webhook events properly', async () => {
    const webhookEvent = stripeMock.mockWebhookEvent('customer.subscription.created');

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', stripeMock.generateValidSignature(webhookEvent))
      .send(webhookEvent);

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
  });
});