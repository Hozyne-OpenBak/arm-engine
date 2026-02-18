# ARM v1 — Autonomous Repo Maintenance

**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Status:** In Development  
**Version:** 1.0.0 (MVP)

---

## Overview

ARM (Autonomous Repo Maintenance) is an OpenClaw-powered agent that autonomously detects, proposes, and executes safe maintenance changes on target GitHub repositories.

**MVP Focus:** Node.js dependency updates

---

## Quick Start

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
