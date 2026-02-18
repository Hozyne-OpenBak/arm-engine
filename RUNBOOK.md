# ARM v1 Operator Runbook

**Version:** 1.0.0  
**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Status:** Production-Ready (MVP)

---

## Overview

This runbook provides operational guidance for running, monitoring, and troubleshooting ARM v1 (Autonomous Repo Maintenance). It covers both manual execution and integration testing workflows.

### Target Audience

- Platform operators executing ARM manually
- Developers testing ARM integration
- SREs troubleshooting ARM failures
- Governance admins reviewing ARM activity

---

## Prerequisites

### Required Access

- GitHub CLI (`gh`) authenticated with:
  - **Read** access to target repository
  - **Write** access to target repository (for PR creation)
  - **Write** access to governance repository (for Story creation)
- Node.js v18+ installed
- ARM dependencies installed (`npm install` in `arm/` directory)

### Verify Authentication

```bash
gh auth status
```

**Expected output:**
```
✓ Logged in to github.com as <username> (<path>)
✓ Git operations for github.com configured to use https protocol.
✓ Token: *******************
```

If not authenticated:
```bash
gh auth login
```

---

## Configuration

### Configuration File

**Location:** `arm/arm.config.json`

**Minimal configuration:**
```json
{
  "version": "1.0",
  "target": {
    "repository": "owner/repo",
    "branch": "main"
  },
  "governance": {
    "repository": "owner/governance-repo",
    "epicNumber": 13
  },
  "policy": {
    "allowPatch": true,
    "allowMinor": true,
    "allowMajor": false
  },
  "execution": {
    "trigger": "manual",
    "dryRun": false
  }
}
```

### Configuration Validation

```bash
cd arm
node -e "require('./arm.config.json'); console.log('✓ Valid JSON')"
```

---

## Policy Configuration

### Safe Defaults & Rationale

ARM enforces safe update policies by default to prevent breaking changes and production incidents.

#### allowMajor: false (Enforced)

**Default:** `false` (cannot be changed)  
**Enforced by:** Config validator at startup  
**Rationale:**

Major version updates (e.g., `express` 4.x → 5.x) frequently introduce breaking changes:
- API removals or changes
- Behavior modifications
- Dependency upgrades
- Migration requirements

**ARM policy:** Major updates **always** require human review. This is a hard constraint enforced by config validation.

**Attempting to enable major updates:**
\`\`\`json
{
  "policy": {
    "allowMajor": true  // ❌ FAILS VALIDATION
  }
}
\`\`\`

**Validation error:**
\`\`\`
❌ Config validation failed: allowMajor must be false (safe default enforced).
   Major version updates require human review and are blocked automatically.
\`\`\`

**Workflow for major updates:**
1. ARM detects major update available
2. ARM logs: `⏭️ Excluded: package@X → Y (major update blocked)`
3. No Story/PR created
4. Human reviews major update manually
5. Human creates Story/PR if appropriate

### Denylist Configuration

The `policy.denylist` field excludes specific packages from ARM processing.

#### When to Use Denylist

**1. Packages with breaking minor/patch updates**
\`\`\`json
{
  "policy": {
    "denylist": ["express", "socket.io"]
  }
}
\`\`\`
Some packages introduce breaking changes even in minor or patch releases. Exclude these until you can review manually.

**2. Dependencies managed externally**
\`\`\`json
{
  "policy": {
    "denylist": ["react", "react-dom"]
  }
}
\`\`\`
If another team or process manages specific dependencies, exclude them to avoid conflicts.

**3. Custom update workflows**
\`\`\`json
{
  "policy": {
    "denylist": ["webpack", "babel-core"]
  }
}
\`\`\`
Build tools or framework packages may require special testing or coordination. Exclude to handle separately.

**4. Temporary exclusions during migrations**
\`\`\`json
{
  "policy": {
    "denylist": ["typescript", "@types/node"]
  }
}
\`\`\`
During large refactors or migrations, temporarily exclude packages to control timing.

#### Denylist Behavior

- **Exact matching:** `"express"` matches `express` only, not `express-session`
- **Case-sensitive:** `"Express"` and `"express"` are different packages
- **No wildcards:** Cannot use `"@types/*"` (use `excludePatterns` for globs)
- **Logged:** All denylisted packages are logged during filtering
- **No Story/PR:** Denylisted packages never create Stories or PRs

#### Denylist vs. Exclusion Patterns

| Feature | Denylist | Exclusion Patterns |
|---------|----------|-------------------|
| **Field** | `policy.denylist` | `policy.excludePatterns` |
| **Matching** | Exact name | Glob patterns |
| **Example** | `"lodash"` | `"@types/*"` |
| **Status** | ✅ Recommended | ⚠️ Deprecated |

**Recommendation:** Use `denylist` for exact package names. Use `excludePatterns` only for glob patterns.

### Validation Failures & Fixes

#### Missing Policy Section
\`\`\`
❌ Config validation failed: Config must include policy section
\`\`\`

**Fix:** Add policy object to config:
\`\`\`json
{
  "policy": {
    "allowMajor": false,
    "denylist": []
  }
}
\`\`\`

#### Invalid Denylist Type
\`\`\`
❌ Config validation failed: policy.denylist must be an array of package names
\`\`\`

**Fix:** Change denylist to array:
\`\`\`json
{
  "policy": {
    "denylist": []  // Not: "express" (string)
  }
}
\`\`\`

#### Empty String in Denylist
\`\`\`
❌ Config validation failed: policy.denylist[0] cannot be an empty string
\`\`\`

**Fix:** Remove empty entries:
\`\`\`json
{
  "policy": {
    "denylist": ["express"]  // Not: ["express", ""]
  }
}
\`\`\`

#### Missing Required Fields
\`\`\`
❌ Config validation failed: governance.epicNumber is required and must be a number
\`\`\`

**Fix:** Add all required fields:
\`\`\`json
{
  "target": { "repository": "owner/repo" },
  "governance": {
    "repository": "owner/governance",
    "epicNumber": 30
  },
  "policy": {}
}
\`\`\`

### Exclusion Logging

ARM logs all exclusions to provide visibility into filtering decisions:

\`\`\`
🔍 Step 2: Applying filter policy...
   Policy: patch=true, minor=true, major=false

⏭️  Excluded: express (denylisted)
⏭️  Excluded: webpack@4.46.0 → 5.76.0 (major update blocked)
⏭️  Excluded: @types/node (matches exclusion pattern)

Recommended updates: 5
Excluded: 3
\`\`\`

**Log format:**
- **Denylisted:** `⏭️ Excluded: <package> (denylisted)`
- **Major blocked:** `⏭️ Excluded: <package>@<current> → <wanted> (major update blocked)`
- **Pattern match:** `⏭️ Excluded: <package> (matches exclusion pattern)`

**Visibility:**
- Console output during execution
- GitHub Actions job logs (when integrated)
- Helps debug why packages weren't processed

### Best Practices

#### Start Conservative
\`\`\`json
{
  "policy": {
    "allowPatch": true,
    "allowMinor": false,  // Start with patches only
    "allowMajor": false,
    "denylist": []
  }
}
\`\`\`
Enable minor updates after gaining confidence with patches.

#### Review Logs Regularly
Check exclusion logs to understand filtering:
- Are major updates being blocked as expected?
- Are denylisted packages being skipped?
- Any unexpected exclusions?

#### Keep Denylist Short
Aim for <10 packages in denylist. Long denylists indicate:
- Policy too aggressive (consider `allowMinor: false`)
- Too many custom workflows (consolidate or automate)
- Packages that should be upgraded manually

#### Document Denylist Reasons
Maintain comments in config or documentation:
\`\`\`json
{
  "policy": {
    "denylist": [
      "express",     // Waiting for 5.x migration - Issue #123
      "webpack"      // Build tool managed by ops team
    ]
  }
}
\`\`\`

#### Test with Dry-Run
Always test policy changes with `dryRun: true` first:
\`\`\`bash
# 1. Update policy in config
# 2. Run dry-run
node demo.js --full
# 3. Review output
# 4. If correct, set dryRun: false
\`\`\`

---

## Execution Modes

### 1. Dry-Run Mode (Recommended for Testing)

Performs scan and filtering but **does not** create Stories or PRs.

**Set in config:**
```json
{
  "execution": {
    "dryRun": true
  }
}
```

**Or use demo script:**
```bash
cd arm
node demo.js --full
```

**Expected output:**
```
🔍 Scanning Hozyne-OpenBak/arm for outdated dependencies...
✅ Scan complete: 1 dependency found
📊 Filter results: 1 recommended, 0 excluded

📝 Story preview:
   Title: Update express (Node.js) from 4.17.1 to 4.22.1
   Epic: #13
   (dry-run, Story not created)

🔀 PR preview:
   Title: [Story #999] Update express from 4.17.1 to 4.22.1
   Body: Closes Hozyne-OpenBak/openclaw-core#999
   (dry-run, PR not created)
```

**Use when:**
- Testing configuration changes
- Validating scanner output
- Reviewing what would be created
- Training or demonstrations

---

### 2. Production Mode (Real Execution)

Creates **real** Stories and PRs in GitHub.

**Set in config:**
```json
{
  "execution": {
    "dryRun": false
  }
}
```

**Execute via integration test:**
```bash
cd arm
node integration-test.js
```

**Expected output:**
```
🦞 ARM v1 Integration Test - Epic #13
Test ID: test-1771387645840

Step 1: Scanning repository for outdated dependencies...
✅ Scan complete: Found 1 outdated dependencies

Step 2: Applying filter policy...
✅ Filter applied: 1 recommended, 0 excluded

Step 3: Creating Story in governance repository...
✅ Story created: #26
   URL: https://github.com/Hozyne-OpenBak/openclaw-core/issues/26

Step 4: Creating PR in target repository...
✅ PR created: #1
   URL: https://github.com/Hozyne-OpenBak/arm/pull/1
   Branch: arm/update-express-4-22-1
```

**Use when:**
- Ready to create real Stories/PRs
- Running scheduled maintenance
- Performing integration validation

---

### 3. Future Optional Mode: docs-only

**Status:** Not yet implemented (post-MVP)

A future enhancement to restrict ARM PRs to documentation-only changes, reducing risk for sensitive repositories.

**Proposed configuration:**
```json
{
  "execution": {
    "mode": "docs-only",
    "fileAllowlist": [
      "**/*.md",
      "**/docs/**",
      "README.*"
    ]
  }
}
```

**Behavior (when implemented):**
- Scanner detects outdated dependencies as usual
- Filter applies update policy
- **PR generation checks changed files:**
  - If **all** changed files match allowlist → PR created
  - If **any** file outside allowlist → PR skipped, Story created with note
- PRs created in docs-only mode would:
  - Only update documentation dependencies (e.g., `remark`, `mdx`)
  - Exclude code/runtime dependencies
  - Still require manual merge (no auto-merge)

**Use cases:**
- High-security repositories where only doc updates are safe to automate
- Teams that want to automate doc tooling updates but not code dependencies
- Gradual rollout: start with docs, expand to code later

**Implementation notes (for future Story):**
- Add file allowlist validation to PRGenerator
- Generate "docs-only" label on PRs
- Skip PR creation if non-doc files would change
- Update Story body to explain why PR was skipped

**Manual merge still required:** Even in docs-only mode, human review and merge approval remains mandatory (v1 constraint).

---

## GitHub Actions Execution

### Overview

ARM can be executed automatically via **GitHub Actions workflow** in the `arm-engine` repository. This is the **recommended production method** for scheduled and on-demand execution.

**Benefits:**
- ✅ No local setup required
- ✅ Centralized execution logs
- ✅ Consistent environment (Ubuntu latest, Node 18)
- ✅ Audit trail in GitHub Actions UI
- ✅ Configurable via workflow inputs

**Workflow file:** `.github/workflows/arm-execute.yml`

---

### Triggering the Workflow

#### Manual Trigger via GitHub UI

1. Navigate to **`arm-engine`** repository
2. Click **Actions** tab
3. Select **"ARM Execute"** workflow (left sidebar)
4. Click **"Run workflow"** dropdown (top-right)
5. Configure inputs:
   - **Use workflow from:** `main` (branch)
   - **Target repository:** `Hozyne-OpenBak/arm` (default)
   - **Dry run mode:** `true` or `false`
   - **Config path:** `arm.config.json` (default)
6. Click **"Run workflow"** button

**Workflow starts immediately** and appears in the workflow runs list.

---

#### Manual Trigger via GitHub CLI

```bash
# Dry-run mode (recommended first)
gh workflow run arm-execute.yml \
  --repo Hozyne-OpenBak/arm-engine \
  -f targetRepo=Hozyne-OpenBak/arm \
  -f dryRun=true \
  -f configPath=arm.config.json

# Production mode (creates Stories + PRs)
gh workflow run arm-execute.yml \
  --repo Hozyne-OpenBak/arm-engine \
  -f dryRun=false

# Check workflow status
gh run list --repo Hozyne-OpenBak/arm-engine --workflow=arm-execute.yml --limit 5
```

---

### Workflow Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `targetRepo` | Target repository (owner/name) | `Hozyne-OpenBak/arm` | No |
| `dryRun` | Dry run mode (`true` = no API calls) | `true` | No |
| `configPath` | Path to config file (relative to repo root) | `arm.config.json` | No |

**Input validation:**
- `targetRepo`: Must be valid GitHub owner/repo format
- `dryRun`: Choice dropdown (`true` or `false`)
- `configPath`: Must exist in `arm-engine` repository

---

### Workflow Steps

The workflow executes these steps:

1. **Checkout arm-engine** — Clones repository
2. **Setup Node.js** — Installs Node 18 with npm cache
3. **Install dependencies** — Runs `npm ci`
4. **Configure git identity** — Sets commit author
5. **Run ARM** — Executes `node src/cli.js` with environment variables
6. **Output Summary** — Generates GitHub Actions job summary

**Environment variables set automatically:**
- `GITHUB_TOKEN`: Secret `ARM_TOKEN` (required for GitHub API)
- `ARM_TARGET_REPO`: From `targetRepo` input
- `ARM_DRY_RUN`: From `dryRun` input
- `ARM_CONFIG_PATH`: From `configPath` input

---

### Reading Workflow Logs

#### Access Logs

1. Navigate to **Actions** tab in `arm-engine`
2. Click on the workflow run (e.g., "ARM Execute #42")
3. Click on job name: **"execute"**
4. View real-time or completed logs

#### Log Structure

```
> Checkout arm-engine
✓ Checkout complete (2s)

> Setup Node.js
✓ Node.js 18.x installed (1s)

> Install dependencies
✓ Dependencies installed (5s)

> Configure git identity
✓ Git identity configured (0s)

> Run ARM
🔍 Scanning Hozyne-OpenBak/arm for outdated dependencies...
✅ Scan complete: 3 dependencies found

📊 Filter results: 2 recommended, 1 excluded

⏭️ Excluded: express (major update blocked)

📝 Story created: #45
   URL: https://github.com/Hozyne-OpenBak/openclaw-core/issues/45

🔀 PR created: #12
   URL: https://github.com/Hozyne-OpenBak/arm/pull/12
   Branch: arm/update-lodash-4-17-22

✅ ARM execution complete (15s)

> Output Summary
✓ Summary generated (0s)
```

#### Key Log Markers

Look for these patterns in logs:

**Success indicators:**
- `✅ Scan complete: X dependencies found`
- `📝 Story created: #XX`
- `🔀 PR created: #XX`
- `✅ ARM execution complete`

**Exclusion indicators:**
- `⏭️ Excluded: <package> (reason)`
- Common reasons: `denylisted`, `major update blocked`, `matches exclusion pattern`

**Error indicators:**
- `❌ Error:` or `Error:` prefix
- Stack traces
- GitHub API error messages

---

### Job Summary

After workflow completes, a **job summary** appears at the bottom of the job page.

**Example summary:**

```
## ARM Execution Complete

**Target Repository:** Hozyne-OpenBak/arm
**Dry Run:** false
**Config Path:** arm.config.json

See logs above for detailed output (detected updates + planned actions).
```

**How to access:**
1. Go to workflow run page
2. Scroll to bottom
3. Look for "Job summary" section

---

### Common Scenarios

#### Scenario 1: First Execution (Dry-Run)

**Goal:** Test configuration without creating Stories/PRs

**Steps:**
1. Trigger workflow with `dryRun=true`
2. Wait for completion (~30s)
3. Review logs for detected updates
4. Verify filter exclusions are correct
5. Check Story/PR previews (not created)

**Expected log excerpt:**
```
📝 Story preview:
   Title: Update lodash from 4.17.20 to 4.17.22
   Epic: #30
   (dry-run, Story not created)

🔀 PR preview:
   Title: [Story #999] Update lodash
   (dry-run, PR not created)
```

---

#### Scenario 2: Production Execution

**Goal:** Create real Stories and PRs

**Prerequisites:**
- Dry-run completed successfully
- Configuration validated
- `ARM_TOKEN` secret configured with correct scopes

**Steps:**
1. Trigger workflow with `dryRun=false`
2. Wait for completion (~45s)
3. Extract Story URL from logs
4. Extract PR URL from logs
5. Manually review Story and PR
6. Approve and merge PR (human review required)

**Expected log excerpt:**
```
📝 Story created: #45
   URL: https://github.com/Hozyne-OpenBak/openclaw-core/issues/45

🔀 PR created: #12
   URL: https://github.com/Hozyne-OpenBak/arm/pull/12
   Branch: arm/update-lodash-4-17-22
```

**Next actions:**
- Navigate to Story URL → Review details
- Navigate to PR URL → Review code changes
- Approve PR → Merge → Story auto-closes

---

#### Scenario 3: Idempotent Re-Run

**Goal:** Verify ARM doesn't create duplicate Stories/PRs

**Setup:**
- Previous run created Story #45 + PR #12
- PR is still open (not merged)

**Steps:**
1. Trigger workflow again with same config
2. Wait for completion
3. Review logs for "Skipped" messages

**Expected log excerpt:**
```
🔍 Scanning Hozyne-OpenBak/arm for outdated dependencies...
✅ Scan complete: 3 dependencies found

📊 Filter results: 2 recommended, 1 excluded

⏭️ Skipped: lodash (Story #45 already exists)
⏭️ Skipped: minimist (Story #46 already exists)

✅ No new Stories or PRs created (all up-to-date or already tracked)
```

**Validation:**
- No duplicate Stories created
- No duplicate PRs created
- Existing open Stories/PRs remain unchanged

---

#### Scenario 4: Dry-Run After Config Change

**Goal:** Validate new denylist or policy change

**Setup:**
- Updated `arm.config.json` in `arm-engine` repo
- Added `express` to `policy.denylist`

**Steps:**
1. Commit and push config change to `main` branch
2. Trigger workflow with `dryRun=true`
3. Review logs for exclusion messages

**Expected log excerpt:**
```
⏭️ Excluded: express (denylisted)

📊 Filter results: 1 recommended, 2 excluded
```

**Validation:**
- `express` appears in exclusions
- No Story/PR preview for `express`
- Other packages still recommended

---

### Monitoring & Observability

#### Workflow Run Status

Check workflow status via CLI:

```bash
# List recent runs
gh run list --repo Hozyne-OpenBak/arm-engine --workflow=arm-execute.yml --limit 10

# View specific run
gh run view <RUN_ID> --repo Hozyne-OpenBak/arm-engine --log

# Watch live run
gh run watch <RUN_ID> --repo Hozyne-OpenBak/arm-engine
```

#### Success Criteria

**Workflow succeeded if:**
- ✅ Job status: `success` (green checkmark)
- ✅ Exit code: `0`
- ✅ Logs contain: `✅ ARM execution complete`
- ✅ No `Error:` messages in logs

**Dry-run succeeded if:**
- ✅ Story/PR previews shown
- ✅ No actual Stories/PRs created
- ✅ Exit code: `0`

**Production run succeeded if:**
- ✅ Story URLs logged
- ✅ PR URLs logged
- ✅ Stories exist in governance repo
- ✅ PRs exist in target repo

---

### Best Practices

#### 1. Always Dry-Run First

**Rule:** Run `dryRun=true` before every production execution.

**Why:**
- Catch configuration errors early
- Preview what will be created
- Validate filter logic
- No cost (no API calls)

#### 2. Review Logs Immediately

**Rule:** Check workflow logs within 5 minutes of completion.

**Why:**
- Identify failures quickly
- Extract Story/PR URLs for review
- Catch GitHub API rate limit warnings

#### 3. Coordinate with Team

**Rule:** Announce workflow runs in team chat.

**Why:**
- Avoid simultaneous runs (potential conflicts)
- Share Story/PR URLs for review
- Build awareness of ARM activity

#### 4. Schedule During Low-Activity Windows

**Rule:** Run production workflows during off-peak hours (e.g., 02:00 UTC).

**Why:**
- Minimize disruption to developers
- Reduce merge conflicts
- Lower GitHub API traffic

#### 5. Monitor Rate Limits

**Rule:** Check GitHub API rate limits before and after runs.

```bash
gh api rate_limit --jq '.resources.core'
```

**Why:**
- Avoid hitting rate limits (5000/hour for authenticated)
- Plan multiple runs accordingly
- Detect anomalies (unexpected consumption)

#### 6. Keep ARM_TOKEN Scoped

**Rule:** Use fine-grained token with minimum required scopes.

**Required scopes:**
- `repo` (full control) or:
  - `public_repo` (for public repos)
  - `repo:status`, `repo_deployment` (for private repos)

**Why:**
- Principle of least privilege
- Limit blast radius of token compromise
- Easier to audit and rotate

#### 7. Pin Workflow Node Version

**Rule:** Keep `node-version: '18'` in workflow (don't use `latest`).

**Why:**
- Predictable behavior
- Avoid breaking changes
- Easier debugging

---

### Troubleshooting GitHub Actions Runs

See [Troubleshooting](#troubleshooting) section for detailed error resolution.

**Quick reference:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Workflow doesn't appear | Wrong repository | Check you're in `arm-engine` repo |
| "Run workflow" disabled | Insufficient permissions | Verify write access to `arm-engine` |
| Job fails immediately | `ARM_TOKEN` secret missing | Add secret in repo settings |
| Auth error during run | Token expired or invalid | Regenerate token, update secret |
| Story created, no PR | Write access to target repo | Check token scopes for target repo |
| Duplicate Stories | Idempotency bug | Check Story detection logic |
| Rate limit error | Too many API calls | Wait for rate limit reset (check headers) |

---

## Manual Execution Workflow

### Step 1: Pre-Flight Checks

```bash
# Verify authentication
gh auth status

# Verify configuration
cd arm
cat arm.config.json

# Run tests
npm test
```

**All tests must pass before execution.**

---

### Step 2: Dry-Run First

Always run in dry-run mode before production execution.

```bash
cd arm
node demo.js --full
```

**Review output:**
- Are the detected dependencies correct?
- Are the recommended versions safe?
- Are major updates excluded?
- Is the Story template complete?
- Is the PR body correctly formatted?

---

### Step 3: Execute Production Run

```bash
cd arm
node integration-test.js
```

**Monitor output for:**
- ✅ Success indicators
- Story URL
- PR URL
- Any error messages

---

### Step 4: Review Created Artifacts

**Story Checklist:**
- [ ] Story created in governance repo
- [ ] Story references correct Epic
- [ ] Story has correct labels: `story`, `type/task`, `status/draft`, `priority/p1`
- [ ] Story body includes all required sections
- [ ] Dependency details are accurate

**PR Checklist:**
- [ ] PR created in target repo
- [ ] PR title includes Story number: `[Story #XX]`
- [ ] PR body includes cross-repo reference: `Closes owner/governance-repo#XX`
- [ ] PR branch follows naming convention: `arm/update-<package>-<version>`
- [ ] Files changed: `package.json`, `package-lock.json`
- [ ] PR validation workflows pass

**Quick verification:**
```bash
# View Story
gh issue view <STORY_NUMBER> --repo owner/governance-repo

# View PR
gh pr view <PR_NUMBER> --repo owner/target-repo

# Check PR status
gh pr checks <PR_NUMBER> --repo owner/target-repo
```

---

### Step 5: Human Review

**Story Review:**
- Verify Story accurately describes the change
- Check that the recommended version is safe
- Review change type (patch/minor/major)
- Confirm no breaking changes expected

**PR Review:**
- Review code changes in GitHub UI
- Verify `package.json` version change
- Verify `package-lock.json` regenerated correctly
- Check for unexpected dependency tree changes
- Run any manual tests if needed

---

### Step 6: Merge PR

**Option A: GitHub UI**
1. Navigate to PR URL
2. Click "Merge pull request"
3. Select squash merge (recommended)
4. Confirm merge

**Option B: GitHub CLI**
```bash
gh pr merge <PR_NUMBER> --repo owner/target-repo --squash
```

---

### Step 7: Verify Story Auto-Closure

**Wait 30-60 seconds after merge, then:**

```bash
gh issue view <STORY_NUMBER> --repo owner/governance-repo --json state,closedAt,closedByPullRequestsReferences
```

**Expected output:**
```json
{
  "state": "CLOSED",
  "closedAt": "2026-02-18T13:30:21Z",
  "closedByPullRequestsReferences": [
    {
      "number": 1,
      "repository": {
        "name": "target-repo",
        "owner": "owner"
      },
      "url": "https://github.com/owner/target-repo/pull/1"
    }
  ]
}
```

✅ **Success:** Story auto-closed by PR merge via cross-repo reference

---

## Integration Testing

### Purpose

Integration testing validates the complete end-to-end workflow:
- Scan → Filter → Story → PR → Merge → Auto-close

### Test Script

**Location:** `arm/integration-test.js`

**Usage:**
```bash
cd arm
node integration-test.js
```

**Output artifacts:**
- `test/integration/test-run.log` - Timestamped execution log
- `test/integration/test-results.json` - Structured test results

### Test Results

**Location:** `arm/test/integration/test-results.json`

**Structure:**
```json
{
  "testId": "test-1771387645840",
  "timestamp": "2026-02-18T04:07:25.840Z",
  "steps": [
    {"step": "scan", "status": "success"},
    {"step": "filter", "status": "success"},
    {"step": "story", "status": "created", "storyNumber": 26},
    {"step": "pr", "status": "created", "prNumber": 1}
  ],
  "urls": {
    "story": "https://github.com/.../issues/26",
    "pr": "https://github.com/.../pull/1"
  },
  "success": true
}
```

### Manual Verification Steps

See [test/integration/README.md](./test/integration/README.md) for complete verification guide.

---

## Monitoring & Observability

### Success Indicators

**Scan phase:**
- ✅ `npm outdated` executes successfully
- ✅ Valid JSON output parsed
- ✅ At least one dependency found (or none if all up-to-date)

**Filter phase:**
- ✅ Policy applied correctly
- ✅ Excluded packages respected
- ✅ Major updates blocked (if `allowMajor: false`)

**Story creation:**
- ✅ Story issue created in governance repo
- ✅ Story URL returned
- ✅ Story has correct labels and Epic reference

**PR creation:**
- ✅ Branch created: `arm/update-<package>-<version>`
- ✅ Files committed: `package.json`, `package-lock.json`
- ✅ PR created in target repo
- ✅ PR references Story with correct cross-repo syntax

**PR validation (via workflows):**
- ✅ `auto-link` workflow passes
- ✅ `validate-story-reference` workflow passes
- ✅ `update-story-status` workflow passes

**Post-merge:**
- ✅ Story state changes to `CLOSED`
- ✅ Story `stateReason` is `COMPLETED`
- ✅ Story `closedByPullRequestsReferences` includes merged PR

---

## Troubleshooting

### Issue: No Outdated Dependencies Found

**Symptom:**
```
❌ No outdated dependencies found. Test cannot proceed.
```

**Cause:** Target repository has all dependencies up-to-date.

**Solution:**
1. Verify target repository has dependencies to check
2. Manually downgrade a dependency for testing:
   ```bash
   cd /path/to/target-repo
   # Edit package.json: "express": "4.17.1"
   npm install
   git add package.json package-lock.json
   git commit -m "Downgrade express for ARM testing"
   git push
   ```
3. Re-run ARM

---

### Issue: Story Creation Failed

**Symptom:**
```
❌ Failed to create Story issue: Command failed: gh issue create...
```

**Possible causes:**

**1. Authentication failure**
```bash
gh auth status
```
If not authenticated:
```bash
gh auth login
```

**2. Missing write access to governance repo**
- Verify your GitHub user has write access
- Check organization permissions

**3. Invalid label**
```
could not add label: 'agent/lead_engineer' not found
```
**Solution:** Label was removed in Story #18 fix. Ensure you have latest code:
```bash
git pull origin main
```

**4. Body escaping issues**
- Fixed in Story #18 by using `--body-file` instead of inline body
- Ensure you're running latest code

---

### Issue: PR Creation Failed

**Symptom:**
```
❌ Failed to create PR: Command failed: gh pr create...
```

**Possible causes:**

**1. Branch already exists**
```bash
gh pr list --repo owner/target-repo --head arm/update-<package>-<version>
```
If branch exists:
```bash
# Delete remote branch
git push origin --delete arm/update-<package>-<version>

# Re-run ARM
```

**2. Merge conflict**
- `package.json` or `package-lock.json` has uncommitted changes
- Target branch has diverged from main

**Solution:**
```bash
cd /path/to/target-repo
git checkout main
git pull
git status  # Ensure clean working directory
```

**3. Write access denied**
- Verify GitHub permissions
- Check organization branch protection rules

---

### Issue: PR Validation Workflows Failed

**Symptom:**
```
validate-story-reference: ❌ failed
```

**Cause:** PR body doesn't include correct Story reference syntax.

**Verify PR body includes:**
```
Closes owner/governance-repo#<STORY_NUMBER>
```

**If incorrect:**
1. Edit PR body in GitHub UI
2. Add correct reference
3. Workflows will re-run automatically

**Permanent fix:** Ensure Story #24 fix is merged (uses `--body-file`)

---

### Issue: Story Didn't Auto-Close After PR Merge

**Symptom:** Story still shows "OPEN" state after PR merged.

**Possible causes:**

**1. Incorrect cross-repo syntax**

Check PR body:
```bash
gh pr view <PR_NUMBER> --repo owner/target-repo --json body --jq .body
```

**Must include:**
```
Closes owner/governance-repo#<STORY_NUMBER>
```

**Not:**
```
Closes #<STORY_NUMBER>  ❌ (references same repo)
```

**Fix:** Edit PR body and re-merge (or manually close Story)

**2. PR not actually merged**

Verify PR state:
```bash
gh pr view <PR_NUMBER> --repo owner/target-repo --json state,merged
```

**Expected:**
```json
{
  "state": "MERGED",
  "merged": true
}
```

**3. GitHub API delay**

Wait up to 5 minutes, then check again. GitHub's cross-repo automation can have delays.

---

### Issue: Duplicate Stories Created

**Symptom:** Multiple Stories exist for the same dependency update.

**Cause:** ARM was run multiple times without checking for existing Story.

**Prevention:** Integration test script includes duplicate detection:
```javascript
const existingStory = await storyCreator.findExistingStory(dep);
if (existingStory) {
  console.log(`Story already exists: #${existingStory.number}`);
  return existingStory;
}
```

**Solution (if duplicates exist):**
1. Close duplicate Stories manually
2. Add comment explaining they are duplicates
3. Proceed with the first Story created

---

### Issue: Major Update Recommended (Policy Violation)

**Symptom:**
```
Filter results: 0 recommended, 1 excluded
```

**Cause:** Available update is major version change, blocked by policy.

**Example:** express 4.17.1 → 5.2.1 (major)

**Policy setting:**
```json
{
  "policy": {
    "allowMajor": false
  }
}
```

**Options:**

**Option A: Manual review and override**
1. Review breaking changes for major version
2. If safe, temporarily allow major updates:
   ```json
   {"policy": {"allowMajor": true}}
   ```
3. Run ARM
4. Restore policy: `{"policy": {"allowMajor": false}}`

**Option B: Wait for minor update**
- Major updates require human decision
- Monitor for future minor/patch releases

---

### Issue: Package-Lock Regeneration Failed

**Symptom:** PR includes `package.json` change but `package-lock.json` unchanged.

**Cause:** `npm install` failed during PR generation.

**Debug:**
```bash
cd /tmp/arm-workspace-<repo>
npm install
```

**Possible causes:**
- Network issues (npm registry unreachable)
- Dependency conflict
- Invalid version specified

**Solution:**
1. Fix underlying npm install issue
2. Delete PR and branch
3. Re-run ARM

---

## Recovery Procedures

### Clean Up Failed Run

**Scenario:** ARM run failed mid-execution, leaving partial artifacts.

**Steps:**

1. **Identify created artifacts:**
   ```bash
   # Check for Story
   gh issue list --repo owner/governance-repo --label story --limit 5
   
   # Check for PR
   gh pr list --repo owner/target-repo --limit 5
   
   # Check for branch
   git ls-remote --heads origin arm/update-*
   ```

2. **Clean up Story (if created):**
   ```bash
   # Close Story with explanation
   gh issue close <STORY_NUMBER> --repo owner/governance-repo \
     --comment "Closing due to failed ARM run. Will be recreated."
   ```

3. **Clean up PR (if created):**
   ```bash
   # Close PR
   gh pr close <PR_NUMBER> --repo owner/target-repo
   
   # Delete branch
   git push origin --delete arm/update-<package>-<version>
   ```

4. **Re-run ARM:**
   ```bash
   cd arm
   node integration-test.js
   ```

---

### Rollback Merged PR

**Scenario:** PR was merged but introduced issues.

**Steps:**

1. **Identify merge commit:**
   ```bash
   gh pr view <PR_NUMBER> --repo owner/target-repo --json mergeCommit
   ```

2. **Revert merge:**
   ```bash
   cd /path/to/target-repo
   git checkout main
   git pull
   git revert <MERGE_COMMIT_SHA>
   git push
   ```

3. **Update Story:**
   - Reopen Story if auto-closed
   - Add comment explaining rollback
   - Link to revert commit

4. **Investigate:**
   - Why did the update cause issues?
   - Should the dependency update be excluded?
   - Update policy if needed

---

## Best Practices

### Before Each Run

- ✅ Run `npm test` to verify unit tests pass
- ✅ Run dry-run mode first to preview changes
- ✅ Review recommended updates manually
- ✅ Check for existing Stories/PRs to avoid duplicates

### During Execution

- ✅ Monitor output for errors
- ✅ Capture logs for audit trail
- ✅ Verify Story and PR URLs are valid

### After Execution

- ✅ Review created Story and PR immediately
- ✅ Verify PR validation workflows pass
- ✅ Perform human review before merge
- ✅ Verify Story auto-closes after merge
- ✅ Document any issues or anomalies

### Policy Configuration

- ✅ Start conservative: `allowMajor: false`
- ✅ Enable patch updates: `allowPatch: true` (low risk)
- ✅ Enable minor updates: `allowMinor: true` (medium risk)
- ✅ Use `excludePatterns` for critical dependencies
- ✅ Review policy regularly based on experience

### Governance Hygiene

- ✅ Close duplicate Stories promptly
- ✅ Add comments to Stories when deviating from process
- ✅ Link PRs to Stories consistently
- ✅ Use squash merge for PRs (cleaner history)

---

## Operational Metrics

### Per-Run Metrics

- **Scan duration:** Time to run `npm outdated`
- **Dependencies found:** Count of outdated packages
- **Recommended updates:** Count after filtering
- **Excluded updates:** Count filtered out
- **Stories created:** Count of new Story issues
- **PRs created:** Count of new PRs

### Success Metrics

- **Story creation success rate:** % of successful Story creations
- **PR creation success rate:** % of successful PR creations
- **PR merge rate:** % of PRs merged vs. created
- **Story auto-close rate:** % of Stories auto-closed by PR merge
- **Time to merge:** Average time from PR creation to merge

### Quality Metrics

- **False positives:** Dependencies flagged but not needing update
- **Policy violations:** Updates blocked by policy
- **Manual interventions:** Stories/PRs requiring manual fixes
- **Rollback rate:** % of merged PRs requiring revert

---

## Appendix: Command Reference

### Configuration

```bash
# Validate config
node -e "require('./arm.config.json')"

# View config schema
cat config.schema.json
```

### Execution

```bash
# Dry-run (via demo)
node demo.js --full

# Production run (via integration test)
node integration-test.js

# Unit tests
npm test
```

### GitHub CLI

```bash
# Authentication
gh auth status
gh auth login

# Stories
gh issue list --repo owner/governance-repo --label story
gh issue view <NUMBER> --repo owner/governance-repo
gh issue close <NUMBER> --repo owner/governance-repo

# PRs
gh pr list --repo owner/target-repo
gh pr view <NUMBER> --repo owner/target-repo
gh pr checks <NUMBER> --repo owner/target-repo
gh pr merge <NUMBER> --repo owner/target-repo --squash
gh pr close <NUMBER> --repo owner/target-repo
```

### Git

```bash
# Branch management
git ls-remote --heads origin arm/update-*
git push origin --delete arm/update-<package>-<version>

# Revert merge
git revert <COMMIT_SHA>
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-18  
**Story:** [#19](https://github.com/Hozyne-OpenBak/openclaw-core/issues/19)  
**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)
