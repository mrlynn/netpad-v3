# npm Integration Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for integrating npm packages with the NetPad Application Marketplace.

## Current State

✅ **Completed:**
- Web marketplace infrastructure (`/api/marketplace/applications`)
- Application bundle export/import (`src/lib/templates/export.ts`, `src/lib/templates/import.ts`)
- Marketplace metadata fields (`marketplaceApplicationId`, `marketplaceVersion`)
- **Step 1:** Package Structure Utilities ✅
- **Step 2:** Bundle Generation Tool ✅
- **Step 3:** npm Registry Sync Service ✅
- **Step 4:** npm Package Import API ✅

## Implementation Strategy

We'll implement in phases, starting with the foundational pieces that enable everything else.

---

## Phase 2: Application npm Packages (START HERE)

### Step 1: Package Structure Utilities

**Goal:** Create utilities to generate and validate npm package structures.

**Files to Create:**
- `src/lib/npm/package-structure.ts` - Package.json generation and validation
- `src/lib/npm/validators.ts` - Validation utilities
- `src/types/npm-package.ts` - TypeScript types for npm package structure

**Tasks:**
1. Define TypeScript interfaces for `NetPadPackage` structure
2. Create `generatePackageJson()` function
3. Create `validatePackageStructure()` function
4. Create `validateBundleJson()` function

**Acceptance Criteria:**
- Can generate valid package.json from Application entity
- Can validate package structure before publishing
- Type-safe interfaces for all package structures

---

### Step 2: Bundle Generation Tool

**Goal:** Convert NetPad Applications to npm package format.

**Files to Create:**
- `src/lib/npm/bundle-generator.ts` - Generate bundle.json from application
- `src/lib/npm/package-builder.ts` - Build complete npm package

**Files to Modify:**
- `src/lib/templates/export.ts` - Enhance to support npm format

**Tasks:**
1. Create `generateBundleJson()` function
2. Create `buildNpmPackage()` function
3. Integrate with existing export utilities
4. Add package.json generation to export flow

**Acceptance Criteria:**
- Can export application as npm-ready package
- Bundle includes all forms, workflows, config schemas
- Package structure matches specification

---

### Step 3: npm Registry Sync Service

**Goal:** Discover and sync packages from npm registry.

**Files to Create:**
- `src/lib/npm/registry-client.ts` - npm registry API client
- `src/lib/npm/package-discovery.ts` - Package discovery logic
- `src/lib/npm/sync-service.ts` - Background sync service

**Dependencies:**
- `npm-registry-fetch` or `axios` for npm API calls

**Tasks:**
1. Create npm registry client (search, fetch package metadata)
2. Implement keyword-based discovery (`netpad-app`, `netpad-plugin`)
3. Create sync service to periodically discover new packages
4. Store discovered packages in database

**Acceptance Criteria:**
- Can search npm registry for NetPad packages
- Can fetch package metadata and bundle.json
- Can discover both official (`@netpad/`) and community packages
- Sync runs periodically (configurable interval)

---

### Step 4: npm Package Import API ✅ COMPLETED

**Goal:** Install packages from npm registry into NetPad.

**Files Created:**
- ✅ `src/lib/npm/package-importer.ts` - Import logic (already existed, fixed return types)
- ✅ `src/app/api/marketplace/npm/install/route.ts` - Install endpoint
- ✅ `src/app/api/marketplace/npm/search/route.ts` - Search endpoint

**Files Modified:**
- ✅ `src/app/api/marketplace/applications/route.ts` - Added npm source filter
- ✅ `src/lib/npm/registry-client.ts` - Added `fetchPackageVersion()` and `downloadPackageTarball()`
- ✅ `src/lib/npm/index.ts` - Added package-importer export

**Tasks:**
1. ✅ Create `importFromNpm()` function (already existed, fixed return types)
2. ✅ Implement dependency resolution (recursive dependency installation)
3. ✅ Create install API endpoint
4. ✅ Create search API endpoint
5. ✅ Handle both official and community packages

**Acceptance Criteria:**
- ✅ Can install package from npm by package name
- ✅ Resolves and installs dependencies
- ✅ Creates Application entity with marketplace metadata
- ✅ Handles version specification
- ✅ Returns installation status and errors

**Implementation Date:** January 15, 2026

---

### Step 5: CLI Tool Foundation ✅ COMPLETED

**Goal:** Create `@netpad/cli` package structure.

**Files Created:**
- ✅ `packages/cli/package.json` - CLI package
- ✅ `packages/cli/src/index.ts` - CLI entry point
- ✅ `packages/cli/src/commands/install.ts` - Install command
- ✅ `packages/cli/src/commands/list.ts` - List command
- ✅ `packages/cli/src/commands/create-app.ts` - Scaffold command
- ✅ `packages/cli/src/commands/search.ts` - Search command
- ✅ `packages/cli/src/commands/login.ts` - Login command
- ✅ `packages/cli/src/commands/logout.ts` - Logout command
- ✅ `packages/cli/src/commands/whoami.ts` - Whoami command
- ✅ `packages/cli/src/lib/auth.ts` - Authentication utilities
- ✅ `packages/cli/src/lib/config.ts` - Config management

**Files Modified:**
- ✅ `packages/cli/src/commands/install.ts` - Updated to use new npm install API
- ✅ `packages/cli/src/commands/search.ts` - Updated to use new npm search API
- ✅ `packages/cli/README.md` - Updated with npm integration documentation

**Tasks:**
1. ✅ Set up CLI package structure (already existed)
2. ✅ Implement `install` command (updated for new API)
3. ✅ Implement `list` command (already implemented)
4. ✅ Implement `create-app` scaffolding command (already implemented)
5. ✅ Add authentication support (already implemented)

**Acceptance Criteria:**
- ✅ Can run `npx @netpad/cli install @netpad/app-customer-feedback`
- ✅ Can list installed packages
- ✅ Can scaffold new application package
- ✅ Authenticates with NetPad API
- ✅ Can search npm registry for NetPad packages

**Published:**
- ✅ Published to npm: `@netpad/cli@0.2.0`
- ✅ Install: `npm install -g @netpad/cli` or `npx @netpad/cli`
- ✅ npm: https://www.npmjs.com/package/@netpad/cli

**Implementation Date:** January 15, 2026  
**Published Date:** January 15, 2026

---

### Step 6: Marketplace UI Integration ✅ COMPLETED

**Goal:** Integrate npm packages into marketplace UI.

**Files Modified:**
- ✅ `src/components/Marketplace/MarketplaceView.tsx` - Added npm source filter and install handler
- ✅ `src/components/Marketplace/ApplicationCard.tsx` - Shows npm package info and install button
- ✅ `src/components/Marketplace/ApplicationDetailDialog.tsx` - Shows npm package info and install button
- ✅ `src/app/api/marketplace/applications/route.ts` - Returns source fields in list response
- ✅ `src/app/api/marketplace/applications/[id]/route.ts` - Returns source fields in detail response

**Tasks:**
1. ✅ Add "npm" source filter to marketplace
2. ✅ Display npm package metadata (package name, npm badge)
3. ✅ Add "Install from npm" button
4. ✅ Show verification badges (Official vs Community - already existed)

**Acceptance Criteria:**
- ✅ Marketplace shows npm packages alongside web packages
- ✅ Can filter by source (web, npm, all)
- ✅ Can install npm packages from UI
- ✅ Shows package metadata and verification status

**Implementation Date:** January 15, 2026

---

## Phase 3: Plugin System Foundation (NEXT)

### Step 7: Plugin SDK Package

**Goal:** Create `@netpad/plugin-sdk` with types and utilities.

**Files to Create:**
- `packages/plugin-sdk/package.json`
- `packages/plugin-sdk/src/index.ts`
- `packages/plugin-sdk/src/types.ts` - Plugin type definitions
- `packages/plugin-sdk/src/runtime.ts` - Runtime utilities

**Tasks:**
1. Define plugin type interfaces
2. Create plugin execution context
3. Add build utilities
4. Document plugin development

---

### Step 8: Plugin Loader System

**Goal:** Auto-discover and load plugins from node_modules.

**Files to Create:**
- `src/lib/plugins/loader.ts` - Plugin discovery and loading
- `src/lib/plugins/registry.ts` - Plugin registry
- `src/app/api/plugins/route.ts` - Plugin API endpoint

**Tasks:**
1. Implement node_modules scanning
2. Load plugin definitions
3. Register plugins in system
4. Create plugin API endpoints

---

## Testing Strategy

### Unit Tests
- Package structure validation
- Bundle generation
- npm registry client
- Package import logic

### Integration Tests
- End-to-end package installation
- Dependency resolution
- Marketplace sync
- CLI commands

### Manual Testing
- Install official package
- Install community package
- Create and publish test package
- Verify marketplace discovery

---

## Dependencies to Add

```json
{
  "dependencies": {
    "npm-registry-fetch": "^15.0.0",
    "semver": "^7.5.0"
  },
  "devDependencies": {
    "@types/semver": "^7.5.0"
  }
}
```

---

## File Structure

```
src/lib/npm/
├── package-structure.ts      # Package.json generation
├── validators.ts             # Validation utilities
├── bundle-generator.ts        # Bundle.json generation
├── package-builder.ts        # Complete package builder
├── registry-client.ts         # npm registry API client
├── package-discovery.ts       # Discovery logic
├── sync-service.ts            # Background sync
└── package-importer.ts        # Import from npm

src/app/api/marketplace/npm/
├── install/route.ts           # Install endpoint
├── search/route.ts            # Search endpoint
└── sync/route.ts              # Manual sync trigger

packages/
├── cli/                       # @netpad/cli package
│   ├── package.json
│   └── src/
│       ├── index.ts
│       └── commands/
└── plugin-sdk/                # @netpad/plugin-sdk package
    ├── package.json
    └── src/
        ├── index.ts
        └── types.ts

src/types/
└── npm-package.ts             # npm package types
```

---

## Next Steps

1. **Start with Step 1** - Package Structure Utilities
2. **Then Step 2** - Bundle Generation Tool
3. **Then Step 3** - npm Registry Sync Service
4. **Continue sequentially** through remaining steps

Each step builds on the previous, so we'll implement them in order.
