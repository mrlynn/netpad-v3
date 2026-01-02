# Publishing @netpad/forms

This guide covers how to publish the `@netpad/forms` package to npm.

## Prerequisites

1. **npm account** with publish access to the `@netpad` scope
2. **Node.js 18+** installed
3. **npm CLI** authenticated (`npm login`)

## Pre-publish Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Types are generated correctly in `dist/`
- [ ] Version is updated in `package.json`
- [ ] CHANGELOG is updated (if applicable)
- [ ] README reflects current API

## Step-by-Step Publishing

### 1. Verify Clean Build

```bash
cd packages/forms

# Clean and rebuild
npm run clean
npm run build

# Run tests
npm test

# Verify the dist folder
ls -la dist/
```

Expected output:
```
index.js          # CommonJS build
index.mjs         # ES Module build
index.d.ts        # TypeScript declarations
types/index.js    # Types subpath (CJS)
types/index.mjs   # Types subpath (ESM)
types/index.d.ts  # Types declarations
```

### 2. Test Package Locally

Before publishing, test the package locally using npm pack:

```bash
# Create a tarball
npm pack

# This creates: netpad-forms-0.1.0.tgz
```

Test in another project:
```bash
# In a test project
npm install /path/to/packages/forms/netpad-forms-0.1.0.tgz
```

### 3. Update Version

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.x): Bug fixes, no API changes
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
npm version 1.0.0
```

### 4. Publish to npm

For the `@netpad` scoped package:

```bash
# First-time publish (public access required for scoped packages)
npm publish --access public

# Subsequent publishes
npm publish
```

### 5. Verify Publication

```bash
# Check npm registry
npm view @netpad/forms

# Test installation
npm install @netpad/forms
```

## Publish Automation (CI/CD)

For automated releases, use GitHub Actions:

```yaml
# .github/workflows/publish-forms.yml
name: Publish @netpad/forms

on:
  push:
    tags:
      - 'forms-v*'

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
        run: cd packages/forms && npm ci

      - name: Run tests
        run: cd packages/forms && npm test

      - name: Build
        run: cd packages/forms && npm run build

      - name: Publish
        run: cd packages/forms && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## npm Organization Setup

If you haven't set up the `@netpad` org:

### Create Organization

1. Go to https://www.npmjs.com/org/create
2. Create `netpad` organization
3. Add team members with publish access

### First-time Scope Setup

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami

# Check org access
npm org ls netpad
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
- Check `npm view @netpad/forms versions`

### "Missing peer dependencies" warnings

This is expected. Peer dependencies are installed by consumers.

## Package Contents

Files included in the published package (defined in `package.json` `files` field):

```
dist/           # Built JavaScript and TypeScript declarations
README.md       # Documentation
```

Files NOT included:
- Source code (`src/`)
- Tests (`src/__tests__/`)
- Configuration files
- node_modules

## Quick Reference

```bash
# Full publish workflow
cd packages/forms
npm run clean
npm run build
npm test
npm version patch  # or minor/major
npm publish --access public
git push --follow-tags
```
