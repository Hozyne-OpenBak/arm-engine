# Scanner Interface — Multi-Ecosystem Support

**Version:** 1.0.0  
**Epic:** #13  
**Story:** #16

---

## Overview

ARM v1 implements Node.js dependency scanning only. This document defines the **Scanner Interface** to support future ecosystems (Python, Ruby, Go, etc.) without rewriting core logic.

---

## Core Interface

All scanners must implement this interface:

```javascript
interface DependencyScanner {
  /**
   * Scan target repository for outdated dependencies
   * @returns {Promise<DependencyReport>}
   */
  async scan(): Promise<DependencyReport>;

  /**
   * Refresh repository (re-clone)
   * @returns {Promise<void>}
   */
  async refresh(): Promise<void>;
}
```

---

## Data Types

### DependencyReport

```javascript
interface DependencyReport {
  scannedAt: string;          // ISO 8601 timestamp
  repository: string;         // owner/name format
  ecosystem: string;          // 'nodejs' | 'python' | 'ruby' | 'go' | ...
  dependencies: Dependency[];
}
```

### Dependency

```javascript
interface Dependency {
  package: string;            // Package name
  current: string;            // Current version
  wanted: string;             // Wanted version (respects constraints)
  latest: string;             // Latest available version
  type: 'patch' | 'minor' | 'major'; // Change type
  location: string;           // 'dependencies' | 'devDependencies' | 'optionalDependencies'
  ecosystem?: string;         // Optional: override report-level ecosystem
}
```

---

## Ecosystem-Specific Implementations

### Node.js (Implemented in v1)

**File:** `src/scanner.js`  
**Tool:** `npm outdated --json`  
**Constraint:** Requires `package.json`

```javascript
class NodeJSScanner implements DependencyScanner {
  constructor(targetRepo: string, workspaceDir?: string);
  async scan(): Promise<DependencyReport>;
  async refresh(): Promise<void>;
}
```

**Usage:**
```javascript
const scanner = new NodeJSScanner('owner/repo');
const report = await scanner.scan();
// report.ecosystem === 'nodejs'
```

---

### Python (Future)

**File:** `src/scanners/python.js` (post-MVP)  
**Tool:** `pip list --outdated --format=json`  
**Constraint:** Requires `requirements.txt` or `pyproject.toml`

```javascript
class PythonScanner implements DependencyScanner {
  constructor(targetRepo: string, workspaceDir?: string);
  async scan(): Promise<DependencyReport>;
  async refresh(): Promise<void>;
}
```

**Usage:**
```javascript
const scanner = new PythonScanner('owner/repo');
const report = await scanner.scan();
// report.ecosystem === 'python'
```

---

### Ruby (Future)

**File:** `src/scanners/ruby.js` (post-MVP)  
**Tool:** `bundle outdated --parseable`  
**Constraint:** Requires `Gemfile`

---

### Go (Future)

**File:** `src/scanners/go.js` (post-MVP)  
**Tool:** `go list -u -m -json all`  
**Constraint:** Requires `go.mod`

---

## Auto-Detection Strategy (Future)

```javascript
async function detectEcosystem(repoPath: string): Promise<string | null> {
  if (fs.existsSync(path.join(repoPath, 'package.json'))) return 'nodejs';
  if (fs.existsSync(path.join(repoPath, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(repoPath, 'Gemfile'))) return 'ruby';
  if (fs.existsSync(path.join(repoPath, 'go.mod'))) return 'go';
  return null;
}
```

---

## Migration Path (v1 → v2)

### Current (v1)
```javascript
const { DependencyScanner } = require('./src/scanner');
const scanner = new DependencyScanner('owner/repo');
```

### Future (v2)
```javascript
const { NodeJSScanner, PythonScanner } = require('./src/scanners');
const scanner = new NodeJSScanner('owner/repo');
// OR auto-detect:
const scanner = await ScannerFactory.create('owner/repo');
```

**Compatibility:**  
Export alias in `src/index.js`:
```javascript
module.exports = {
  DependencyScanner: NodeJSScanner, // v1 compat
  NodeJSScanner,
  PythonScanner,
  // ...
};
```

---

## Filter Integration

Filters work across all ecosystems (no changes needed):

```javascript
const filter = new UpdateFilter(policy);
const results = filter.filter(report); // Works for any ecosystem
```

---

## Story Creator Integration

Story creator detects ecosystem from `report.ecosystem`:

```javascript
const story = await storyCreator.createStory(dependency, report.ecosystem);
// Generates: "Update express (Node.js) from 4.17.1 to 4.22.1"
```

---

## Testing Strategy

Each scanner implementation must provide:

1. **Unit tests** — Mock ecosystem tools (npm, pip, bundle, go)
2. **Integration tests** — Real test repos in each ecosystem
3. **Interface compliance** — TypeScript or runtime checks

---

## Benefits

- **Clean separation:** Each ecosystem in its own file
- **No refactoring:** Core logic (filter, story creator, PR generator) unchanged
- **Easy testing:** Mock one ecosystem without affecting others
- **Progressive enhancement:** Add ecosystems incrementally

---

**Status:** Design  
**Implementation:** Node.js only (v1)  
**Next ecosystems:** Python, Ruby, Go (post-MVP)
