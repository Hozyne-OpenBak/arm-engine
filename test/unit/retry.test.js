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

describe('retryWithBackoff', () => {
  let mockFn;
  let consoleLogSpy;

  beforeEach(() => {
    mockFn = jest.fn();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('successful execution', () => {
    test('returns result on first attempt success', async () => {
      mockFn.mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, 3, 1000);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
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
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Retry 1/3 after 1000ms')
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

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    test('logs each retry attempt with correct format', async () => {
      const transientError = new Error('Network timeout');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 3, 500)
      ).rejects.toThrow();

      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        1,
        '⚠️  Retry 1/3 after 500ms: Network timeout'
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        2,
        '⚠️  Retry 2/3 after 1000ms: Network timeout'
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        3,
        '⚠️  Retry 3/3 after 2000ms: Network timeout'
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
      expect(consoleLogSpy).not.toHaveBeenCalled();
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
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('after 1000ms')
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('after 2000ms')
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('after 4000ms')
      );
    });

    test('respects custom base delay', async () => {
      const transientError = new Error('Timeout');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 2, 500)
      ).rejects.toThrow();

      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('after 500ms')
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('after 1000ms')
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

      expect(mockFn).toHaveBeenCalledTimes(5);
      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
    });

    test('stops at max retries and throws last error', async () => {
      const transientError = new Error('Persistent timeout');
      mockFn.mockRejectedValue(transientError);
      isTransientError.mockReturnValue(true);

      await expect(
        retryWithBackoff(mockFn, 2, 100)
      ).rejects.toThrow('Persistent timeout');

      expect(mockFn).toHaveBeenCalledTimes(2);
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
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
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
  test('waits for specified milliseconds', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(150);
  });

  test('returns a Promise', () => {
    const result = sleep(10);
    expect(result).toBeInstanceOf(Promise);
  });
});
