# ARM v1 Architecture — Autonomous Repo Maintenance

**Epic:** #13  
**Story:** #14  
**Version:** 1.0.0  
**Status:** Design  
**Date:** 2026-02-18

---

## 1. Overview

ARM (Autonomous Repo Maintenance) is an OpenClaw-powered agent that autonomously detects, proposes, and executes safe maintenance changes on target GitHub repositories. ARM v1 focuses on Node.js dependency updates as the MVP use case.

### 1.1 Goals

- **Autonomous operation**: Detect outdated dependencies without human intervention
- **Governance compliance**: All changes flow through Story → PR → validation → merge workflow
- **Safety first**: Only apply safe updates (patch/minor versions by default)
- **Transparency**: Full audit trail via GitHub issues and PRs

### 1.2 Non-Goals (v1)

- Multi-repository support (single target repo only)
- Python/other ecosystems (Node.js only)
- Breaking change analysis
- Automated merge decisions (human approval required)
- Production deployment automation

---

## 2. Cross-Repository Interaction Model

ARM operates across **two repositories** with distinct responsibilities:

### 2.1 Repository Roles

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ARM Cross-Repo Architecture                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐         ┌───────────────────────────┐
│  Governance Repository       │         │  Target Repository        │
│  (openclaw-core)             │         │  (arm)                    │
│                              │         │                           │
│  Purpose:                    │         │  Purpose:                 │
│  - Track work via Stories    │         │  - Contains code to       │
│  - Epic #13 definition       │         │    maintain               │
│  - Audit trail               │         │  - Receives dependency    │
│  - Status tracking           │         │    PRs                    │
│                              │         │                           │
│  Contains:                   │         │  Contains:                │
│  ┌────────────────────┐     │         │  ┌────────────────────┐  │
│  │ Epic #13           │     │         │  │ package.json       │  │
│  │ ARM v1 - MVP       │     │         │  │ package-lock.json  │  │
│  └────────────────────┘     │         │  │ src/               │  │
│         ▲                    │         │  │ test/              │  │
│         │                    │         │  └────────────────────┘  │
│         │ references         │         │         ▲                │
│         │                    │         │         │                │
│  ┌──────┴──────────┐         │         │         │ modifies       │
│  │ Story #26       │◄────────┼─────────┼─────────┘                │
│  │ Update express  │         │         │                           │
│  │ 4.17.1→4.22.1   │         │         │  ┌────────────────────┐  │
│  │                 │         │         │  │ PR #1              │  │
│  │ Labels:         │         │         │  │                    │  │
│  │ - story         │         │         │  │ Branch:            │  │
│  │ - status/draft  │ ◄───────┼─────────┼──│ arm/update-        │  │
│  │   → in-progress │  links  │         │  │   express-4-22-1   │  │
│  │   → completed   │         │         │  │                    │  │
│  └─────────────────┘         │         │  │ Body:              │  │
│         ▲                    │         │  │ Closes openclaw-   │  │
│         │ closes on merge    │         │  │   core#26          │──┼─┐
│         └────────────────────┼─────────┼──│                    │  │ │
│                              │         │  └────────────────────┘  │ │
│  Workflows:                  │         │                           │ │
│  - validate-story-reference  │         │  When PR merges:          │ │
│  - update-story-status       │         │  GitHub auto-closes ──────┘ │
│  - auto-link                 │         │  Story #26 via cross-repo   │
│                              │         │  reference syntax           │
└──────────────────────────────┘         └───────────────────────────┘
```

### 2.2 Data Flow: Scan → Story → PR → Merge → Auto-Close

```
┌─────────────┐
│  ARM Agent  │
│  (OpenClaw) │
└──────┬──────┘
       │
       │ 1. Scan target repo
       ▼
┌──────────────────┐
│ npm outdated     │
│ express 4.17.1   │
│   → 4.22.1       │
└──────┬───────────┘
       │
       │ 2. Filter (minor update allowed)
       ▼
┌──────────────────────────────────────────────────────────┐
│ Decision: Create Story for express 4.17.1 → 4.22.1      │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 3. Create Story in governance repo
       ▼
┌────────────────────────────────────────────────────────┐
│ openclaw-core/issues/26                                │
│ Title: Update express (Node.js) from 4.17.1 to 4.22.1 │
│ Labels: story, type/task, status/draft, priority/p1   │
│ Body: Full Story template                             │
└──────┬─────────────────────────────────────────────────┘
       │
       │ 4. Create PR in target repo
       ▼
┌────────────────────────────────────────────────────────┐
│ arm/pull/1                                             │
│ Branch: arm/update-express-4-22-1                      │
│ Title: [Story #26] Update express from 4.17.1...      │
│ Body: Closes openclaw-core#26  ← CROSS-REPO REFERENCE │
│ Files: package.json, package-lock.json                 │
└──────┬─────────────────────────────────────────────────┘
       │
       │ 5. Validation workflows run (governance repo)
       ▼
┌────────────────────────────────────────────────────────┐
│ ✅ validate-story-reference: PASS                      │
│ ✅ update-story-status: Story #26 → in-progress        │
│ ✅ auto-link: PR linked to Story                       │
└──────┬─────────────────────────────────────────────────┘
       │
       │ 6. Human reviews and merges PR
       ▼
┌────────────────────────────────────────────────────────┐
│ PR #1 merged in arm repo                               │
└──────┬─────────────────────────────────────────────────┘
       │
       │ 7. GitHub automation
       ▼
┌────────────────────────────────────────────────────────┐
│ GitHub parses PR body:                                 │
│   "Closes openclaw-core#26"                            │
│                                                         │
│ → Closes Story #26 in openclaw-core                    │
│ → Sets stateReason: COMPLETED                          │
│ → Adds "closed by arm#1" to Story timeline             │
└──────┬─────────────────────────────────────────────────┘
       │
       │ 8. Workflow updates Story labels
       ▼
┌────────────────────────────────────────────────────────┐
│ Story #26 final state:                                 │
│ - State: CLOSED                                        │
│ - stateReason: COMPLETED                               │
│ - Labels: story, type/task, status/completed, p1       │
│ - closedByPullRequestsReferences: arm#1                │
└────────────────────────────────────────────────────────┘
```

### 2.3 Governance Automation Integration Points

ARM integrates with governance workflows at multiple points:

#### 2.3.1 Story Creation
- **Component:** StoryCreator
- **Action:** `gh issue create --repo openclaw-core`
- **Result:** Story issue created with template
- **Labels:** story, type/task, status/draft, priority/p1
- **Epic reference:** Body includes `#13`

#### 2.3.2 PR Creation
- **Component:** PRGenerator
- **Action:** `gh pr create --repo arm`
- **Result:** PR created with cross-repo Story reference
- **Critical:** Body must include `Closes openclaw-core#<N>`
- **Triggers:** Governance validation workflows

#### 2.3.3 Validation (Governance Repo Workflows)
- **validate-story-reference:** Ensures PR body has Story reference
- **update-story-status:** Updates Story labels (draft → in-progress)
- **auto-link:** Creates explicit PR ↔ Story link in GitHub UI

#### 2.3.4 Merge & Auto-Close
- **GitHub native:** Recognizes `Closes owner/repo#N` syntax
- **Action:** Auto-closes Story when PR merges
- **Workflow:** update-story-status adds `status/completed` label

---

## 3. System Architecture

### 3.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ARM Agent (OpenClaw)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │ Orchestrator │─────▶│   Scanner    │─────▶│  Filter  │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│         │                                           │       │
│         ▼                                           ▼       │
│  ┌──────────────┐                          ┌──────────────┐│
│  │Story Creator │                          │ PR Generator ││
│  └──────────────┘                          └──────────────┘│
│         │                                           │       │
└─────────┼───────────────────────────────────────────┼───────┘
          │                                           │
          │                                           │
          ▼                                           ▼
┌──────────────────┐                        ┌──────────────────┐
│ openclaw-core    │                        │   target repo    │
│ (Governance)     │                        │  (arm)           │
│                  │                        │                  │
│ - Create Story   │                        │ - Create branch  │
│ - Track status   │                        │ - Update deps    │
└──────────────────┘                        │ - Create PR      │
                                            └──────────────────┘
```

### 2.2 Components

#### 2.2.1 Orchestrator
**Responsibility:** Main control flow and coordination

- Loads configuration
- Triggers scan cycle
- Coordinates component execution
- Handles errors and logging
- Reports results

**Interface:**
```javascript
class ARMOrchestrator {
  constructor(config) {}
  async run() {}         // Execute full scan-to-PR cycle
  async scan() {}        // Scan only (dry-run)
  getStatus() {}         // Return current state
}
```

#### 2.2.2 Scanner
**Responsibility:** Detect outdated dependencies

- Clones/pulls target repository
- Executes `npm outdated --json`
- Parses output into structured format
- Returns list of all outdated packages

**Interface:**
```javascript
class DependencyScanner {
  constructor(targetRepo) {}
  async scan() {}        // Returns DependencyReport
  async refresh() {}     // Re-clone repo if needed
}

// Output format
interface DependencyReport {
  scannedAt: string;     // ISO timestamp
  repository: string;    // owner/repo
  dependencies: Dependency[];
}

interface Dependency {
  package: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'patch' | 'minor' | 'major';
  location: 'dependencies' | 'devDependencies';
}
```

#### 2.2.3 Filter
**Responsibility:** Apply update policies

- Filters dependencies based on config policy
- Categorizes by change type (patch/minor/major)
- Prioritizes updates (security > compatibility > features)
- Returns filtered list of safe updates

**Interface:**
```javascript
class UpdateFilter {
  constructor(policy) {}
  filter(report) {}      // Returns FilteredUpdates
}

interface UpdatePolicy {
  allowPatch: boolean;   // Default: true
  allowMinor: boolean;   // Default: true
  allowMajor: boolean;   // Default: false
  excludePatterns: string[];  // e.g., ["@types/*"]
}

interface FilteredUpdates {
  recommended: Dependency[];
  excluded: Dependency[];
  reason: string;        // Why excluded
}
```

#### 2.2.4 Story Creator
**Responsibility:** Create Story issues in governance repo

- Generates Story from dependency update
- Creates issue via `gh issue create`
- Applies labels: `story`, `maintenance`, `automated`
- Links to Epic #13
- Returns Story issue number

**Interface:**
```javascript
class StoryCreator {
  constructor(governanceRepo) {}
  async createStory(update) {}  // Returns Story
}

interface Story {
  number: number;
  title: string;
  url: string;
  dependency: Dependency;
}
```

#### 2.2.5 PR Generator
**Responsibility:** Create PR in target repo

- Creates feature branch
- Updates package.json
- Runs `npm install` to regenerate lock file
- Commits changes
- Creates PR via `gh pr create` with Story reference
- Returns PR number

**Interface:**
```javascript
class PRGenerator {
  constructor(targetRepo) {}
  async createPR(story) {}  // Returns PR
}

interface PR {
  number: number;
  url: string;
  branch: string;
  story: number;
}
```

---

## 4. Data Flow

### 3.1 Happy Path

```
1. Orchestrator.run()
   └─▶ Scanner.scan()
       └─▶ returns DependencyReport
           └─▶ Filter.filter(report)
               └─▶ returns FilteredUpdates
                   └─▶ for each recommended update:
                       ├─▶ StoryCreator.createStory(update)
                       │   └─▶ returns Story
                       └─▶ PRGenerator.createPR(story)
                           └─▶ returns PR
                           └─▶ Validation workflow runs
                               └─▶ Human reviews and merges
```

### 3.2 Error Handling

Each component returns structured errors:

```javascript
interface ARMError {
  component: string;
  stage: 'scan' | 'filter' | 'story' | 'pr';
  message: string;
  cause?: Error;
  recoverable: boolean;
}
```

**Error scenarios:**
- Target repo not accessible → fatal (stop)
- npm outdated fails → fatal (stop)
- Story creation fails → retry 3x, then fatal
- PR creation fails → retry 3x, then fatal
- Validation workflow fails → wait for human intervention

---

## 5. Configuration

### 4.1 Configuration Schema

See `config.schema.json` for full JSON Schema.

### 4.2 Example Configuration

```json
{
  "version": "1.0.0",
  "target": {
    "repository": "Hozyne-OpenBak/arm",
    "branch": "main"
  },
  "governance": {
    "repository": "Hozyne-OpenBak/openclaw-core",
    "epicNumber": 13
  },
  "policy": {
    "allowPatch": true,
    "allowMinor": true,
    "allowMajor": false,
    "excludePatterns": []
  },
  "execution": {
    "trigger": "manual",
    "dryRun": false
  },
  "github": {
    "authMethod": "gh-cli"
  }
}
```

### 4.3 Configuration Options

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | string | Yes | - | Config schema version |
| `target.repository` | string | Yes | - | Target repo (owner/name) |
| `target.branch` | string | No | `main` | Target branch |
| `governance.repository` | string | Yes | - | Governance repo for Stories |
| `governance.epicNumber` | number | Yes | - | Epic to link Stories to |
| `policy.allowPatch` | boolean | No | `true` | Allow patch updates |
| `policy.allowMinor` | boolean | No | `true` | Allow minor updates |
| `policy.allowMajor` | boolean | No | `false` | Allow major updates |
| `policy.excludePatterns` | string[] | No | `[]` | Packages to exclude (glob) |
| `execution.trigger` | string | No | `manual` | Trigger mode (manual/cron) |
| `execution.dryRun` | boolean | No | `false` | Scan only, no Story/PR |
| `github.authMethod` | string | No | `gh-cli` | Auth method (gh-cli only for v1) |

---

## 6. GitHub Integration

### 5.1 Authentication Strategy

ARM v1 uses **GitHub CLI (gh)** for all GitHub operations:

- **Authentication**: `gh auth status` to verify auth
- **Issues**: `gh issue create` for Story creation
- **Pull Requests**: `gh pr create` for PR creation
- **Git operations**: `gh` handles git credentials automatically

**Why gh CLI?**
- Already authenticated in OpenClaw environment
- Handles OAuth tokens automatically
- No need to manage PATs or SSH keys
- Consistent with existing governance workflows

### 5.2 Rate Limiting

GitHub API rate limits:
- Authenticated: 5,000 requests/hour
- Per-resource: varies

ARM v1 rate limit strategy:
- Track API calls per operation
- Fail gracefully if rate limit hit
- Log rate limit headers
- Suggest retry time

**Estimated API calls per run:**
- 1x `npm outdated` (no API call)
- 1x `gh issue create` per update
- 1x `gh pr create` per update
- Total: ~2-4 calls for typical single-update scenario

**Rate limit risk:** LOW (well within limits for MVP)

---

## 7. Execution Modes

### 6.1 Manual Trigger

**Use case:** On-demand scan and update

```bash
openclaw run arm
```

Or via OpenClaw agent:
```
@openclaw run ARM scan on Hozyne-OpenBak/arm
```

**Flow:**
1. Load config
2. Execute scan
3. Create Story + PR if updates found
4. Report results

### 6.2 Cron Trigger (Future)

**Use case:** Scheduled daily/weekly scans

```json
{
  "execution": {
    "trigger": "cron",
    "schedule": "0 9 * * MON"  // Every Monday at 9 AM
  }
}
```

**Implementation:** OpenClaw cron integration (post-MVP)

### 6.3 Dry-Run Mode

**Use case:** Test without creating issues/PRs

```json
{
  "execution": {
    "dryRun": true
  }
}
```

**Behavior:**
- Scans target repo
- Filters updates
- Logs what would be created
- Does NOT create Story or PR

---

## 8. Security Considerations

### 7.1 Repository Access

- ARM requires **write access** to target repo (to push branches)
- ARM requires **write access** to governance repo (to create Stories)
- Use GitHub CLI authentication (least privilege)
- No long-lived tokens stored in config

### 7.2 Dependency Safety

- Only allow patch/minor updates by default
- Major updates require explicit config opt-in
- No automated merges (human review required)
- Validate package.json changes before commit

### 7.3 Governance Compliance

- All changes tracked via Story issues
- All PRs reference Story numbers
- Validation workflow ensures compliance
- Audit trail: scan → Story → PR → merge

---

## 9. Monitoring & Observability

### 8.1 Logging

ARM logs all operations:

```
[ARM] Starting scan: Hozyne-OpenBak/arm
[Scanner] Running npm outdated...
[Scanner] Found 1 outdated dependency: express@4.17.1 → 4.18.2
[Filter] Recommended: express (minor update)
[Story] Creating Story: Update express from 4.17.1 to 4.18.2
[Story] Created: #123
[PR] Creating PR for Story #123
[PR] Created: Hozyne-OpenBak/arm#45
[ARM] Scan complete. 1 Story, 1 PR created.
```

### 8.2 Metrics (Future)

- Scans executed per day
- Stories created
- PRs created
- PRs merged
- Time to merge (Story → PR → merge)
- Success rate (PRs passing validation)

---

## 10. Future Enhancements (Post-MVP)

### 9.1 Multi-Repo Support
- Config: list of target repos
- Parallel scanning
- Batch Story/PR creation

### 9.2 Python Ecosystem
- `pip list --outdated`
- requirements.txt updates
- Poetry/Pipenv support

### 9.3 Breaking Change Analysis
- Analyze changelogs
- Detect breaking changes
- Flag high-risk updates

### 9.4 Automated Merge
- Auto-merge patch updates if CI passes
- Configurable merge policy

### 9.5 Rollback Automation
- Detect issues post-merge
- Auto-revert breaking changes

---

## 11. Testing Strategy

See Story #18 for detailed integration test plan.

**Unit tests:**
- Scanner: mock npm outdated output
- Filter: test policy logic
- Story Creator: mock gh CLI
- PR Generator: mock gh CLI

**Integration tests:**
- End-to-end: scan → Story → PR → validation
- Error scenarios: auth failures, network issues
- Duplicate detection: prevent duplicate Stories/PRs

**Test environment:**
- Target: Hozyne-OpenBak/arm (real repo)
- Governance: Hozyne-OpenBak/openclaw-core (real repo)
- Intentionally outdated dependency: express@4.17.1

---

## 12. Decision Log

### 11.1 Why Node.js First?
- Most common dependency ecosystem in OpenClaw community
- Simple tooling (`npm outdated`)
- Test repo easily created
- Clear MVP scope

### 11.2 Why GitHub CLI?
- Already authenticated in OpenClaw
- No token management
- Consistent with existing workflows
- Reduces complexity

### 11.3 Why Manual Trigger First?
- Simpler to test and debug
- No cron scheduler complexity
- Easy to add cron later
- Reduces risk of runaway automation

### 11.4 Why No Automated Merge?
- Safety: human review required
- Trust: build confidence first
- Governance: maintain audit trail
- Risk: avoid breaking changes

---

## 13. Acceptance Criteria

Story #14 is complete when:

- [x] This architecture document exists
- [x] Project directory structure created (`arm/`)
- [x] Configuration schema defined (`config.schema.json`)
- [x] Example configuration provided (`arm.config.json`)
- [x] Design decisions documented
- [ ] PR created in openclaw-core
- [ ] PR references Story #14
- [ ] PR reviewed and approved
- [ ] PR merged to main

---

**Status:** Draft  
**Author:** @agent-architect (OpenBak)  
**Reviewers:** TBD  
**Last Updated:** 2026-02-18 03:38 UTC
