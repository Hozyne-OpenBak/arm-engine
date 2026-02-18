# ARM v1 Integration Testing

**Story:** #18  
**Epic:** #13  
**Purpose:** Validate end-to-end governed workflow across repositories

---

## Overview

This integration test validates the complete ARM v1 workflow:

1. **Scan** - Detect outdated dependencies in target repo
2. **Filter** - Apply update policy
3. **Story** - Create Story issue in governance repo
4. **PR** - Create PR in target repo with cross-repo Story reference
5. **Merge** - Manual merge of PR
6. **Verify** - Confirm Story auto-closes

---

## Prerequisites

- GitHub CLI (`gh`) authenticated
- Write access to:
  - `Hozyne-OpenBak/openclaw-core` (governance repo)
  - `Hozyne-OpenBak/arm` (target repo)
- Node.js installed
- ARM v1 dependencies installed (`npm install`)

---

## Running the Integration Test

### 1. Execute Test Script

```bash
cd arm
chmod +x integration-test.js
node integration-test.js
```

### 2. Expected Output

```
🦞 ARM v1 Integration Test - Epic #13
Test ID: test-1708229760000
Target: Hozyne-OpenBak/arm
Governance: Hozyne-OpenBak/openclaw-core

Step 1: Scanning repository for outdated dependencies...
✅ Scan complete: Found 1 outdated dependencies

Step 2: Applying filter policy...
✅ Filter applied: 1 recommended, 0 excluded

Testing with: express (4.17.1 → 4.22.1)

Step 3: Creating Story in governance repository...
✅ Story created: #XXX
   URL: https://github.com/Hozyne-OpenBak/openclaw-core/issues/XXX

Step 4: Creating PR in target repository...
✅ PR created: #YYY
   URL: https://github.com/Hozyne-OpenBak/arm/pull/YYY
   Branch: arm/update-express-4-22-1

Step 5: Manual verification required

═══════════════════════════════════════════════════════════════
MANUAL VERIFICATION STEPS:
═══════════════════════════════════════════════════════════════
1. Review Story: https://github.com/.../issues/XXX
   - Verify Story is in Epic #13
   - Verify Story has correct labels
   - Verify Story template is complete

2. Review PR: https://github.com/.../pull/YYY
   - Verify PR references Story with: Closes Hozyne-OpenBak/openclaw-core#XXX
   - Verify PR validation workflows pass
   - Verify package.json and package-lock.json updated

3. Merge PR in target repo
   - Click "Merge pull request" in GitHub UI
   - OR via CLI: gh pr merge YYY --repo Hozyne-OpenBak/arm --squash

4. Verify Story auto-closure
   - Navigate to: https://github.com/.../issues/XXX
   - Verify Story status changed to "Closed"
   - Verify status label changed to "status/completed"
═══════════════════════════════════════════════════════════════

✅ Integration test setup complete!

📝 Logs saved to: test/integration/test-run.log
📊 Results saved to: test/integration/test-results.json
```

---

## Manual Verification Steps

### Step 1: Review Story

Navigate to the Story URL provided in test output.

**Verify:**
- [ ] Story title: "Update [package] (Node.js) from [current] to [wanted]"
- [ ] Labels: `story`, `type/task`, `status/draft`, `priority/p1`, `agent/lead_engineer`
- [ ] Body includes:
  - [ ] Epic reference: `#13`
  - [ ] Target repository: `Hozyne-OpenBak/arm`
  - [ ] Change details (package, versions, type)
  - [ ] Goals / Non-Goals
  - [ ] Acceptance Criteria
  - [ ] Tasks
  - [ ] Implementation Notes

### Step 2: Review PR

Navigate to the PR URL provided in test output.

**Verify:**
- [ ] PR title: `[Story #XXX] Update [package] from [current] to [wanted]`
- [ ] PR body includes:
  - [ ] **Cross-repo Story reference:** `Closes Hozyne-OpenBak/openclaw-core#XXX`
  - [ ] Change summary with dependency details
  - [ ] File changes: `package.json`, `package-lock.json`
  - [ ] Testing checklist
  - [ ] Governance links (Story, Epic)
- [ ] Files changed:
  - [ ] `package.json` - version updated
  - [ ] `package-lock.json` - regenerated
- [ ] Validation workflows (if configured):
  - [ ] All checks passing

### Step 3: Merge PR

**Option A: GitHub UI**
1. Navigate to PR URL
2. Click "Merge pull request"
3. Select merge method (squash recommended)
4. Confirm merge

**Option B: GitHub CLI**
```bash
gh pr merge <PR_NUMBER> --repo Hozyne-OpenBak/arm --squash
```

### Step 4: Verify Story Auto-Closure

**Wait 30-60 seconds after merge, then:**

1. Navigate to Story URL
2. **Verify Story status:**
   - [ ] Issue shows "Closed" badge
   - [ ] Closed by: GitHub action triggered by PR merge
   - [ ] Timeline shows: "This was referenced" → PR link

**Expected behavior:**
- GitHub automatically closes Story when PR with `Closes owner/repo#N` is merged
- Story status transitions to "Closed"
- If governance workflows exist, status label may update to `status/completed`

---

## Test Artifacts

### Logs

**Location:** `test/integration/test-run.log`

Contains timestamped logs of all test steps:
```
[2026-02-18T04:00:00.000Z] 🦞 ARM v1 Integration Test - Epic #13
[2026-02-18T04:00:01.234Z] Step 1: Scanning repository...
[2026-02-18T04:00:05.678Z] ✅ Scan complete: Found 1 outdated dependencies
...
```

### Results

**Location:** `test/integration/test-results.json`

Contains structured test results:
```json
{
  "testId": "test-1708229760000",
  "timestamp": "2026-02-18T04:00:00.000Z",
  "steps": [
    {
      "step": "scan",
      "status": "success",
      "timestamp": "2026-02-18T04:00:05.678Z",
      "scannedAt": "2026-02-18T04:00:05.123Z",
      "dependenciesFound": 1
    },
    ...
  ],
  "urls": {
    "story": "https://github.com/Hozyne-OpenBak/openclaw-core/issues/XXX",
    "pr": "https://github.com/Hozyne-OpenBak/arm/pull/YYY"
  },
  "success": true,
  "verificationRequired": true,
  "verificationSteps": [
    "Review Story: https://...",
    "Review PR: https://...",
    "Merge PR: gh pr merge YYY --repo Hozyne-OpenBak/arm --squash",
    "Verify Story closed: https://..."
  ]
}
```

---

## Troubleshooting

### "No outdated dependencies found"

**Cause:** Target repo has all dependencies up-to-date.

**Solution:**
1. Manually downgrade a dependency in `Hozyne-OpenBak/arm`
2. Push change to main
3. Re-run integration test

**Example:**
```bash
cd /path/to/arm
# Edit package.json: "express": "4.17.1"
git add package.json
git commit -m "Downgrade express for testing"
git push
```

### "Story already exists"

**Cause:** Previous test run created Story for same dependency.

**Behavior:** Test script will reuse existing Story and create new PR.

**To reset:**
- Close existing Story manually
- Delete existing PR/branch
- Re-run test

### "PR already exists"

**Cause:** Previous test run created PR for same dependency.

**Behavior:** Test script will reuse existing PR.

**To reset:**
- Close existing PR
- Delete branch: `git push origin --delete arm/update-<package>-<version>`
- Re-run test

### "Failed to create PR"

**Possible causes:**
- Git authentication issue
- Branch already exists
- Merge conflict

**Debug:**
1. Check `gh auth status`
2. Verify write access to target repo
3. Check for existing branches: `gh pr list --repo Hozyne-OpenBak/arm`

---

## Success Criteria

Integration test is successful when:

- ✅ Script completes without errors
- ✅ Story created in governance repo with correct template
- ✅ PR created in target repo with cross-repo Story reference
- ✅ PR references Story with `Closes Hozyne-OpenBak/openclaw-core#XXX`
- ✅ PR can be merged successfully
- ✅ Story automatically closes after PR merge
- ✅ Logs and results files generated

---

## Cleanup

After successful test:

1. **Keep Story and PR** - They serve as evidence of successful integration
2. **Document results** - Record Story# and PR# in Story #18
3. **Optional:** Revert dependency update if not desired for production

**To revert dependency update:**
```bash
cd /path/to/arm
git revert <merge-commit-sha>
git push
```

---

## Notes

- Test creates **real** GitHub issues and PRs (not dry-run)
- Manual merge step required (no auto-merge in MVP)
- Story auto-closure validates GitHub's cross-repo issue linking
- Test can be run multiple times (idempotent with duplicate detection)

---

**Last Updated:** 2026-02-18  
**Story:** #18  
**Epic:** #13

---

## GitHub Actions Integration Test

**Story:** #36  
**Epic:** #30  
**Script:** `test-github-actions.sh`

Validates the ARM GitHub Actions workflow execution with comprehensive test scenarios.

### Prerequisites

- GitHub CLI (`gh`) authenticated with `GITHUB_TOKEN`
- Access to `Hozyne-OpenBak/arm-engine` repository
- `ARM_TOKEN` secret configured (for production tests)
- Bash shell

### Quick Start

**Safe test (dry-run only, no API calls):**
```bash
cd test/integration
chmod +x test-github-actions.sh
./test-github-actions.sh --dry-run-only --verbose
```

**Full test suite (requires ARM_TOKEN):**
```bash
export GITHUB_TOKEN="ghp_..."
export ARM_TOKEN="ghp_..."  # Must have repo scope
./test-github-actions.sh --production --verbose
```

### Test Scenarios

| Test | Description | Requires ARM_TOKEN |
|------|-------------|-------------------|
| **Dry-run mode** | Validates workflow runs without API calls | No |
| **Production mode** | Creates actual Stories and PRs | Yes |
| **Idempotency** | Verifies duplicate detection on re-run | Yes |
| **Error handling** | Tests graceful failure with invalid config | No |

### Validation Checks

#### Dry-Run Mode
- ✅ Workflow completes successfully
- ✅ "DRY RUN MODE" indicator present
- ✅ No Stories or PRs created
- ✅ Execution summary generated

#### Production Mode
- ✅ Workflow completes successfully
- ✅ Story URLs logged (if outdated deps found)
- ✅ PR URLs logged (if outdated deps found)
- ✅ Job summary generated
- ✅ GitHub Actions annotations present

#### Idempotency
- ✅ Second run detects existing Stories
- ✅ "Story reused" (♻️) messages present
- ✅ No duplicate Stories created

### Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARM GitHub Actions Integration Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Configuration:
   Repository: Hozyne-OpenBak/arm-engine
   Target: Hozyne-OpenBak/arm
   Workflow: arm-execute.yml
   Mode: Dry-run only

✅ Prerequisites validated

ℹ Test 1: Dry-run mode execution
   Workflow run ID: 123456789
   ✓ Dry-run mode confirmed
   ✓ No API calls made (as expected)
   ✓ Execution summary present
✅ Dry-run mode test passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total tests:   1
  Passed:        1
  Failed:        0

✅ All tests passed! 🎉
```

### Troubleshooting

**Error: "GitHub CLI (gh) not found"**
- Install GitHub CLI: https://cli.github.com/

**Error: "GITHUB_TOKEN not set"**
```bash
export GITHUB_TOKEN=$(gh auth token)
```

**Error: "GitHub CLI not authenticated"**
```bash
gh auth login
```

**Error: "ARM_TOKEN not set" (production tests)**
- Ensure `ARM_TOKEN` is configured in repository secrets
- Or export for local testing: `export ARM_TOKEN="ghp_..."`

**Workflow hangs or times out**
- Check workflow status: `gh run list --repo Hozyne-OpenBak/arm-engine`
- View logs: `gh run view <run-id> --log --repo Hozyne-OpenBak/arm-engine`
- Increase timeout: Edit `wait_for_run` max_wait parameter in script

### CI Integration (Future)

This test can be integrated into CI pipelines:

```yaml
- name: Run Integration Tests
  run: |
    cd test/integration
    ./test-github-actions.sh --dry-run-only --verbose
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

For production CI tests (rare, due to API rate limits):
```yaml
- name: Run Production Integration Tests
  if: github.event_name == 'schedule' # Weekly cron
  run: |
    cd test/integration
    ./test-github-actions.sh --production
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ARM_TOKEN: ${{ secrets.ARM_TOKEN }}
```

---

**Related Documentation:**
- [ARM Runbook](../../RUNBOOK.md) - GitHub Actions execution guide
- [GitHub Actions Workflow](../../.github/workflows/arm-execute.yml) - Workflow definition
