/**
 * retry.js - Retry Utility with Exponential Backoff
 * 
 * Provides retry logic for handling transient failures in GitHub API calls.
 * 
 * Story: #35
 * Task: T35.1, T35.2
 * Epic: #30
 */

const { isTransientError } = require('./error-categorizer');

/**
 * Utility to introduce a delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry execution of a provided async function with exponential backoff on transient errors.
 * 
 * Transient errors (network timeouts, rate limits, 502/503) trigger retry with exponential backoff.
 * Permanent errors (authentication, not found, invalid config) fail immediately without retry.
 * 
 * @param {Function} fn - The async function to execute
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds for backoff (default: 1000)
 * @returns {Promise<any>} Result of the function on success
 * @throws {Error} Last error encountered after all retries exhausted, or permanent error immediately
 * 
 * @example
 * const result = await retryWithBackoff(
 *   async () => createStory(dep),
 *   3,    // max retries
 *   1000  // base delay ms
 * );
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let attempt = 0;
  let lastError;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // Attempt to execute the function
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isTransientError(error)) {
        // If the error is permanent, fail immediately
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.pow(2, attempt - 1) * baseDelay;

      // Log retry attempt
      console.log(`⚠️  Retry ${attempt}/${maxRetries} after ${delay}ms: ${error.message}`);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Throw the last error after all retries are exhausted
  throw lastError;
}

// Export utility for use in other files
module.exports = {
  retryWithBackoff,
  sleep
};
