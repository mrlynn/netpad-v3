# Marketplace Next Steps

## Current State

✅ **Completed:**
- Marketplace API endpoints (list, detail, download, import)
- Marketplace UI (browse, search, filter, view details)
- Application export/import with connections
- Application cards and detail dialogs

## Priority Enhancements

### 1. **Publish to Marketplace UI** (High Priority)
**Problem**: Users can export applications but can't publish them to marketplace
**Solution**: Add "Publish to Marketplace" option in ProjectExportDialog

**Implementation:**
- Add "Publish" checkbox/button in ProjectExportDialog
- Create ApplicationPublishDialog component
- Allow users to:
  - Set marketplace metadata (summary, tags, category)
  - Choose to publish immediately or save as draft
  - Preview how it will appear in marketplace
- Call POST `/api/marketplace/applications` endpoint

**Files to Create/Modify:**
- `src/components/Projects/ApplicationPublishDialog.tsx` (new)
- `src/components/Projects/ProjectExportDialog.tsx` (enhance)

### 2. **Navigation Integration** (High Priority)
**Problem**: Marketplace is not easily discoverable
**Solution**: Add marketplace link to navigation

**Implementation:**
- Add marketplace nav item to AppNavBar
- Use Apps/Store icon
- Link to `/orgs/[orgId]/marketplace`

**Files to Modify:**
- `src/components/Navigation/AppNavBar.tsx`

### 3. **Seed Example Applications** (High Priority)
**Problem**: Empty marketplace is not useful
**Solution**: Create seed script to populate marketplace with example applications

**Implementation:**
- Create seed script that publishes example applications:
  - IT Help Desk (from examples/it-helpdesk)
  - Customer Onboarding
  - Survey & Feedback
  - Order Processing
- Use existing template examples as base
- Run on deployment or via admin script

**Files to Create:**
- `scripts/seed-marketplace.ts`
- `scripts/marketplace-applications/` (example bundles)

### 4. **My Applications Management** (Medium Priority)
**Problem**: Users can't manage their published applications
**Solution**: Add "My Applications" page/section

**Implementation:**
- Add "My Applications" tab/section in marketplace
- Show user's published applications
- Allow:
  - Edit metadata
  - Unpublish/republish
  - View stats (downloads, etc.)
  - Delete
- Filter by published/draft status

**Files to Create:**
- `src/components/Marketplace/MyApplicationsView.tsx`
- `src/app/api/marketplace/applications/[id]/route.ts` (add PUT/DELETE)

### 5. **Application Versioning** (Medium Priority)
**Problem**: No way to update published applications
**Solution**: Support versioning in marketplace

**Implementation:**
- Allow publishing new versions of existing applications
- Show version history
- Allow users to import specific versions
- Auto-increment version numbers
- Show "Update available" for imported applications

**Files to Modify:**
- `src/types/template.ts` (enhance ApplicationManifest)
- `src/app/api/marketplace/applications/[id]/route.ts`
- `src/components/Marketplace/ApplicationDetailDialog.tsx`

### 6. **Enhanced Search & Discovery** (Medium Priority)
**Problem**: Basic search may not be enough
**Solution**: Improve search and add discovery features

**Implementation:**
- Full-text search across all fields
- Tag-based filtering
- "Featured" applications section
- "Recently Added" section
- "Most Popular" section
- Related applications suggestions

**Files to Modify:**
- `src/app/api/marketplace/applications/route.ts` (enhance search)
- `src/components/Marketplace/MarketplaceView.tsx` (add sections)

### 7. **Application Ratings & Reviews** (Low Priority)
**Problem**: No social proof or feedback mechanism
**Solution**: Add ratings and reviews system

**Implementation:**
- Allow users to rate applications (1-5 stars)
- Allow written reviews
- Show average rating and review count
- Filter by rating
- Sort by rating

**Files to Create:**
- `src/app/api/marketplace/applications/[id]/reviews/route.ts`
- `src/components/Marketplace/ApplicationReviewDialog.tsx`
- Database schema for reviews

### 8. **Application Analytics** (Low Priority)
**Problem**: Publishers can't see how their apps are performing
**Solution**: Add analytics dashboard for published applications

**Implementation:**
- Show download trends
- Show import success/failure rates
- Show user feedback
- Export analytics data

**Files to Create:**
- `src/components/Marketplace/ApplicationAnalytics.tsx`
- `src/app/api/marketplace/applications/[id]/analytics/route.ts`

## Recommended Implementation Order

1. **Navigation Integration** (Quick win, improves discoverability)
2. **Publish to Marketplace UI** (Enables content creation)
3. **Seed Example Applications** (Populates marketplace)
4. **My Applications Management** (Enables content management)
5. **Application Versioning** (Enables updates)
6. **Enhanced Search & Discovery** (Improves UX)
7. **Ratings & Reviews** (Adds social features)
8. **Analytics** (Adds insights)

## Quick Wins (Can Do Now)

1. **Add Marketplace to Navigation** - 15 minutes
2. **Add Publish Button to Export Dialog** - 30 minutes
3. **Create Seed Script** - 1 hour
4. **Add "My Applications" Filter** - 1 hour

## Technical Considerations

### Database Indexes
Ensure proper indexes for marketplace queries:
```javascript
db.marketplace_applications.createIndex({ "manifest.category": 1, published: 1 });
db.marketplace_applications.createIndex({ "manifest.tags": 1, published: 1 });
db.marketplace_applications.createIndex({ "stats.downloads": -1, published: 1 });
db.marketplace_applications.createIndex({ publishedAt: -1, published: 1 });
db.marketplace_applications.createIndex({ publishedBy: 1 });
```

### Performance
- Consider caching popular applications
- Paginate large result sets (already implemented)
- Lazy load application details

### Security
- Validate bundle structure before publishing
- Sanitize user input in metadata
- Rate limit publishing
- Consider moderation queue for new applications
