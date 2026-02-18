/**
 * error-categorizer.test.js - Unit tests for error categorization
 * 
 * Tests for categorizeError and isTransientError functions including:
 * - Transient error detection
 * - Permanent error detection
 * - Error message and fix generation
 * - All error categories
 * 
 * Story: #35
 * Task: T35.12
 * Epic: #30
 */

const { categorizeError, isTransientError } = require('../../src/utils/error-categorizer');

describe('categorizeError', () => {
  describe('rate limit errors (transient)', () => {
    test('categorizes rate limit message as transient', () => {
      const error = new Error('rate limit exceeded');
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'transient',
        category: 'rate_limit',
        message: 'GitHub API rate limit exceeded',
        fix: 'Wait and retry automatically'
      });
    });

    test('categorizes HTTP 429 as rate limit', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      const result = categorizeError(error);

      expect(result.type).toBe('transient');
      expect(result.category).toBe('rate_limit');
    });

    test('matches rate limit in various message formats', () => {
      const messages = [
        'API rate limit exceeded',
        'Rate Limit Exceeded',
        'rate-limit error'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        const result = categorizeError(error);
        expect(result.type).toBe('transient');
        expect(result.category).toBe('rate_limit');
      });
    });
  });

  describe('network errors (transient)', () => {
    test('categorizes ETIMEDOUT as network error', () => {
      const error = new Error('Connection timed out');
      error.code = 'ETIMEDOUT';
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'transient',
        category: 'network',
        message: 'Network error: ETIMEDOUT',
        fix: 'Retry automatically after brief delay'
      });
    });

    test('categorizes ECONNRESET as network error', () => {
      const error = new Error('Connection reset');
      error.code = 'ECONNRESET';
      const result = categorizeError(error);

      expect(result.type).toBe('transient');
      expect(result.category).toBe('network');
      expect(result.message).toContain('ECONNRESET');
    });

    test('categorizes ENOTFOUND as network error', () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      error.code = 'ENOTFOUND';
      const result = categorizeError(error);

      expect(result.type).toBe('transient');
      expect(result.category).toBe('network');
    });

    test('all network codes produce correct message', () => {
      const codes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];

      codes.forEach(code => {
        const error = new Error(`Network error: ${code}`);
        error.code = code;
        const result = categorizeError(error);
        
        expect(result.type).toBe('transient');
        expect(result.message).toContain(code);
        expect(result.fix).toContain('Retry');
      });
    });
  });

  describe('service unavailable errors (transient)', () => {
    test('categorizes HTTP 502 as service unavailable', () => {
      const error = new Error('Bad Gateway');
      error.status = 502;
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'transient',
        category: 'service_unavailable',
        message: 'GitHub service temporarily unavailable (HTTP 502)',
        fix: 'Retry automatically - service should recover'
      });
    });

    test('categorizes HTTP 503 as service unavailable', () => {
      const error = new Error('Service Unavailable');
      error.status = 503;
      const result = categorizeError(error);

      expect(result.type).toBe('transient');
      expect(result.category).toBe('service_unavailable');
      expect(result.message).toContain('503');
    });
  });

  describe('authentication errors (permanent)', () => {
    test('categorizes HTTP 401 as authentication error', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'permanent',
        category: 'auth',
        message: 'Authentication failed',
        fix: 'Check ARM_TOKEN secret in repository settings'
      });
    });

    test('categorizes HTTP 403 as authentication error', () => {
      const error = new Error('Forbidden');
      error.status = 403;
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('auth');
    });

    test('categorizes "Bad credentials" message as auth error', () => {
      const error = new Error('Bad credentials');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('auth');
    });

    test('categorizes "Unauthorized" message as auth error', () => {
      const error = new Error('Unauthorized access');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('auth');
    });

    test('categorizes authentication-related messages', () => {
      const error = new Error('authentication token invalid');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('auth');
    });

    test('auth errors suggest checking ARM_TOKEN', () => {
      const error = new Error('Bad credentials');
      const result = categorizeError(error);

      expect(result.fix).toContain('ARM_TOKEN');
    });
  });

  describe('not found errors (permanent)', () => {
    test('categorizes HTTP 404 as not found', () => {
      const error = new Error('Not Found');
      error.status = 404;
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'permanent',
        category: 'not_found',
        message: 'Repository or resource not found',
        fix: 'Verify repository names in arm.config.json'
      });
    });

    test('categorizes "Not Found" message', () => {
      const error = new Error('Repository Not Found');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('not_found');
    });

    test('not found errors suggest checking config', () => {
      const error = new Error('Not Found');
      error.status = 404;
      const result = categorizeError(error);

      expect(result.fix).toContain('arm.config.json');
    });
  });

  describe('configuration errors (permanent)', () => {
    test('categorizes config-related errors', () => {
      const error = new Error('Invalid config file');
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'permanent',
        category: 'config',
        message: 'Invalid configuration',
        fix: 'Check arm.config.json for required fields and valid values'
      });
    });

    test('categorizes "configuration" keyword', () => {
      const error = new Error('configuration error detected');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('config');
    });

    test('categorizes "invalid" keyword', () => {
      const error = new Error('invalid repository name');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('config');
    });

    test('config errors suggest checking config file', () => {
      const error = new Error('Bad config');
      const result = categorizeError(error);

      expect(result.fix).toContain('arm.config.json');
      expect(result.fix).toContain('required fields');
    });
  });

  describe('unknown errors (permanent)', () => {
    test('categorizes unknown errors as permanent', () => {
      const error = new Error('Something unexpected happened');
      const result = categorizeError(error);

      expect(result).toEqual({
        type: 'permanent',
        category: 'unknown',
        message: 'Something unexpected happened',
        fix: 'Check logs for details and verify configuration'
      });
    });

    test('handles errors without messages', () => {
      const error = new Error();
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
      expect(result.category).toBe('unknown');
      expect(result.message).toBe('Unknown error occurred');
    });

    test('unknown errors suggest checking logs', () => {
      const error = new Error('Mystery error');
      const result = categorizeError(error);

      expect(result.fix).toContain('Check logs');
    });

    test('defaults to permanent for safety', () => {
      const error = new Error('Unusual edge case');
      const result = categorizeError(error);

      expect(result.type).toBe('permanent');
    });
  });

  describe('error categorization priority', () => {
    test('rate limit takes priority over message content', () => {
      const error = new Error('rate limit: invalid config');
      const result = categorizeError(error);

      expect(result.category).toBe('rate_limit');
    });

    test('network code takes priority over message', () => {
      const error = new Error('Failed with invalid config');
      error.code = 'ETIMEDOUT';
      const result = categorizeError(error);

      expect(result.category).toBe('network');
    });

    test('auth status code takes priority', () => {
      const error = new Error('Some generic message');
      error.status = 401;
      const result = categorizeError(error);

      expect(result.category).toBe('auth');
    });
  });
});

describe('isTransientError', () => {
  test('returns true for rate limit errors', () => {
    const error = new Error('rate limit exceeded');
    expect(isTransientError(error)).toBe(true);
  });

  test('returns true for network errors', () => {
    const error = new Error('Timeout');
    error.code = 'ETIMEDOUT';
    expect(isTransientError(error)).toBe(true);
  });

  test('returns true for service unavailable', () => {
    const error = new Error('Service Unavailable');
    error.status = 503;
    expect(isTransientError(error)).toBe(true);
  });

  test('returns false for authentication errors', () => {
    const error = new Error('Bad credentials');
    expect(isTransientError(error)).toBe(false);
  });

  test('returns false for not found errors', () => {
    const error = new Error('Not Found');
    error.status = 404;
    expect(isTransientError(error)).toBe(false);
  });

  test('returns false for configuration errors', () => {
    const error = new Error('Invalid config');
    expect(isTransientError(error)).toBe(false);
  });

  test('returns false for unknown errors', () => {
    const error = new Error('Unknown error');
    expect(isTransientError(error)).toBe(false);
  });

  test('is consistent with categorizeError', () => {
    const errors = [
      { error: new Error('rate limit'), expected: true },
      { error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), expected: true },
      { error: Object.assign(new Error('unavailable'), { status: 502 }), expected: true },
      { error: Object.assign(new Error('unauthorized'), { status: 401 }), expected: false },
      { error: Object.assign(new Error('not found'), { status: 404 }), expected: false },
      { error: new Error('invalid config'), expected: false }
    ];

    errors.forEach(({ error, expected }) => {
      const result = isTransientError(error);
      const categorization = categorizeError(error);
      
      expect(result).toBe(expected);
      expect(result).toBe(categorization.type === 'transient');
    });
  });
});
