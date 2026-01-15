# @netpad/cli Testing Guide

## Quick Start Testing

### 1. Build and Test Locally

```bash
cd packages/cli

# Clean and build
npm run clean
npm run build

# Test binary
node dist/index.js --version
node dist/index.js --help

# Test create-app (no server required)
node dist/index.js create-app test-app --dir /tmp/test
ls -la /tmp/test/netpad-app-test-app/
```

### 2. Test with npm pack

```bash
# Create tarball
npm pack

# Test installation in another directory
mkdir /tmp/cli-test
cd /tmp/cli-test
npm init -y
npm install /path/to/packages/cli/netpad-cli-0.2.0.tgz

# Test
npx netpad --version
npx netpad create-app test
```

### 3. Test with npm link (Development)

```bash
cd packages/cli
npm link

# In another terminal
netpad --version
netpad create-app test
```

### 4. Test Commands Requiring Server

These require a running NetPad server:

```bash
# Set API URL for local development
export NETPAD_API_URL=http://localhost:3000

# Search (works without auth)
netpad search
netpad search "customer"

# Login
netpad login --api-key <key> --api-url http://localhost:3000

# Whoami
netpad whoami

# List
netpad list

# Install (requires a package on npm)
netpad install @netpad/test-package
```

## Test Results Summary

✅ **Working:**
- Build process
- TypeScript compilation
- Package structure
- Binary execution
- Version command
- Help command
- Create-app command
- Package tarball creation

⚠️ **Requires Server:**
- Search command (needs npm registry access)
- Login command (needs NetPad API)
- List command (needs NetPad API + auth)
- Install command (needs NetPad API + auth + package)

## Automated Test Script

Run the automated test suite:

```bash
npm run test:all
# or
bash scripts/test-cli.sh
```

## Manual Testing Checklist

See `TEST_PLAN.md` for comprehensive manual testing steps.

## Publishing

See `PUBLISHING.md` for step-by-step publishing instructions.
