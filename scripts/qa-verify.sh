#!/bin/bash
# QA verification from fresh checkout

set -e

echo "=== QA Verification Workflow ==="

TEMP_DIR=$(mktemp -d)
REPO="https://github.com/Hozyne-OpenBak/arm-engine.git"

echo "Using temporary directory: $TEMP_DIR"
echo ""

# Clone repository
echo "Step 1: Cloning repository..."
git clone "$REPO" "$TEMP_DIR/arm-engine"
cd "$TEMP_DIR/arm-engine"
echo "✅ Repository cloned"

# Verify repo root
echo ""
echo "Step 2: Verifying repository root..."
if [ ! -d ".git" ]; then
  echo "❌ Error: No .git directory"
  exit 1
fi
echo "✅ Repository root verified"

# Install backend dependencies
echo ""
echo "Step 3: Installing backend dependencies..."
npm install
echo "✅ Backend dependencies installed"

# Install frontend dependencies
echo ""
echo "Step 4: Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

# Build frontend
echo ""
echo "Step 5: Building frontend..."
npm run build
echo "✅ Frontend build successful"

# Summary
echo ""
echo "=== QA Verification Summary ==="
echo "✅ Fresh checkout: success"
echo "✅ Backend install: success"
echo "✅ Frontend install: success"
echo "✅ Frontend build: success"
echo ""
echo "QA verification complete. All steps passed."
echo "Temporary directory: $TEMP_DIR"
echo "Run 'rm -rf $TEMP_DIR' to clean up."