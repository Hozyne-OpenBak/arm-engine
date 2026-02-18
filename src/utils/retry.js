/**
 * retry.js - Retry Utility with Exponential Backoff
 * 
 * Provides retry logic for handling transient failures in GitHub API calls.
 * 
 * Story: #35
 * Task: T35.1
 * Epic: #30
 */

/**
 * Utility to introduce a delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Function to categorize errors as transient or permanent
 * @param {Error} error - Error object to categorize
 * @returns {boolean} True if error is transient (should retry)
 */
function isTransientError(error) {
  const transientCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
  if (transientCodes.includes(error.code)) return true;
  if (error.message?.includes('rate limit')) return true;
  if (error.status === 502 || error.status === 503) return true;
  return false;
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
 *   3,
 *   1000
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
  isTransientError,
  sleep
};
