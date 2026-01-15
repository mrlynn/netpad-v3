#!/bin/bash

# Test script for @netpad/cli
# Run from packages/cli directory

set -e

echo "🧪 Testing @netpad/cli Package"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from packages/cli directory${NC}"
    exit 1
fi

# Step 1: Clean and build
echo "📦 Step 1: Building package..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 2: Check dist directory
echo "📁 Step 2: Verifying dist directory..."
if [ ! -d "dist" ]; then
    echo -e "${RED}✗ dist directory not found${NC}"
    exit 1
fi

if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}✗ dist/index.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ dist directory verified${NC}"
echo ""

# Step 3: TypeScript compilation check
echo "🔍 Step 3: Checking TypeScript compilation..."
if [ ! -f "dist/index.d.ts" ]; then
    echo -e "${YELLOW}⚠ dist/index.d.ts not found (types may not be generated)${NC}"
else
    echo -e "${GREEN}✓ TypeScript declarations found${NC}"
fi
echo ""

# Step 4: Package structure check
echo "📋 Step 4: Checking package structure..."
npm pack --dry-run > /tmp/netpad-cli-pack.txt 2>&1
if grep -q "dist/" /tmp/netpad-cli-pack.txt && grep -q "README.md" /tmp/netpad-cli-pack.txt; then
    echo -e "${GREEN}✓ Package structure looks good${NC}"
else
    echo -e "${YELLOW}⚠ Package structure may need review${NC}"
    cat /tmp/netpad-cli-pack.txt
fi
echo ""

# Step 5: Test binary (if linked)
echo "🔧 Step 5: Testing binary..."
if command -v netpad &> /dev/null; then
    VERSION=$(netpad --version 2>&1 || echo "")
    if [ ! -z "$VERSION" ]; then
        echo -e "${GREEN}✓ Binary works: $VERSION${NC}"
    else
        echo -e "${YELLOW}⚠ Binary found but --version didn't work${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Binary not in PATH (run 'npm link' to test)${NC}"
fi
echo ""

# Step 6: Test with node directly
echo "🚀 Step 6: Testing with node..."
if node dist/index.js --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Can run with node directly${NC}"
else
    echo -e "${RED}✗ Failed to run with node${NC}"
    node dist/index.js --version
    exit 1
fi
echo ""

# Summary
echo "================================"
echo -e "${GREEN}✅ All automated tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test commands manually: npm link"
echo "  2. Test with npm pack: npm pack"
echo "  3. Test installation: npm install -g ./netpad-cli-*.tgz"
echo "  4. Run full test suite: See TEST_PLAN.md"
echo ""
