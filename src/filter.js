/**
 * filter.js - Update Policy Filter
 * 
 * Filters outdated dependencies based on update policy
 * (patch/minor/major), denylist, and exclusion patterns.
 * 
 * Implements:
 * - T32.3: Major update blocking enforcement
 * - T32.4: Denylist filter implementation
 * - T32.5: Denylist exclusion logging
 * - T32.6: Major update block logging
 * 
 * Story: #15, #32
 * Epic: #13, #30
 */

const { minimatch } = require('minimatch');

/**
 * @typedef {Object} UpdatePolicy
 * @property {boolean} allowPatch - Allow patch updates (1.0.0 → 1.0.1)
 * @property {boolean} allowMinor - Allow minor updates (1.0.0 → 1.1.0)
 * @property {boolean} allowMajor - Allow major updates (1.0.0 → 2.0.0)
 * @property {string[]} denylist - Exact package names to exclude (case-sensitive)
 * @property {string[]} excludePatterns - Package name patterns to exclude (glob, deprecated)
 */

/**
 * @typedef {Object} FilteredUpdates
 * @property {import('./scanner').Dependency[]} recommended - Updates to apply
 * @property {Array<{dep: import('./scanner').Dependency, reason: string}>} excluded - Excluded updates with reasons
 */

class UpdateFilter {
  /**
   * @param {UpdatePolicy} policy - Update policy configuration
   */
  constructor(policy) {
    this.policy = {
      allowPatch: policy.allowPatch !== undefined ? policy.allowPatch : true,
      allowMinor: policy.allowMinor !== undefined ? policy.allowMinor : true,
      allowMajor: policy.allowMajor !== undefined ? policy.allowMajor : false,
      denylist: policy.denylist || [],
      excludePatterns: policy.excludePatterns || []
    };
  }

  /**
   * Check if package is in denylist (exact match, case-sensitive)
   * @private
   * @param {string} packageName
   * @returns {boolean}
   */
  isDenylisted(packageName) {
    return this.policy.denylist.includes(packageName);
  }

  /**
   * Check if package matches any exclusion pattern
   * @private
   * @param {string} packageName
   * @returns {boolean}
   */
  isExcluded(packageName) {
    return this.policy.excludePatterns.some(pattern => 
      minimatch(packageName, pattern)
    );
  }

  /**
   * Check if change type is allowed by policy
   * @private
   * @param {string} type - 'patch' | 'minor' | 'major'
   * @returns {boolean}
   */
  isChangeTypeAllowed(type) {
    switch (type) {
      case 'patch':
        return this.policy.allowPatch;
      case 'minor':
        return this.policy.allowMinor;
      case 'major':
        return this.policy.allowMajor;
      default:
        return false;
    }
  }

  /**
   * Filter dependency report based on policy
   * @param {import('./scanner').DependencyReport} report
   * @returns {FilteredUpdates}
   */
  filter(report) {
    const recommended = [];
    const excluded = [];

    for (const dep of report.dependencies) {
      // Check denylist first (T32.4, T32.5)
      if (this.isDenylisted(dep.package)) {
        console.log(`⏭️  Excluded: ${dep.package} (denylisted)`);
        excluded.push({
          dep,
          reason: `Package is denylisted`
        });
        continue;
      }

      // Check exclusion patterns (deprecated, backward compatibility)
      if (this.isExcluded(dep.package)) {
        console.log(`⏭️  Excluded: ${dep.package} (matches exclusion pattern)`);
        excluded.push({
          dep,
          reason: `Matches exclusion pattern`
        });
        continue;
      }

      // Check change type policy
      if (!this.isChangeTypeAllowed(dep.type)) {
        // Special logging for major update blocks (T32.3, T32.6)
        if (dep.type === 'major') {
          console.log(`⏭️  Excluded: ${dep.package}@${dep.current} → ${dep.wanted} (major update blocked)`);
        } else {
          console.log(`⏭️  Excluded: ${dep.package} (${dep.type} updates not allowed)`);
        }
        
        excluded.push({
          dep,
          reason: `${dep.type.charAt(0).toUpperCase() + dep.type.slice(1)} updates not allowed by policy`
        });
        continue;
      }

      // Passed all filters
      recommended.push(dep);
    }

    return {
      recommended,
      excluded
    };
  }

  /**
   * Get summary of filter results
   * @param {FilteredUpdates} results
   * @returns {string}
   */
  getSummary(results) {
    const lines = [];
    
    if (results.recommended.length > 0) {
      lines.push(`Recommended updates: ${results.recommended.length}`);
      results.recommended.forEach(dep => {
        const updateStr = dep.wanted === dep.latest 
          ? `${dep.current} → ${dep.latest}`
          : `${dep.current} → ${dep.wanted} (latest: ${dep.latest})`;
        lines.push(`  - ${dep.package}: ${updateStr} (${dep.type})`);
      });
    } else {
      lines.push('No updates recommended.');
    }

    if (results.excluded.length > 0) {
      lines.push(`\nExcluded: ${results.excluded.length}`);
      results.excluded.forEach(({ dep, reason }) => {
        const updateStr = dep.wanted === dep.latest 
          ? `${dep.current} → ${dep.latest}`
          : `${dep.current} → ${dep.wanted} (latest: ${dep.latest})`;
        lines.push(`  - ${dep.package}: ${updateStr} (${reason})`);
      });
    }

    return lines.join('\n');
  }
}

module.exports = { UpdateFilter };
