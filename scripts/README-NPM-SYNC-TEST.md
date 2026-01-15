# Testing npm Registry Sync Service (Step 3)

This guide explains how to test the npm Registry Sync Service functionality.

## Quick Start

Run all tests:
```bash
npm run test:npm-sync
```

Or run specific tests:
```bash
npx tsx scripts/test-npm-sync.ts [command]
```

## Available Test Commands

### 1. Search Test
Tests npm registry search functionality:
```bash
npx tsx scripts/test-npm-sync.ts search
```

**What it tests:**
- Search npm registry with keyword queries
- Returns package search results
- Shows package metadata from search

### 2. Metadata Test
Tests fetching package metadata:
```bash
npx tsx scripts/test-npm-sync.ts metadata
```

**What it tests:**
- Fetch package metadata from npm registry
- Parse version information
- Extract package details

### 3. Package.json Test
Tests fetching package.json:
```bash
npx tsx scripts/test-npm-sync.ts package-json
```

**What it tests:**
- Fetch complete package.json from npm
- Extract NetPad-specific fields
- Verify package structure

### 4. Package Existence Test
Tests checking if packages exist:
```bash
npx tsx scripts/test-npm-sync.ts exists
```

**What it tests:**
- Check if packages exist in npm registry
- Handle non-existent packages gracefully

### 5. Discovery Test
Tests package discovery:
```bash
npx tsx scripts/test-npm-sync.ts discover
```

**What it tests:**
- Discover NetPad packages by keywords
- Filter official vs community packages
- Extract NetPad config from packages

**Note:** This may take a minute as it searches the npm registry.

### 6. Discovery by Criteria Test
Tests filtered discovery:
```bash
npx tsx scripts/test-npm-sync.ts discover-criteria
```

**What it tests:**
- Filter packages by type (application/plugin)
- Filter by category
- Filter by verification status

### 7. Sync Status Test
Tests getting sync status:
```bash
npx tsx scripts/test-npm-sync.ts sync-status
```

**What it tests:**
- Get last sync time from database
- Count synced packages
- Check for sync errors

### 8. Sync Specific Package Test
Tests syncing a single package:
```bash
npx tsx scripts/test-npm-sync.ts sync-package
```

**What it tests:**
- Sync a specific package to marketplace
- Update database with package metadata
- Handle errors gracefully

### 9. Full Sync Test
Tests full registry sync:
```bash
npx tsx scripts/test-npm-sync.ts sync
```

**What it tests:**
- Discover all NetPad packages
- Sync to marketplace database
- Track new vs updated packages
- Handle errors during sync

**⚠️ Warning:** This will write to the database. Make sure you're using a test database.

### 10. API Endpoint Test
Tests the sync API endpoint:
```bash
npx tsx scripts/test-npm-sync.ts api
```

**What it tests:**
- GET /api/marketplace/npm/sync (status)
- Verify endpoint is accessible

**Note:** POST endpoint requires authentication - test manually via API client.

## Testing via API

### Get Sync Status
```bash
curl http://localhost:3000/api/marketplace/npm/sync
```

### Trigger Manual Sync
```bash
curl -X POST http://localhost:3000/api/marketplace/npm/sync \
  -H "Content-Type: application/json" \
  -d '{"force": true, "includeOfficial": true, "includeCommunity": true}'
```

### Sync Specific Package
```bash
curl -X POST http://localhost:3000/api/marketplace/npm/sync \
  -H "Content-Type: application/json" \
  -d '{"packageName": "@netpad/forms"}'
```

## Expected Results

### If No Packages Exist Yet
- Search/discovery tests will return empty results (this is expected)
- Sync will complete with 0 packages discovered
- Status will show "Never" for last sync

### If Packages Exist
- Search/discovery will find packages
- Sync will update database
- Status will show sync timestamp and package counts

## Troubleshooting

### "Cannot find module" errors
Make sure you're running from the project root:
```bash
cd /path/to/netpad-3
npx tsx scripts/test-npm-sync.ts
```

### Database connection errors
Ensure `.env.local` has `MONGODB_URI` set:
```bash
MONGODB_URI=mongodb+srv://...
```

### npm registry errors
- Check internet connection
- Verify npm registry is accessible: `curl https://registry.npmjs.org`
- Some tests may fail if npm registry is slow (this is okay)

### Authentication errors (API tests)
- Make sure dev server is running: `npm run dev`
- API endpoints may require authentication
- Check browser console for session cookies if needed

## Next Steps

After testing Step 3, you can:
1. Verify packages appear in marketplace database
2. Check marketplace UI shows npm packages
3. Proceed to Step 4 (Package Import API)
