# ARM v1 Governance Integration

**Version:** 1.0.0  
**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Governance Model:** v3

---

## Overview

ARM v1 operates within the OpenClaw Governance Model v3 framework, ensuring all dependency updates follow formal governance processes. This document describes how ARM integrates with governance workflows, Story/PR lifecycle, and failure scenarios.

---

## Governance Model v3 Compliance

### Core Principles

ARM adheres to all Governance Model v3 requirements:

1. **No direct commits to main** — All changes via PRs
2. **Story-driven development** — Every PR references a Story
3. **Epic tracking** — All Stories link to parent Epic
4. **Status transitions** — Stories progress through defined states
5. **Human oversight** — No automated merges (v1)
6. **Audit trail** — Full GitHub issue/PR history

---

## Two-Repository Architecture

ARM operates across two repositories with distinct roles:

### Governance Repository (openclaw-core)

**Purpose:** Central governance and planning

**ARM creates:**
- **Story issues** for each dependency update
- Epic tracking (e.g., Epic #13: ARM v1)

**ARM reads:**
- Epic number (from config)
- Existing Stories (duplicate detection)

**Permissions required:**
- Write access to create issues
- Read access to search issues

**Example:** `Hozyne-OpenBak/openclaw-core`

---

### Target Repository (arm, etc.)

**Purpose:** Code changes and dependency updates

**ARM creates:**
- **Pull Requests** with dependency updates
- **Branches** following naming convention: `arm/update-<package>-<version>`
- **Commits** updating `package.json` and lock files

**ARM reads:**
- Current dependency versions (`package.json`)
- Existing PRs (duplicate detection)

**Permissions required:**
- Write access to create branches and PRs
- Read access to scan dependencies

**Example:** `Hozyne-OpenBak/arm`

---

## Cross-Repository Linking

### GitHub Issue Reference Syntax

ARM uses GitHub's cross-repository issue linking to connect PRs in the target repo with Stories in the governance repo.

**Syntax:**
```
Closes owner/repository#issue_number
```

**Example:**
```
Closes Hozyne-OpenBak/openclaw-core#26
```

**Why cross-repo syntax is required:**

GitHub's issue keywords (`Closes`, `Fixes`, `Resolves`) default to the same repository:
- `Closes #26` → Closes issue #26 **in the same repo as the PR**
- `Closes owner/repo#26` → Closes issue #26 **in the specified repo**

ARM PRs live in the **target repo** (e.g., `arm`) but reference Stories in the **governance repo** (e.g., `openclaw-core`), requiring the full syntax.

### Auto-Close Behavior

When a PR with cross-repo reference is **merged**:

1. GitHub parses PR body for `Closes owner/repo#N`
2. GitHub closes issue #N in `owner/repo`
3. GitHub adds timeline entry: "closed by PR #X in other-owner/other-repo"
4. Story state transitions to `CLOSED`
5. Story `stateReason` set to `COMPLETED`

**Timing:** Usually within 30-60 seconds of PR merge

**Verification:**
```bash
gh issue view <STORY_NUMBER> --repo owner/governance-repo \
  --json state,closedAt,closedByPullRequestsReferences
```

---

## Story Lifecycle

### 1. Story Creation (Automated)

**Triggered by:** ARM scan detecting outdated dependency

**Process:**
1. ARM runs `npm outdated` on target repo
2. Filter applies update policy
3. ARM checks for existing Story (duplicate detection)
4. If no existing Story, ARM creates new Story via `gh issue create`

**Story template:**
```markdown
## Story: Update <package> from <current> to <wanted>

### Epic
#<epicNumber> — ARM v1: Autonomous Repo Maintenance (MVP)

### Objective
Update `<package>` dependency in `<targetRepo>` to address outdated Node.js package.

### Target Repository
`<targetRepo>`

### Change Details
- Package: <package>
- Ecosystem: Node.js
- Current version: <current>
- Target version: <wanted>
- Latest version: <latest>
- Change type: <Patch|Minor|Major>
- Location: dependencies

### Goals
- Update package to recommended version
- Maintain compatibility (minor update only)
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
- [ ] Update package manifest
- [ ] Regenerate lock file
- [ ] Run basic smoke tests (if available)
- [ ] Create PR with Story reference
- [ ] Link PR to this Story

### Implementation Notes
**Change type:** <type> update (<current> → <wanted>)  
**Note:** Latest version is <latest>, but <wanted> is recommended based on current version constraints.

### PR Link
*Will be added when PR is created*

---
**Status:** Draft  
**Automated:** true  
**Generated by:** ARM v1  
**Scanned at:** <timestamp>
```

**Labels applied:**
- `story` — Story issue type
- `type/task` — Task work type
- `status/draft` — Initial draft state
- `priority/p1` — High priority

**Note:** `agent/lead_engineer` label was removed in Story #24 (doesn't exist in all repos)

---

### 2. Story Draft State

**Status label:** `status/draft`

**Characteristics:**
- Story created but PR not yet created
- Waiting for PR generation step
- Human can review Story before PR is created

**Transitions to:** `status/in-progress` (when PR created)

---

### 3. Story In-Progress State

**Status label:** `status/in-progress`

**Triggered by:** PR creation (via `update-story-status` workflow)

**Characteristics:**
- PR has been created and linked to Story
- Story is actively being worked
- Awaiting human review and merge

**Transitions to:** `status/completed` (when PR merged)

---

### 4. Story Completion

**Status label:** `status/completed`

**Triggered by:** PR merge (via GitHub cross-repo auto-close + workflow)

**Characteristics:**
- PR merged in target repo
- Story automatically closed by GitHub
- `stateReason` set to `COMPLETED`

**Final state:** Story closed, no further action needed

---

## PR Lifecycle

### 1. PR Creation (Automated)

**Triggered by:** Story creation + successful filter

**Process:**
1. ARM clones target repository
2. ARM creates feature branch: `arm/update-<package>-<version>`
3. ARM updates `package.json` with new version
4. ARM runs `npm install` to regenerate `package-lock.json`
5. ARM commits changes
6. ARM pushes branch to origin
7. ARM creates PR via `gh pr create`

**PR template:**
```markdown
## Update <package> from <current> to <wanted>

### Story
Closes <governanceRepo>#<storyNumber>

### Change Summary
Updates `<package>` dependency to address outdated version.

- Package: <package>
- Current: <current>
- Target: <wanted>
- Latest: <latest>
- Change type: <type>

**Note:** Latest version is <latest>, but <wanted> is recommended based on current version constraints.

### Changes
- `package.json`: Updated `<package>` version
- `package-lock.json`: Regenerated via `npm install`

### Testing
- [x] package-lock.json regenerated
- [x] No breaking changes (minor/patch update only)
- [ ] Manual review recommended for dependency tree changes

### Governance
- Story: <governanceRepo>#<storyNumber>
- Epic: [#<epicNumber>](<epicUrl>)
- Automated: true
- Generated by: ARM v1

---
**Status:** Draft  
**Requires:** Human review and approval before merge
```

**PR title format:**
```
[Story #<storyNumber>] Update <package> from <current> to <wanted>
```

**Branch naming convention:**
```
arm/update-<package>-<version>
```

**Example:** `arm/update-express-4-22-1`

---

### 2. PR Validation (Automated)

**Triggered by:** PR creation

**Workflows:**

#### auto-link
- Links PR to Story in governance repo
- Validates cross-repo reference syntax
- Updates Story with PR link

#### validate-story-reference
- Ensures PR body includes `Closes <repo>#<number>`
- Fails if Story reference missing or malformed
- Required for merge

#### update-story-status
- Transitions Story from `status/draft` to `status/in-progress`
- Adds `status/in-progress` label to Story
- Tracks PR lifecycle

**All workflows must pass before merge.**

---

### 3. Human Review (Manual)

**Required steps:**

1. **Review Story** in governance repo
   - Verify dependency update is safe
   - Check change type (patch/minor/major)
   - Confirm no breaking changes expected

2. **Review PR** in target repo
   - Inspect `package.json` changes
   - Verify `package-lock.json` regenerated correctly
   - Check for unexpected dependency tree changes
   - Review any failing tests

3. **Approve or request changes**
   - If safe: Approve PR in GitHub UI
   - If concerns: Request changes, comment, or close PR

**No automated merge:** Human must click "Merge pull request" (v1 constraint)

---

### 4. PR Merge (Manual)

**Process:**
1. Human reviews and approves PR
2. Human clicks "Merge pull request" (or uses `gh pr merge`)
3. GitHub merges PR into target repo main branch
4. GitHub triggers post-merge workflows

**Recommended merge method:** Squash merge (cleaner history)

---

### 5. Post-Merge (Automated)

**GitHub auto-close:**
1. PR body contains `Closes <governanceRepo>#<storyNumber>`
2. PR is merged
3. GitHub parses PR body, identifies cross-repo reference
4. GitHub closes Story in governance repo
5. GitHub sets `closedByPullRequestsReferences` metadata
6. Story transitions to `status/completed` (if workflow exists)

**Timeline entry added to Story:**
```
This was referenced <timestamp>
<user> merged PR #<prNumber> in <targetRepo>
```

---

## Governance Workflows

ARM integrates with three governance automation workflows in `openclaw-core`:

### auto-link

**File:** `.github/workflows/auto-link.yml`

**Purpose:** Links PRs to Stories

**Triggers:**
- PR opened
- PR synchronized (new commits)

**Actions:**
1. Parses PR body for Story references
2. Adds comment linking to Story
3. Updates Story with PR link (if possible)

**Required for:** Cross-repo visibility

---

### validate-story-reference

**File:** `.github/workflows/validate-story-reference.yml`

**Purpose:** Enforces Story reference in PR body

**Triggers:**
- PR opened
- PR synchronized
- PR edited

**Validation:**
- Checks PR title includes `[Story #<N>]`
- Checks PR body includes `Closes #<N>` or `Closes <repo>#<N>`
- Fails if missing or malformed

**Required for:** Governance compliance

**ARM-specific:** Must use cross-repo syntax `Closes <repo>#<N>`

---

### update-story-status

**File:** `.github/workflows/update-story-status.yml`

**Purpose:** Transitions Story status labels

**Triggers:**
- PR opened → Story moves to `status/in-progress`
- PR merged → Story moves to `status/completed`
- PR closed → Story moves back to `status/draft`

**Labels managed:**
- `status/draft`
- `status/in-progress`
- `status/completed`

**Required for:** Status tracking

---

## Label Management

### Story Labels

Applied at Story creation:

| Label | Color | Description | Required |
|-------|-------|-------------|----------|
| `story` | Blue | Story issue type | ✅ |
| `type/task` | Gray | Task work type | ✅ |
| `status/draft` | Gray | Initial draft state | ✅ |
| `priority/p1` | Yellow | High priority | ✅ |

Applied by workflows:

| Label | Color | Description | Applied By |
|-------|-------|-------------|-----------|
| `status/in-progress` | Yellow | PR created, work active | update-story-status |
| `status/completed` | Green | PR merged, work done | update-story-status |

---

### PR Labels

ARM does not apply labels to PRs (v1). Labels can be added manually by reviewers.

**Future enhancement:** Apply `arm/automated`, `dependency/minor`, `docs-only` labels

---

## Failure Scenarios & Remediation

### Scenario 1: Story Created, PR Creation Failed

**Symptoms:**
- Story exists in governance repo
- No PR exists in target repo
- ARM error during PR creation

**Remediation:**

**Option A: Re-run ARM**
```bash
cd arm
node integration-test.js
```
ARM will detect existing Story and reuse it, creating only the PR.

**Option B: Manual PR creation**
1. Close ARM-generated Story with comment
2. Manually create branch and PR
3. Reference Story in PR body: `Closes <repo>#<storyNumber>`

**Option C: Close Story and retry**
1. Close Story: `gh issue close <N> --repo <governance-repo>`
2. Re-run ARM (will create new Story and PR)

---

### Scenario 2: PR Created, Validation Failed

**Symptoms:**
- PR exists in target repo
- Story exists in governance repo
- `validate-story-reference` workflow failed

**Cause:** PR body missing or malformed Story reference

**Remediation:**
1. Edit PR body in GitHub UI
2. Add correct reference: `Closes <governanceRepo>#<storyNumber>`
3. Workflows will re-run automatically
4. Verify `validate-story-reference` passes

---

### Scenario 3: PR Merged, Story Didn't Auto-Close

**Symptoms:**
- PR merged in target repo
- Story still open in governance repo

**Cause:** Cross-repo reference syntax incorrect

**Remediation:**

**Verify PR body includes:**
```
Closes <governanceRepo>#<storyNumber>
```

**Not:**
```
Closes #<storyNumber>  ❌ (wrong: references same repo)
```

**Manual fix:**
1. Manually close Story: `gh issue close <N> --repo <governance-repo>`
2. Add comment: "Closed manually, linked to PR #X"
3. Optionally: Edit PR body and re-merge (if possible)

---

### Scenario 4: Duplicate Stories Created

**Symptoms:**
- Multiple Stories exist for same dependency update

**Cause:** ARM run multiple times without duplicate detection active

**Remediation:**
1. Identify oldest Story (keep this one)
2. Close duplicate Stories with comment: "Duplicate of #<original>"
3. Ensure duplicate detection works:
   ```javascript
   const existing = await storyCreator.findExistingStory(dep);
   ```

---

### Scenario 5: PR Merged, Breaking Change Introduced

**Symptoms:**
- PR merged successfully
- Target repo tests failing or runtime errors

**Cause:** Dependency update introduced breaking changes (policy misconfiguration or unexpected behavior)

**Remediation:**

**Immediate:**
1. Revert merge: `git revert <merge-sha>`
2. Push revert: `git push`
3. Update Story with revert commit link

**Follow-up:**
1. Investigate why update caused issues
2. Review policy configuration (`allowMajor`, `allowMinor`)
3. Add package to `excludePatterns` if needed
4. Document findings in Story

**Policy adjustment example:**
```json
{
  "policy": {
    "excludePatterns": ["express", "breaking-package"]
  }
}
```

---

## Best Practices

### For Operators

✅ **Always review Stories before merging PRs**
- Check dependency changelog for breaking changes
- Verify version number is as expected
- Confirm change type matches policy

✅ **Monitor workflow runs**
- Ensure all three workflows pass (auto-link, validate, update-status)
- Investigate failed workflows immediately

✅ **Use squash merge**
- Cleaner git history
- Easier to revert if needed
- Single commit per dependency update

✅ **Document exceptions**
- If closing Story without merging PR, add comment explaining why
- If manually overriding policy, document rationale

---

### For Governance Admins

✅ **Keep Epic #13 up to date**
- Link all ARM-generated Stories to Epic
- Close Epic when all Stories complete
- Document lessons learned

✅ **Maintain label consistency**
- Ensure required labels exist in governance repo
- Update label colors/descriptions as needed
- Document label meanings

✅ **Review ARM activity regularly**
- Check Story creation rate (avoid spam)
- Monitor PR merge rate (low rate may indicate issues)
- Audit closed Stories for quality

---

### For Repository Maintainers

✅ **Configure branch protection**
- Require PR reviews before merge
- Require status checks to pass
- Prevent force pushes

✅ **Keep workflows up to date**
- Sync governance workflows from openclaw-core
- Test workflow changes in separate branches
- Document workflow behavior

✅ **Set up notifications**
- Subscribe to ARM PRs (GitHub notifications)
- Set up Slack/Discord webhooks for PR activity
- Monitor Story creation in governance repo

---

## Audit & Compliance

### Audit Trail

Every ARM action leaves a GitHub audit trail:

1. **Story creation:** Issue #N created by @user
2. **PR creation:** PR #X opened by @user, references Issue #N
3. **Validation:** Workflow runs visible in Actions tab
4. **Review:** PR comments, approvals, change requests
5. **Merge:** PR merged by @user, commit SHA recorded
6. **Auto-close:** Story closed by PR #X, timeline entry added

**Query audit trail:**
```bash
# Story timeline
gh issue view <N> --repo <governance-repo> --json timeline

# PR timeline
gh pr view <X> --repo <target-repo> --json timeline

# Workflow runs
gh run list --repo <repo> --workflow <workflow.yml>
```

---

### Compliance Checks

**Verify governance compliance:**

1. **All PRs reference Stories:**
   ```bash
   gh pr list --repo <target-repo> --json number,body \
     | jq '.[] | select(.body | contains("Closes") | not)'
   ```
   Expected: Empty (all PRs have Story reference)

2. **All Stories linked to Epic:**
   ```bash
   gh issue list --repo <governance-repo> --label story --json number,body \
     | jq '.[] | select(.body | contains("#13") | not)'
   ```
   Expected: Empty (all Stories reference Epic #13)

3. **All Stories closed by PRs:**
   ```bash
   gh issue list --repo <governance-repo> --label story --state closed --json number,closedByPullRequestsReferences \
     | jq '.[] | select(.closedByPullRequestsReferences | length == 0)'
   ```
   Expected: Empty (all closed Stories have linked PRs)

---

## Configuration Reference

### Governance-Related Config

```json
{
  "governance": {
    "repository": "owner/governance-repo",
    "epicNumber": 13
  }
}
```

**Fields:**
- `repository` — Governance repo for Story creation (owner/name format)
- `epicNumber` — Epic to link Stories to (must exist in governance repo)

**Validation:**
- Repository must be accessible via GitHub CLI
- Epic must exist and be open
- User must have write access

---

## Appendix: GitHub API Resources

### Issues

- [Linking a PR to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)
- [Closing issues using keywords](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword)

### Pull Requests

- [About pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)
- [Merging a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request)

### Workflows

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-18  
**Story:** [#19](https://github.com/Hozyne-OpenBak/openclaw-core/issues/19)  
**Epic:** [#13](https://github.com/Hozyne-OpenBak/openclaw-core/issues/13)  
**Governance Model:** v3
