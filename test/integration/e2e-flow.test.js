const { signup, makePayment, provisionTenant, useTenant } = require('../utils');

describe('End-to-End Integration Flow', () => {
    it('should complete user signup, payment, and provisioning', async () => {
        const signupResult = await signup('testUser', 'testPassword');
        expect(signupResult.success).toBe(true);

        const paymentResult = await makePayment('testUser', 'testCard');
        expect(paymentResult.success).toBe(true);

        const provisionResult = await provisionTenant('testUser');
        expect(provisionResult.success).toBe(true);

        const usageResult = await useTenant('testUser');
        expect(usageResult.success).toBe(true);
    });

    it('should handle payment failure recovery', async () => {
        const paymentResult = await makePayment('testUser', 'invalidCard');
        expect(paymentResult.success).toBe(false);
    });

    it('should maintain tenant isolation', async () => {
        const tenantAUsage = await useTenant('tenantA');
        const tenantBUsage = await useTenant('tenantB');
        expect(tenantAUsage.isolated).toBe(true);
        expect(tenantBUsage.isolated).toBe(true);
    });
});