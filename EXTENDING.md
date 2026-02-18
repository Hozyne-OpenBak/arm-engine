# ARM v1 Extension Guide

**Version:** 1.0.0  
**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Status:** Post-MVP

---

## Overview

ARM v1 MVP supports **Node.js only**. This guide describes how to extend ARM to support additional package ecosystems (Python, Ruby, Go, Rust, etc.) in future versions.

### Design Principles

1. **Scanner Interface Contract** — All scanners implement the same interface
2. **Ecosystem Detection** — Auto-detect ecosystem from repository
3. **Governance Integrity** — Maintain cross-repo Story/PR linking
4. **Policy Consistency** — Same patch/minor/major policy across ecosystems
5. **Minimal Core Changes** — New ecosystems = new scanner modules, not core refactors

---

## Architecture Overview

### Current (MVP)

```
┌─────────────────────────────────────────────────────────┐
│  ARM v1 (Node.js only)                                  │
│                                                          │
│  ┌──────────────┐                                       │
│  │ Orchestrator │──────┐                                │
│  └──────────────┘      │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ NodeJS Scanner   │                       │
│              │ (npm outdated)   │                       │
│              └──────────────────┘                       │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ Filter           │                       │
│              └──────────────────┘                       │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ Story Creator    │                       │
│              └──────────────────┘                       │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ PR Generator     │                       │
│              └──────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Future (Multi-Ecosystem)

```
┌─────────────────────────────────────────────────────────┐
│  ARM v2 (Multi-Ecosystem)                               │
│                                                          │
│  ┌──────────────┐                                       │
│  │ Orchestrator │──────┐                                │
│  └──────────────┘      │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ Ecosystem Router │                       │
│              └──────────────────┘                       │
│                        │                                │
│          ┌─────────────┼─────────────┬─────────────┐   │
│          ▼             ▼             ▼             ▼   │
│    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────┐ │
│    │ Node.js │   │ Python  │   │ Ruby    │   │ Go  │ │
│    │ Scanner │   │ Scanner │   │ Scanner │   │ ... │ │
│    └─────────┘   └─────────┘   └─────────┘   └─────┘ │
│          │             │             │             │   │
│          └─────────────┼─────────────┴─────────────┘   │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ Unified Filter   │                       │
│              └──────────────────┘                       │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ Story Creator    │                       │
│              │ (ecosystem-aware)│                       │
│              └──────────────────┘                       │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │ PR Generator     │                       │
│              │ (ecosystem-aware)│                       │
│              └──────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## Scanner Interface Contract

All scanners must implement the `DependencyScanner` interface defined in [SCANNER_INTERFACE.md](./SCANNER_INTERFACE.md).

### Interface Definition

```javascript
/**
 * DependencyScanner Interface
 * 
 * All ecosystem scanners must implement this interface.
 */
class DependencyScanner {
  /**
   * @param {string} repository - Repository identifier (owner/name)
   */
  constructor(repository) {}

  /**
   * Scan repository for outdated dependencies
   * @returns {Promise<ScanReport>}
   */
  async scan() {}

  /**
   * Get ecosystem identifier
   * @returns {string}
   */
  getEcosystem() {}
}

/**
 * ScanReport structure
 */
interface ScanReport {
  scannedAt: string;          // ISO timestamp
  ecosystem: string;          // "nodejs", "python", etc.
  repository: string;         // "owner/name"
  dependencies: Dependency[]; // Array of outdated dependencies
}

/**
 * Dependency structure
 */
interface Dependency {
  package: string;    // Package name
  current: string;    // Current version
  wanted: string;     // Recommended version (respects semver range)
  latest: string;     // Latest available version
  type: string;       // "patch", "minor", "major"
  location: string;   // "dependencies", "devDependencies", etc.
}
```

### Example: Node.js Scanner (Current)

```javascript
// src/scanner.js
const { execSync } = require('child_process');

class NodeJSDependencyScanner {
  constructor(repository) {
    this.repository = repository;
  }

  async scan() {
    const output = execSync('npm outdated --json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const outdated = JSON.parse(output || '{}');
    const dependencies = this.parseNpmOutdated(outdated);

    return {
      scannedAt: new Date().toISOString(),
      ecosystem: 'nodejs',
      repository: this.repository,
      dependencies
    };
  }

  parseNpmOutdated(outdated) {
    return Object.entries(outdated).map(([pkg, info]) => ({
      package: pkg,
      current: info.current,
      wanted: info.wanted,
      latest: info.latest,
      type: this.determineChangeType(info.current, info.wanted),
      location: info.location || 'dependencies'
    }));
  }

  determineChangeType(current, wanted) {
    // Semver comparison logic
    // Returns "patch", "minor", or "major"
  }

  getEcosystem() {
    return 'nodejs';
  }
}

module.exports = { NodeJSDependencyScanner };
```

---

## Adding a New Ecosystem

### Step 1: Create Scanner Module

**Location:** `src/scanners/<ecosystem>-scanner.js`

**Example:** `src/scanners/python-scanner.js`

```javascript
/**
 * python-scanner.js - Python dependency scanner
 * Implements DependencyScanner interface for Python (pip/poetry)
 */
const { execSync } = require('child_process');

class PythonDependencyScanner {
  constructor(repository) {
    this.repository = repository;
    this.toolDetected = null; // 'pip', 'poetry', or 'pipenv'
  }

  async scan() {
    // Detect Python package manager
    this.toolDetected = this.detectPackageManager();

    if (!this.toolDetected) {
      throw new Error('No Python package manager detected (pip, poetry, pipenv)');
    }

    // Run appropriate outdated command
    let dependencies;
    switch (this.toolDetected) {
      case 'poetry':
        dependencies = this.scanPoetry();
        break;
      case 'pip':
        dependencies = this.scanPip();
        break;
      case 'pipenv':
        dependencies = this.scanPipenv();
        break;
      default:
        throw new Error(`Unsupported Python tool: ${this.toolDetected}`);
    }

    return {
      scannedAt: new Date().toISOString(),
      ecosystem: 'python',
      repository: this.repository,
      dependencies
    };
  }

  detectPackageManager() {
    // Check for pyproject.toml (poetry)
    try {
      execSync('test -f pyproject.toml', { stdio: 'pipe' });
      return 'poetry';
    } catch {}

    // Check for Pipfile (pipenv)
    try {
      execSync('test -f Pipfile', { stdio: 'pipe' });
      return 'pipenv';
    } catch {}

    // Check for requirements.txt (pip)
    try {
      execSync('test -f requirements.txt', { stdio: 'pipe' });
      return 'pip';
    } catch {}

    return null;
  }

  scanPoetry() {
    const output = execSync('poetry show --outdated --no-ansi', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return this.parsePoetryOutput(output);
  }

  parsePoetryOutput(output) {
    // Parse poetry show output
    // Format: package current latest
    // Example: requests 2.28.0 2.31.0
    const lines = output.trim().split('\n');
    const dependencies = [];

    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)/);
      if (!match) continue;

      const [, pkg, current, latest] = match;
      dependencies.push({
        package: pkg,
        current,
        wanted: latest, // Poetry doesn't distinguish wanted vs latest
        latest,
        type: this.determineChangeType(current, latest),
        location: 'dependencies'
      });
    }

    return dependencies;
  }

  scanPip() {
    const output = execSync('pip list --outdated --format=json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return this.parsePipOutput(JSON.parse(output));
  }

  parsePipOutput(outdated) {
    return outdated.map(item => ({
      package: item.name,
      current: item.version,
      wanted: item.latest_version,
      latest: item.latest_version,
      type: this.determineChangeType(item.version, item.latest_version),
      location: 'dependencies'
    }));
  }

  scanPipenv() {
    const output = execSync('pipenv update --outdated', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return this.parsePipenvOutput(output);
  }

  parsePipenvOutput(output) {
    // Parse pipenv update --outdated output
    // Implementation depends on pipenv output format
  }

  determineChangeType(current, target) {
    // Python version comparison (PEP 440)
    const currParts = current.split('.').map(Number);
    const targParts = target.split('.').map(Number);

    if (currParts[0] !== targParts[0]) return 'major';
    if (currParts[1] !== targParts[1]) return 'minor';
    return 'patch';
  }

  getEcosystem() {
    return 'python';
  }
}

module.exports = { PythonDependencyScanner };
```

---

### Step 2: Register Scanner

**Location:** `src/scanner-registry.js`

```javascript
/**
 * scanner-registry.js - Ecosystem scanner registry
 */
const { NodeJSDependencyScanner } = require('./scanners/nodejs-scanner');
const { PythonDependencyScanner } = require('./scanners/python-scanner');
// Import additional scanners here

const SCANNERS = {
  nodejs: NodeJSDependencyScanner,
  python: PythonDependencyScanner,
  // ruby: RubyDependencyScanner,
  // go: GoDependencyScanner,
};

/**
 * Detect ecosystem from repository
 * @param {string} repoPath - Path to repository
 * @returns {string} - Ecosystem identifier
 */
function detectEcosystem(repoPath) {
  const fs = require('fs');
  const path = require('path');

  // Node.js: package.json
  if (fs.existsSync(path.join(repoPath, 'package.json'))) {
    return 'nodejs';
  }

  // Python: pyproject.toml, requirements.txt, Pipfile
  if (
    fs.existsSync(path.join(repoPath, 'pyproject.toml')) ||
    fs.existsSync(path.join(repoPath, 'requirements.txt')) ||
    fs.existsSync(path.join(repoPath, 'Pipfile'))
  ) {
    return 'python';
  }

  // Ruby: Gemfile
  if (fs.existsSync(path.join(repoPath, 'Gemfile'))) {
    return 'ruby';
  }

  // Go: go.mod
  if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
    return 'go';
  }

  // Rust: Cargo.toml
  if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) {
    return 'rust';
  }

  throw new Error('Unknown ecosystem: no supported package manager files found');
}

/**
 * Get scanner for ecosystem
 * @param {string} ecosystem - Ecosystem identifier
 * @param {string} repository - Repository identifier
 * @returns {DependencyScanner}
 */
function getScanner(ecosystem, repository) {
  const ScannerClass = SCANNERS[ecosystem];
  if (!ScannerClass) {
    throw new Error(`No scanner registered for ecosystem: ${ecosystem}`);
  }
  return new ScannerClass(repository);
}

module.exports = { detectEcosystem, getScanner, SCANNERS };
```

---

### Step 3: Update Orchestrator

**Location:** `src/orchestrator.js` (future file, not in MVP)

```javascript
/**
 * orchestrator.js - ARM orchestration logic
 */
const { detectEcosystem, getScanner } = require('./scanner-registry');
const { UpdateFilter } = require('./filter');
const { StoryCreator } = require('./story-creator');
const { PRGenerator } = require('./pr-generator');

class ARMOrchestrator {
  constructor(config) {
    this.config = config;
  }

  async run() {
    // Step 1: Detect ecosystem
    console.log('Detecting ecosystem...');
    const ecosystem = detectEcosystem('/path/to/repo');
    console.log(`✅ Detected: ${ecosystem}`);

    // Step 2: Get appropriate scanner
    const scanner = getScanner(ecosystem, this.config.target.repository);

    // Step 3: Scan for outdated dependencies
    console.log('Scanning for outdated dependencies...');
    const report = await scanner.scan();
    console.log(`✅ Found ${report.dependencies.length} outdated`);

    // Step 4: Apply filter policy
    console.log('Applying filter policy...');
    const filter = new UpdateFilter(this.config.policy);
    const filtered = filter.filter(report);
    console.log(`✅ ${filtered.recommended.length} recommended, ${filtered.excluded.length} excluded`);

    // Step 5: Process each recommended update
    for (const dep of filtered.recommended) {
      console.log(`\nProcessing: ${dep.package} (${dep.current} → ${dep.wanted})`);

      // Create Story
      const storyCreator = new StoryCreator({
        governanceRepo: this.config.governance.repository,
        epicNumber: this.config.governance.epicNumber,
        targetRepo: this.config.target.repository
      });

      const story = await storyCreator.createStory(dep, ecosystem, this.config.execution.dryRun);
      console.log(`✅ Story created: ${story.url}`);

      // Create PR
      const prGenerator = new PRGenerator({
        targetRepo: this.config.target.repository,
        baseBranch: this.config.target.branch
      });

      const pr = await prGenerator.createPR(
        dep,
        story.number,
        this.config.governance.repository,
        this.config.execution.dryRun
      );
      console.log(`✅ PR created: ${pr.url}`);
    }
  }
}

module.exports = { ARMOrchestrator };
```

---

### Step 4: Update Story Template

**Location:** `src/story-creator.js`

**Change:** Make Story template ecosystem-aware

```javascript
generateStoryBody(dep, ecosystem) {
  // Map ecosystem to human-readable label
  const ecosystemLabels = {
    nodejs: 'Node.js',
    python: 'Python',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust'
  };

  const ecosystemLabel = ecosystemLabels[ecosystem] || ecosystem;

  // Map ecosystem to manifest/lock file names
  const manifestFiles = {
    nodejs: '`package.json`, `package-lock.json`',
    python: '`requirements.txt`, `pyproject.toml`, or `Pipfile.lock`',
    ruby: '`Gemfile`, `Gemfile.lock`',
    go: '`go.mod`, `go.sum`',
    rust: '`Cargo.toml`, `Cargo.lock`'
  };

  const manifestFile = manifestFiles[ecosystem] || 'package manifest';

  return `## Story: Update ${dep.package} from ${dep.current} to ${dep.wanted}

### Epic
#${this.epicNumber} — ARM v1: Autonomous Repo Maintenance (MVP)

### Objective
Update \`${dep.package}\` dependency in \`${this.targetRepo}\` to address outdated ${ecosystemLabel} package.

### Target Repository
\`${this.targetRepo}\`

### Change Details
- **Package:** ${dep.package}
- **Ecosystem:** ${ecosystemLabel}
- **Current version:** ${dep.current}
- **Target version:** ${dep.wanted}
- **Latest version:** ${dep.latest}
- **Change type:** ${changeTypeLabel}
- **Location:** ${dep.location}

### Goals
- Update package to recommended version
- Maintain compatibility (${dep.type} update only)
- Regenerate lock files
- Pass all validation checks

### Non-Goals
- Breaking changes (major version updates)
- Multi-package updates in single PR
- Dependency conflict resolution (defer to manual review)

### Acceptance Criteria
- [ ] Package manifest updated with new version
- [ ] Lock file regenerated
- [ ] No breaking changes introduced
- [ ] PR created and linked to this Story
- [ ] PR passes validation workflow
- [ ] Human review completed

### Tasks
- [ ] Update package manifest (${manifestFile})
- [ ] Regenerate lock file
- [ ] Run basic smoke tests (if available)
- [ ] Create PR with Story reference
- [ ] Link PR to this Story

### Implementation Notes
**Change type:** ${changeTypeLabel} update (${dep.current} → ${dep.wanted})  
**Note:** Latest version is ${dep.latest}, but ${dep.wanted} is recommended based on current version constraints.

**Recommended approach:**
1. Update version in package manifest
2. Run package manager install/update command
3. Verify lock file changes
4. Commit with message: "Update ${dep.package} from ${dep.current} to ${dep.wanted}"

### PR Link
*Will be added when PR is created*

---
**Status:** Draft  
**Automated:** true  
**Generated by:** ARM v1  
**Scanned at:** ${report.scannedAt}
`;
}
```

---

### Step 5: Update PR Generator

**Location:** `src/pr-generator.js`

**Change:** Make PR generation ecosystem-aware

```javascript
async applyChanges(branchName, dep, ecosystem) {
  // Ecosystem-specific update logic
  switch (ecosystem) {
    case 'nodejs':
      await this.updateNodeJS(branchName, dep);
      break;
    case 'python':
      await this.updatePython(branchName, dep);
      break;
    case 'ruby':
      await this.updateRuby(branchName, dep);
      break;
    // Add cases for other ecosystems
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

async updateNodeJS(branchName, dep) {
  // Existing implementation
  await this.updatePackageJson(dep);
  execSync('npm install', { cwd: this.workspacePath, stdio: 'inherit' });
  execSync('git add package.json package-lock.json', { cwd: this.workspacePath });
  execSync(`git commit -m "Update ${dep.package} from ${dep.current} to ${dep.wanted}"`, {
    cwd: this.workspacePath
  });
}

async updatePython(branchName, dep) {
  const fs = require('fs');
  const path = require('path');

  // Detect Python tool
  if (fs.existsSync(path.join(this.workspacePath, 'pyproject.toml'))) {
    // Poetry
    execSync(`poetry add ${dep.package}@^${dep.wanted}`, {
      cwd: this.workspacePath,
      stdio: 'inherit'
    });
    execSync('git add pyproject.toml poetry.lock', { cwd: this.workspacePath });
  } else if (fs.existsSync(path.join(this.workspacePath, 'Pipfile'))) {
    // Pipenv
    execSync(`pipenv install ${dep.package}==${dep.wanted}`, {
      cwd: this.workspacePath,
      stdio: 'inherit'
    });
    execSync('git add Pipfile Pipfile.lock', { cwd: this.workspacePath });
  } else {
    // pip / requirements.txt
    const reqPath = path.join(this.workspacePath, 'requirements.txt');
    let content = fs.readFileSync(reqPath, 'utf8');
    content = content.replace(
      new RegExp(`${dep.package}==.*`, 'g'),
      `${dep.package}==${dep.wanted}`
    );
    fs.writeFileSync(reqPath, content);
    execSync('git add requirements.txt', { cwd: this.workspacePath });
  }

  execSync(`git commit -m "Update ${dep.package} from ${dep.current} to ${dep.wanted}"`, {
    cwd: this.workspacePath
  });
}

async updateRuby(branchName, dep) {
  // Update Gemfile
  execSync(`bundle update ${dep.package}`, {
    cwd: this.workspacePath,
    stdio: 'inherit'
  });
  execSync('git add Gemfile Gemfile.lock', { cwd: this.workspacePath });
  execSync(`git commit -m "Update ${dep.package} from ${dep.current} to ${dep.wanted}"`, {
    cwd: this.workspacePath
  });
}
```

---

### Step 6: Add Unit Tests

**Location:** `test/unit/scanners/python-scanner.test.js`

```javascript
/**
 * python-scanner.test.js - Unit tests for Python scanner
 */
const { PythonDependencyScanner } = require('../../../src/scanners/python-scanner');

describe('PythonDependencyScanner', () => {
  let scanner;

  beforeEach(() => {
    scanner = new PythonDependencyScanner('owner/test-repo');
  });

  describe('detectPackageManager', () => {
    test('detects poetry when pyproject.toml exists', () => {
      // Mock fs.existsSync
      const tool = scanner.detectPackageManager();
      expect(tool).toBe('poetry');
    });

    test('detects pip when requirements.txt exists', () => {
      const tool = scanner.detectPackageManager();
      expect(tool).toBe('pip');
    });

    test('returns null when no Python files found', () => {
      const tool = scanner.detectPackageManager();
      expect(tool).toBeNull();
    });
  });

  describe('parsePoetryOutput', () => {
    test('parses poetry show output correctly', () => {
      const output = `requests 2.28.0 2.31.0
flask 2.0.0 3.0.0`;
      const deps = scanner.parsePoetryOutput(output);

      expect(deps).toHaveLength(2);
      expect(deps[0]).toMatchObject({
        package: 'requests',
        current: '2.28.0',
        wanted: '2.31.0',
        latest: '2.31.0',
        type: 'minor',
        location: 'dependencies'
      });
    });
  });

  describe('determineChangeType', () => {
    test('identifies major change', () => {
      expect(scanner.determineChangeType('2.0.0', '3.0.0')).toBe('major');
    });

    test('identifies minor change', () => {
      expect(scanner.determineChangeType('2.28.0', '2.31.0')).toBe('minor');
    });

    test('identifies patch change', () => {
      expect(scanner.determineChangeType('2.28.0', '2.28.1')).toBe('patch');
    });
  });

  describe('getEcosystem', () => {
    test('returns "python"', () => {
      expect(scanner.getEcosystem()).toBe('python');
    });
  });
});
```

---

### Step 7: Update Documentation

**Files to update:**

1. **README.md**
   - Add Python to supported ecosystems list
   - Update Quick Start with ecosystem detection

2. **ARCHITECTURE.md**
   - Document scanner registry
   - Add ecosystem detection flow
   - Update component diagram

3. **SCANNER_INTERFACE.md**
   - Add Python scanner example
   - Document ecosystem-specific considerations

---

## Ecosystem-Specific Considerations

### Python

**Package Managers:**
- pip (requirements.txt)
- poetry (pyproject.toml)
- pipenv (Pipfile)

**Challenges:**
- Version specifiers (==, >=, ~=)
- Dependency resolution (poetry lock vs pip)
- Virtual environments

**Recommendation:**
- Start with poetry (simplest, most modern)
- Add pip support second (most common)
- Pipenv last (less common)

---

### Ruby

**Package Manager:**
- bundler (Gemfile)

**Command:**
```bash
bundle outdated --parseable
```

**Format:**
```
gem_name (current_version < wanted_version < latest_version)
```

**Challenges:**
- Gemfile version constraints (~>, >=)
- Platform-specific gems

---

### Go

**Package Manager:**
- go modules (go.mod)

**Command:**
```bash
go list -u -m -json all
```

**Output:** JSON with module versions

**Challenges:**
- Indirect dependencies
- Module replacement (replace directive)
- Major version suffixes (v2, v3)

---

### Rust

**Package Manager:**
- cargo (Cargo.toml)

**Command:**
```bash
cargo outdated --format json
```

**Output:** JSON with crate versions

**Challenges:**
- Semver compatibility
- Optional features
- Workspace dependencies

---

## Governance Integrity

### Cross-Ecosystem Consistency

When adding new ecosystems, ensure:

1. **Story template consistency**
   - Same structure for all ecosystems
   - Ecosystem name in title and body
   - Manifest/lock files mentioned correctly

2. **PR body consistency**
   - Cross-repo Story reference format unchanged
   - Files changed section ecosystem-appropriate

3. **Label consistency**
   - Same labels for all ecosystems
   - No ecosystem-specific labels (keep simple)

4. **Workflow compatibility**
   - validate-story-reference: Works for all ecosystems
   - update-story-status: Works for all ecosystems
   - No ecosystem-specific workflows required

---

## Testing Strategy

### Unit Tests (per ecosystem)

- Scanner parsing logic
- Version comparison
- Change type determination
- Tool detection

### Integration Tests (per ecosystem)

- End-to-end: scan → Story → PR
- Dry-run mode
- Real execution (test repo)

### Cross-Ecosystem Tests

- Ecosystem detection accuracy
- Scanner registry
- Multi-ecosystem repositories (if applicable)

---

## Migration Path (Post-MVP)

### Phase 1: Registry + Python (v1.1)

1. Extract Node.js scanner to `src/scanners/nodejs-scanner.js`
2. Create scanner registry
3. Implement Python scanner
4. Add integration tests
5. Update documentation

**Epic scope:** ~2-3 Stories

---

### Phase 2: Ruby + Go (v1.2)

1. Implement Ruby scanner
2. Implement Go scanner
3. Add integration tests
4. Update documentation

**Epic scope:** ~2 Stories

---

### Phase 3: Rust + Others (v1.3+)

1. Implement Rust scanner
2. Implement additional ecosystems as needed
3. Add integration tests
4. Update documentation

**Epic scope:** 1 Story per ecosystem

---

## Configuration Changes (Future)

### Per-Ecosystem Policies

**Current (MVP):**
```json
{
  "policy": {
    "allowPatch": true,
    "allowMinor": true,
    "allowMajor": false
  }
}
```

**Future (Multi-Ecosystem):**
```json
{
  "policy": {
    "default": {
      "allowPatch": true,
      "allowMinor": true,
      "allowMajor": false
    },
    "nodejs": {
      "allowMinor": true,
      "excludePatterns": ["react"]
    },
    "python": {
      "allowMinor": false,
      "allowPatch": true
    }
  }
}
```

**Rationale:**
- Different ecosystems have different stability norms
- Python major updates often safer than Node.js
- Per-ecosystem exclude patterns

---

## Appendix: Ecosystem Commands

### Node.js
```bash
npm outdated --json
```

### Python (poetry)
```bash
poetry show --outdated --no-ansi
```

### Python (pip)
```bash
pip list --outdated --format=json
```

### Python (pipenv)
```bash
pipenv update --outdated
```

### Ruby
```bash
bundle outdated --parseable
```

### Go
```bash
go list -u -m -json all
```

### Rust
```bash
cargo outdated --format json
```

---

## Appendix: Version Comparison Libraries

### Node.js
- **Library:** `semver`
- **Usage:** `semver.diff('1.0.0', '2.0.0') // 'major'`

### Python
- **Library:** `packaging`
- **Usage:** `Version('1.0.0') < Version('2.0.0')`

### Ruby
- **Library:** `gem`
- **Usage:** `Gem::Version.new('1.0.0') < Gem::Version.new('2.0.0')`

### Go
- **Library:** Built-in `semver` support
- **Usage:** Module version comparison

### Rust
- **Library:** `semver` crate
- **Usage:** `Version::parse("1.0.0")`

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-18  
**Story:** [#19](https://github.com/Hozyne-OpenBak/openclaw-core/issues/19)  
**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Status:** Post-MVP guidance
