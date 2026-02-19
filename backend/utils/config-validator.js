/**
 * config-validator.js - Configuration Validation
 * 
 * Validates ARM configuration at startup to fail fast on invalid config.
 * Enforces safe defaults and validates structure.
 * 
 * Story: #32
 * Task: T32.2
 * Epic: #30
 */

/**
 * Validate ARM configuration
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  // Validate config is an object
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be a valid object');
  }

  // Validate target section
  if (!config.target || typeof config.target !== 'object') {
    throw new Error('Config must include target section');
  }

  if (!config.target.repository || typeof config.target.repository !== 'string') {
    throw new Error('target.repository is required and must be a string');
  }

  // Validate governance section
  if (!config.governance || typeof config.governance !== 'object') {
    throw new Error('Config must include governance section');
  }

  if (!config.governance.repository || typeof config.governance.repository !== 'string') {
    throw new Error('governance.repository is required and must be a string');
  }

  if (!config.governance.epicNumber || typeof config.governance.epicNumber !== 'number') {
    throw new Error('governance.epicNumber is required and must be a number');
  }

  // Validate policy section
  if (!config.policy || typeof config.policy !== 'object') {
    throw new Error('Config must include policy section');
  }

  // Enforce safe default: allowMajor must be false
  if (config.policy.allowMajor === true) {
    throw new Error(
      'allowMajor must be false (safe default enforced). ' +
      'Major version updates require human review and are blocked automatically.'
    );
  }

  // Validate denylist is an array (if present)
  if (config.policy.denylist !== undefined) {
    if (!Array.isArray(config.policy.denylist)) {
      throw new Error('policy.denylist must be an array of package names');
    }

    // Validate each denylist entry is a string
    for (let i = 0; i < config.policy.denylist.length; i++) {
      if (typeof config.policy.denylist[i] !== 'string') {
        throw new Error(`policy.denylist[${i}] must be a string, got ${typeof config.policy.denylist[i]}`);
      }

      if (config.policy.denylist[i].trim() === '') {
        throw new Error(`policy.denylist[${i}] cannot be an empty string`);
      }
    }
  }

  // Validate excludePatterns is an array (if present, backward compatibility)
  if (config.policy.excludePatterns !== undefined && !Array.isArray(config.policy.excludePatterns)) {
    throw new Error('policy.excludePatterns must be an array');
  }

  // All validations passed
  return true;
}

/**
 * Log configuration summary after validation
 * @param {Object} config - Validated configuration
 */
function logConfigSummary(config) {
  console.log('✅ Config validated successfully:');
  console.log(`   allowMajor: ${config.policy.allowMajor === false ? 'false (safe default)' : 'false (default)'}`);
  
  if (config.policy.denylist && config.policy.denylist.length > 0) {
    console.log(`   denylist: [${config.policy.denylist.join(', ')}]`);
  } else {
    console.log(`   denylist: [] (no packages excluded)`);
  }
  
  console.log('');
}

module.exports = {
  validateConfig,
  logConfigSummary
};
