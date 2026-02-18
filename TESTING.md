# ARM v1 Testing Checklist & Validation Plan

**Story:** #36  
**Task:** T36.7  
**Epic:** #30  
**Version:** 1.0.0

---

## Overview

This document provides comprehensive testing checklists and validation procedures for ARM v1 (GitHub Actions mode).

**Testing Levels:**
1. **Pre-Execution** - Prerequisites and configuration validation
2. **Dry-Run** - Safe testing without API calls
3. **Production** - Full workflow execution with Story/PR creation
4. **Idempotency** - Duplicate detection validation
5. **Error Scenarios** - Graceful failure handling

---

## 1. Pre-Execution Validation

**Purpose:** Verify environment is ready before triggering workflow.

### 1.1 Repository Configuration

- [ ] `arm.config.json` exists in repository root
- [ ] Config file is valid JSON (no syntax errors)
- [ ] `version` field present and correct (`"1.0.0"`)
- [ ] `target.repository` is valid owner/name format
- [ ] `governance.repository` is valid owner/name format
- [ ] `governance.epicNumber` is a valid issue number
- [ ] `policy.allowMajor` is `false` (enforced safe default)
- [ ] `policy.denylist` contains only exact package names
- [ ] No deprecated `policy.excludePatterns` used

**Validation Command:**
```bash
node src/cli.js --validate-config  # Future feature
# OR manually:
jq '.' arm.config.json  # Validates JSON syntax
```

**Expected Output:**
```
arm.config.json is valid JSON ✓
```

---

### 1.2 Secrets Configuration

- [ ] `ARM_TOKEN` secret configured in repository settings
- [ ] Token has `repo` scope (required for API calls)
- [ ] Token not expired
- [ ] Token has access to both target and governance repositories

**Validation:**
1. Navigate to: `Settings` → `Secrets and variables` → `Actions`
2. Verify `ARM_TOKEN` is listed
3. Test token manually:
   ```bash
   gh api user --token $ARM_TOKEN
   ```

**Expected Output:**
```json
{
  "login": "Hozyne-OpenBak",
  ...
}
```

---

### 1.3 Workflow File

- [ ] `.github/workflows/arm-execute.yml` exists
- [ ] Workflow syntax is valid YAML
- [ ] `workflow_dispatch` trigger configured
- [ ] Inputs: `targetRepo`, `dryRun`, `configPath` defined
- [ ] `ARM_TOKEN` secret referenced correctly

**Validation Command:**
```bash
gh workflow view arm-execute.yml --repo Hozyne-OpenBak/arm-engine
```

**Expected Output:**
```
ARM Execute - arm-execute.yml
ID: 12345678
```

---

### 1.4 Dependencies

- [ ] Node.js 18+ available in workflow runner
- [ ] `package.json` has all required dependencies
- [ ] `npm ci` succeeds in workflow

**Validation:**
- Check workflow logs for "Install dependencies" step
- Should complete in <10s with no errors

---

## 2. Dry-Run Validation

**Purpose:** Test workflow execution without creating Stories or PRs.

### 2.1 Trigger Workflow

**Steps:**
1. Navigate to: `Actions` → `ARM Execute` → `Run workflow`
2. Set inputs:
   - `targetRepo`: `Hozyne-OpenBak/arm` (default)
   - `dryRun`: `true` ✅
   - `configPath`: `arm.config.json` (default)
3. Click "Run workflow"

**Expected:** Workflow appears in run list within 5 seconds.

---

### 2.2 Workflow Execution

- [ ] Workflow status changes: ⏳ Queued → 🔄 In Progress → ✅ Success
- [ ] All 6 workflow steps complete successfully:
  1. Checkout arm-engine ✅
  2. Setup Node.js ✅
  3. Install dependencies ✅
  4. Configure git identity ✅
  5. Run ARM ✅
  6. Output Summary ✅

**Validation:** Click on workflow run → "execute" job → Check step statuses.

---

### 2.3 Logs Validation

**Required Log Markers:**
- [ ] `🦞 ARM v1 - GitHub Actions Execution` (header)
- [ ] `DRY RUN MODE` (dry-run indicator)
- [ ] `📡 Step 1: Scanning repository...` (scan started)
- [ ] `✅ Scan complete: X dependencies found` (scan succeeded)
- [ ] `📊 Filter results: X recommended, Y excluded` (filter applied)
- [ ] `EXECUTION SUMMARY` (summary header)
- [ ] Success rate percentage (e.g., `🎯 Success rate: 100%`)

**Validation:**
```bash
gh run view <run-id> --repo Hozyne-OpenBak/arm-engine --log | grep -E "DRY RUN MODE|Scan complete|EXECUTION SUMMARY"
```

---

### 2.4 No API Calls

**Critical Checks:**
- [ ] **NO** `✅ Story created:` messages in logs
- [ ] **NO** `✅ PR created:` messages in logs
- [ ] **NO** new issues in governance repository
- [ ] **NO** new PRs in target repository

**Validation:**
```bash
# Check logs for absence of creation messages
gh run view <run-id> --repo Hozyne-OpenBak/arm-engine --log | grep -E "Story created|PR created"
# Expected: No output (empty)

# Verify no new issues
gh issue list --repo Hozyne-OpenBak/openclaw-core --limit 5
# Expected: No new issues with ARM label from this run
```

---

### 2.5 Job Summary

- [ ] Job summary generated (bottom of workflow run page)
- [ ] Summary includes "Dry Run" label
- [ ] Summary includes target repository
- [ ] Summary includes configuration used

**Expected Format:**
```markdown
## ARM Execution Complete

**Target Repository:** Hozyne-OpenBak/arm
**Dry Run:** true
**Config Path:** arm.config.json

See logs above for detailed output (detected updates + planned actions).
```

---

## 3. Production Validation

**Purpose:** Validate full workflow execution with Story/PR creation.

**⚠️ WARNING:** Production mode creates real GitHub Issues and Pull Requests. Only run when ready.

### 3.1 Pre-Production Checklist

- [ ] Dry-run mode tested successfully (see Section 2)
- [ ] ARM_TOKEN verified with `repo` scope
- [ ] Target repository confirmed (no typos)
- [ ] Governance repository confirmed
- [ ] Epic number exists and is open
- [ ] Team aware of impending Stories/PRs

---

### 3.2 Trigger Workflow

**Steps:**
1. Navigate to: `Actions` → `ARM Execute` → `Run workflow`
2. Set inputs:
   - `targetRepo`: `Hozyne-OpenBak/arm` (or custom)
   - `dryRun`: `false` ⚠️
   - `configPath`: `arm.config.json`
3. **Double-check** `dryRun` is `false`
4. Click "Run workflow"

---

### 3.3 Workflow Execution

- [ ] Workflow status: ⏳ Queued → 🔄 In Progress → ✅ Success
- [ ] All 6 steps complete successfully
- [ ] Runtime: <2 minutes (typical)

---

### 3.4 Story Creation Validation

**Expected Behavior:** One Story issue created per recommended dependency update.

**Checks:**
- [ ] `✅ Story created:` messages in logs
- [ ] Story URLs logged (e.g., `https://github.com/Hozyne-OpenBak/openclaw-core/issues/XXX`)
- [ ] Stories exist in governance repository
- [ ] Stories have correct labels:
  - `arm` (ARM-created)
  - `epic:<epic-number>` (linked to Epic)
  - `state:ready` (ready for execution)
- [ ] Story title format: `[ARM] Update <package> from <current> to <target>`
- [ ] Story body includes:
  - Package name
  - Current version
  - Target version
  - Target repository
  - Changelog link (if available)

**Validation:**
```bash
# List recent ARM stories
gh issue list --repo Hozyne-OpenBak/openclaw-core --label arm --limit 10

# View specific story
gh issue view <story-number> --repo Hozyne-OpenBak/openclaw-core
```

---

### 3.5 PR Creation Validation

**Expected Behavior:** One PR created per Story in target repository.

**Checks:**
- [ ] `✅ PR created:` messages in logs
- [ ] PR URLs logged (e.g., `https://github.com/Hozyne-OpenBak/arm/pull/XXX`)
- [ ] PRs exist in target repository
- [ ] PR branch naming: `arm/update-<package>-<version>`
- [ ] PR title format: `[ARM] Update <package> from <current> to <target>`
- [ ] PR body includes:
  - Story reference (e.g., `Closes Hozyne-OpenBak/openclaw-core#XXX`)
  - Package name
  - Version change
  - Changelog link
- [ ] PR file changes:
  - `package.json` updated
  - `package-lock.json` updated
- [ ] PR is mergeable (no conflicts)

**Validation:**
```bash
# List recent PRs
gh pr list --repo Hozyne-OpenBak/arm --limit 10

# View specific PR
gh pr view <pr-number> --repo Hozyne-OpenBak/arm

# Check PR file changes
gh pr diff <pr-number> --repo Hozyne-OpenBak/arm
```

---

### 3.6 Job Summary Validation

- [ ] Job summary generated
- [ ] Summary includes table with columns: Package, Story, PR, Status
- [ ] Story URLs clickable
- [ ] PR URLs clickable
- [ ] Status indicators correct: ✅ Created, ♻️ Reused, ⏭️ Skipped, ❌ Failed

**Expected Format:**
```markdown
## ARM Execution Results

| Package | Story | PR | Status |
|---------|-------|-----|--------|
| lodash | [#45](https://github.com/Hozyne-OpenBak/openclaw-core/issues/45) | [#12](https://github.com/Hozyne-OpenBak/arm/pull/12) | ✅ Created |
| express | [#46](https://github.com/Hozyne-OpenBak/openclaw-core/issues/46) | - | ⏭️ Skipped |
```

---

### 3.7 Annotations Validation

- [ ] Annotations panel accessible (top bar of workflow run)
- [ ] Success annotations (`:notice`) for Stories created
- [ ] Success annotations (`:notice`) for PRs created
- [ ] Warning annotations (`:warning`) for skipped items
- [ ] Error annotations (`:error`) for failures (if any)

**Validation:**
1. Click workflow run → "Annotations" tab
2. Verify counts: X notices, Y warnings, Z errors

---

### 3.8 Cross-Repo Integration

**Critical:** Verify Story auto-closes when PR merges.

**Steps:**
1. Merge one of the created PRs in target repository:
   ```bash
   gh pr merge <pr-number> --repo Hozyne-OpenBak/arm --squash
   ```
2. Wait 1-2 minutes for GitHub automation
3. Verify Story auto-closed:
   ```bash
   gh issue view <story-number> --repo Hozyne-OpenBak/openclaw-core --json state
   ```

**Expected:**
```json
{
  "state": "CLOSED"
}
```

---

## 4. Idempotency Validation

**Purpose:** Verify duplicate detection works correctly (no duplicate Stories/PRs on re-run).

### 4.1 First Run (Baseline)

- [ ] Complete production validation (Section 3)
- [ ] Note Story numbers created
- [ ] Note PR numbers created

---

### 4.2 Second Run (Duplicate Detection)

**Steps:**
1. Trigger workflow again (same configuration)
2. Wait for completion

**Expected Behavior:**
- [ ] Workflow succeeds
- [ ] `♻️ Story reused:` messages in logs (NOT "Story created")
- [ ] Existing Story URLs logged
- [ ] **NO** new Stories created in governance repository
- [ ] **NO** new PRs created in target repository (if PR already exists)
- [ ] Annotations include `::warning` for reused Stories

**Validation:**
```bash
# Check logs for reuse messages
gh run view <run-id> --repo Hozyne-OpenBak/arm-engine --log | grep "Story reused"

# Verify story count unchanged
gh issue list --repo Hozyne-OpenBak/openclaw-core --label arm --json number | jq length
```

---

### 4.3 Post-Merge Run (New Cycle)

**Steps:**
1. Merge PRs from first run
2. Trigger workflow again

**Expected Behavior:**
- [ ] Workflow succeeds
- [ ] **NO** Stories for merged PRs (dependencies now up-to-date)
- [ ] New Stories only if new outdated dependencies detected
- [ ] Logs show: `⏭️ Skipped: <package> (already at target version)`

---

## 5. Error Scenario Validation

**Purpose:** Verify graceful handling of error conditions.

### 5.1 Invalid Configuration

**Test:** Trigger workflow with nonexistent config file.

**Steps:**
1. Trigger workflow with `configPath: nonexistent.json`

**Expected:**
- [ ] Workflow fails gracefully
- [ ] Error message: `❌ Config file not found: nonexistent.json`
- [ ] Exit code: 1
- [ ] No Stories/PRs created

---

### 5.2 Authentication Failure

**Test:** Use invalid or expired ARM_TOKEN.

**Steps:**
1. Temporarily set ARM_TOKEN to invalid value in secrets
2. Trigger workflow (dry-run)

**Expected:**
- [ ] Workflow fails immediately
- [ ] Error annotation: `::error Authentication failed`
- [ ] Suggested fix: "Check ARM_TOKEN secret in repository settings"
- [ ] No retries attempted (permanent error)

**Validation:**
```bash
gh run view <run-id> --repo Hozyne-OpenBak/arm-engine --log | grep "Authentication failed"
```

---

### 5.3 Rate Limit Handling

**Test:** Simulate rate limit (difficult to test without hitting actual limits).

**Expected Behavior (if rate limit hit):**
- [ ] Workflow does not fail immediately
- [ ] Warning annotation: `::warning Rate limit exceeded`
- [ ] Retry logic activates (up to 3 attempts)
- [ ] Exponential backoff delays: 1s, 2s, 4s
- [ ] Logs show retry messages: `⚠️ Transient error (attempt X/3)`

**Validation:** Review logs for retry patterns.

---

### 5.4 Transient Network Errors

**Test:** Simulate network timeout (difficult without mocking).

**Expected Behavior:**
- [ ] Workflow does not fail immediately
- [ ] Retry logic activates (up to 3 attempts)
- [ ] Error categorized as transient
- [ ] Workflow succeeds after retry

**Validation:** Check logs for `Retrying in Xms...` messages.

---

### 5.5 Repository Not Found

**Test:** Trigger workflow with invalid target repository.

**Steps:**
1. Set `targetRepo: Hozyne-OpenBak/nonexistent-repo`

**Expected:**
- [ ] Workflow fails gracefully
- [ ] Error message: `❌ Repository not found: Hozyne-OpenBak/nonexistent-repo`
- [ ] Suggested fix: "Verify repository names in arm.config.json"
- [ ] No retries (permanent error)

---

## 6. Performance Validation

**Purpose:** Ensure workflow executes within reasonable timeframes.

### 6.1 Timing Benchmarks

| Scenario | Expected Duration | Acceptable Range |
|----------|-------------------|------------------|
| Dry-run (no deps found) | <30s | 15-60s |
| Dry-run (5 deps found) | <45s | 30-90s |
| Production (1 Story+PR) | <60s | 45-120s |
| Production (5 Stories+PRs) | <2min | 1-4min |

**Validation:**
- [ ] Check "Elapsed time" in execution summary
- [ ] Verify within acceptable range

---

### 6.2 Resource Usage

- [ ] Workflow uses `ubuntu-latest` runner
- [ ] Memory usage reasonable (<2GB)
- [ ] No disk space issues
- [ ] No process crashes

**Validation:** Review workflow logs for resource warnings.

---

## 7. Integration Testing (Automated)

**Purpose:** Run automated integration test suite.

### 7.1 Run Test Script

**Command:**
```bash
cd test/integration
./test-github-actions.sh --production --verbose
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total tests:   4
  Passed:        4
  Failed:        0

✅ All tests passed! 🎉
```

**Checks:**
- [ ] Dry-run mode test passes
- [ ] Production mode test passes (if --production used)
- [ ] Idempotency test passes (if --production used)
- [ ] Error handling test passes

---

## 8. Validation Sign-Off

**Completion Checklist:**

- [ ] All pre-execution validations passed
- [ ] Dry-run mode tested and validated
- [ ] Production mode tested and validated (if applicable)
- [ ] Idempotency validated
- [ ] Error scenarios tested
- [ ] Performance within acceptable range
- [ ] Automated integration tests passed
- [ ] Documentation updated (if issues found)

**Signed Off By:**
- Name: ___________________________
- Date: ___________________________
- Notes: ___________________________

---

## 9. Troubleshooting Common Issues

### Issue: Workflow not appearing

**Symptoms:** Workflow doesn't show up in Actions tab after trigger.

**Checks:**
- [ ] Workflow file syntax valid
- [ ] Workflow file on correct branch (usually `main`)
- [ ] Repository Actions enabled (Settings → Actions)

**Fix:** Check workflow syntax with `gh workflow view`.

---

### Issue: Workflow fails immediately

**Symptoms:** Workflow fails on "Run ARM" step with exit code 1.

**Checks:**
- [ ] ARM_TOKEN secret configured
- [ ] Config file exists and valid
- [ ] Target repository accessible

**Fix:** Review logs for specific error message, follow suggested fix.

---

### Issue: No Stories created (production mode)

**Symptoms:** Workflow succeeds but no Stories created.

**Possible Causes:**
- All dependencies up-to-date (no outdated deps found)
- All updates excluded by policy (major updates blocked)
- Packages on denylist

**Validation:**
```bash
# Check logs for exclusion messages
gh run view <run-id> --log | grep "Excluded\|No outdated"
```

**Fix:** Adjust policy in `arm.config.json` if intended updates are blocked.

---

### Issue: Stories created but no PRs

**Symptoms:** Stories exist but PRs not created.

**Possible Causes:**
- ARM_TOKEN lacks write access to target repository
- Branch already exists (from previous run)
- PR generation failed (check logs)

**Validation:**
```bash
# Check PR generation logs
gh run view <run-id> --log | grep "PR creation failed"
```

**Fix:** Verify ARM_TOKEN has `repo` scope and write access.

---

### Issue: Story doesn't auto-close after PR merge

**Symptoms:** PR merged but Story remains open.

**Possible Causes:**
- PR body doesn't contain correct Story reference
- GitHub automation delay (wait 5 minutes)
- Cross-repo automation not working

**Validation:**
```bash
# Check PR body for Story reference
gh pr view <pr-number> --json body | jq -r '.body' | grep "Closes"
```

**Expected Format:**
```
Closes Hozyne-OpenBak/openclaw-core#XXX
```

**Fix:** Manually close Story or update PR body and re-merge.

---

## 10. Continuous Validation

**Ongoing Monitoring:**

- [ ] Weekly: Run dry-run validation
- [ ] Monthly: Run full production validation
- [ ] After config changes: Run full validation
- [ ] After workflow changes: Run automated tests

**Metrics to Track:**
- Success rate (%)
- Average execution time
- Number of Stories created per run
- Number of PRs merged per week

---

## Appendix A: Quick Reference

### Essential Commands

```bash
# Trigger dry-run
gh workflow run arm-execute.yml --repo Hozyne-OpenBak/arm-engine -f dryRun=true

# Trigger production
gh workflow run arm-execute.yml --repo Hozyne-OpenBak/arm-engine -f dryRun=false

# List recent runs
gh run list --repo Hozyne-OpenBak/arm-engine --workflow=arm-execute.yml --limit 5

# View run logs
gh run view <run-id> --repo Hozyne-OpenBak/arm-engine --log

# Check run status
gh run view <run-id> --repo Hozyne-OpenBak/arm-engine --json status,conclusion

# List ARM stories
gh issue list --repo Hozyne-OpenBak/openclaw-core --label arm --limit 10

# List ARM PRs
gh pr list --repo Hozyne-OpenBak/arm --limit 10

# Run integration tests
cd test/integration && ./test-github-actions.sh --dry-run-only --verbose
```

---

## Appendix B: Validation Tracking Template

Copy this template for each validation run:

```markdown
# ARM v1 Validation Report

**Date:** YYYY-MM-DD  
**Validator:** [Name]  
**Workflow Run ID:** [ID]  
**Mode:** Dry-Run | Production

## Results

- [ ] Pre-execution validation: PASS | FAIL
- [ ] Workflow execution: PASS | FAIL
- [ ] Logs validation: PASS | FAIL
- [ ] Job summary: PASS | FAIL
- [ ] Story creation (if prod): PASS | FAIL | N/A
- [ ] PR creation (if prod): PASS | FAIL | N/A
- [ ] Idempotency (if tested): PASS | FAIL | N/A
- [ ] Performance: PASS | FAIL

## Notes

[Any issues encountered, fixes applied, or observations]

## Sign-Off

Validated by: ___________________________  
Date: ___________________________
```

---

## Appendix C: Related Documentation

- **[RUNBOOK.md](./RUNBOOK.md)** - Operational guide and troubleshooting
- **[README.md](./README.md)** - Quick start and overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical design
- **[test/integration/README.md](./test/integration/README.md)** - Integration testing guide
- **[.github/workflows/arm-execute.yml](./.github/workflows/arm-execute.yml)** - Workflow definition

---

**Maintained by:** OpenClaw Orchestrator  
**Last Updated:** 2026-02-18  
**Story:** #36  
**Epic:** #30
