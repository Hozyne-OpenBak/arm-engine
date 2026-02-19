#!/bin/bash
# Verifies repository environment before operations

set -e

echo "=== ARM Engine Repository Verification ==="

# Check if in repo root
if [ ! -d ".git" ]; then
  echo "❌ Error: Not in repository root (no .git directory found)"
  echo "Current directory: $(pwd)"
  exit 1
fi

# Verify canonical repo slug
REPO_SLUG=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || echo "unknown")
EXPECTED_SLUG="Hozyne-OpenBak/arm-engine"

if [ "$REPO_SLUG" != "$EXPECTED_SLUG" ]; then
  echo "❌ Error: Repository slug mismatch"
  echo "Expected: $EXPECTED_SLUG"
  echo "Got: $REPO_SLUG"
  exit 1
fi

echo "✅ Repository root verified"
echo "✅ Canonical slug: $REPO_SLUG"

# Verify git status
if ! git status > /dev/null 2>&1; then
  echo "❌ Error: Git status check failed"
  exit 1
fi

echo "✅ Git operations functional"
echo ""
echo "Repository verification complete. Safe to proceed."