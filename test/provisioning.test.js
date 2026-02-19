const { provisionTenant } = require('../src/provisioning/controller');

jest.mock('../src/provisioning/kubernetes', () => ({
  createNamespace: jest.fn().mockResolvedValue(),
  applyNetworkPolicy: jest.fn().mockResolvedValue(),
  applyResourceQuota: jest.fn().mockResolvedValue(),
  createSecrets: jest.fn().mockResolvedValue()
}));

jest.mock('../src/provisioning/helm', () => ({
  deployHelmChart: jest.fn().mockResolvedValue()
}));

describe('ProvisionTenant', () => {
  test('provisions a tenant successfully', async () => {
    await expect(provisionTenant({
      namespace: 'test-namespace',
      networkPolicy: {},
      resourceQuota: {},
      secrets: {}
    })).resolves.not.toThrow();
  });
});