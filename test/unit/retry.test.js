/**
 * retry.test.js - Unit tests for retry utility
 * 
 * Tests for retryWithBackoff function including:
 * - Successful execution
 * - Transient error retry
 * - Permanent error fail-fast
 * - Exponential backoff timing
 * - Max retries exhausted
 * 
 * Story: #35
 * Task: T35.12
 * Epic: #30
 */

const { retryWithBackoff, sleep } = require('../../src/utils/retry');
const { isTransientError } = require('../../src/utils/error-categorizer');

// Mock error categorizer for isolated testing
jest.mock('../../src/utils/error-categorizer');

// Mock sleep to avoid real delays in tests
jest.mock('../../src/utils/retry', () => {
  const actual = jest.requireActual('../../src/utils/retry');
  return {
    ...actual,
    sleep: jest.fn().mockResolvedValue(undefined)
  };
});

describe('retryWithBackoff', () => {
  let mockFn;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    mockFn = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Ensure sleep mock is reset
    sleep.mockClear();
    sleep.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('successful execution', () => {
    test('returns result on first attempt success', async () => {
      mockFn.mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, 3, 1000);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('returns result after transient error and retry', async () => {
      const transientError = new Error('Rate limit exceeded');
      mockFn
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce('success');
      
      isTransientError.mockReturnValue(true);

      const result = await retryWithBackoff(mockFn, 3, 1000);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Transient error (attempt 1/')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in 1000ms')
      );
    });
  });

  describe('transient error handling', () => {
    test('retries on transient errors up to max retries', async () => {
      const transientError = new Error('ETIMEDOUT');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 3, 1000)
      ).rejects.toThrow('ETIMEDOUT');

      // maxRetries=3 means 3 retry attempts after initial = 4 total attempts
      expect(mockFn).toHaveBeenCalledTimes(4);
      // Each retry logs 2 lines (error + delay), 3 retries = 6 lines
      expect(consoleWarnSpy).toHaveBeenCalledTimes(6);
    }, 10000); // 10 second timeout for this test

    test('logs each retry attempt with correct format', async () => {
      const transientError = new Error('Network timeout');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 3, 500)
      ).rejects.toThrow();

      // Each retry logs 2 lines: error message + retry delay
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        1,
        '⚠️  Transient error (attempt 1/4): Network timeout'
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        2,
        '   Retrying in 500ms...'
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        3,
        '⚠️  Transient error (attempt 2/4): Network timeout'
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        4,
        '   Retrying in 1000ms...'
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        5,
        '⚠️  Transient error (attempt 3/4): Network timeout'
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        6,
        '   Retrying in 2000ms...'
      );
    });
  });

  describe('permanent error handling', () => {
    test('fails immediately on permanent errors', async () => {
      const permanentError = new Error('Bad credentials');
      mockFn.mockRejectedValue(permanentError);
      isTransientError.mockReturnValue(false);

      await expect(
        retryWithBackoff(mockFn, 3, 1000)
      ).rejects.toThrow('Bad credentials');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('does not retry on authentication errors', async () => {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      mockFn.mockRejectedValue(authError);
      isTransientError.mockReturnValue(false);

      await expect(
        retryWithBackoff(mockFn, 3, 1000)
      ).rejects.toThrow('Unauthorized');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('does not retry on configuration errors', async () => {
      const configError = new Error('Invalid config');
      mockFn.mockRejectedValue(configError);
      isTransientError.mockReturnValue(false);

      await expect(
        retryWithBackoff(mockFn, 3, 1000)
      ).rejects.toThrow('Invalid config');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('exponential backoff', () => {
    test('uses correct exponential backoff delays', async () => {
      const transientError = new Error('Service unavailable');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 3, 1000)
      ).rejects.toThrow();

      // Check delay calculations in log messages
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in 1000ms')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in 2000ms')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in 4000ms')
      );
    }, 10000); // 10 second timeout for this test

    test('respects custom base delay', async () => {
      const transientError = new Error('Timeout');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 2, 500)
      ).rejects.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in 500ms')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in 1000ms')
      );
    });
  });

  describe('max retries configuration', () => {
    test('respects custom max retries', async () => {
      const transientError = new Error('ECONNRESET');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 5, 100)
      ).rejects.toThrow();

      // maxRetries=5 means 5 retry attempts after initial = 6 total attempts
      expect(mockFn).toHaveBeenCalledTimes(6);
      // Each retry logs 2 lines, 5 retries = 10 lines
      expect(consoleWarnSpy).toHaveBeenCalledTimes(10);
    });

    test('stops at max retries and throws last error', async () => {
      const transientError = new Error('Persistent timeout');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 2, 100)
      ).rejects.toThrow('Persistent timeout');

      // maxRetries=2 means 2 retry attempts after initial = 3 total attempts
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('mixed scenarios', () => {
    test('succeeds after multiple transient failures', async () => {
      const transientError = new Error('Rate limit');
      mockFn
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce('finally succeeded');
      
      isTransientError.mockReturnValue(true);

      const result = await retryWithBackoff(mockFn, 3, 100);

      expect(result).toBe('finally succeeded');
      expect(mockFn).toHaveBeenCalledTimes(3);
      // 2 retries = 4 console.warn calls (2 lines per retry)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(4);
    });

    test('preserves error details through retries', async () => {
      const detailedError = new Error('Detailed failure message');
      detailedError.code = 'CUSTOM_CODE';
      detailedError.status = 503;
      
      mockFn.mockRejectedValue(detailedError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 2, 100)
      ).rejects.toMatchObject({
        message: 'Detailed failure message',
        code: 'CUSTOM_CODE',
        status: 503
      });
    });
  });
});

describe('sleep utility', () => {
  const actualSleep = jest.requireActual('../../src/utils/retry').sleep;
  
  test('waits for specified milliseconds', async () => {
    const start = Date.now();
    await actualSleep(100);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(150);
  });

  test('returns a Promise', () => {
    const result = actualSleep(10);
    expect(result).toBeInstanceOf(Promise);
  });
});
