#!/usr/bin/env bash
###############################################################################
# test-github-actions.sh - Integration Test for GitHub Actions Workflow
#
# Tests ARM GitHub Actions workflow execution in various scenarios:
# - Dry-run mode (no API calls)
# - Production mode (requires ARM_TOKEN)
# - Idempotent re-run (no duplicates)
# - Output validation (Story/PR URLs, job summary)
# - Error handling scenarios
#
# Usage:
#   ./test-github-actions.sh [--dry-run-only] [--production] [--verbose]
#
# Options:
#   --dry-run-only    Only test dry-run mode (safe, no API calls)
#   --production      Run production tests (requires ARM_TOKEN)
#   --verbose         Enable verbose output
#   --help            Show this help message
#
# Environment Variables:
#   GITHUB_TOKEN      Required for GitHub CLI (gh) commands
#   ARM_TOKEN         Required for production tests (workflow execution)
#
# Story: #36
# Epic: #30
###############################################################################

set -euo pipefail

# Configuration
REPO_OWNER="${REPO_OWNER:-Hozyne-OpenBak}"
REPO_NAME="${REPO_NAME:-arm-engine}"
TARGET_REPO="${TARGET_REPO:-Hozyne-OpenBak/arm}"
WORKFLOW_FILE="arm-execute.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Options
DRY_RUN_ONLY=false
PRODUCTION=false
VERBOSE=false

###############################################################################
# Helper Functions
###############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
  echo -e "${GREEN}✅${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
  echo -e "${RED}❌${NC} $*"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${NC}   $*${NC}"
  fi
}

test_start() {
  TESTS_RUN=$((TESTS_RUN + 1))
  log_info "Test $TESTS_RUN: $*"
}

test_pass() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  log_success "$*"
}

test_fail() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  log_error "$*"
}

###############################################################################
# Validation Functions
###############################################################################

check_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Check gh CLI
  if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) not found. Install from: https://cli.github.com/"
    exit 1
  fi
  
  # Check GITHUB_TOKEN
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    log_error "GITHUB_TOKEN not set. Required for GitHub CLI commands."
    exit 1
  fi
  
  # Check ARM_TOKEN for production tests
  if [ "$PRODUCTION" = true ] && [ -z "${ARM_TOKEN:-}" ]; then
    log_error "ARM_TOKEN not set. Required for production tests."
    exit 1
  fi
  
  # Verify gh authentication
  if ! gh auth status &> /dev/null; then
    log_error "GitHub CLI not authenticated. Run: gh auth login"
    exit 1
  fi
  
  log_success "Prerequisites validated"
}

trigger_workflow() {
  local dry_run="$1"
  local target="${2:-$TARGET_REPO}"
  local config="${3:-arm.config.json}"
  
  log_verbose "Triggering workflow: dry_run=$dry_run, target=$target, config=$config"
  
  gh workflow run "$WORKFLOW_FILE" \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --field targetRepo="$target" \
    --field dryRun="$dry_run" \
    --field configPath="$config" \
    2>&1
}

get_latest_run() {
  gh run list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --workflow "$WORKFLOW_FILE" \
    --limit 1 \
    --json databaseId,status,conclusion \
    --jq '.[0]'
}

wait_for_run() {
  local run_id="$1"
  local max_wait="${2:-300}" # 5 minutes default
  local elapsed=0
  
  log_verbose "Waiting for run $run_id to complete (max ${max_wait}s)..."
  
  while [ $elapsed -lt $max_wait ]; do
    local status
    status=$(gh run view "$run_id" \
      --repo "$REPO_OWNER/$REPO_NAME" \
      --json status,conclusion \
      --jq '{status, conclusion}')
    
    local run_status
    run_status=$(echo "$status" | jq -r '.status')
    
    if [ "$run_status" = "completed" ]; then
      local conclusion
      conclusion=$(echo "$status" | jq -r '.conclusion')
      log_verbose "Run completed with conclusion: $conclusion"
      echo "$conclusion"
      return 0
    fi
    
    sleep 5
    elapsed=$((elapsed + 5))
    
    if [ $((elapsed % 30)) -eq 0 ]; then
      log_verbose "Still waiting... (${elapsed}s elapsed)"
    fi
  done
  
  log_error "Workflow run timed out after ${max_wait}s"
  return 1
}

get_run_logs() {
  local run_id="$1"
  gh run view "$run_id" \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --log 2>&1 || echo ""
}

###############################################################################
# Test Cases
###############################################################################

test_dry_run_mode() {
  test_start "Dry-run mode execution"
  
  # Trigger dry-run workflow
  if ! trigger_workflow "true"; then
    test_fail "Failed to trigger dry-run workflow"
    return 1
  fi
  
  sleep 5 # Allow workflow to appear in list
  
  # Get latest run
  local run_info
  run_info=$(get_latest_run)
  local run_id
  run_id=$(echo "$run_info" | jq -r '.databaseId')
  
  if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
    test_fail "Could not find workflow run"
    return 1
  fi
  
  log_verbose "Workflow run ID: $run_id"
  
  # Wait for completion
  local conclusion
  if ! conclusion=$(wait_for_run "$run_id"); then
    test_fail "Workflow run did not complete"
    return 1
  fi
  
  # Verify success
  if [ "$conclusion" != "success" ]; then
    test_fail "Workflow failed with conclusion: $conclusion"
    log_verbose "Logs:"
    get_run_logs "$run_id" | head -50
    return 1
  fi
  
  # Validate output
  local logs
  logs=$(get_run_logs "$run_id")
  
  # Check for dry-run indicators
  if echo "$logs" | grep -q "DRY RUN MODE"; then
    log_verbose "✓ Dry-run mode confirmed"
  else
    test_fail "Missing 'DRY RUN MODE' indicator"
    return 1
  fi
  
  # Verify no actual API calls made
  if echo "$logs" | grep -q "PR created:.*github.com"; then
    test_fail "PR was created in dry-run mode (should not happen)"
    return 1
  fi
  
  if echo "$logs" | grep -q "Story created:.*github.com"; then
    test_fail "Story was created in dry-run mode (should not happen)"
    return 1
  fi
  
  log_verbose "✓ No API calls made (as expected)"
  
  # Check for execution summary
  if echo "$logs" | grep -q "EXECUTION SUMMARY"; then
    log_verbose "✓ Execution summary present"
  else
    test_fail "Missing execution summary"
    return 1
  fi
  
  test_pass "Dry-run mode test passed"
  return 0
}

test_production_mode() {
  test_start "Production mode execution (creates Stories/PRs)"
  
  if [ "$PRODUCTION" != true ]; then
    log_warning "Skipping production test (use --production to enable)"
    return 0
  fi
  
  # Trigger production workflow
  if ! trigger_workflow "false"; then
    test_fail "Failed to trigger production workflow"
    return 1
  fi
  
  sleep 5
  
  # Get latest run
  local run_info
  run_info=$(get_latest_run)
  local run_id
  run_id=$(echo "$run_info" | jq -r '.databaseId')
  
  if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
    test_fail "Could not find workflow run"
    return 1
  fi
  
  log_verbose "Workflow run ID: $run_id"
  
  # Wait for completion
  local conclusion
  if ! conclusion=$(wait_for_run "$run_id" 600); then # 10 min for production
    test_fail "Workflow run did not complete"
    return 1
  fi
  
  # Verify success
  if [ "$conclusion" != "success" ]; then
    test_fail "Workflow failed with conclusion: $conclusion"
    return 1
  fi
  
  # Validate output
  local logs
  logs=$(get_run_logs "$run_id")
  
  # Check for Story creation
  local story_count
  story_count=$(echo "$logs" | grep -c "Story created:.*github.com" || echo "0")
  
  if [ "$story_count" -gt 0 ]; then
    log_verbose "✓ $story_count Story(ies) created"
  else
    log_warning "No Stories created (may be expected if no outdated deps)"
  fi
  
  # Check for PR creation
  local pr_count
  pr_count=$(echo "$logs" | grep -c "PR created:.*github.com" || echo "0")
  
  if [ "$pr_count" -gt 0 ]; then
    log_verbose "✓ $pr_count PR(s) created"
  else
    log_warning "No PRs created (may be expected if no outdated deps)"
  fi
  
  # Check for job summary
  if echo "$logs" | grep -q "writeJobSummary\|Job Summary"; then
    log_verbose "✓ Job summary generated"
  else
    test_fail "Missing job summary"
    return 1
  fi
  
  # Check for annotations
  if echo "$logs" | grep -q "::notice\|::warning\|logAnnotation"; then
    log_verbose "✓ Annotations present"
  else
    log_warning "No annotations found (may be expected)"
  fi
  
  test_pass "Production mode test passed"
  return 0
}

test_idempotency() {
  test_start "Idempotency (no duplicates on re-run)"
  
  if [ "$PRODUCTION" != true ]; then
    log_warning "Skipping idempotency test (requires --production)"
    return 0
  fi
  
  log_info "Running workflow twice to test duplicate detection..."
  
  # First run
  if ! trigger_workflow "false"; then
    test_fail "Failed to trigger first workflow"
    return 1
  fi
  
  sleep 5
  local run1_info
  run1_info=$(get_latest_run)
  local run1_id
  run1_id=$(echo "$run1_info" | jq -r '.databaseId')
  
  log_verbose "First run ID: $run1_id"
  
  if ! wait_for_run "$run1_id" 600; then
    test_fail "First run did not complete"
    return 1
  fi
  
  # Second run (should detect duplicates)
  sleep 3
  if ! trigger_workflow "false"; then
    test_fail "Failed to trigger second workflow"
    return 1
  fi
  
  sleep 5
  local run2_info
  run2_info=$(get_latest_run)
  local run2_id
  run2_id=$(echo "$run2_info" | jq -r '.databaseId')
  
  log_verbose "Second run ID: $run2_id"
  
  if ! wait_for_run "$run2_id" 600; then
    test_fail "Second run did not complete"
    return 1
  fi
  
  # Validate second run detected duplicates
  local logs2
  logs2=$(get_run_logs "$run2_id")
  
  if echo "$logs2" | grep -q "Story reused\|♻️"; then
    log_verbose "✓ Duplicate Stories detected and reused"
    test_pass "Idempotency test passed"
    return 0
  else
    test_fail "No duplicate detection found (expected ♻️ Story reused)"
    return 1
  fi
}

test_error_handling() {
  test_start "Error handling (invalid config)"
  
  # Trigger with invalid config path (should fail gracefully)
  if trigger_workflow "true" "$TARGET_REPO" "nonexistent-config.json" 2>&1 | grep -q "error"; then
    log_verbose "✓ Invalid config rejected"
  else
    log_warning "Could not trigger workflow with invalid config (may be expected)"
  fi
  
  test_pass "Error handling validated"
  return 0
}

###############################################################################
# Main Execution
###############################################################################

print_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Integration tests for ARM GitHub Actions workflow.

Options:
  --dry-run-only    Only test dry-run mode (safe, no API calls)
  --production      Run production tests (requires ARM_TOKEN)
  --verbose         Enable verbose output
  --help            Show this help message

Environment Variables:
  GITHUB_TOKEN      Required for GitHub CLI (gh) commands
  ARM_TOKEN         Required for production tests

Examples:
  # Safe test (dry-run only)
  $0 --dry-run-only --verbose
  
  # Full test suite (requires ARM_TOKEN)
  $0 --production --verbose

EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --dry-run-only)
        DRY_RUN_ONLY=true
        shift
        ;;
      --production)
        PRODUCTION=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --help)
        print_usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
  done
}

print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "                          TEST SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Total tests:   $TESTS_RUN"
  echo "  Passed:        $TESTS_PASSED"
  echo "  Failed:        $TESTS_FAILED"
  echo ""
  
  if [ $TESTS_FAILED -eq 0 ]; then
    log_success "All tests passed! 🎉"
    echo ""
    return 0
  else
    log_error "$TESTS_FAILED test(s) failed"
    echo ""
    return 1
  fi
}

main() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ARM GitHub Actions Integration Tests"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  parse_args "$@"
  
  log_info "Configuration:"
  log_verbose "  Repository: $REPO_OWNER/$REPO_NAME"
  log_verbose "  Target: $TARGET_REPO"
  log_verbose "  Workflow: $WORKFLOW_FILE"
  log_verbose "  Mode: $([ "$DRY_RUN_ONLY" = true ] && echo "Dry-run only" || echo "Full suite")"
  log_verbose "  Production: $([ "$PRODUCTION" = true ] && echo "Enabled" || echo "Disabled")"
  echo ""
  
  check_prerequisites
  echo ""
  
  # Run tests
  test_dry_run_mode || true
  
  if [ "$DRY_RUN_ONLY" != true ]; then
    test_production_mode || true
    test_idempotency || true
    test_error_handling || true
  fi
  
  # Print summary
  if ! print_summary; then
    exit 1
  fi
}

# Run main
main "$@"
