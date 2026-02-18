/**
 * logger.test.js - Unit tests for GitHub Actions Annotation Logger
 * 
 * Story: #34
 * Task: T34.7
 * Epic: #30
 */

const { logAnnotation } = require('../../src/utils/logger');

describe('logAnnotation', () => {
  const originalEnv = process.env;
  let consoleLogSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
  });

  test('outputs annotation when CI is set', () => {
    process.env.CI = 'true';

    logAnnotation('notice', 'Test message');

    expect(consoleLogSpy).toHaveBeenCalledWith('::notice::Test message');
  });

  test('outputs annotation for warning type', () => {
    process.env.CI = 'true';

    logAnnotation('warning', 'Warning message');

    expect(consoleLogSpy).toHaveBeenCalledWith('::warning::Warning message');
  });

  test('outputs annotation for error type', () => {
    process.env.CI = 'true';

    logAnnotation('error', 'Error message');

    expect(consoleLogSpy).toHaveBeenCalledWith('::error::Error message');
  });

  test('does not output when CI is not set', () => {
    delete process.env.CI;

    logAnnotation('notice', 'Test message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('does not output when CI is false', () => {
    process.env.CI = 'false';

    logAnnotation('notice', 'Test message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('does not output when CI is empty string', () => {
    process.env.CI = '';

    logAnnotation('notice', 'Test message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('handles complex messages with special characters', () => {
    process.env.CI = 'true';

    logAnnotation('notice', 'Package update: express@4.17.1 → 4.18.2');

    expect(consoleLogSpy).toHaveBeenCalledWith('::notice::Package update: express@4.17.1 → 4.18.2');
  });

  test('handles messages with newlines', () => {
    process.env.CI = 'true';

    logAnnotation('error', 'Failed to create PR\nError: Bad credentials');

    expect(consoleLogSpy).toHaveBeenCalledWith('::error::Failed to create PR\nError: Bad credentials');
  });
});
