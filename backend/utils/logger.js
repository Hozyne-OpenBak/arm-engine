/**
 * logger.js - GitHub Actions Annotation Logger
 * 
 * Provides utility functions for GitHub Actions workflow annotations.
 * 
 * Story: #34
 * Task: T34.4
 * Epic: #30
 */

/**
 * Log a GitHub Actions workflow annotation
 * @param {string} type - Annotation type: 'notice', 'warning', or 'error'
 * @param {string} message - Annotation message
 */
function logAnnotation(type, message) {
  // Only output annotations in CI context (GitHub Actions)
  if (process.env.CI) {
    console.log(`::${type}::${message}`);
  }
}

module.exports = { logAnnotation };
