# ARM v1 — Autonomous Repo Maintenance

**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Status:** In Development  
**Version:** 1.0.0 (MVP)

---

## Overview

ARM (Autonomous Repo Maintenance) is an OpenClaw-powered agent that autonomously detects, proposes, and executes safe maintenance changes on target GitHub repositories.

**MVP Focus:** Node.js dependency updates

---


---

## GitHub Actions Quick Start

**Recommended:** Use GitHub Actions workflow for automated, scheduled, or manual ARM execution.

### Prerequisites

1. **ARM_TOKEN secret** configured in repository settings
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`
   - Create new secret: `ARM_TOKEN`
   - Value: GitHub personal access token with `repo` scope

2. **Workflow file** already exists: [`.github/workflows/arm-execute.yml`](.github/workflows/arm-execute.yml)

3. **Configuration file** exists: `arm.config.json` in repository root

---

### Quick Run (Dry-Run Mode)

**Safest option:** Test workflow without creating Stories or PRs.

1. Go to **Actions** tab in this repository
2. Select **"ARM Execute"** workflow (left sidebar)
3. Click **"Run workflow"** dropdown (top-right)
4. Set **Dry run mode:** `true` ✅ (default)
5. Click **"Run workflow"** button

**Result:** Workflow scans for outdated dependencies and logs results without creating Issues or PRs.

---

### Production Run (Creates Stories + PRs)

**⚠️ Use with caution:** Creates real GitHub Issues and Pull Requests.

1. Go to **Actions** tab
2. Select **"ARM Execute"** workflow
3. Click **"Run workflow"** dropdown
4. Set **Dry run mode:** `false` ⚠️
5. Optionally change **Target repository** (default: `Hozyne-OpenBak/arm`)
6. Click **"Run workflow"** button

**Result:** Workflow creates Stories in governance repo and PRs in target repo for recommended updates.

---

### View Results

**Workflow Logs:**
- Click on the workflow run to see detailed logs
- Look for `✅ Story created:` and `✅ PR created:` messages

**Job Summary:**
- Scroll to bottom of workflow run page
- View markdown table with all created Stories and PRs

**Annotations:**
- Click **"Annotations"** tab (top bar)
- Review notices (✅ successes), warnings (⚠️ retries), and errors (❌ failures)

---

### Workflow Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `targetRepo` | Target repository (owner/name) | `Hozyne-OpenBak/arm` | No |
| `dryRun` | Dry run mode (no API calls) | `true` | No |
| `configPath` | Path to config file | `arm.config.json` | No |

**Example via GitHub CLI:**
```bash
# Dry-run (safe)
gh workflow run arm-execute.yml \
  --repo Hozyne-OpenBak/arm-engine \
  -f dryRun=true

# Production (creates Stories + PRs)
gh workflow run arm-execute.yml \
  --repo Hozyne-OpenBak/arm-engine \
  -f dryRun=false \
  -f targetRepo=Hozyne-OpenBak/my-repo
```

---

### Troubleshooting

**Workflow fails immediately:**
- ✅ Verify `ARM_TOKEN` secret exists
- ✅ Check token has `repo` scope
- ✅ Confirm `arm.config.json` is valid JSON

**No Stories or PRs created:**
- ℹ️ Check logs for "No outdated dependencies found"
- ℹ️ Review "Excluded" messages (e.g., major updates blocked)
- ℹ️ Verify filter policy in `arm.config.json`

**Rate limit errors:**
- ⏱️ Wait for rate limit reset (shown in logs)
- ⏱️ Retry logic automatically handles transient failures (3 attempts)

For detailed troubleshooting, see [RUNBOOK.md - Troubleshooting](./RUNBOOK.md#troubleshooting-github-actions-runs).

---

### Full Documentation

- **[RUNBOOK.md](./RUNBOOK.md)** - Complete operational guide
  - GitHub Actions execution details
  - Workflow inputs and outputs
  - Monitoring and troubleshooting
  - Best practices
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical design
- **[Test Integration](./test/integration/README.md)** - Integration testing guide

---

## CLI Quick Start

## CLI Quick Start (Alternative)

### Prerequisites

- OpenClaw agent environment
- GitHub CLI (`gh`) authenticated
- Write access to target and governance repositories

### Configuration

1. Copy `arm.config.json` and customize:
   - `target.repository`: Your target repo
   - `governance.repository`: Your governance repo
   - `governance.epicNumber`: Your Epic issue number

2. Adjust update policy:
   - `policy.allowPatch`: true (recommended)
   - `policy.allowMinor`: true (safe for most cases)
   - `policy.allowMajor`: false (requires human review)

### Run

**Manual trigger:**
```bash
openclaw run arm
```

**Dry-run (scan only, no Story/PR):**
```json
{
  "execution": {
    "dryRun": true
  }
}
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical design.  
See [SCANNER_INTERFACE.md](./SCANNER_INTERFACE.md) for multi-ecosystem support design.

**Components:**
- **Orchestrator**: Main control flow
- **Scanner**: Detect outdated dependencies via `npm outdated`
- **Filter**: Apply update policy (patch/minor/major)
- **Story Creator**: Create Story issues in governance repo
- **PR Generator**: Create PRs in target repo with Story reference

**Data Flow:**
```
Scan → Filter → Create Story → Create PR → Validation → Human Review → Merge
```

---

## Configuration Reference

Full schema: [config.schema.json](./config.schema.json)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | string | ✓ | - | Config schema version |
| `target.repository` | string | ✓ | - | Target repo (owner/name) |
| `target.branch` | string | | `main` | Target branch |
| `governance.repository` | string | ✓ | - | Governance repo for Stories |
| `governance.epicNumber` | number | ✓ | - | Epic to link Stories to |
| `policy.allowPatch` | boolean | | `true` | Allow patch updates |
| `policy.allowMinor` | boolean | | `true` | Allow minor updates |
| `policy.allowMajor` | boolean | | `false` | Allow major updates (safe default: false) |
| `policy.denylist` | string[] | | `[]` | Packages to exclude (exact names) |
| `policy.excludePatterns` | string[] | | `[]` | Packages to exclude (glob patterns, deprecated) |
| `execution.trigger` | string | | `manual` | Trigger mode (manual/cron) |
| `execution.dryRun` | boolean | | `false` | Scan only, no Story/PR |
| `github.authMethod` | string | | `gh-cli` | Auth method (gh-cli only for v1) |

### Policy Configuration

**Safe Defaults:**
- `allowMajor` is enforced as `false` by default to prevent breaking changes
- Major version updates require manual review and are blocked automatically
- Config validation will fail if `allowMajor: true` is set

**Denylist Usage:**
The `denylist` field allows excluding specific packages from ARM processing:

```json
{
  "policy": {
    "allowPatch": true,
    "allowMinor": true,
    "allowMajor": false,
    "denylist": ["express", "lodash", "webpack"]
  }
}
```

**When to use denylist:**
- Packages with known breaking changes in minor/patch updates
- Dependencies managed by another process
- Packages with custom update workflows
- Temporary exclusions during migration

**Package matching:**
- Exact package name only (case-sensitive)
- No glob patterns or wildcards
- Example: `"express"` matches `express` but not `express-session`

---

## Policy Configuration

### Safe Defaults

ARM enforces safe defaults to prevent breaking changes:

- **`allowMajor: false`** — Major version updates are blocked by default
- Major updates (e.g., `express` 4.x → 5.x) require manual review
- Config validation will fail if you try to set `allowMajor: true`

**Why?** Major version updates often include breaking changes. ARM prevents accidental breakage by requiring human review for major updates.

### Denylist Usage

The `policy.denylist` field allows excluding specific packages from ARM processing.

**Configuration:**
\`\`\`json
{
  \"policy\": {
    \"allowPatch\": true,
    \"allowMinor\": true,
    \"allowMajor\": false,
    \"denylist\": [\"express\", \"lodash\", \"webpack\"]
  }
}
\`\`\`

**When to use denylist:**
- **Breaking changes in minor/patch** — Some packages introduce breaking changes even in minor updates
- **External management** — Dependencies managed by another process or team
- **Custom workflows** — Packages requiring special update procedures
- **Temporary exclusions** — During migrations or refactoring work

**Package matching rules:**
- **Exact match only** — `\"express\"` matches `express` but not `express-session`
- **Case-sensitive** — `\"Express\"` and `\"express\"` are different
- **No wildcards** — Use `excludePatterns` for glob patterns like `@types/*`

**Examples:**

\`\`\`json
// Exclude specific problematic packages
{
  \"denylist\": [\"express\", \"lodash\"]
}

// Common use case: exclude framework during migration
{
  \"denylist\": [\"react\", \"react-dom\"]
}

// Exclude build tools with custom workflows
{
  \"denylist\": [\"webpack\", \"babel-core\"]
}
\`\`\`

### Denylist vs. Exclusion Patterns

| Feature | Denylist | Exclusion Patterns |
|---------|----------|-------------------|
| **Matching** | Exact name | Glob patterns |
| **Case** | Sensitive | Sensitive |
| **Example** | `\"express\"` | `\"@types/*\"` |
| **Use case** | Specific packages | Package families |
| **Status** | ✅ Recommended | ⚠️ Deprecated |

**Recommendation:** Use `denylist` for exact package names. Use `excludePatterns` only for glob patterns like `@types/*`.

### Exclusion Logging

All excluded packages are logged during filtering:

\`\`\`
⏭️  Excluded: express (denylisted)
⏭️  Excluded: webpack@4.46.0 → 5.76.0 (major update blocked)
⏭️  Excluded: @types/node (matches exclusion pattern)
\`\`\`

This provides visibility into why packages were skipped.

---

## Example Workflow

**Target repo:** `Hozyne-OpenBak/arm` has outdated `express@4.17.1`

1. **Scan**: ARM detects express@4.17.1 → 4.18.2 (minor update)
2. **Filter**: Minor update allowed by policy
3. **Story**: Creates Story in `openclaw-core`: "Update express from 4.17.1 to 4.18.2"
4. **PR**: Creates PR in `arm` repo referencing Story #XX
5. **Validation**: PR passes validation workflow (Story reference found)
6. **Review**: Human reviews and approves PR
7. **Merge**: PR merged, Story marked complete

---

## Documentation

Complete technical documentation for operators, developers, and contributors:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, data flow, cross-repo interaction model
- **[RUNBOOK.md](./RUNBOOK.md)** — Operator guide: execution, monitoring, troubleshooting
- **[GOVERNANCE.md](./GOVERNANCE.md)** — Governance integration: Story lifecycle, PR linking, workflows
- **[EXTENDING.md](./EXTENDING.md)** — Post-MVP: How to add new ecosystems (Python, Ruby, etc.)
- **[SCANNER_INTERFACE.md](./SCANNER_INTERFACE.md)** — Multi-ecosystem scanner interface contract
- **[test/integration/README.md](./test/integration/README.md)** — Integration testing guide

---

## Stories (Epic #13)

- [x] **#14** — Architecture & Execution Environment
- [x] **#15** — Dependency Detection Engine
- [x] **#16** — Story Creation Automation
- [x] **#17** — PR Generation with Story Reference
- [x] **#18** — Integration Testing & Validation
- [x] **#19** — Documentation & Runbook
- [x] **#24** — Fix cross-repo Story reference syntax (patch)

**Status:** ✅ All Stories complete — ARM v1 MVP production-ready

---

## Development

### Project Structure

```
arm/
├── ARCHITECTURE.md         # Full technical design
├── README.md               # This file
├── config.schema.json      # JSON Schema for configuration
├── arm.config.json         # Example configuration
├── src/                    # Source code (TBD in Story #15)
│   ├── orchestrator.js
│   ├── scanner.js
│   ├── filter.js
│   ├── story-creator.js
│   └── pr-generator.js
└── test/                   # Tests (TBD in Story #18)
    ├── unit/
    └── integration/
```

---

## Security

- **No long-lived tokens**: Uses GitHub CLI authentication
- **Least privilege**: Only writes to configured repos
- **Human oversight**: No automated merges (v1)
- **Audit trail**: All changes tracked via Story → PR → merge

---

## Support

- **Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues:** Report in [openclaw-core](https://github.com/Hozyne-OpenBak/openclaw-core/issues)

---

**Status:** Story #14 (Architecture) complete  
**Next:** Story #15 (Dependency Detection Engine)
