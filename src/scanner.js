/**
 * scanner.js - Dependency Detection Engine
 * 
 * Detects outdated Node.js dependencies in a target repository
 * using npm outdated.
 * 
 * Story: #15
 * Epic: #13
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} Dependency
 * @property {string} package - Package name
 * @property {string} current - Current version
 * @property {string} wanted - Wanted version (respects semver range)
 * @property {string} latest - Latest available version
 * @property {string} type - Change type: 'patch' | 'minor' | 'major'
 * @property {string} location - Location: 'dependencies' | 'devDependencies'
 */

/**
 * @typedef {Object} DependencyReport
 * @property {string} scannedAt - ISO timestamp of scan
 * @property {string} repository - Repository in owner/name format
 * @property {Dependency[]} dependencies - List of outdated dependencies
 */

class DependencyScanner {
  /**
   * @param {string} targetRepo - Target repository in owner/name format
   * @param {string} workspaceDir - Workspace directory for cloning
   */
  constructor(targetRepo, workspaceDir = '/tmp/arm-workspace') {
    this.targetRepo = targetRepo;
    this.workspaceDir = workspaceDir;
    this.repoPath = path.join(workspaceDir, targetRepo.split('/')[1]);
  }

  /**
   * Ensure repository is cloned or updated
   * @private
   */
  async ensureRepo() {
    if (!fs.existsSync(this.workspaceDir)) {
      fs.mkdirSync(this.workspaceDir, { recursive: true });
    }

    if (fs.existsSync(this.repoPath)) {
      // Pull latest
      try {
        execSync('git pull', { cwd: this.repoPath, stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Failed to pull repository: ${error.message}`);
      }
    } else {
      // Clone
      try {
        const cloneUrl = `https://github.com/${this.targetRepo}.git`;
        execSync(`git clone ${cloneUrl} ${this.repoPath}`, { 
          cwd: this.workspaceDir, 
          stdio: 'pipe' 
        });
      } catch (error) {
        throw new Error(`Failed to clone repository: ${error.message}`);
      }
    }
  }

  /**
   * Determine change type based on semver versions
   * @private
   * @param {string} current - Current version
   * @param {string} latest - Latest version
   * @returns {string} - 'patch' | 'minor' | 'major'
   */
  determineChangeType(current, latest) {
    // Strip leading 'v' or '^' or '~' if present
    const cleanCurrent = current.replace(/^[v^~]/, '');
    const cleanLatest = latest.replace(/^[v^~]/, '');

    const [currMajor, currMinor, currPatch] = cleanCurrent.split('.').map(Number);
    const [latestMajor, latestMinor, latestPatch] = cleanLatest.split('.').map(Number);

    if (latestMajor > currMajor) return 'major';
    if (latestMinor > currMinor) return 'minor';
    if (latestPatch > currPatch) return 'patch';
    
    return 'patch'; // Default to patch if versions are equal or format is unexpected
  }

  /**
   * Parse npm outdated JSON output
   * @private
   * @param {string} jsonOutput - Raw JSON output from npm outdated
   * @returns {Dependency[]}
   */
  parseNpmOutdated(jsonOutput) {
    if (!jsonOutput || jsonOutput.trim() === '') {
      return [];
    }

    try {
      const outdated = JSON.parse(jsonOutput);
      const dependencies = [];

      for (const [packageName, info] of Object.entries(outdated)) {
        // Use "wanted" for update recommendations (respects semver range)
        // This ensures we don't recommend major updates if current range is ^X.Y.Z
        const targetVersion = info.wanted || info.latest;
        
        const dep = {
          package: packageName,
          current: info.current || 'unknown',
          wanted: info.wanted || info.latest,
          latest: info.latest || 'unknown',
          type: this.determineChangeType(info.current, targetVersion),
          location: info.type || 'dependencies'
        };

        dependencies.push(dep);
      }

      return dependencies;
    } catch (error) {
      throw new Error(`Failed to parse npm outdated output: ${error.message}`);
    }
  }

  /**
   * Scan repository for outdated dependencies
   * @returns {Promise<DependencyReport>}
   */
  async scan() {
    // Ensure repo is available
    await this.ensureRepo();

    // Check package.json exists
    const packageJsonPath = path.join(this.repoPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`No package.json found in ${this.targetRepo}`);
    }

    // Run npm outdated
    let outdatedOutput = '';
    try {
      // npm outdated exits with code 1 if outdated packages exist
      // We need to capture output regardless of exit code
      outdatedOutput = execSync('npm outdated --json', {
        cwd: this.repoPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (error) {
      // npm outdated returns exit code 1 when outdated deps found
      // Output is in error.stdout
      if (error.stdout) {
        outdatedOutput = error.stdout;
      } else {
        throw new Error(`npm outdated failed: ${error.message}`);
      }
    }

    // Parse output
    const dependencies = this.parseNpmOutdated(outdatedOutput);

    return {
      scannedAt: new Date().toISOString(),
      repository: this.targetRepo,
      ecosystem: 'nodejs',
      dependencies
    };
  }

  /**
   * Refresh repository (re-clone)
   * @returns {Promise<void>}
   */
  async refresh() {
    if (fs.existsSync(this.repoPath)) {
      fs.rmSync(this.repoPath, { recursive: true, force: true });
    }
    await this.ensureRepo();
  }
}

module.exports = { DependencyScanner };
