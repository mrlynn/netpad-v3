# Phase 5 Spec – Marketplace Publishing & Discovery

**Date:** January 14, 2026  
**Author:** NetPad Applications-First initiative  
**Depends on:**  
- `docs/PHASE4_IMPLEMENTATION_STATUS.md` (Releases, Templates, Insights)  
- `docs/APPLICATIONS_DESIGN.md` (Applications-First model)  
- `docs/MARKETPLACE_NEXT_STEPS.md` (Priority enhancements)

---

## 1. Purpose and Scope

**Phase 4** completed the foundation:
- ✅ Applications as first-class entities
- ✅ Forms and workflows scoped to applications
- ✅ **Application Releases** (versioned snapshots)
- ✅ Workflow templates for quick starts

**Phase 5** connects releases to the marketplace, enabling:
- **Publish applications** from releases to the public marketplace
- **Discover marketplace** applications easily
- **Seed marketplace** with example applications
- **Manage published applications** (My Applications)

> **Explicit Non-goals (Phase 5):**
> - No npm package publishing yet (that's Phase 6+)
> - No ratings/reviews system (deferred to Phase 7)
> - No application versioning/updates in marketplace (deferred to Phase 6)
> - No contract enforcement (deferred to later phase)

---

## 2. High-level Outcomes

By the end of Phase 5:

1. **Users can publish applications to marketplace**:
   - From any application release (versioned snapshot)
   - With marketplace metadata (summary, tags, category, screenshots)
   - As "published" (public) or "draft" (private)

2. **Marketplace is discoverable**:
   - Navigation link in AppNavBar
   - Browse, search, filter applications
   - View application details before importing

3. **Marketplace has content**:
   - Seed script populates with example applications
   - IT Help Desk, Customer Onboarding, Survey & Feedback examples

4. **Users can manage their published applications**:
   - "My Applications" view
   - Edit metadata, unpublish/republish, view stats

---

## 3. Core Concept: Releases → Marketplace

### The Connection

**Application Releases** (Phase 4) are the **source of truth** for marketplace publishing:

```
Application (in user's org)
  └── Release v1.0.0 (snapshot with manifest)
       └── Publish to Marketplace
            └── Marketplace Listing (public, versioned)
```

**Key Insight:**
- A **Release** contains the exact snapshot (forms + workflows + manifest)
- Publishing a release creates a **Marketplace Listing** pointing to that release
- Future: Multiple releases → multiple marketplace versions

### Data Flow

1. **User creates Release** (Phase 4) → `ApplicationRelease` document
2. **User publishes Release** (Phase 5) → `MarketplaceApplication` document
3. **Marketplace listing** references:
   - Source `applicationId` + `releaseId` (for tracking)
   - Bundle snapshot (for distribution)
   - Marketplace metadata (for discovery)

---

## 4. API Enhancements

### 4.1 Publish Release to Marketplace

**Endpoint:** `POST /api/marketplace/applications`

**Enhancement:** Accept `releaseId` instead of raw bundle

**Current API:**
```typescript
POST /api/marketplace/applications
{
  bundle: BundleExport,
  publish: boolean
}
```

**Enhanced API:**
```typescript
POST /api/marketplace/applications
{
  // Option 1: Publish from release (preferred)
  applicationId: string,
  releaseId: string,
  orgId: string,
  projectId: string,
  
  // Option 2: Publish raw bundle (backward compatible)
  bundle?: BundleExport,
  
  // Marketplace metadata
  marketplace: {
    summary?: string,        // Short description for marketplace
    tags?: string[],         // Additional tags beyond release
    category?: string,       // Marketplace category
    screenshots?: string[],  // Screenshot URLs
    featured?: boolean,      // Featured in marketplace
  },
  
  publish: boolean          // true = published, false = draft
}
```

**Implementation:**
1. If `releaseId` provided:
   - Load `ApplicationRelease` from org database
   - Extract `manifest` from release
   - Build `BundleExport` from release's manifest (forms/workflows)
   - Merge marketplace metadata
2. If `bundle` provided (backward compatible):
   - Use bundle directly
3. Create/update `MarketplaceApplication` document

### 4.2 Get User's Published Applications

**Endpoint:** `GET /api/marketplace/applications?publishedBy={userId}`

**Response:**
```typescript
{
  applications: MarketplaceApplication[],
  total: number
}
```

### 4.3 Update Published Application

**Endpoint:** `PUT /api/marketplace/applications/[id]`

**Body:**
```typescript
{
  marketplace?: {
    summary?: string,
    tags?: string[],
    category?: string,
    screenshots?: string[],
    featured?: boolean,
  },
  published?: boolean  // Unpublish/republish
}
```

### 4.4 Delete Published Application

**Endpoint:** `DELETE /api/marketplace/applications/[id]`

**Auth:** Only `publishedBy` user can delete

---

## 5. UI Surfaces

### 5.1 Publish from Release

**Location:** Application Releases Tab

**Flow:**
1. User views releases in Application detail page → Releases tab
2. User clicks "Publish to Marketplace" button on a release
3. `ApplicationPublishDialog` opens:
   - Pre-fills from release:
     - Version (from release)
     - Changelog (from release)
     - Forms/workflows count (from manifest)
   - User fills marketplace metadata:
     - Summary (required, 1-2 sentences)
     - Tags (multi-select, pre-filled from application tags)
     - Category (dropdown)
     - Screenshots (optional, file upload or URLs)
   - Publish options:
     - "Publish now" (published: true)
     - "Save as draft" (published: false)
   - Preview section showing how it will appear
4. On submit:
   - Calls `POST /api/marketplace/applications` with `releaseId`
   - Shows success message
   - Optionally navigates to marketplace listing

**Component:** `src/components/Projects/ApplicationPublishDialog.tsx`

### 5.2 Publish from Export Dialog

**Location:** Project Export Dialog (existing)

**Enhancement:**
- Add "Publish to Marketplace" checkbox/button
- When checked, opens `ApplicationPublishDialog` after export
- Allows publishing the exported bundle directly

**File:** `src/components/Projects/ProjectExportDialog.tsx`

### 5.3 Marketplace Navigation

**Location:** AppNavBar

**Implementation:**
- Add "Marketplace" nav item
- Icon: `Apps` or `Store` (Material UI)
- Link: `/orgs/[orgId]/marketplace`
- Position: After "Applications" or "Projects"

**File:** `src/components/Navigation/AppNavBar.tsx`

### 5.4 My Applications View

**Location:** Marketplace page

**Implementation:**
- Add "My Applications" tab/section in marketplace
- Shows user's published applications (filtered by `publishedBy`)
- Actions per application:
  - Edit metadata (opens publish dialog in edit mode)
  - Unpublish/Republish toggle
  - View stats (downloads, etc.)
  - Delete (with confirmation)
- Filter by: Published / Draft

**Component:** `src/components/Marketplace/MyApplicationsView.tsx`

---

## 6. Seed Script

### 6.1 Seed Marketplace Applications

**Script:** `scripts/seed-marketplace.ts`

**Purpose:** Populate marketplace with example applications

**Applications to Seed:**
1. **IT Help Desk** (from `examples/it-helpdesk`)
   - Category: `helpdesk`
   - Tags: `it-support`, `ticketing`, `automation`
2. **Customer Onboarding** (from templates)
   - Category: `onboarding`
   - Tags: `customer`, `onboarding`, `automation`
3. **Survey & Feedback** (from templates)
   - Category: `feedback`
   - Tags: `survey`, `feedback`, `customer-engagement`
4. **Order Processing** (from templates)
   - Category: `ecommerce`
   - Tags: `orders`, `ecommerce`, `processing`

**Implementation:**
1. Load example bundles from `examples/` or `templates/`
2. Create `ApplicationRelease` for each (in a seed org)
3. Publish releases to marketplace via API
4. Mark as `published: true`
5. Set `publishedBy: 'system'` for seeded apps

**Usage:**
```bash
npm run seed:marketplace
```

---

## 7. Database Schema

### 7.1 MarketplaceApplication (Platform DB)

**Collection:** `marketplace_applications`

**Schema:**
```typescript
interface MarketplaceApplication {
  _id?: ObjectId;
  id: string;                    // Unique marketplace ID
  manifest: ApplicationManifest; // From release
  bundle: BundleExport;          // Snapshot from release
  
  // Publishing metadata
  published: boolean;
  publishedAt?: Date;
  publishedBy: string;          // userId
  
  // Source tracking (Phase 5 addition)
  sourceApplicationId?: string;   // Original applicationId
  sourceReleaseId?: string;       // Original releaseId
  sourceOrgId?: string;            // Original orgId
  
  // Marketplace metadata
  marketplace?: {
    summary?: string;
    tags?: string[];
    category?: string;
    screenshots?: string[];
    featured?: boolean;
  };
  
  // Stats
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```javascript
db.marketplace_applications.createIndex({ published: 1, 'stats.downloads': -1 });
db.marketplace_applications.createIndex({ published: 1, publishedAt: -1 });
db.marketplace_applications.createIndex({ publishedBy: 1 });
db.marketplace_applications.createIndex({ 'manifest.category': 1, published: 1 });
db.marketplace_applications.createIndex({ 'manifest.tags': 1, published: 1 });
db.marketplace_applications.createIndex({ sourceReleaseId: 1 }); // For tracking
```

---

## 8. Implementation Plan

### 8.1 Backend Enhancements

**Task 1: Enhance Marketplace API**
- [ ] Update `POST /api/marketplace/applications` to accept `releaseId`
- [ ] Add `GET /api/marketplace/applications?publishedBy={userId}`
- [ ] Add `PUT /api/marketplace/applications/[id]`
- [ ] Add `DELETE /api/marketplace/applications/[id]`
- [ ] Add source tracking (`sourceApplicationId`, `sourceReleaseId`)

**Files:**
- `src/app/api/marketplace/applications/route.ts`
- `src/app/api/marketplace/applications/[id]/route.ts`

**Task 2: Release-to-Bundle Conversion**
- [ ] Create utility: `convertReleaseToBundle(release: ApplicationRelease)`
- [ ] Extracts forms/workflows from release manifest
- [ ] Builds `BundleExport` structure

**File:** `src/lib/marketplace/release-bundle.ts` (new)

### 8.2 UI Components

**Task 3: ApplicationPublishDialog**
- [ ] Create component for publishing releases
- [ ] Pre-fill from release data
- [ ] Marketplace metadata form
- [ ] Preview section
- [ ] Publish/Draft toggle

**File:** `src/components/Projects/ApplicationPublishDialog.tsx` (new or enhance existing)

**Task 4: Enhance ProjectExportDialog**
- [ ] Add "Publish to Marketplace" checkbox
- [ ] Open publish dialog after export
- [ ] Wire up publish flow

**File:** `src/components/Projects/ProjectExportDialog.tsx`

**Task 5: Add Publish Button to Releases Tab**
- [ ] Add "Publish to Marketplace" button per release
- [ ] Only show if release not already published (check `sourceReleaseId`)
- [ ] Open `ApplicationPublishDialog` with release context

**File:** `src/app/orgs/[orgId]/projects/[projectId]/applications/[applicationId]/page.tsx`

**Task 6: Marketplace Navigation**
- [ ] Add "Marketplace" nav item to AppNavBar
- [ ] Link to `/orgs/[orgId]/marketplace`

**File:** `src/components/Navigation/AppNavBar.tsx`

**Task 7: My Applications View**
- [ ] Create `MyApplicationsView` component
- [ ] Add tab/section in marketplace page
- [ ] Show user's published applications
- [ ] Edit/Unpublish/Delete actions

**File:** `src/components/Marketplace/MyApplicationsView.tsx` (new)
**File:** `src/app/orgs/[orgId]/marketplace/page.tsx` (enhance)

### 8.3 Seed Script

**Task 8: Marketplace Seed Script**
- [ ] Create `scripts/seed-marketplace.ts`
- [ ] Load example bundles
- [ ] Create releases for each
- [ ] Publish to marketplace
- [ ] Mark as system-published

**File:** `scripts/seed-marketplace.ts` (new)

### 8.4 Testing & Documentation

**Task 9: Testing**
- [ ] Test publish from release
- [ ] Test publish from export dialog
- [ ] Test My Applications view
- [ ] Test seed script
- [ ] Test marketplace navigation

**Task 10: Documentation**
- [ ] Update `PHASE5_IMPLEMENTATION_STATUS.md`
- [ ] Update `APPLICATIONS_DESIGN.md` with Phase 5 status
- [ ] Create user guide for publishing

---

## 9. Design Decisions

### 9.1 Releases as Source of Truth

**Decision:** Marketplace listings are created FROM releases, not independently.

**Rationale:**
- Releases are versioned snapshots (Phase 4)
- Marketplace needs versioned content
- Future: Multiple releases → multiple marketplace versions
- Traceability: Can track which release a marketplace listing came from

**Implementation:**
- `MarketplaceApplication.sourceReleaseId` links back to release
- Publishing requires an existing release (or creates one implicitly)

### 9.2 Draft vs Published

**Decision:** Support draft state for marketplace listings.

**Rationale:**
- Users may want to prepare listings before making public
- Allows editing metadata before publishing
- Matches common marketplace patterns

**Implementation:**
- `published: boolean` field
- Only `published: true` listings appear in public marketplace
- `publishedBy` user can see their drafts in "My Applications"

### 9.3 Marketplace Metadata vs Release Metadata

**Decision:** Marketplace has additional metadata beyond release.

**Rationale:**
- Release metadata: version, changelog, manifest (technical)
- Marketplace metadata: summary, tags, category, screenshots (discovery)
- Separation allows different audiences (developers vs end users)

**Implementation:**
- `MarketplaceApplication.marketplace` object contains discovery metadata
- Release metadata (`manifest`) remains in bundle for technical details

### 9.4 Seed Script Strategy

**Decision:** Seed script creates releases first, then publishes them.

**Rationale:**
- Follows same flow as user publishing
- Tests release-to-marketplace conversion
- Creates realistic data structure

**Implementation:**
- Seed script:
  1. Creates seed org/project/applications
  2. Creates releases for each
  3. Publishes releases to marketplace
  4. Marks as `publishedBy: 'system'`

---

## 10. Success Criteria

Phase 5 is complete when:

1. ✅ Users can publish applications from releases to marketplace
2. ✅ Marketplace is discoverable via navigation
3. ✅ Marketplace has seeded example applications
4. ✅ Users can manage their published applications (My Applications)
5. ✅ All API endpoints work correctly
6. ✅ UI flows are intuitive and tested

---

## 11. Future Phases (Post Phase 5)

**Phase 6:** Application Versioning in Marketplace
- Publish new versions of existing marketplace applications
- Update notifications for installed applications
- Version history and changelog display

**Phase 7:** Ratings & Reviews
- User ratings (1-5 stars)
- Written reviews
- Average rating display
- Filter/sort by rating

**Phase 8:** npm Integration
- Publish to npm registry
- Install from npm packages
- npm registry sync service

---

## 12. Summary

Phase 5 bridges **Phase 4 Releases** to **Marketplace Publishing**, enabling:

- **Publishing:** Release → Marketplace Listing
- **Discovery:** Navigation + Browse + Search
- **Content:** Seed script populates examples
- **Management:** My Applications view

This unlocks the Applications-First vision: **Applications are shareable, discoverable products**, not just internal tools.

---

**Ready for Implementation:** January 14, 2026
