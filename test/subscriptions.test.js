const request = require('supertest');
const app = require('../src/app');
const { setupDatabase, teardownDatabase } = require('./test-utils');

describe('Subscription API Tests', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);

  test('Create subscription for user', async () => {
    const res = await request(app)
      .post('/api/subscriptions/create')
      .set('Authorization', `Bearer test-jwt`) // Mock a JWT for auth
      .send({ planId: 'basic', paymentMethodId: 'pm_test' });

    expect(res.statusCode).toBe(201);
    expect(res.body.subscription).toBeDefined();
  });

  test('Upgrade subscription plan', async () => {
    const res = await request(app)
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer test-jwt`)
      .send({ planId: 'pro' });

    expect(res.statusCode).toBe(200);
    expect(res.body.subscription.planId).toBe('pro');
  });

  test('Get current subscription', async () => {
    const res = await request(app)
      .get('/api/subscriptions/current')
      .set('Authorization', `Bearer test-jwt`);

    expect(res.statusCode).toBe(200);
    expect(res.body.subscriptionId).toBeDefined();
    expect(res.body.plan).toBeDefined();
  });

  test('Cancel subscription', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer test-jwt`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Subscription canceled');
  });
});