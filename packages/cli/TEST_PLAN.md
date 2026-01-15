# @netpad/cli Testing Plan

## Pre-Publish Testing Checklist

### 1. Build Verification

```bash
cd packages/cli
npm run clean  # If clean script exists
npm run build
```

**Expected:**
- TypeScript compiles without errors
- `dist/` directory created with:
  - `index.js` (main entry point)
  - `index.d.ts` (TypeScript declarations)
  - All command files in `dist/commands/`
  - All lib files in `dist/lib/`

### 2. Package Structure Test

```bash
npm pack --dry-run
```

**Expected:**
- Only `dist/`, `README.md`, and `package.json` included
- No `src/`, `node_modules/`, or test files

### 3. Local Installation Test

```bash
# Create tarball
npm pack

# In a test directory
mkdir /tmp/netpad-cli-test
cd /tmp/netpad-cli-test
npm init -y
npm install /path/to/packages/cli/netpad-cli-0.2.0.tgz

# Test binary
npx netpad --version
npx netpad --help
```

**Expected:**
- Package installs successfully
- Binary `netpad` is available
- `--version` shows correct version
- `--help` shows command list

### 4. Command Testing

#### 4.1 Version Command
```bash
npx netpad version
npx netpad v
```

**Expected:**
- Shows version number
- Shows homepage URL

#### 4.2 Help Command
```bash
npx netpad --help
npx netpad install --help
```

**Expected:**
- Shows all available commands
- Shows command-specific help

#### 4.3 Search Command (No Auth Required)
```bash
npx netpad search
npx netpad search "customer"
npx netpad search --type application
npx netpad search --type plugin --verified
npx netpad search --limit 10
```

**Expected:**
- Searches npm registry successfully
- Shows package results
- Filters by type work
- Limit works

#### 4.4 Login Command
```bash
# Test API key login
npx netpad login --api-key <test-key> --api-url http://localhost:3000

# Test interactive login (if possible)
npx netpad login --api-url http://localhost:3000
```

**Expected:**
- Prompts for API key if not provided
- Verifies API key
- Stores credentials in `~/.netpad/config.json`
- Shows success message

#### 4.5 Whoami Command
```bash
npx netpad whoami
```

**Expected:**
- Shows authentication status
- Shows masked API key
- Shows org/project IDs if set

#### 4.6 List Command (Requires Auth)
```bash
npx netpad list
npx netpad list --org <orgId> --api-url http://localhost:3000
```

**Expected:**
- Lists installed applications
- Shows application details
- Handles no applications gracefully

#### 4.7 Install Command (Requires Auth)
```bash
# Test with a real package (if available)
npx netpad install @netpad/forms --api-url http://localhost:3000

# Test with version
npx netpad install @netpad/forms --version 0.2.0 --api-url http://localhost:3000

# Test with overwrite
npx netpad install @netpad/forms --overwrite --api-url http://localhost:3000
```

**Expected:**
- Installs package successfully
- Shows installation progress
- Shows application ID
- Shows dependencies if any
- Handles errors gracefully

#### 4.8 Create App Command
```bash
npx netpad create-app test-app
npx netpad create-app my-app --scope @myorg --dir /tmp/test
```

**Expected:**
- Creates directory structure
- Generates package.json with netpad field
- Creates README.md
- Creates dist/bundle.json
- Shows next steps

#### 4.9 Logout Command
```bash
npx netpad logout
```

**Expected:**
- Clears credentials
- Shows success message
- Handles no credentials gracefully

### 5. Error Handling Tests

#### 5.1 Network Errors
```bash
# Test with invalid API URL
npx netpad login --api-url http://invalid-url:9999
```

**Expected:**
- Shows clear error message
- Provides troubleshooting tips

#### 5.2 Authentication Errors
```bash
# Test with invalid API key
npx netpad login --api-key invalid-key --api-url http://localhost:3000
```

**Expected:**
- Shows authentication error
- Doesn't crash

#### 5.3 Missing Arguments
```bash
npx netpad install
npx netpad create-app
```

**Expected:**
- Shows usage/help
- Doesn't crash

### 6. Integration Tests

#### 6.1 Full Workflow Test
```bash
# 1. Login
npx netpad login --api-key <key> --api-url http://localhost:3000

# 2. Verify login
npx netpad whoami

# 3. Search for packages
npx netpad search

# 4. List applications
npx netpad list

# 5. Create new app
npx netpad create-app test-integration

# 6. Logout
npx netpad logout
```

**Expected:**
- All commands work in sequence
- No state issues between commands

### 7. Cross-Platform Testing

Test on:
- [ ] macOS
- [ ] Linux
- [ ] Windows (if applicable)

### 8. Node Version Testing

Test with:
- [ ] Node.js 18.x
- [ ] Node.js 20.x
- [ ] Node.js 22.x

## Test Script

Run all tests:

```bash
cd packages/cli
npm run test:all
```

Or use the test script:

```bash
./scripts/test-cli.sh
```

## Publishing Checklist

Before publishing:

- [ ] All tests pass
- [ ] Version updated in package.json
- [ ] README is complete and accurate
- [ ] CHANGELOG updated (if applicable)
- [ ] Build succeeds: `npm run build`
- [ ] Package structure verified: `npm pack --dry-run`
- [ ] Local installation tested: `npm pack` + install
- [ ] All commands tested manually
- [ ] Error handling verified
- [ ] Cross-platform tested (if applicable)

## Publishing Steps

1. **Update version:**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Test package:**
   ```bash
   npm pack
   # Test in another directory
   ```

4. **Publish:**
   ```bash
   npm publish --access public
   ```

5. **Verify:**
   ```bash
   npm view @netpad/cli
   npm install -g @netpad/cli
   netpad --version
   ```
