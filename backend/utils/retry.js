/**
 * retry.js - Retry Logic with Exponential Backoff
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
 * Permanent errors (auth, config, not found) fail immediately without retry.
 * 
 * Backoff delays: 1s, 2s, 4s (default base=1000ms)
 * 
 * @param {Function} fn - Async function to execute
 * @param {number} [maxRetries=3] - Maximum retry attempts
 * @param {number} [baseDelay=1000] - Base delay in milliseconds (doubles each retry)
 * @returns {Promise<*>} Result of fn() if successful
 * @throws {Error} Last error if all retries exhausted or permanent error encountered
 * 
 * @example
 * const result = await retryWithBackoff(
 *   async () => createStory(dep),
 *   3,    // max retries
 *   1000  // base delay ms
 * );
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is transient (should retry)
      if (!isTransientError(error)) {
        console.error(`❌ Permanent error detected, failing immediately: ${error.message}`);
        throw error;
      }
      
      // If we've exhausted retries, throw the last error
      if (attempt === maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) exhausted: ${error.message}`);
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️  Transient error (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
      console.warn(`   Retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }
  
  // Should never reach here, but throw last error as fallback
  throw lastError;
}

// Export utility for use in other files
module.exports = {
  retryWithBackoff,
  sleep
};
