# Navigation Improvements: Applications-First Hierarchy

**Status:** Draft  
**Priority:** High (Before Phase 10)  
**Timeline:** 1-2 weeks

---

## Overview

This document addresses navigation improvements to better reflect the "applications-first" philosophy and reduce cognitive overload. The goal is to make Applications feel like the parent container, not a peer to Forms/Workflows/Data.

---

## Current State Analysis

### What's Working ✅

1. **Primary nav categories are correct**: Projects · Applications · Forms · Workflows · Data · Marketplace
2. **Visual weight**: Applications is emphasized (green accent, center position)
3. **Card metadata**: Forms/workflows/connections shown at a glance
4. **Status badges**: Clear and restrained

### Issues Identified ⚠️

1. **Everything looks equal**: Forms, Workflows, Data appear as peers to Applications
2. **No ownership boundary**: Can't distinguish "My Applications" vs "Installed" vs "System"
3. **Cards blur system vs user intent**: System apps, templates, and user apps look identical
4. **Forms/Workflows/Data too prominent**: They compete with Applications for attention

---

## Proposed Changes

### 1. Navigation Hierarchy Restructure

**Current Structure:**
```
[Projects] [Applications] [Forms] [Workflows] [Data] [Marketplace]
```

**Proposed Structure:**
```
[Projects] [Applications] ──────────────── [Marketplace]
              │
              ├─ Forms (contextual)
              ├─ Workflows (contextual)
              └─ Data (contextual)
```

**Implementation Options:**

**Option A: Visual Grouping (Low Risk)**
- Add subtle divider/grouping in nav
- Visually de-emphasize Forms/Workflows/Data (slightly smaller, muted)
- Keep Applications prominent

**Option B: Nested Navigation (Medium Risk)**
- Forms/Workflows/Data become sub-items under Applications
- Only show when inside an application context
- Global access via dropdown or secondary nav

**Option C: Contextual Navigation (Higher Risk)**
- Forms/Workflows/Data only visible when inside an application
- Global views accessible via Applications page tabs

**Recommendation:** Start with **Option A** (visual grouping), then consider **Option B** if needed.

### 2. Applications Page: Ownership Tabs

**Current:** "All Applications" | "Installed"

**Proposed:** "My Applications" | "Installed" | "System"

**Tab Definitions:**
- **My Applications**: Applications created by current user or org (default)
- **Installed**: Marketplace applications installed in this project
- **System**: Default/system applications (e.g., "General – Default Application")

**Visual Treatment:**
- My Applications: Full color, editable affordances
- Installed: Subtle marketplace icon/badge, upgrade indicators
- System: Muted colors, lock icon, read-only indicators

### 3. Application Card Lifecycle Signals

**Current:** All cards look identical (except "Default" badge)

**Proposed:** Visual distinction by lifecycle:

**System Applications:**
- Muted border color (gray)
- Lock icon in corner
- "System" badge
- Reduced opacity (0.85)
- No edit/delete actions

**Installed Applications:**
- Marketplace icon/badge (small, top-right)
- "Installed" badge
- Update available indicator (if applicable)
- Full color, but distinct from user apps

**User Applications:**
- Full color, full opacity
- Editable affordances visible
- No special badges (default state)

**Template/Starter Applications:**
- "Template" badge
- Subtle pattern or icon
- Distinct from both system and user apps

### 4. Card Metadata Enhancements

**Add to Cards:**
- **Source indicator**: Small icon showing where app came from (user-created, marketplace, system)
- **Contract status**: If app has active contract, show lock icon
- **Last modified by**: Show who last edited (for team collaboration)
- **Installation date**: For installed apps, show when installed

### 5. Forms/Workflows/Data: Contextual Access

**Current:** Always visible in top nav

**Proposed Approaches:**

**Approach 1: Secondary Navigation (Recommended)**
- Keep Forms/Workflows/Data in nav but visually de-emphasized
- Add divider/grouping to show hierarchy
- When inside an application, show contextual tabs (Forms, Workflows, Data) within that app

**Approach 2: Applications-First Access**
- Remove Forms/Workflows/Data from top nav
- Access via Applications page → Select app → See Forms/Workflows/Data tabs
- Global views accessible via "All Forms" / "All Workflows" links in Applications page

**Approach 3: Hybrid**
- Keep Forms/Workflows/Data in nav but smaller/muted
- Add "View All" links in Applications page
- Emphasize that these are "implementation details" of applications

**Recommendation:** Start with **Approach 1** (visual de-emphasis), gather feedback, then consider Approach 2 if needed.

---

## Implementation Plan

### Phase 1: Visual Hierarchy (Week 1)

**Step 1.1: Navigation Grouping**
- Add visual divider/grouping in AppNavBar
- Group: `[Projects] [Applications] ── [Forms] [Workflows] [Data] ── [Marketplace]`
- De-emphasize Forms/Workflows/Data (smaller font, muted colors, reduced opacity)

**Step 1.2: Applications Page Tabs**
- Change "All Applications" → "My Applications"
- Add "System" tab
- Update tab styling to show ownership

**Step 1.3: Card Lifecycle Signals**
- Add `applicationSource` field to Application type: `'user' | 'installed' | 'system' | 'template'`
- Update ApplicationCard to show lifecycle indicators
- Add badges/icons for each source type

**Files to Modify:**
- `src/components/Navigation/AppNavBar.tsx`
- `src/app/orgs/[orgId]/projects/[projectId]/applications/page.tsx`
- `src/components/Applications/ApplicationCard.tsx` (extract from page)
- `src/types/application.ts`

### Phase 2: Ownership & Source Tracking (Week 1-2)

**Step 2.1: Application Source Detection**
- Detect source when loading applications:
  - `system`: `isDefault === true` or specific system app IDs
  - `installed`: Check `installedApplications` collection
  - `template`: Check if created from template
  - `user`: Default for user-created apps

**Step 2.2: Filtering Logic**
- Filter applications by source for each tab
- "My Applications": `source === 'user' || source === 'template'`
- "Installed": `source === 'installed'`
- "System": `source === 'system'`

**Step 2.3: Card Visual Treatment**
- System apps: Muted colors, lock icon, read-only
- Installed apps: Marketplace badge, update indicators
- User apps: Full color, editable

**Files to Modify:**
- `src/lib/platform/applications.ts` (add source detection)
- `src/app/orgs/[orgs]/projects/[projectId]/applications/page.tsx` (filtering)
- `src/components/Applications/ApplicationCard.tsx` (visual treatment)

### Phase 3: Contextual Navigation (Week 2, Optional)

**Step 3.1: Application Context Bar**
- Add context bar when inside an application
- Shows: `Applications > [App Name] > [Forms | Workflows | Data]`
- Breadcrumb navigation

**Step 3.2: Forms/Workflows/Data De-emphasis**
- Reduce visual weight in top nav
- Add tooltip: "Access via Applications"
- Consider moving to secondary nav or dropdown

**Files to Create/Modify:**
- `src/components/Navigation/ApplicationContextBar.tsx` (new)
- `src/components/Navigation/AppNavBar.tsx` (update)
- Application detail pages (add context bar)

---

## Detailed Specifications

### Navigation Visual Hierarchy

**Current:**
```tsx
<Box sx={{ display: 'flex', gap: 0.5 }}>
  <NavItem>Projects</NavItem>
  <NavItem>Applications</NavItem>
  <NavItem>Forms</NavItem>
  <NavItem>Workflows</NavItem>
  <NavItem>Data</NavItem>
  <NavItem>Marketplace</NavItem>
</Box>
```

**Proposed:**
```tsx
<Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
  {/* Organizational */}
  <NavItem>Projects</NavItem>
  
  {/* Primary: Applications */}
  <NavItem emphasized>Applications</NavItem>
  
  {/* Divider */}
  <Divider orientation="vertical" flexItem sx={{ height: 24, mx: 1 }} />
  
  {/* Implementation Details (de-emphasized) */}
  <NavItem deEmphasized>Forms</NavItem>
  <NavItem deEmphasized>Workflows</NavItem>
  <NavItem deEmphasized>Data</NavItem>
  
  {/* Divider */}
  <Divider orientation="vertical" flexItem sx={{ height: 24, mx: 1 }} />
  
  {/* Distribution */}
  <NavItem>Marketplace</NavItem>
</Box>
```

**Styling for de-emphasized items:**
- Font size: 0.8125rem (vs 0.875rem)
- Opacity: 0.6 (vs 1.0)
- Font weight: 400 (vs 500)
- Hover: Slight opacity increase (0.8)

### Application Source Types

```typescript
export type ApplicationSource = 'user' | 'installed' | 'system' | 'template';

export interface Application {
  // ... existing fields ...
  source?: ApplicationSource;  // Auto-detected, not stored
  installedFrom?: {
    marketplaceApplicationId: string;
    installedVersion: string;
    installedAt: Date;
  };
}
```

**Detection Logic:**
```typescript
function detectApplicationSource(application: Application, installedApps: InstalledApplication[]): ApplicationSource {
  // System apps
  if (application.isDefault || application.name === 'General – Default Application') {
    return 'system';
  }
  
  // Installed apps
  const installed = installedApps.find(
    inst => inst.marketplaceApplicationId === application.marketplaceApplicationId
  );
  if (installed) {
    return 'installed';
  }
  
  // Template apps (check metadata)
  if (application.tags?.includes('template') || application.createdFromTemplate) {
    return 'template';
  }
  
  // Default: user-created
  return 'user';
}
```

### Card Visual Treatment

**System Applications:**
```tsx
<Card sx={{
  borderColor: 'divider',
  opacity: 0.85,
  bgcolor: alpha(theme.palette.background.paper, 0.5),
  '&:hover': {
    opacity: 0.9,
    // No transform
  }
}}>
  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
    <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
  </Box>
  <Chip label="System" size="small" color="default" />
</Card>
```

**Installed Applications:**
```tsx
<Card sx={{
  borderColor: alpha('#00ED64', 0.3),
  position: 'relative',
}}>
  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
    <Storefront sx={{ fontSize: 16, color: '#00ED64' }} />
  </Box>
  <Chip 
    label="Installed" 
    size="small" 
    sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }}
  />
  {hasUpdate && <UpdateBadge />}
</Card>
```

**User Applications:**
```tsx
<Card sx={{
  borderColor: 'divider',
  // Full opacity, full color
  // Editable affordances visible
}}>
  {/* No special badges - this is the default */}
</Card>
```

### Tab Structure

**Applications Page Tabs:**
```tsx
<Tabs value={activeTab}>
  <Tab 
    label="My Applications" 
    icon={<Person />}
    iconPosition="start"
  />
  <Tab 
    label="Installed" 
    icon={<Storefront />}
    iconPosition="start"
    badge={updatesAvailable > 0 ? updatesAvailable : undefined}
  />
  <Tab 
    label="System" 
    icon={<Lock />}
    iconPosition="start"
  />
</Tabs>
```

---

## Migration Strategy

### Backward Compatibility

1. **Default Source**: If source not detected, default to `'user'` (no breaking changes)
2. **Existing Apps**: All existing apps treated as "My Applications" initially
3. **System Detection**: Use `isDefault` flag and name patterns to detect system apps
4. **Installed Detection**: Query `installedApplications` collection to match

### Data Migration

**No database changes required** - source is computed, not stored.

**Optional Enhancement:** Store `source` field for performance, but compute on-the-fly initially.

---

## Success Criteria

✅ **Visual Hierarchy:**
- Applications clearly emphasized in navigation
- Forms/Workflows/Data visually de-emphasized
- Clear grouping/divider shows hierarchy

✅ **Ownership Clarity:**
- Users can distinguish "My Applications" from "Installed" from "System"
- Cards show lifecycle signals (badges, icons, colors)
- Tabs provide clear filtering

✅ **Cognitive Load Reduction:**
- Navigation feels calmer, more intentional
- Users understand Applications are the parent
- Forms/Workflows/Data feel like implementation details

✅ **Contract Integration:**
- System/installed apps show lock indicators
- Users understand which apps are "contracts" vs "editable"
- Visual signals align with Phase 9 contract protection

---

## Testing Checklist

- [ ] Navigation grouping visible and clear
- [ ] Applications tab shows correct filtering (My/Installed/System)
- [ ] Cards show correct lifecycle indicators
- [ ] System apps are read-only (no edit/delete)
- [ ] Installed apps show marketplace badge
- [ ] User apps show full editing capabilities
- [ ] Forms/Workflows/Data are de-emphasized but still accessible
- [ ] Mobile navigation works correctly
- [ ] No breaking changes to existing functionality

---

## Future Considerations

### Phase 10 Integration

These navigation improvements set the stage for Phase 10 (Application Permissions):
- System apps: Only owners can modify
- Installed apps: Permission-based access
- User apps: Full permission control

### Advanced Navigation (Future)

- **Application Context Bar**: Show breadcrumb when inside an application
- **Quick Switch**: Dropdown to switch between applications
- **Recent Applications**: Show recently accessed apps
- **Application Search**: Global search across all applications

---

*Last Updated: January 15, 2026*
