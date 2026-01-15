# Phase 6 Spec – Marketplace Versioning & Updates

**Date:** January 14, 2026  
**Author:** NetPad Applications-First initiative  
**Depends on:**  
- `docs/PHASE5_IMPLEMENTATION_STATUS.md` (Marketplace Publishing & Discovery) ✅

---

## 1. Purpose and Scope

**Phase 5** completed marketplace publishing and discovery:
- ✅ Users can publish applications to marketplace
- ✅ Users can browse and import applications
- ✅ Users can manage their published applications

**Phase 6** adds versioning and update management:
- **Track installed applications** - Know what's installed and which version
- **Publish new versions** - Update existing marketplace listings with new releases
- **Update notifications** - Alert users when updates are available
- **Version history** - View changelog and version progression
- **Upgrade workflows** - One-click upgrade to latest version

> **Explicit Non-goals (Phase 6):**
> - No automatic updates (user must initiate)
> - No downgrade support (only upgrade forward)
> - No breaking change detection (deferred to Phase 9)
> - No rollback mechanism (deferred to Phase 9)

---

## 2. High-level Outcomes

By the end of Phase 6:

1. **Users can see installed applications**:
   - "Installed Applications" view showing what's installed
   - Current version vs latest available version
   - Update available indicators

2. **Publishers can release new versions**:
   - Publish new release to existing marketplace listing
   - Update version number (semantic versioning)
   - Add changelog for new version
   - Marketplace listing shows latest version

3. **Users receive update notifications**:
   - In-app notifications when updates are available
   - Update badges on installed applications
   - Changelog preview before upgrading

4. **Users can upgrade applications**:
   - One-click upgrade to latest version
   - Upgrade preserves user customizations (where possible)
   - Upgrade creates new forms/workflows or updates existing

---

## 3. Core Concept: Installed Applications Tracking

### The Problem

Currently, when a user imports a marketplace application:
- Forms and workflows are created in their org
- No record of which marketplace application was installed
- No tracking of installed version
- No way to know if updates are available

### The Solution

**Installed Applications Collection** tracks:
- Which marketplace application was installed
- What version was installed
- When it was installed
- Which forms/workflows belong to the installation
- Current status (installed, updated, needs-update)

---

## 4. Data Model

### 4.1 Installed Application (Org Database)

**Collection:** `installed_applications` (in org database)

```typescript
interface InstalledApplication {
  _id?: ObjectId;
  installationId: string;              // "inst_abc123"
  organizationId: string;
  projectId: string;
  
  // Marketplace reference
  marketplaceApplicationId: string;   // ID from marketplace_applications
  marketplaceApplicationName: string;  // Snapshot of name at install time
  installedVersion: string;            // "1.0.0" - version that was installed
  latestAvailableVersion?: string;     // "1.2.0" - latest in marketplace
  installedAt: Date;
  lastCheckedAt?: Date;                // When we last checked for updates
  lastUpdatedAt?: Date;                // When last upgraded
  
  // Installed components
  installedForms: Array<{
    formId: string;                    // ID in org database
    originalFormId?: string;           // Original ID from bundle
    originalSlug?: string;             // Original slug from bundle
    name: string;
  }>;
  installedWorkflows: Array<{
    workflowId: string;                // ID in org database
    originalWorkflowId?: string;       // Original ID from bundle
    originalSlug?: string;             // Original slug from bundle
    name: string;
  }>;
  
  // Status
  status: 'installed' | 'update-available' | 'updating' | 'error';
  updateAvailable?: {
    version: string;
    changelog?: string;
    publishedAt: Date;
  };
  
  // Metadata
  installedBy: string;                 // userId
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```javascript
db.installed_applications.createIndex({ organizationId: 1, projectId: 1 });
db.installed_applications.createIndex({ marketplaceApplicationId: 1 });
db.installed_applications.createIndex({ status: 1, organizationId: 1 });
```

### 4.2 Marketplace Application Version History

**Enhancement to existing `marketplace_applications` collection:**

```typescript
interface MarketplaceApplication {
  // ... existing fields ...
  
  // Version history (new)
  versions?: Array<{
    version: string;                   // "1.0.0", "1.1.0", "1.2.0"
    releaseId?: string;                // Link to source release
    changelog?: string;
    publishedAt: Date;
    publishedBy: string;
  }>;
  
  // Latest version tracking
  latestVersion: string;               // "1.2.0" - current latest
  latestVersionPublishedAt?: Date;
}
```

---

## 5. API Enhancements

### 5.1 Track Installation

**Enhancement to:** `POST /api/marketplace/applications/[id]/import`

**New behavior:**
- After successful import, create `InstalledApplication` record
- Link imported forms/workflows to installation
- Store installed version from marketplace application

**Response enhancement:**
```typescript
{
  success: true,
  import: { ... },
  application: { ... },
  installation: {
    installationId: string;
    installedVersion: string;
  }
}
```

### 5.2 List Installed Applications

**Endpoint:** `GET /api/applications/installed?orgId={orgId}&projectId={projectId}`

**Response:**
```typescript
{
  installations: InstalledApplication[];
  total: number;
}
```

### 5.3 Check for Updates

**Endpoint:** `GET /api/applications/installed/[installationId]/updates`

**Response:**
```typescript
{
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  updateInfo?: {
    version: string;
    changelog?: string;
    publishedAt: Date;
  };
}
```

### 5.4 Publish New Version

**Enhancement to:** `POST /api/marketplace/applications`

**New behavior:**
- If `marketplaceApplicationId` provided (updating existing):
  - Add new version to `versions` array
  - Update `latestVersion` and `latestVersionPublishedAt`
  - Keep existing bundle (or update if provided)
  - Increment version number
- If new application:
  - Create as before
  - Initialize `versions` array with first version

**Request:**
```typescript
{
  // Update existing
  marketplaceApplicationId?: string;   // ID of existing marketplace app
  releaseId: string;                   // New release to publish
  orgId: string;
  projectId: string;
  applicationId: string;
  manifest: {
    version: string;                   // New version (e.g., "1.1.0")
    changelog?: string;
    // ... other manifest fields
  },
  publish: boolean
}
```

### 5.5 Upgrade Installed Application

**Endpoint:** `POST /api/applications/installed/[installationId]/upgrade`

**Request:**
```typescript
{
  targetVersion?: string;              // Optional - defaults to latest
  options?: {
    preserveCustomizations?: boolean;  // Try to preserve user changes
    overwriteExisting?: boolean;       // Overwrite if conflicts
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  upgradedTo: string;
  changes: {
    formsAdded: number;
    formsUpdated: number;
    workflowsAdded: number;
    workflowsUpdated: number;
    errors?: Array<{ type: string; name: string; error: string }>;
  };
}
```

---

## 6. UI Surfaces

### 6.1 Installed Applications View

**Location:** Applications page or new "Installed" tab

**Features:**
- List all installed marketplace applications
- Show current version vs latest version
- Update available badges
- "Check for Updates" button
- "Upgrade" button (when update available)
- "View Details" link to marketplace listing
- "Uninstall" option (with confirmation)

**Component:** `src/components/Applications/InstalledApplicationsView.tsx` (new)

### 6.2 Update Notification System

**Location:** Multiple places

**Features:**
- Badge on Applications nav item showing count of updates
- In-app notification banner (dismissible)
- Update indicators on installed application cards
- Notification center entry

**Implementation:**
- Poll for updates on app load (or manual check)
- Store update status in state/SWR cache
- Show notifications based on status

### 6.3 Upgrade Dialog

**Location:** Triggered from Installed Applications view

**Features:**
- Show current version vs new version
- Display changelog
- Preview what will change (forms/workflows added/updated)
- Options:
  - Preserve customizations (checkbox)
  - Overwrite existing (checkbox)
- Confirmation before upgrade
- Progress indicator during upgrade
- Success/error feedback

**Component:** `src/components/Applications/ApplicationUpgradeDialog.tsx` (new)

### 6.4 Version History in Marketplace

**Location:** Application detail dialog in marketplace

**Features:**
- "Version History" accordion/section
- List all versions with:
  - Version number
  - Release date
  - Changelog preview
  - Download count for that version
- "View Changelog" for each version
- "Install this version" option (for older versions)

**Enhancement to:** `src/components/Marketplace/ApplicationDetailDialog.tsx`

### 6.5 Publish New Version Flow

**Location:** My Applications → Edit → Publish New Version

**Features:**
- "Publish New Version" button in My Applications view
- Opens ApplicationPublishDialog with:
  - Pre-filled from existing marketplace listing
  - Version field showing next suggested version
  - Changelog field (required for new version)
  - Preview of what changed since last version
- On publish:
  - Creates new release (if not already created)
  - Updates marketplace listing with new version
  - Notifies all users who installed previous version

**Enhancement to:** `src/components/Projects/ApplicationPublishDialog.tsx`

---

## 7. Implementation Plan

### 7.1 Backend (Week 1)

**Task 1: Installed Applications Collection**
- [ ] Create `installed_applications` collection schema
- [ ] Add indexes
- [ ] Create utility functions: `createInstallation`, `getInstallation`, `listInstallations`

**File:** `src/lib/platform/installedApplications.ts` (new)

**Task 2: Track Installations**
- [ ] Enhance `POST /api/marketplace/applications/[id]/import` to create installation record
- [ ] Link imported forms/workflows to installation
- [ ] Store installed version

**File:** `src/app/api/marketplace/applications/[id]/route.ts`

**Task 3: Installed Applications API**
- [ ] `GET /api/applications/installed` - List installed applications
- [ ] `GET /api/applications/installed/[id]` - Get installation details
- [ ] `GET /api/applications/installed/[id]/updates` - Check for updates
- [ ] `POST /api/applications/installed/[id]/upgrade` - Upgrade installation

**File:** `src/app/api/applications/installed/route.ts` (new)  
**File:** `src/app/api/applications/installed/[id]/route.ts` (new)

**Task 4: Marketplace Version History**
- [ ] Add `versions` array to marketplace application schema
- [ ] Update `POST /api/marketplace/applications` to handle version updates
- [ ] Track `latestVersion` and `latestVersionPublishedAt`

**File:** `src/app/api/marketplace/applications/route.ts`

### 7.2 UI Components (Week 1-2)

**Task 5: Installed Applications View**
- [ ] Create `InstalledApplicationsView` component
- [ ] Show installed apps with version info
- [ ] Update available indicators
- [ ] Check for updates functionality

**File:** `src/components/Applications/InstalledApplicationsView.tsx` (new)

**Task 6: Upgrade Dialog**
- [ ] Create `ApplicationUpgradeDialog` component
- [ ] Show version comparison
- [ ] Display changelog
- [ ] Preview changes
- [ ] Handle upgrade flow

**File:** `src/components/Applications/ApplicationUpgradeDialog.tsx` (new)

**Task 7: Update Notifications**
- [ ] Add update check on app load
- [ ] Create notification badge component
- [ ] Add notification banner
- [ ] Integrate with SWR for real-time updates

**Files:**
- `src/components/Applications/UpdateNotificationBadge.tsx` (new)
- `src/components/Applications/UpdateNotificationBanner.tsx` (new)
- `src/hooks/useInstalledApplications.ts` (new)

**Task 8: Enhance Marketplace Detail Dialog**
- [ ] Add "Version History" section
- [ ] Show all versions with changelogs
- [ ] "Install this version" option

**File:** `src/components/Marketplace/ApplicationDetailDialog.tsx`

**Task 9: Enhance Publish Dialog**
- [ ] Add "Publish New Version" mode
- [ ] Pre-fill from existing listing
- [ ] Version suggestion logic
- [ ] Changelog requirement

**File:** `src/components/Projects/ApplicationPublishDialog.tsx`

### 7.3 Integration (Week 2)

**Task 10: Add Installed Tab to Applications Page**
- [ ] Add "Installed" tab to applications page
- [ ] Integrate `InstalledApplicationsView`
- [ ] Add navigation between "All Applications" and "Installed"

**File:** `src/app/orgs/[orgId]/projects/[projectId]/applications/page.tsx`

**Task 11: Update Notifications Integration**
- [ ] Add update badge to Applications nav item
- [ ] Show notification banner on applications page
- [ ] Wire up "Check for Updates" actions

**Files:**
- `src/components/Navigation/AppNavBar.tsx`
- `src/app/orgs/[orgId]/projects/[projectId]/applications/page.tsx`

### 7.4 Testing & Documentation (Week 2)

**Task 12: Testing**
- [ ] Test installation tracking
- [ ] Test version publishing
- [ ] Test update detection
- [ ] Test upgrade flow
- [ ] Test version history display

**Task 13: Documentation**
- [ ] Update `PHASE6_IMPLEMENTATION_STATUS.md`
- [ ] Update `APPLICATIONS_ROADMAP.md`
- [ ] Add help topics for installed applications and upgrades

---

## 8. Design Decisions

### 8.1 Installation Tracking Strategy

**Decision:** Track installations at the org/project level, not per-form/workflow.

**Rationale:**
- Applications are installed as units
- Easier to manage and upgrade
- Matches user mental model

**Implementation:**
- One `InstalledApplication` record per import
- Links to all forms/workflows created during import
- Status applies to entire installation

### 8.2 Version Comparison

**Decision:** Use semantic versioning (X.Y.Z) for comparison.

**Rationale:**
- Already used in releases
- Standard versioning scheme
- Easy to compare versions programmatically

**Implementation:**
- Parse version strings (e.g., "1.2.0")
- Compare major.minor.patch
- Show "update available" if latest > installed

### 8.3 Upgrade Strategy

**Decision:** Upgrade creates/updates forms/workflows, doesn't delete.

**Rationale:**
- Preserves user data
- Less destructive
- Allows incremental updates

**Implementation:**
- Match forms/workflows by original ID/slug
- Update existing if found
- Create new if not found
- Don't delete anything (user can manually remove)

### 8.4 Update Notifications

**Decision:** Manual check + periodic background check (not real-time).

**Rationale:**
- Reduces API load
- User controls when to check
- Background check on app load is sufficient

**Implementation:**
- "Check for Updates" button (manual)
- Background check on applications page load
- Cache results in SWR
- Show badges/notifications based on cached state

---

## 9. Success Criteria

Phase 6 is complete when:

1. ✅ Users can see installed marketplace applications
2. ✅ Users can see when updates are available
3. ✅ Publishers can publish new versions of marketplace applications
4. ✅ Users can upgrade installed applications to latest version
5. ✅ Version history is visible in marketplace
6. ✅ All API endpoints work correctly
7. ✅ UI flows are intuitive and tested

---

## 10. Future Phases (Post Phase 6)

**Phase 7:** Ratings & Reviews
- User ratings (1-5 stars)
- Written reviews
- Average rating display
- Filter/sort by rating

**Phase 8:** npm Integration
- Publish to npm registry
- Install from npm packages
- npm registry sync service

**Phase 9:** Contracts & Protection
- Application contract enforcement
- Locked vs editable components
- Breaking change detection
- Rollback mechanism

---

## 11. Summary

Phase 6 adds **versioning and update management** to the marketplace, enabling:

- **Tracking:** Know what's installed and which version
- **Publishing:** Release new versions of marketplace applications
- **Notifications:** Alert users when updates are available
- **Upgrades:** One-click upgrade to latest version
- **History:** View version progression and changelogs

This transforms the marketplace from a one-time import system into a **living ecosystem** where applications evolve and users stay up-to-date.

---

**Ready for Implementation:** January 14, 2026
