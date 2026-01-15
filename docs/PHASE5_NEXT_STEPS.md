# Phase 5: Next Steps - Marketplace Publishing

**Status:** Ready to Begin  
**Spec:** `docs/PHASE5_SPEC.md`  
**Dependencies:** Phase 4 Complete ✅

---

## Quick Summary

Phase 5 connects **Application Releases** (Phase 4) to **Marketplace Publishing**, enabling users to:
1. **Publish** applications from releases to the public marketplace
2. **Discover** marketplace via navigation
3. **Manage** their published applications

---

## Implementation Checklist

### Backend (Week 1)

- [ ] **Enhance Marketplace API** (`src/app/api/marketplace/applications/route.ts`)
  - [ ] Accept `releaseId` in POST (publish from release)
  - [ ] Add `GET ?publishedBy={userId}` (My Applications)
  - [ ] Add source tracking (`sourceReleaseId`, `sourceApplicationId`)

- [ ] **Add Update/Delete Endpoints** (`src/app/api/marketplace/applications/[id]/route.ts`)
  - [ ] `PUT /api/marketplace/applications/[id]` (update metadata, unpublish/republish)
  - [ ] `DELETE /api/marketplace/applications/[id]` (delete listing)

- [ ] **Release-to-Bundle Utility** (`src/lib/marketplace/release-bundle.ts` - new)
  - [ ] `convertReleaseToBundle(release: ApplicationRelease): BundleExport`
  - [ ] Extracts forms/workflows from release manifest

### UI Components (Week 1-2)

- [ ] **ApplicationPublishDialog** (`src/components/Projects/ApplicationPublishDialog.tsx`)
  - [ ] Pre-fill from release (version, changelog, counts)
  - [ ] Marketplace metadata form (summary, tags, category, screenshots)
  - [ ] Publish/Draft toggle
  - [ ] Preview section

- [ ] **Enhance ProjectExportDialog** (`src/components/Projects/ProjectExportDialog.tsx`)
  - [ ] Add "Publish to Marketplace" checkbox
  - [ ] Open publish dialog after export

- [ ] **Add Publish Button to Releases Tab**
  - [ ] "Publish to Marketplace" button per release
  - [ ] Check if already published (show "Update" if exists)
  - [ ] Open `ApplicationPublishDialog` with release context

- [ ] **Marketplace Navigation** (`src/components/Navigation/AppNavBar.tsx`)
  - [ ] Add "Marketplace" nav item
  - [ ] Link to `/orgs/[orgId]/marketplace`

- [ ] **My Applications View** (`src/components/Marketplace/MyApplicationsView.tsx` - new)
  - [ ] Show user's published applications
  - [ ] Edit/Unpublish/Delete actions
  - [ ] Filter by Published/Draft

- [ ] **Enhance Marketplace Page** (`src/app/orgs/[orgId]/marketplace/page.tsx`)
  - [ ] Add "My Applications" tab/section

### Seed Script (Week 2)

- [ ] **Marketplace Seed Script** (`scripts/seed-marketplace.ts` - new)
  - [ ] Load example bundles (IT Help Desk, Customer Onboarding, etc.)
  - [ ] Create releases for each
  - [ ] Publish to marketplace
  - [ ] Mark as `publishedBy: 'system'`

### Testing & Docs (Week 2)

- [ ] **Testing**
  - [ ] Test publish from release
  - [ ] Test publish from export dialog
  - [ ] Test My Applications view
  - [ ] Test seed script
  - [ ] Test marketplace navigation

- [ ] **Documentation**
  - [ ] Create `PHASE5_IMPLEMENTATION_STATUS.md`
  - [ ] Update `APPLICATIONS_DESIGN.md` with Phase 5 status

---

## Priority Order

**High Priority (Week 1):**
1. Enhance Marketplace API (accept `releaseId`)
2. ApplicationPublishDialog component
3. Add publish button to Releases tab
4. Marketplace navigation

**Medium Priority (Week 1-2):**
5. My Applications view
6. Update/Delete endpoints
7. Enhance ProjectExportDialog

**Low Priority (Week 2):**
8. Seed script
9. Testing & documentation

---

## Key Files to Create/Modify

### New Files
- `src/lib/marketplace/release-bundle.ts` - Release-to-bundle conversion
- `src/components/Marketplace/MyApplicationsView.tsx` - My Applications view
- `scripts/seed-marketplace.ts` - Marketplace seed script
- `docs/PHASE5_IMPLEMENTATION_STATUS.md` - Implementation status

### Modified Files
- `src/app/api/marketplace/applications/route.ts` - Enhance POST, add GET with filter
- `src/app/api/marketplace/applications/[id]/route.ts` - Add PUT/DELETE
- `src/components/Projects/ApplicationPublishDialog.tsx` - Create or enhance
- `src/components/Projects/ProjectExportDialog.tsx` - Add publish option
- `src/app/orgs/[orgId]/projects/[projectId]/applications/[applicationId]/page.tsx` - Add publish button
- `src/components/Navigation/AppNavBar.tsx` - Add marketplace nav
- `src/app/orgs/[orgId]/marketplace/page.tsx` - Add My Applications section

---

## Success Metrics

Phase 5 is complete when:
- ✅ Users can publish applications from releases
- ✅ Marketplace is discoverable via navigation
- ✅ Marketplace has seeded example applications
- ✅ Users can manage their published applications
- ✅ All API endpoints work correctly
- ✅ UI flows are intuitive

---

## Next Phase Preview

**Phase 6** (Future):
- Application versioning in marketplace
- Update notifications for installed applications
- Version history and changelog display

---

**Ready to Start:** January 14, 2026
