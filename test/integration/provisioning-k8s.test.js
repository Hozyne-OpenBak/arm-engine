const { createNamespace } = require('../src/provisioning/kubernetes');

jest.mock('@kubernetes/client-node', () => {
  return {
    KubeConfig: jest.fn().mockImplementation(() => ({
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn().mockReturnValue({
        createNamespace: jest.fn().mockResolvedValue()
      })
    }))
  };
});

describe('Integration Tests for K8s Provisioning', () => {
  test('creates a namespace successfully', async () => {
    await expect(createNamespace('test-namespace')).resolves.not.toThrow();
  });
});