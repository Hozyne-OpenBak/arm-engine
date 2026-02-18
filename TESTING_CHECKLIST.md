# ARM v1 Testing Checklist and Validation Plan

**Story:** [#36](https://github.com/Hozyne-OpenBak/openclaw-core/issues/36) → Task T36.7  
**Epic:** [#30](https://github.com/Hozyne-OpenBak/openclaw-core/issues/30)  
**Purpose:** Operator-facing validation checklist for ARM v1 features  
**Version:** 1.0.0  
**Last Updated:** 2026-02-18

---

## Overview

This checklist validates the complete ARM v1 feature set against documented behaviors. Use it for:

- **Pre-deployment validation** — Verify all features work before production use
- **Regression testing** — Confirm changes haven't broken existing functionality
- **CI validation** — Subset of checks suitable for automation
- **Operator onboarding** — Learn what ARM does and how to verify it

---

## Scope and Constraints

**Included:**
- ✅ Features implemented and merged to `main` branch
- ✅ Documented behaviors in README, RUNBOOK, ARCHITECTURE
- ✅ Retry logic, error handling, idempotency
- ✅ Observable outputs and validation points

**Excluded:**
- ❌ Speculative or planned features (post-MVP)
- ❌ Internal implementation details not observable by operators
- ❌ Performance benchmarks (out of scope for MVP)

---

## Testing Modes

### 1. Manual Operator Validation
**Target:** Human operators running ARM manually  
**Duration:** ~30 minutes  
**Frequency:** Before each production deployment, or after significant changes

### 2. CI Validation (Subset)
**Target:** GitHub Actions automated checks  
**Duration:** ~10 minutes  
**Frequency:** Every PR, every merge to `main`  
**Limitations:** No real GitHub API calls in CI (dry-run mode only)

---

## Prerequisites

Before starting, ensure:

- [ ] GitHub CLI (`gh`) authenticated
- [ ] Node.js v18+ installed
- [ ] ARM dependencies installed (`npm install` in `arm-engine/`)
- [ ] Write access to:
  - Governance repo: `Hozyne-OpenBak/openclaw-core`
  - Target repo: `Hozyne-OpenBak/arm`
- [ ] Target repo has at least one outdated dependency (or manually downgrade one for testing)

**Verify authentication:**
```bash
gh auth status
```

**Verify test repo access:**
```bash
gh repo view Hozyne-OpenBak/arm
gh repo view Hozyne-OpenBak/openclaw-core
```

---

## 1. Unit Tests

**Purpose:** Validate individual components in isolation  
**Mode:** Automated (always run via `npm test`)  
**CI-suitable:** ✅ Yes

### 1.1 Scanner Tests
- [ ] Scanner parses `npm outdated` JSON output correctly
- [ ] Scanner handles empty output (no outdated dependencies)
- [ ] Scanner determines change type (patch/minor/major) correctly
- [ ] Scanner handles malformed version strings gracefully

**Command:**
```bash
cd arm-engine
npm test -- test/unit/scanner.test.js
```

**Expected:** All tests pass ✅

---

### 1.2 Filter Tests
- [ ] Filter applies patch/minor/major policy correctly
- [ ] Filter respects exclusion patterns (glob matching)
- [ ] Filter handles empty dependency list
- [ ] Filter produces correct recommended/excluded counts
- [ ] Filter summary formatting is readable

**Command:**
```bash
npm test -- test/unit/filter.test.js
```

**Expected:** All tests pass ✅

---

### 1.3 Story Creator Tests
- [ ] Story title generation includes package, ecosystem, versions
- [ ] Story body includes all required sections
- [ ] Story body correctly references Epic number
- [ ] Story body handles different change types (patch/minor/major)
- [ ] Dry-run mode returns mock Story without GitHub API call

**Command:**
```bash
npm test -- test/unit/story-creator.test.js
```

**Expected:** All tests pass ✅

---

### 1.4 PR Generator Tests
- [ ] Branch name generation is URL-safe and consistent
- [ ] PR title includes Story number
- [ ] PR body includes cross-repo Story reference (`Closes owner/repo#N`)
- [ ] PR body includes dependency details (package, versions, change type)
- [ ] Commit message follows convention
- [ ] Dry-run mode returns mock PR without GitHub API call

**Command:**
```bash
npm test -- test/unit/pr-generator.test.js
```

**Expected:** All tests pass ✅

---

### 1.5 All Unit Tests (Full Suite)
- [ ] All unit tests pass together
- [ ] No test timeouts or flakes
- [ ] Test coverage includes core logic

**Command:**
```bash
npm test
```

**Expected:** 
```
Test Suites: 4 passed, 4 total
Tests:       XX passed, XX total
```

---

## 2. Dry-Run Mode

**Purpose:** Validate end-to-end flow without creating real GitHub artifacts  
**Mode:** Manual  
**CI-suitable:** ✅ Yes (safe, no side effects)

### 2.1 Configuration Validation
- [ ] Config file exists: `arm-engine/arm.config.json`
- [ ] Config has required fields: `target.repository`, `governance.repository`, `governance.epicNumber`
- [ ] Config policy is set: `allowPatch`, `allowMinor`, `allowMajor`
- [ ] JSON syntax is valid (no parse errors)

**Command:**
```bash
cd arm-engine
node -e "require('./arm.config.json'); console.log('✓ Valid JSON')"
```

**Expected:** `✓ Valid JSON`

---

### 2.2 Dry-Run Execution
- [ ] Demo script runs without errors
- [ ] Scanner detects outdated dependencies
- [ ] Filter applies policy correctly
- [ ] Story preview shows correct title and body structure
- [ ] PR preview shows correct title and cross-repo reference
- [ ] No real GitHub issues/PRs created

**Command:**
```bash
cd arm-engine
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

**Validation:**
- [ ] Story title format: `Update <package> (<ecosystem>) from <current> to <wanted>`
- [ ] Story body includes Epic reference: `#13`
- [ ] PR body includes cross-repo reference: `Closes Hozyne-OpenBak/openclaw-core#999`

---

## 3. Integration Test (Real GitHub Artifacts)

**Purpose:** Validate complete workflow with real GitHub API calls  
**Mode:** Manual (requires cleanup after)  
**CI-suitable:** ❌ No (creates real issues/PRs; rate limits)

### 3.1 Pre-Flight Checks
- [ ] Target repo has outdated dependencies (or manually downgrade one)
- [ ] No existing open Story for same dependency
- [ ] No existing open PR for same dependency
- [ ] Git working directory is clean

**Command:**
```bash
# Check for outdated deps
cd /path/to/target/repo
npm outdated

# Check for existing Stories
gh issue list --repo Hozyne-OpenBak/openclaw-core --label story --state open

# Check for existing PRs
gh pr list --repo Hozyne-OpenBak/arm --state open
```

---

### 3.2 Run Integration Test
- [ ] Integration test script runs without errors
- [ ] Scanner finds at least one outdated dependency
- [ ] Filter recommends at least one update
- [ ] Story created in governance repo
- [ ] PR created in target repo
- [ ] Logs saved to `test/integration/test-run.log`
- [ ] Results saved to `test/integration/test-results.json`

**Command:**
```bash
cd arm-engine
node integration-test.js
```

**Expected output:**
```
🦞 ARM v1 Integration Test - Epic #13
Test ID: test-<timestamp>

Step 1: Scanning repository...
✅ Scan complete: Found 1 outdated dependencies

Step 2: Applying filter policy...
✅ Filter applied: 1 recommended, 0 excluded

Step 3: Creating Story in governance repository...
✅ Story created: #XX
   URL: https://github.com/Hozyne-OpenBak/openclaw-core/issues/XX

Step 4: Creating PR in target repository...
✅ PR created: #YY
   URL: https://github.com/Hozyne-OpenBak/arm/pull/YY

Step 5: Manual verification required
...
✅ Integration test setup complete!
```

---

### 3.3 Verify Story Artifact

**Navigate to Story URL from test output.**

**Story Metadata:**
- [ ] Story number matches output (e.g., `#26`)
- [ ] Story is in `openclaw-core` repository
- [ ] Story state is `Open`
- [ ] Story has labels: `story`, `type/task`, `status/draft`, `priority/p1`

**Story Content:**
- [ ] Title: `Update <package> (<ecosystem>) from <current> to <wanted>`
- [ ] Body includes Epic reference: `#13`
- [ ] Body includes target repository: `Hozyne-OpenBak/arm`
- [ ] Body includes dependency details table
- [ ] Body includes change type (Patch/Minor/Major)
- [ ] Body includes acceptance criteria checklist
- [ ] Body includes implementation notes
- [ ] Body includes generated timestamp

**Command (optional):**
```bash
gh issue view <STORY_NUMBER> --repo Hozyne-OpenBak/openclaw-core
```

---

### 3.4 Verify PR Artifact

**Navigate to PR URL from test output.**

**PR Metadata:**
- [ ] PR number matches output (e.g., `#1`)
- [ ] PR is in `arm` repository (target repo)
- [ ] PR state is `Open`
- [ ] PR base branch is `main`
- [ ] PR head branch follows naming convention: `arm/update-<package>-<version>`

**PR Content:**
- [ ] Title includes Story number: `[Story #XX] Update <package> from <current> to <wanted>`
- [ ] Body includes cross-repo Story reference: `Closes Hozyne-OpenBak/openclaw-core#XX`
- [ ] Body includes dependency details (package, versions, change type)
- [ ] Body includes "Changes" section (lists files changed)
- [ ] Body includes "Governance" section (links to Story and Epic)

**PR Files Changed:**
- [ ] `package.json` modified (version updated)
- [ ] `package-lock.json` modified (regenerated)
- [ ] No other files modified

**PR Validation Workflows:**
- [ ] `validate-story-reference` workflow passes ✅
- [ ] `auto-link` workflow completes (may pass or skip depending on setup)

**Command (optional):**
```bash
gh pr view <PR_NUMBER> --repo Hozyne-OpenBak/arm
gh pr checks <PR_NUMBER> --repo Hozyne-OpenBak/arm
gh pr diff <PR_NUMBER> --repo Hozyne-OpenBak/arm
```

---

### 3.5 Verify Cross-Repo Linking

**Purpose:** Confirm PR body correctly references Story using GitHub's cross-repo syntax.

**Check PR body for:**
- [ ] Contains line: `Closes Hozyne-OpenBak/openclaw-core#<STORY_NUMBER>`
- [ ] NOT just `Closes #<STORY_NUMBER>` (same-repo syntax)

**Command:**
```bash
gh pr view <PR_NUMBER> --repo Hozyne-OpenBak/arm --json body --jq .body
```

**Expected:** Body includes `Closes Hozyne-OpenBak/openclaw-core#XX`

---

### 3.6 Manual Merge and Auto-Closure Validation

**Purpose:** Validate that merging PR automatically closes Story via cross-repo reference.

**Steps:**
1. **Merge PR** (via GitHub UI or CLI):
   ```bash
   gh pr merge <PR_NUMBER> --repo Hozyne-OpenBak/arm --squash
   ```

2. **Wait 30-60 seconds** for GitHub automation to process

3. **Check Story status**:
   ```bash
   gh issue view <STORY_NUMBER> --repo Hozyne-OpenBak/openclaw-core --json state,closedAt
   ```

**Expected:**
```json
{
  "state": "CLOSED",
  "closedAt": "2026-02-18T13:30:21Z"
}
```

**Validation:**
- [ ] Story state changed to `CLOSED`
- [ ] Story shows "Closed by <user> via <PR link>" in timeline
- [ ] Story `closedAt` timestamp is recent (within last few minutes)

**If Story did NOT auto-close:**
- ⚠️ Check PR body syntax (must be `Closes owner/repo#N`, not `Closes #N`)
- ⚠️ Check GitHub webhook/automation delay (wait up to 5 minutes)
- ⚠️ Verify Story #24 fix was applied (uses `--body-file` for correct escaping)

---

### 3.7 Test Logs and Results

**Verify test artifacts were created:**
- [ ] `test/integration/test-run.log` exists and contains timestamped logs
- [ ] `test/integration/test-results.json` exists and is valid JSON
- [ ] Results JSON includes `testId`, `timestamp`, `steps`, `urls`, `success`
- [ ] Results JSON `success` field is `true`

**Command:**
```bash
cd arm-engine
ls -lh test/integration/test-run.log test/integration/test-results.json
cat test/integration/test-results.json | jq .success
```

**Expected:** `true`

---

## 4. Error Handling and Edge Cases

**Purpose:** Validate graceful failure and retry behaviors  
**Mode:** Manual (scenario-based testing)  
**CI-suitable:** ⚠️ Partial (some scenarios safe for CI)

### 4.1 No Outdated Dependencies

**Scenario:** Target repo has all dependencies up-to-date.

**Setup:**
```bash
# Ensure target repo is fully updated
cd /path/to/target/repo
npm update
git add package*.json
git commit -m "Update all dependencies for testing"
git push
```

**Test:**
```bash
cd arm-engine
node integration-test.js
```

**Expected output:**
```
❌ No outdated dependencies found. Test cannot proceed.
```

**Validation:**
- [ ] Script exits gracefully (no crash)
- [ ] Clear message indicates no dependencies found
- [ ] No Story or PR created

---

### 4.2 All Updates Filtered Out

**Scenario:** Scanner finds dependencies, but all are excluded by policy.

**Setup:** Set restrictive policy in `arm.config.json`:
```json
{
  "policy": {
    "allowPatch": false,
    "allowMinor": false,
    "allowMajor": false
  }
}
```

**Test:**
```bash
cd arm-engine
node demo.js --full
```

**Expected output:**
```
📊 Filter results: 0 recommended, X excluded
```

**Validation:**
- [ ] Script runs without errors
- [ ] All dependencies shown as excluded
- [ ] Exclusion reasons shown (e.g., "Patch updates not allowed")
- [ ] No Story or PR preview generated

**Cleanup:** Restore normal policy in `arm.config.json`

---

### 4.3 Duplicate Story Detection

**Scenario:** Story already exists for the same dependency update.

**Setup:** Run integration test once (creates Story #XX).

**Test:** Run integration test again **without merging the PR**.

**Expected output:**
```
Step 3: Creating Story in governance repository...
⚠️  Story already exists: #XX
   Using existing Story for test: https://...
```

**Validation:**
- [ ] Existing Story reused (no duplicate created)
- [ ] New PR created referencing existing Story
- [ ] Message clearly indicates Story was reused

**Cleanup:** Close Story and PR manually, or merge PR to clean up.

---

### 4.4 Duplicate PR Detection

**Scenario:** PR already exists for the same dependency update.

**Setup:** Run integration test once (creates PR #YY).

**Test:** Run integration test again **without merging the PR**.

**Expected output:**
```
Step 4: Creating PR in target repository...
✓ Found existing PR: #YY
⚠️  PR already exists: #YY
   Using existing PR for test: https://...
```

**Validation:**
- [ ] Existing PR reused (no duplicate created)
- [ ] Message clearly indicates PR was reused
- [ ] No new branch created

**Cleanup:** Close PR and delete branch:
```bash
gh pr close <PR_NUMBER> --repo Hozyne-OpenBak/arm
git push origin --delete arm/update-<package>-<version>
```

---

### 4.5 Git Authentication Failure

**Scenario:** GitHub CLI not authenticated.

**Setup:**
```bash
gh auth logout
```

**Test:**
```bash
cd arm-engine
node integration-test.js
```

**Expected:**
- [ ] Script fails with clear error message
- [ ] Error mentions authentication or GitHub API
- [ ] Does not crash silently

**Cleanup:**
```bash
gh auth login
```

---

### 4.6 Missing Repository Access

**Scenario:** User lacks write access to governance repo.

**Setup:** Use GitHub account without write access to `openclaw-core` (if available for testing).

**Test:**
```bash
cd arm-engine
node integration-test.js
```

**Expected:**
- [ ] Script fails at Story creation step
- [ ] Error message mentions permissions or access denied
- [ ] Partial artifacts (scan + filter) complete successfully

---

### 4.7 Malformed Configuration

**Scenario:** Invalid `arm.config.json`.

**Setup:** Temporarily corrupt config:
```bash
cd arm-engine
echo "{ invalid json" > arm.config.json
```

**Test:**
```bash
node -e "require('./arm.config.json')"
```

**Expected:**
- [ ] JSON parse error thrown
- [ ] Clear error message with line/column number

**Cleanup:** Restore valid config from version control:
```bash
git checkout arm.config.json
```

---

### 4.8 npm outdated Failure

**Scenario:** `npm outdated` command fails (e.g., no `package.json` in target repo).

**Setup:** Temporarily rename `package.json` in cloned workspace:
```bash
mv /tmp/arm-workspace/arm/package.json /tmp/arm-workspace/arm/package.json.bak
```

**Test:**
```bash
cd arm-engine
node integration-test.js
```

**Expected:**
- [ ] Scanner throws error: "No package.json found in <repo>"
- [ ] Script exits gracefully
- [ ] Clear error message

**Cleanup:**
```bash
mv /tmp/arm-workspace/arm/package.json.bak /tmp/arm-workspace/arm/package.json
```

---

### 4.9 No Changes After npm install

**Scenario:** Package version in `package.json` is updated, but `npm install` produces no changes (edge case: package already at target version).

**Expected behavior:**
- [ ] PR generator detects no changes via `git status --porcelain`
- [ ] PR generator logs: "No changes detected after npm install. Skipping commit and push."
- [ ] PR generator cleans up feature branch
- [ ] No PR created (returns `null`)

**Note:** This scenario is rare in practice but handled gracefully in code (see `pr-generator.js:applyChanges`).

---

## 5. Idempotency Validation

**Purpose:** Verify ARM can be safely run multiple times without creating duplicates  
**Mode:** Manual (scenario-based testing)  
**CI-suitable:** ❌ No (requires real GitHub artifacts)

### 5.1 Idempotent Scan
- [ ] Running scan multiple times produces consistent results
- [ ] Scanner detects same outdated dependencies on repeated runs
- [ ] No side effects (no files modified)

**Test:**
```bash
cd arm-engine
node demo.js --scan
node demo.js --scan
# Compare outputs - should be identical
```

---

### 5.2 Idempotent Story Creation
- [ ] Running story creation with existing Story reuses it
- [ ] No duplicate Stories created
- [ ] Story number remains consistent

**Test:** See section 4.3 (Duplicate Story Detection)

---

### 5.3 Idempotent PR Creation
- [ ] Running PR creation with existing PR reuses it
- [ ] No duplicate PRs created
- [ ] PR branch is not recreated

**Test:** See section 4.4 (Duplicate PR Detection)

---

### 5.4 Full Integration Test Idempotency
- [ ] Running full integration test twice reuses artifacts
- [ ] Second run completes successfully with reused Story/PR
- [ ] No errors or warnings beyond "already exists" messages

**Test:**
```bash
cd arm-engine
node integration-test.js  # First run
node integration-test.js  # Second run - should reuse artifacts
```

**Expected second run output:**
```
Step 3: Creating Story...
⚠️  Story already exists: #XX

Step 4: Creating PR...
✓ Found existing PR: #YY
```

**Cleanup:** Manually close Story/PR after testing.

---

## 6. GitHub Actions CI Validation

**Purpose:** Validate GitHub Actions workflow for PR validation  
**Mode:** Automated (GitHub Actions)  
**CI-suitable:** ✅ Yes

### 6.1 Workflow File Exists
- [ ] `.github/workflows/validate-story-reference.yml` exists
- [ ] Workflow is enabled (not disabled in GitHub settings)

**Command:**
```bash
cd arm-engine
ls -lh .github/workflows/validate-story-reference.yml
```

---

### 6.2 Workflow Triggers on PR Events
- [ ] Workflow triggers on `pull_request` opened/edited/reopened
- [ ] Workflow runs for target repo (`Hozyne-OpenBak/arm`)

**Validation:** Open/edit any PR and verify workflow runs automatically.

---

### 6.3 Story Reference Validation Logic
- [ ] Workflow searches PR body for Story reference
- [ ] Workflow validates cross-repo syntax: `owner/repo#N`
- [ ] Workflow passes if reference found ✅
- [ ] Workflow fails if reference missing ❌

**Test:**
1. Create test PR with correct reference:
   ```
   Closes Hozyne-OpenBak/openclaw-core#13
   ```
   **Expected:** Workflow passes ✅

2. Create test PR without reference:
   ```
   This PR updates express.
   ```
   **Expected:** Workflow fails ❌

**Command:**
```bash
gh pr checks <PR_NUMBER> --repo Hozyne-OpenBak/arm
```

---

### 6.4 Workflow Logs
- [ ] Workflow logs are accessible via GitHub UI
- [ ] Logs show validation steps clearly
- [ ] Failure logs indicate why validation failed

**Access:** GitHub UI → Actions tab → Select workflow run → View logs

---

## 7. Documentation Validation

**Purpose:** Ensure documentation reflects actual behavior  
**Mode:** Manual (cross-reference testing)  
**CI-suitable:** ⚠️ Partial (linting only)

### 7.1 README Quick Start
- [ ] Quick Start instructions work end-to-end
- [ ] Configuration example is valid JSON
- [ ] Example commands run without errors
- [ ] Expected outputs match actual outputs

**Test:** Follow README Quick Start from scratch.

---

### 7.2 RUNBOOK Execution Workflows
- [ ] Manual execution workflow steps are complete
- [ ] Dry-run mode instructions work
- [ ] Production mode instructions work
- [ ] Troubleshooting section covers observed failures

**Test:** Follow RUNBOOK manual execution workflow.

---

### 7.3 Integration Test README
- [ ] Integration test README matches actual test script behavior
- [ ] Manual verification steps are complete and correct
- [ ] Expected outputs match actual script outputs

**Test:** Run integration test and cross-reference with `test/integration/README.md`.

---

### 7.4 Configuration Schema
- [ ] `config.schema.json` validates `arm.config.json` correctly
- [ ] Schema includes all required fields
- [ ] Schema defaults match code defaults

**Test:**
```bash
cd arm-engine
npm install ajv-cli -g
ajv validate -s config.schema.json -d arm.config.json
```

**Expected:** Validation success ✅

---

## 8. Regression Checks (Post-Change)

**Purpose:** Run after code changes to detect regressions  
**Mode:** Manual (run full checklist)  
**CI-suitable:** ⚠️ Partial (unit tests + dry-run only)

**After any code change to ARM v1:**
- [ ] All unit tests pass (section 1)
- [ ] Dry-run mode works (section 2)
- [ ] Integration test completes successfully (section 3)
- [ ] No new errors or warnings in logs
- [ ] Story/PR artifacts still correctly formatted

**Recommended regression subset (fast check):**
```bash
cd arm-engine
npm test                    # Unit tests
node demo.js --full         # Dry-run
node integration-test.js    # Integration test
```

**Full regression:** Run entire checklist (sections 1-7).

---

## 9. CI/CD Pipeline Validation

**Purpose:** Validate automated testing in GitHub Actions  
**Mode:** Automated (GitHub Actions)  
**CI-suitable:** ✅ Yes

### 9.1 CI Workflow on PR
- [ ] Unit tests run automatically on every PR
- [ ] Dry-run demo runs in CI (no side effects)
- [ ] Linting checks pass (if configured)
- [ ] CI results reported to PR status checks

**Trigger:** Open any PR in `arm-engine/` repo.

**Expected:** All CI checks pass ✅

---

### 9.2 CI Workflow on Merge to Main
- [ ] Same checks run on merge to `main`
- [ ] Additional post-merge validations (if any)

**Trigger:** Merge any PR to `main`.

**Expected:** All CI checks pass ✅

---

### 9.3 CI Logs and Artifacts
- [ ] CI logs accessible from GitHub Actions tab
- [ ] Test results visible in CI output
- [ ] No secrets leaked in logs

**Access:** GitHub UI → Actions tab → Select workflow run

---

## 10. Observable Outputs Summary

**Purpose:** Document what operators can observe and where  
**Mode:** Reference (not a test)

### 10.1 Scanner Outputs
- **Location:** Console logs, test results JSON
- **Format:** `DependencyReport` object with `scannedAt`, `repository`, `dependencies[]`
- **Observables:**
  - Timestamp of scan
  - List of outdated packages with current/wanted/latest versions
  - Change type classification (patch/minor/major)

---

### 10.2 Filter Outputs
- **Location:** Console logs, demo output
- **Format:** `FilterResults` object with `recommended[]`, `excluded[]`
- **Observables:**
  - Count of recommended updates
  - Count of excluded updates
  - Exclusion reasons for each filtered-out dependency

---

### 10.3 Story Outputs
- **Location:** GitHub Issues, console logs, test results JSON
- **Format:** `Story` object with `number`, `title`, `url`
- **Observables:**
  - Story issue number (e.g., `#26`)
  - Story URL (GitHub issue link)
  - Story metadata (labels, Epic reference, state)
  - Story body content (rendered in GitHub UI)

---

### 10.4 PR Outputs
- **Location:** GitHub Pull Requests, console logs, test results JSON
- **Format:** `PR` object with `number`, `url`, `branch`, `storyNumber`
- **Observables:**
  - PR number (e.g., `#1`)
  - PR URL (GitHub PR link)
  - PR branch name (e.g., `arm/update-express-4-22-1`)
  - PR metadata (base/head, state, validation workflow results)
  - PR files changed (`package.json`, `package-lock.json`)

---

### 10.5 Test Logs
- **Location:** `test/integration/test-run.log`
- **Format:** Timestamped text log
- **Observables:**
  - Full execution trace
  - Success/failure messages for each step
  - URLs of created artifacts

---

### 10.6 Test Results JSON
- **Location:** `test/integration/test-results.json`
- **Format:** Structured JSON
- **Observables:**
  - Test ID, timestamp
  - Step-by-step results with status
  - URLs of Story and PR
  - Overall success boolean

---

## 11. Validation Summary Report

**Purpose:** Template for reporting validation results  
**Mode:** Manual (fill out after completing checklist)

---

### Validation Report Template

```markdown
# ARM v1 Validation Report

**Date:** YYYY-MM-DD  
**Operator:** [Your Name]  
**ARM Version:** [commit hash or version tag]  
**Target Repo:** Hozyne-OpenBak/arm  
**Governance Repo:** Hozyne-OpenBak/openclaw-core  

## Results

### 1. Unit Tests
- Status: ✅ Pass / ❌ Fail
- Tests run: X passed, Y total
- Notes: [Any failures or warnings]

### 2. Dry-Run Mode
- Status: ✅ Pass / ❌ Fail
- Dependencies found: X
- Recommended updates: Y
- Notes: [Anything unexpected]

### 3. Integration Test
- Status: ✅ Pass / ❌ Fail
- Story created: #XX ([URL])
- PR created: #YY ([URL])
- Story auto-closed after merge: ✅ Yes / ❌ No
- Notes: [Manual verification results]

### 4. Error Handling
- Scenarios tested: [List scenarios from section 4]
- Failures handled gracefully: ✅ Yes / ❌ No
- Notes: [Any unexpected errors]

### 5. Idempotency
- Duplicate detection works: ✅ Yes / ❌ No
- Safe to run multiple times: ✅ Yes / ❌ No
- Notes: [Any duplicate artifacts created]

### 6. CI Validation
- Workflows run: ✅ Yes / ❌ No
- Checks passing: ✅ Yes / ❌ No
- Notes: [CI results]

### 7. Documentation
- README accurate: ✅ Yes / ❌ No
- RUNBOOK accurate: ✅ Yes / ❌ No
- Notes: [Any discrepancies]

## Conclusion

✅ ARM v1 is validated and ready for production  
❌ Issues found - see notes above  
⚠️ Partial validation - see notes above  

**Signed off by:** [Your Name]  
**Date:** YYYY-MM-DD
```

---

## 12. CI Automation Strategy

**Purpose:** Define what to automate in CI vs. manual validation  
**Mode:** Reference (implementation guidance)

### CI-Suitable Checks (Automate)
- ✅ All unit tests (section 1)
- ✅ Dry-run mode execution (section 2)
- ✅ Configuration validation (section 2.1)
- ✅ Linting and code formatting
- ✅ Documentation link checking

### Manual-Only Checks (Cannot Automate)
- ❌ Integration test with real GitHub artifacts (section 3)
- ❌ Story/PR manual verification (sections 3.3, 3.4)
- ❌ Manual merge and auto-closure validation (section 3.6)
- ❌ Duplicate detection (requires pre-existing artifacts)
- ❌ Full regression testing (time-intensive)

### Hybrid Checks (Automate Subset)
- ⚠️ Error handling: Automate safe scenarios (e.g., malformed config), manual for GitHub API failures
- ⚠️ Documentation validation: Automate link checking, manual for accuracy

---

## 13. Checklist Maintenance

**Purpose:** Keep this checklist up-to-date as ARM evolves

### When to Update This Checklist
- New features added to ARM (post-MVP)
- Behaviors change (e.g., new retry logic)
- Documentation updated (e.g., new runbook sections)
- Bugs fixed that require new validation steps

### Checklist Versioning
- Version number matches ARM release (e.g., 1.0.0, 1.1.0)
- Breaking changes increment major version
- New test sections increment minor version

### Review Cadence
- Review after each Story completion
- Full review before each production deployment
- Update checklist as part of documentation tasks

---

## Appendix A: Quick Reference Commands

```bash
# Prerequisites
gh auth status
npm install

# Unit tests
npm test
npm test -- test/unit/scanner.test.js  # Single suite

# Dry-run
node demo.js --full

# Integration test
node integration-test.js

# View artifacts
gh issue view <STORY_NUMBER> --repo Hozyne-OpenBak/openclaw-core
gh pr view <PR_NUMBER> --repo Hozyne-OpenBak/arm
gh pr checks <PR_NUMBER> --repo Hozyne-OpenBak/arm

# Cleanup
gh issue close <STORY_NUMBER> --repo Hozyne-OpenBak/openclaw-core
gh pr close <PR_NUMBER> --repo Hozyne-OpenBak/arm
git push origin --delete arm/update-<package>-<version>
```

---

## Appendix B: Behavior Mappings

| Feature | Documented In | Test Section |
|---------|--------------|--------------|
| Scan outdated dependencies | README, ARCHITECTURE | 1.1, 2.2, 3.2 |
| Filter by policy | README, ARCHITECTURE | 1.2, 2.2, 4.2 |
| Create Story issue | ARCHITECTURE, GOVERNANCE | 1.3, 2.2, 3.3 |
| Create PR with Story ref | ARCHITECTURE, GOVERNANCE | 1.4, 2.2, 3.4 |
| Dry-run mode | README, RUNBOOK | 2.2 |
| Duplicate Story detection | Story #33 | 4.3, 5.2 |
| Duplicate PR detection | Story #33 | 4.4, 5.3 |
| Cross-repo auto-closure | GOVERNANCE, RUNBOOK | 3.5, 3.6 |
| Error handling | RUNBOOK (Troubleshooting) | 4.x |
| Idempotency | Story #33 | 5.x |
| PR validation workflow | Story #31, GOVERNANCE | 6.x |

---

## Appendix C: Known Limitations

**ARM v1 MVP intentionally excludes:**

1. **Auto-merge** — All PRs require manual review and merge (safety constraint)
2. **Multi-ecosystem support** — Only Node.js dependencies in MVP (Python, Ruby, etc. planned for post-MVP)
3. **Retry logic for transient failures** — Network/API failures are not automatically retried (operator must re-run)
4. **Rollback automation** — Failed updates require manual revert
5. **Dependency conflict resolution** — Complex lockfile conflicts require manual intervention
6. **Real-time CI integration** — Integration test creates real artifacts (not suitable for PR CI)
7. **Scheduled/cron execution** — Manual trigger only (Story mentions cron support as future enhancement)

**These are not test failures** — they are out-of-scope for MVP.

---

## Appendix D: Success Criteria

**ARM v1 is considered validated when:**

- ✅ All unit tests pass (section 1)
- ✅ Dry-run mode executes without errors (section 2)
- ✅ Integration test creates Story and PR successfully (section 3.2-3.4)
- ✅ Cross-repo Story reference syntax is correct (section 3.5)
- ✅ Story auto-closes after PR merge (section 3.6)
- ✅ Duplicate detection prevents duplicate Stories/PRs (sections 4.3, 4.4)
- ✅ No critical bugs in error handling (section 4)
- ✅ Documentation matches actual behavior (section 7)

**Blockers (must fix before production use):**
- ❌ Unit test failures
- ❌ Integration test fails to create Story or PR
- ❌ Story does not auto-close after PR merge (cross-repo linking broken)
- ❌ Duplicate Stories/PRs created on repeated runs

**Non-blockers (acceptable for MVP):**
- ⚠️ Transient GitHub API failures (retry manually)
- ⚠️ Edge case errors with clear messages
- ⚠️ Performance optimizations not yet implemented

---

**End of Testing Checklist**  
**Version:** 1.0.0  
**Story:** [#36](https://github.com/Hozyne-OpenBak/openclaw-core/issues/36)  
**Epic:** [#30](https://github.com/Hozyne-OpenBak/openclaw-core/issues/30)  
**Maintainer:** ARM v1 Team  
**Last Updated:** 2026-02-18
