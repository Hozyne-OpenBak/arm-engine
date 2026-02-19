/**
 * error-categorizer.js - Error Categorization Utility
 * 
 * Categorizes errors as transient or permanent with detailed information
 * and suggested fixes for users.
 * 
 * Story: #35
 * Task: T35.2
 * Epic: #30
 */

/**
 * @typedef {Object} ErrorInfo
 * @property {'transient'|'permanent'} type - Error type for retry logic
 * @property {'rate_limit'|'network'|'auth'|'not_found'|'config'|'service_unavailable'|'unknown'} category - Specific error category
 * @property {string} message - Human-readable error description
 * @property {string} fix - Suggested fix for the user
 */

/**
 * Categorize an error with detailed information and suggested fixes
 * 
 * @param {Error} error - Error object to categorize
 * @returns {ErrorInfo} Structured error information
 * 
 * @example
 * const errorInfo = categorizeError(error);
 * if (errorInfo.type === 'transient') {
 *   // Retry logic
 * } else {
 *   console.error(`${errorInfo.message}. Fix: ${errorInfo.fix}`);
 * }
 */
function categorizeError(error) {
  // Rate limit errors (transient)
  if (error.message?.includes('rate limit') || error.status === 429) {
    return {
      type: 'transient',
      category: 'rate_limit',
      message: 'GitHub API rate limit exceeded',
      fix: 'Wait and retry automatically'
    };
  }

  // Network timeout errors (transient)
  const networkCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
  if (networkCodes.includes(error.code)) {
    return {
      type: 'transient',
      category: 'network',
      message: `Network error: ${error.code}`,
      fix: 'Retry automatically after brief delay'
    };
  }

  // Service unavailable errors (transient)
  if (error.status === 502 || error.status === 503) {
    return {
      type: 'transient',
      category: 'service_unavailable',
      message: `GitHub service temporarily unavailable (HTTP ${error.status})`,
      fix: 'Retry automatically - service should recover'
    };
  }

  // Authentication errors (permanent)
  if (
    error.status === 401 ||
    error.status === 403 ||
    error.message?.includes('Bad credentials') ||
    error.message?.includes('Unauthorized') ||
    error.message?.includes('authentication')
  ) {
    return {
      type: 'permanent',
      category: 'auth',
      message: 'Authentication failed',
      fix: 'Check ARM_TOKEN secret in repository settings'
    };
  }

  // Not found errors (permanent)
  if (error.status === 404 || error.message?.includes('Not Found')) {
    return {
      type: 'permanent',
      category: 'not_found',
      message: 'Repository or resource not found',
      fix: 'Verify repository names in arm.config.json'
    };
  }

  // Configuration errors (permanent)
  if (
    error.message?.includes('config') ||
    error.message?.includes('configuration') ||
    error.message?.includes('invalid')
  ) {
    return {
      type: 'permanent',
      category: 'config',
      message: 'Invalid configuration',
      fix: 'Check arm.config.json for required fields and valid values'
    };
  }

  // Unknown errors default to permanent (safer to stop than retry indefinitely)
  return {
    type: 'permanent',
    category: 'unknown',
    message: error.message || 'Unknown error occurred',
    fix: 'Check logs for details and verify configuration'
  };
}

/**
 * Check if an error is transient (should be retried)
 * 
 * Convenience wrapper around categorizeError for backward compatibility
 * and simpler retry logic checks.
 * 
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is transient (should retry)
 * 
 * @example
 * if (isTransientError(error)) {
 *   // Retry logic
 * } else {
 *   throw error; // Fail fast
 * }
 */
function isTransientError(error) {
  const errorInfo = categorizeError(error);
  return errorInfo.type === 'transient';
}

module.exports = {
  categorizeError,
  isTransientError
};
