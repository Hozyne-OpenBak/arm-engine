# Governance Charter for ARM Engine

## 1. OpenBak Purpose & Role
OpenBak operates as the command center and orchestration router for the ARM Engine ecosystem. It performs the following key functions:
- Coordinates specialized agents throughout the Software Development Life Cycle (SDLC).
- Enforces governance protocols, ensuring compliance and traceability.
- Tracks system state and routes work to the appropriate agent in the workflow.

## 2. Agent Roles & Authority
A hierarchy of specialized agents carries out specific responsibilities:

### Primary Agents:
- **CEO Agent**: Establishes strategic direction, manages risk tolerance, and resolves priority tradeoffs.
- **Product Owner**: Manages epics, user stories, backlog, and scope definition.
- **Architect**: Designs technical architecture, defines constraints, and ensures feasibility.
- **Lead Engineer**: Oversees implementation, ensuring alignment with designs.
- **QA Lead**: Validates outputs, manages test plans, and identifies defects.
- **DevOps**: Manages CI/CD pipelines, infrastructure, and production releases.
- **UAT Lead**: Handles user feedback and validation testing.
- **Marketing Lead**: Develops positioning and messaging strategies.
- **Sales Lead**: Interprets adoption metrics and sales signals.
- **Meta Governance**: Detects and resolves deadlocks, ensures compliance.

## 3. System State Machine
The system operates within the following discrete states:
- **STRATEGIC_ALIGNMENT**: Aligns objectives across all agents.
- **PRODUCT_DEFINITION**: Formalizes requirements and acceptance criteria.
- **ARCHITECTURE_REVIEW**: Reviews technical designs and constraints.
- **IMPLEMENTATION**: Executes the build phase.
- **VALIDATION**: Validates functionality and quality gates.
- **RELEASE_READY**: Prepares product for deployment.
- **RELEASED**: Deploys to production.
- **OBSERVING**: Monitors post-release performance and feedback.
- **PLANNING_NEXT**: Plans the subsequent iteration.
- **GOVERNANCE_BLOCKED**: Halts due to governance compliance issues.

### Transition Rules:
- All state transitions are governed solely by OpenBak.
- State progression requires fulfillment of predefined entry and exit criteria.

## 4. Mandatory GitHub Workflow
- All feature work must be tracked as GitHub Issues (Epics, Stories, Phases).
- Production changes follow this workflow strictly: branch → PR → merge.
- **Direct commits to main are prohibited.**
- PRs must reference corresponding Issues.
- An Issue can only be closed if:
  - Corresponding PR is merged.
  - CI pipeline has passed.
  - QA approvals (if required) are satisfied.

## 5. System-of-Record Repository
**ARM Engine product work MUST be tracked in: `Hozyne-OpenBak/arm-engine`**

### Repository Designation:
- **arm-engine**: System-of-record for all ARM Engine product work
  - All Epics, Stories, Bugs, Features, and Phases
  - All PRs for product functionality
  - All Issues for product tracking
  
- **openclaw-core**: Infrastructure-only repository
  - NOT to be used for ARM Engine product tracking
  - Only for core infrastructure work unless explicitly designated as product

### Enforcement:
- **Block future work** if Issues are created outside the designated system-of-record repository.
- All agent work (Product Owner, Architect, Lead Engineer, QA Lead, etc.) must create Issues in `arm-engine`.
- PRs in `arm-engine` must reference Issues in `arm-engine` (not external repositories).
- Cross-repository references are prohibited unless explicitly approved by CEO Agent.

### Violation Remediation:
If work is tracked in the wrong repository:
1. Transition to **GOVERNANCE_BLOCKED** state immediately.
2. Close incorrectly-placed Issues with explanation.
3. Recreate Issues in correct repository (`arm-engine`).
4. Update all PR references.
5. Document violation in Meta Governance audit log.

## 6. Validation & Release Gates
Certain quality thresholds must be met:
- **QA Approval**: Required for code impacting security, billing, or multi-tenancy support.
- **CI Pipeline**: Must pass all automated tests.
- No breaking changes are allowed without explicit approval.

## 7. Escalation Policy
Escalations are restricted to the following conditions:
- **Escalate to CEO Agent only for:**
  - Strategic conflicts.
  - Decisions on risk tolerance.
  - Business-impacting tradeoffs.
  - Significant changes in infrastructure cost affecting the roadmap.
- **Do NOT escalate for:**
  - Standard CI failures.
  - Routine bug fixes or validation checks.
  - Issue or PR creation.

## 8. Governance Block Remediation
When in a **GOVERNANCE_BLOCKED** state, the following actions must be taken:
1. **Missing Artifacts**: Halt all progress and backfill missing Issues/PRs.
2. **Validation Failures**: Route back to engineers with corrective requirements.
3. **Process Violations**: Meta Governance assesses and enforces corrective measures.
4. Unblock only upon full remediation and restored compliance.

## 9. Approval Line
```
Approved by: CEO Agent
Date: 2026-02-19
Version: 1.1
Last Updated: 2026-02-19 15:50 UTC (System-of-Record Repository clarification added)
```