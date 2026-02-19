#!/bin/bash
# Seeds required GitHub labels in repository

echo "=== Seeding GitHub Labels ==="

REPO="Hozyne-OpenBak/arm-engine"

# Define labels (name, color, description)
declare -a LABELS=(
  "epic|0052CC|Epic tracking for large feature sets"
  "story|0E8A16|User story or feature request"
  "bug|D73A4A|Bug report or defect"
  "security|B60205|Security-related issue"
  "billing|FBCA04|Billing or payment related"
  "frontend|1D76DB|Frontend work (React, UI)"
  "backend|5319E7|Backend work (Node.js, APIs)"
  "devops|006B75|DevOps, infrastructure, deployment"
  "qa|C5DEF5|QA, testing, validation"
  "blocked|666666|Work blocked or on hold"
  "governance|E99695|Governance or process improvement"
)

for LABEL_DEF in "${LABELS[@]}"; do
  IFS='|' read -r NAME COLOR DESC <<< "$LABEL_DEF"
  
  echo "Processing label '$NAME'..."
  
  # Try to create, if it exists, update it with --force
  if gh label create "$NAME" --color "$COLOR" --description "$DESC" --repo "$REPO" 2>/dev/null; then
    echo "✅ Created label '$NAME'"
  else
    # Label exists, update it
    if gh label edit "$NAME" --color "$COLOR" --description "$DESC" --repo "$REPO" 2>/dev/null; then
      echo "✅ Updated label '$NAME'"
    else
      echo "✓ Label '$NAME' exists (no changes needed)"
    fi
  fi
done

echo ""
echo "Label seeding complete."
