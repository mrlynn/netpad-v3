# @netpad/cli Publish Checklist

**Version:** 0.2.0  
**Date:** January 15, 2026

## ✅ Pre-Publish Verification

### Build & Structure
- [x] ✅ TypeScript compiles without errors
- [x] ✅ `dist/` directory created correctly
- [x] ✅ All commands compiled
- [x] ✅ Binary has correct shebang (`#!/usr/bin/env node`)
- [x] ✅ Package structure verified (`npm pack --dry-run`)
- [x] ✅ Only required files included (dist/, README.md)

### Code Quality
- [x] ✅ No linter errors
- [x] ✅ All imports resolve correctly
- [x] ✅ TypeScript declarations generated
- [x] ✅ Commands updated for new npm APIs

### Documentation
- [x] ✅ README.md complete
- [x] ✅ TEST_PLAN.md created
- [x] ✅ PUBLISHING.md created
- [x] ✅ README-TESTING.md created

### Package Configuration
- [x] ✅ `package.json` has correct metadata
- [x] ✅ Repository URL set
- [x] ✅ Homepage URL set
- [x] ✅ `publishConfig.access` set to "public"
- [x] ✅ Keywords include npm, marketplace, applications
- [x] ✅ Author set to "MongoDB"
- [x] ✅ License set to "Apache-2.0"

### Testing
- [x] ✅ Build succeeds
- [x] ✅ Version command works
- [x] ✅ Help command works
- [x] ✅ Create-app command works
- [x] ✅ Package tarball created successfully
- [ ] ⚠️ Search command (requires network - tested manually)
- [ ] ⚠️ Login/List/Install (require server - test after publish)

## 🚀 Publishing Steps

### 1. Final Verification

```bash
cd packages/cli

# Clean build
npm run clean
npm run build
npm run typecheck

# Verify package
npm pack --dry-run
```

### 2. Update Version (if needed)

```bash
# For patch release
npm version patch

# For minor release
npm version minor

# For major release
npm version major
```

**Note:** This will:
- Update `package.json` version
- Create a git commit
- Create a git tag

### 3. Verify npm Login

```bash
# Check you're logged in
npm whoami

# Verify @netpad org access
npm org ls netpad
```

### 4. Create Tarball for Final Test

```bash
npm pack

# Test in another directory
mkdir /tmp/final-test
cd /tmp/final-test
npm init -y
npm install /path/to/netpad-cli-0.2.0.tgz
npx netpad --version
```

### 5. Publish

```bash
npm publish --access public
```

**Expected output:**
```
+ @netpad/cli@0.2.0
```

### 6. Verify Publication

```bash
# Check on npm
npm view @netpad/cli

# Test global installation
npm install -g @netpad/cli
netpad --version
netpad --help
```

### 7. Test Published Package

```bash
# In a clean directory
mkdir /tmp/test-published
cd /tmp/test-published
npm init -y
npm install -g @netpad/cli

# Test commands
netpad version
netpad search --limit 5
netpad create-app test
```

## 📝 Post-Publish

- [ ] Update main project documentation if CLI is referenced
- [ ] Announce release (if significant)
- [ ] Monitor npm downloads/stats
- [ ] Watch for issues in first 24 hours

## 🔗 Quick Links

- **npm Package:** https://www.npmjs.com/package/@netpad/cli
- **GitHub:** https://github.com/mrlynn/netpad-v3/tree/main/packages/cli
- **Documentation:** See README.md

## ⚠️ Known Limitations

- Search command requires network access to npm registry
- Login/List/Install commands require running NetPad server
- Full integration testing requires live environment

These are expected and will be tested post-publish.
