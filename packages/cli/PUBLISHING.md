# Publishing @netpad/cli

This guide covers how to test and publish the `@netpad/cli` package to npm.

## Prerequisites

1. **npm account** with publish access to the `@netpad` scope
2. **Node.js 18+** installed
3. **npm CLI** authenticated (`npm login`)
4. **Access to @netpad organization** on npm

## Pre-Publish Checklist

Before publishing, ensure:

- [ ] All tests pass (see `TEST_PLAN.md`)
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript compiles without errors
- [ ] Version is updated in `package.json`
- [ ] README is complete and accurate
- [ ] All commands tested manually
- [ ] Package structure verified: `npm pack --dry-run`
- [ ] Local installation tested

## Step-by-Step Publishing

### 1. Clean and Build

```bash
cd packages/cli

# Clean previous builds
npm run clean

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

**Expected output:**
- `dist/index.js` - Main entry point
- `dist/index.d.ts` - TypeScript declarations
- `dist/commands/` - All command files
- `dist/lib/` - Library files

### 2. Run Automated Tests

```bash
# Run test script
npm run test:all

# Or manually
bash scripts/test-cli.sh
```

**Expected:**
- Build succeeds
- dist directory verified
- Binary works with node
- Package structure correct

### 3. Test Package Locally

```bash
# Create a tarball
npm pack

# This creates: netpad-cli-0.2.0.tgz
```

Test in another directory:

```bash
# Create test directory
mkdir /tmp/netpad-cli-test
cd /tmp/netpad-cli-test
npm init -y

# Install from tarball
npm install /path/to/packages/cli/netpad-cli-0.2.0.tgz

# Test binary
npx netpad --version
npx netpad --help
npx netpad search --limit 5
```

**Expected:**
- Package installs successfully
- Binary works
- Commands execute

### 4. Test Commands Manually

#### Test Search (No Auth Required)
```bash
npx netpad search
npx netpad search "customer"
npx netpad search --type application
```

#### Test Version
```bash
npx netpad version
npx netpad v
```

#### Test Help
```bash
npx netpad --help
npx netpad install --help
```

#### Test Create App
```bash
npx netpad create-app test-app
# Verify files created
ls -la netpad-app-test-app/
```

#### Test Login (Requires API)
```bash
# With API key
npx netpad login --api-key <key> --api-url http://localhost:3000

# Verify
npx netpad whoami
```

#### Test List (Requires Auth)
```bash
npx netpad list
```

#### Test Install (Requires Auth + Package)
```bash
# Only if you have a test package
npx netpad install @netpad/test-package --api-url http://localhost:3000
```

### 5. Update Version

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.2.x): Bug fixes, no API changes
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

```bash
# Patch version bump
npm version patch

# Minor version bump
npm version minor

# Major version bump
npm version major

# Or set explicitly
npm version 0.3.0
```

**Note:** This will:
1. Update `package.json` version
2. Create a git commit
3. Create a git tag

### 6. Final Build

```bash
# Clean and rebuild
npm run clean
npm run build

# Type check
npm run typecheck
```

### 7. Verify Package Contents

```bash
npm pack --dry-run
```

**Expected files:**
- `package.json`
- `README.md`
- `dist/` (all compiled files)
- `dist/index.js` (main entry)
- `dist/index.d.ts` (types)

**Should NOT include:**
- `src/` (source files)
- `node_modules/`
- `*.test.ts` (test files)
- `tsconfig.json`
- `.git/`

### 8. Publish to npm

For the `@netpad` scoped package:

```bash
# First-time publish (public access required for scoped packages)
npm publish --access public

# Subsequent publishes
npm publish
```

**Note:** The `publishConfig.access` in `package.json` should already be set to `"public"`.

### 9. Verify Publication

```bash
# Check npm registry
npm view @netpad/cli

# Test installation
npm install -g @netpad/cli

# Test globally installed version
netpad --version
netpad --help
```

### 10. Test Global Installation

```bash
# Install globally
npm install -g @netpad/cli

# Test commands
netpad version
netpad search --limit 5
netpad --help
```

## Troubleshooting

### "You do not have permission to publish"

```bash
# Ensure you're logged in
npm login

# Verify org membership
npm org ls netpad

# If needed, request access from org admin
```

### "Package already exists"

- Ensure version is incremented
- Check `npm view @netpad/cli versions`

### Build Errors

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules
npm install
npm run build
```

### TypeScript Errors

```bash
# Check TypeScript config
npx tsc --noEmit

# Fix any type errors
```

### Binary Not Working

Check the shebang in `dist/index.js`:
```javascript
#!/usr/bin/env node
```

Should be the first line of the file.

## CI/CD Publishing

For automated releases, use GitHub Actions:

```yaml
# .github/workflows/publish-cli.yml
name: Publish @netpad/cli

on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: cd packages/cli && npm ci

      - name: Build
        run: cd packages/cli && npm run build

      - name: Publish
        run: cd packages/cli && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Quick Reference

```bash
# Full publish workflow
cd packages/cli
npm run clean
npm run build
npm run typecheck
npm run test:all
npm version patch  # or minor/major
npm pack  # Test locally first
npm publish --access public

# Verify
npm view @netpad/cli
npm install -g @netpad/cli
netpad --version
```

## Post-Publish

After publishing:

1. **Update documentation** if needed
2. **Announce release** (if significant)
3. **Monitor for issues** in first 24 hours
4. **Update version in main project** if referenced

## Version History

- `0.2.0` - npm integration support, updated install/search commands
- `0.1.0` - Initial release
