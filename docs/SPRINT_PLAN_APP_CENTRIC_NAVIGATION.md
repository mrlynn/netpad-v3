# Sprint Plan: Application-Centric Navigation Implementation

**Sprint Duration:** 2 Weeks
**Start Date:** TBD
**Team:** Claude (AI Assistant) + Cursor (Auto)
**Reference:** [ORGANIZATION_APPLICATION-CENTRIC_ARCHITECTURE.md](./ORGANIZATION_APPLICATION-CENTRIC_ARCHITECTURE.md)

---

## Sprint Overview

This sprint transforms NetPad from a hierarchy-first navigation model to an application-centric one, where users think in terms of "switching apps" rather than "drilling through folders."

### Current State Assessment
- ✅ Application model and APIs exist
- ✅ ApplicationContextBar component exists (but limited usage)
- ✅ URL structure supports org/project/application hierarchy
- ✅ OrganizationContext pattern established
- ❌ No ApplicationContext for global app state
- ❌ No persistent app switcher in main navigation
- ❌ No user preferences for recent/last applications
- ❌ No keyboard shortcuts for app switching
- ❌ ApplicationContextBar only on app detail pages

---

## Phase 1: Foundation (Days 1-4)

### 1.1 Create ApplicationContext Provider
**Assignee:** Claude
**Effort:** 4 hours
**Files:**
- `src/contexts/ApplicationContext.tsx` (new)
- `src/app/layout.tsx` (modify)

**Description:**
Create a new React context that manages the current application state globally, following the pattern established by OrganizationContext.

**Implementation Details:**
```typescript
interface ApplicationContextType {
  currentApplication: Application | null;
  recentApplications: Application[];
  isLoading: boolean;

  // Methods
  selectApplication: (appId: string) => Promise<void>;
  refreshApplications: () => Promise<void>;
  clearApplicationContext: () => void;
}
```

**Acceptance Criteria:**
- [ ] ApplicationContext exports provider and hook (useApplication)
- [ ] Current application persisted to localStorage
- [ ] Context syncs with URL parameters when available
- [ ] Context loads last application on mount if no URL context
- [ ] Recent applications tracked (last 10)
- [ ] Integration with existing OrganizationContext
- [ ] TypeScript types properly defined

**Test Criteria:**
- [ ] Unit test: Context provides expected values
- [ ] Unit test: selectApplication updates state and localStorage
- [ ] Unit test: Recent applications capped at 10
- [ ] Integration test: Context syncs with URL changes

---

### 1.2 Create useApplications SWR Hook
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/lib/swr/useApplications.ts` (new)
- `src/lib/swr/index.ts` (modify)

**Description:**
Create an SWR hook for fetching applications, following the pattern of useCollections. This provides caching, revalidation, and optimistic updates.

**Implementation Details:**
```typescript
interface UseApplicationsOptions {
  orgId?: string;
  projectId?: string;
  status?: 'draft' | 'active' | 'archived';
  includeStats?: boolean;
}

interface UseApplicationsReturn {
  applications: Application[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
  total: number;
}
```

**Acceptance Criteria:**
- [ ] Hook fetches from /api/applications with proper query params
- [ ] Respects org and project context
- [ ] Provides loading and error states
- [ ] Supports filtering by status
- [ ] Exports mutate function for manual revalidation
- [ ] Follows existing SWR patterns in codebase

**Test Criteria:**
- [ ] Mock API test: Returns applications correctly
- [ ] Mock API test: Handles error states
- [ ] Test: Caches results between renders

---

### 1.3 Create Recent Applications API
**Assignee:** Claude
**Effort:** 3 hours
**Files:**
- `src/app/api/applications/recent/route.ts` (new)
- `src/app/api/applications/[applicationId]/access/route.ts` (new)
- `src/lib/platform/applications.ts` (modify)
- `src/lib/platform/userPreferences.ts` (new)

**Description:**
Create backend APIs for tracking and retrieving recent applications per user.

**Implementation Details:**
```typescript
// GET /api/applications/recent
// Returns user's recent applications sorted by lastAccessedAt

// POST /api/applications/:id/access
// Records that user accessed this application, updates recency

// User preferences stored in database (new collection or user document)
interface UserPreferences {
  userId: string;
  lastApplicationId?: string;
  recentApplicationIds: string[];
  collapsedProjectIds: string[];
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- [ ] GET /api/applications/recent returns up to 10 recent apps
- [ ] POST /api/applications/:id/access updates lastAccessedAt
- [ ] User preferences persisted to database
- [ ] Endpoints respect RBAC permissions
- [ ] Recent list doesn't include deleted/archived apps

**Test Criteria:**
- [ ] API test: Recent apps sorted correctly
- [ ] API test: Access updates timestamp
- [ ] API test: Respects user permissions
- [ ] API test: Handles non-existent app IDs gracefully

---

### 1.4 Create Applications Grouped API
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/app/api/applications/grouped/route.ts` (new)

**Description:**
Create an API endpoint that returns applications grouped by project for the app switcher UI.

**Implementation Details:**
```typescript
// GET /api/applications/grouped?orgId=X
// Response:
interface GroupedApplicationsResponse {
  success: boolean;
  groups: Array<{
    project: { id: string; name: string; };
    applications: Application[];
  }>;
  ungrouped: Application[]; // Apps without project
  total: number;
}
```

**Acceptance Criteria:**
- [ ] Returns applications grouped by project
- [ ] Each group includes project metadata
- [ ] Handles apps without project assignment
- [ ] Respects user permissions
- [ ] Efficient aggregation query

**Test Criteria:**
- [ ] API test: Correct grouping structure
- [ ] API test: Includes all accessible apps
- [ ] API test: Handles empty projects

---

## Phase 2: Application Switcher UI (Days 5-7)

### 2.1 Create Application Switcher Modal
**Assignee:** Claude
**Effort:** 6 hours
**Files:**
- `src/components/Navigation/ApplicationSwitcher.tsx` (new)
- `src/components/Navigation/ApplicationSwitcherItem.tsx` (new)
- `src/components/Navigation/ApplicationSwitcherGroup.tsx` (new)

**Description:**
Create the main application switcher modal that opens via Cmd+K or header click. This is the primary navigation component for switching between applications.

**Implementation Details:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search applications...                            ⌘K   │
├─────────────────────────────────────────────────────────────┤
│  RECENT                                                     │
│    🎫 IT Help Desk                        IT Systems        │
│    📋 Job Applications                    HR                │
├─────────────────────────────────────────────────────────────┤
│  IT SYSTEMS                                           ▾     │
│    🎫 IT Help Desk                                          │
│    🖥️ Asset Tracker                                         │
├─────────────────────────────────────────────────────────────┤
│  + Create new application                                   │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Modal opens via Cmd+K / Ctrl+K keyboard shortcut
- [ ] Modal opens via header app name click
- [ ] Search input filters applications in real-time (<50ms)
- [ ] Recent applications section shows last 5 accessed
- [ ] Applications grouped by project (collapsible sections)
- [ ] Keyboard navigation (↑/↓ arrows, Enter, Escape)
- [ ] Click outside or Escape closes modal
- [ ] Selection navigates to application and closes modal
- [ ] "Create new application" action at bottom
- [ ] Empty state when no applications exist
- [ ] Loading state while fetching

**Test Criteria:**
- [ ] Unit test: Renders with applications
- [ ] Unit test: Search filters correctly
- [ ] Unit test: Keyboard navigation works
- [ ] Unit test: Selection triggers navigation
- [ ] Visual test: Matches design spec
- [ ] A11y test: Keyboard accessible

---

### 2.2 Add Keyboard Shortcut Handler
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/hooks/useKeyboardShortcuts.ts` (new or modify if exists)
- `src/components/Navigation/ApplicationSwitcher.tsx` (integrate)

**Description:**
Implement global keyboard shortcut handling for the application switcher and other navigation actions.

**Implementation Details:**
```typescript
// Global shortcuts
Cmd/Ctrl + K: Open application switcher
Escape: Close any open modal
Cmd/Ctrl + /: Show keyboard shortcuts help
```

**Acceptance Criteria:**
- [ ] Cmd+K / Ctrl+K opens app switcher globally
- [ ] Shortcuts work from any page
- [ ] Shortcuts don't conflict with browser defaults
- [ ] Shortcuts disabled when in input fields (configurable)
- [ ] Hook reusable for other shortcuts

**Test Criteria:**
- [ ] Test: Cmd+K triggers callback
- [ ] Test: Shortcut ignored in input fields
- [ ] Test: Multiple shortcuts registered correctly

---

### 2.3 Update Header with App Context
**Assignee:** Claude
**Effort:** 4 hours
**Files:**
- `src/components/Navigation/AppNavBar.tsx` (modify)
- `src/components/Navigation/AppContextHeader.tsx` (new)

**Description:**
Update the main navigation header to prominently display the current application with a clickable dropdown that opens the switcher.

**Implementation Details:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [NetPad Logo]   🎫 IT Help Desk ▼         [Search] [Notifications] [👤]│
│                 Acme Corp · IT Systems                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [Forms]    [Workflows]    [Data]    [Settings]    [Deploy]             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] App name + icon prominent in header (replaces current structure)
- [ ] Org · Project shown as secondary text below app name
- [ ] Clicking app name opens switcher modal
- [ ] Dropdown indicator (▼) on app name
- [ ] App icon/color displayed if set
- [ ] Graceful fallback when no app selected
- [ ] Responsive: collapses appropriately on mobile
- [ ] Matches existing design system

**Test Criteria:**
- [ ] Visual test: Header renders correctly
- [ ] Test: Click opens switcher
- [ ] Test: Displays correct app info
- [ ] Responsive test: Mobile layout works

---

### 2.4 Integrate Switcher with Navigation Flow
**Assignee:** Cursor
**Effort:** 3 hours
**Files:**
- `src/components/Navigation/AppNavBar.tsx` (modify)
- `src/contexts/ApplicationContext.tsx` (integrate)

**Description:**
Wire up the application switcher to actually navigate users when they select an app, and ensure context is updated appropriately.

**Acceptance Criteria:**
- [ ] Selecting app in switcher navigates to /apps/[slug]/forms
- [ ] Current app context updates immediately
- [ ] Recent apps list updates on selection
- [ ] URL changes reflected in header
- [ ] Back/forward browser buttons work correctly
- [ ] Tab navigation items update based on app context

**Test Criteria:**
- [ ] Integration test: Full navigation flow
- [ ] Test: Context updates on navigation
- [ ] Test: Browser history maintained

---

## Phase 3: Context Persistence & Auto-Navigation (Days 8-9)

### 3.1 Implement Auto-Navigate on Login
**Assignee:** Claude
**Effort:** 3 hours
**Files:**
- `src/app/page.tsx` (modify)
- `src/contexts/ApplicationContext.tsx` (modify)
- `src/lib/auth/redirects.ts` (new or modify)

**Description:**
When a user logs in, automatically redirect them to their last-used application instead of requiring manual navigation.

**Implementation Details:**
```typescript
// Login flow logic:
1. User authenticates
2. Check user preferences for lastApplicationId
3. If exists and accessible: redirect to /apps/[slug]/forms
4. If user has exactly one app: redirect to that app
5. If no apps: show create app prompt or app switcher
6. If URL specifies destination: honor that instead
```

**Acceptance Criteria:**
- [ ] On login, redirect to last-used application
- [ ] If no last app but user has one app, go to that app
- [ ] If no apps, show application switcher/create prompt
- [ ] Respect URL if user navigated to specific deep link
- [ ] Handle race condition: preferences load vs. initial render
- [ ] Show loading state during resolution
- [ ] Handle case where last app was deleted/access revoked

**Test Criteria:**
- [ ] Test: Redirects to last app on login
- [ ] Test: Single app auto-select works
- [ ] Test: Deep link preserved
- [ ] Test: Deleted app handled gracefully

---

### 3.2 Implement LocalStorage Sync
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/contexts/ApplicationContext.tsx` (modify)
- `src/lib/storage/applicationPreferences.ts` (new)

**Description:**
Implement localStorage caching for application context that syncs with the server-side preferences, providing fast initial loads.

**Implementation Details:**
```typescript
const STORAGE_KEYS = {
  LAST_APP_ID: 'netpad_last_application_id',
  RECENT_APPS: 'netpad_recent_applications',
  COLLAPSED_PROJECTS: 'netpad_collapsed_projects',
};

// Sync strategy:
// 1. On load: Use localStorage for immediate UI
// 2. Fetch server preferences async
// 3. Merge/update localStorage if server differs
// 4. On change: Update both localStorage and server
```

**Acceptance Criteria:**
- [ ] Last application ID cached in localStorage
- [ ] Recent apps list cached in localStorage
- [ ] Collapsed project states cached
- [ ] Sync with server preferences on load
- [ ] Update both on changes
- [ ] Handle localStorage unavailable (private browsing)

**Test Criteria:**
- [ ] Test: localStorage saves correctly
- [ ] Test: Server sync works
- [ ] Test: Fallback when localStorage unavailable

---

### 3.3 Update URL Structure (New Routes)
**Assignee:** Claude
**Effort:** 4 hours
**Files:**
- `src/app/apps/[appSlug]/forms/page.tsx` (new)
- `src/app/apps/[appSlug]/workflows/page.tsx` (new)
- `src/app/apps/[appSlug]/data/page.tsx` (new)
- `src/app/apps/[appSlug]/settings/page.tsx` (new)
- `src/app/apps/[appSlug]/layout.tsx` (new)
- `src/lib/routing.ts` (modify)

**Description:**
Create simplified URL routes that put applications first, inferring org/project from the application.

**Implementation Details:**
```
New routes:
/apps/:appSlug/forms         → Application forms list
/apps/:appSlug/workflows     → Application workflows list
/apps/:appSlug/data          → Application data explorer
/apps/:appSlug/settings      → Application settings

// App slug uniqueness enforced within organization
// Org determined from authenticated user + app lookup
```

**Acceptance Criteria:**
- [ ] /apps/:appSlug/forms routes to application forms
- [ ] /apps/:appSlug/workflows routes to application workflows
- [ ] /apps/:appSlug/data routes to application data explorer
- [ ] /apps/:appSlug/settings routes to application settings
- [ ] App layout provides application context
- [ ] Org/project inferred from application lookup
- [ ] Handle ambiguous slugs (same name, different orgs) with selector

**Test Criteria:**
- [ ] Test: All new routes render correctly
- [ ] Test: Context populated from app lookup
- [ ] Test: 404 for non-existent apps
- [ ] Test: Permission denied handled

---

### 3.4 Implement Legacy URL Redirects
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/middleware.ts` (modify or create)
- `src/lib/routing.ts` (modify)

**Description:**
Add redirects from old URL structure to new simplified structure, ensuring bookmarks and shared links continue working.

**Implementation Details:**
```typescript
// Redirect mappings:
/orgs/:org/projects/:proj/applications/:app/forms
  → /apps/:appSlug/forms (301)

/orgs/:org/projects/:proj/applications/:app/workflows
  → /apps/:appSlug/workflows (301)

// Preserve query parameters
// Log redirects for monitoring
```

**Acceptance Criteria:**
- [ ] Old URLs redirect to new structure with 301
- [ ] Query parameters preserved in redirect
- [ ] All old routes have corresponding redirects
- [ ] Redirects work for nested resources (forms/:id, etc.)
- [ ] Internal links updated to new format

**Test Criteria:**
- [ ] Test: Each old route redirects correctly
- [ ] Test: 301 status code used
- [ ] Test: Query params preserved

---

## Phase 4: Polish & Edge Cases (Day 10)

### 4.1 Handle Multi-Org Users
**Assignee:** Claude
**Effort:** 2 hours
**Files:**
- `src/components/Navigation/AppNavBar.tsx` (modify)
- `src/components/Navigation/ApplicationSwitcher.tsx` (modify)

**Description:**
For users with access to multiple organizations, show appropriate context and handle app switching across orgs.

**Acceptance Criteria:**
- [ ] Multi-org users see org indicator in header (subtle)
- [ ] App switcher groups apps by org when user has multiple orgs
- [ ] Org name shown in app switcher items
- [ ] Switching to app in different org updates org context
- [ ] Single-org users see no org indicator (clean UI)

**Test Criteria:**
- [ ] Test: Multi-org user sees org indicator
- [ ] Test: Single-org user sees no indicator
- [ ] Test: Cross-org switch updates context

---

### 4.2 Empty States & Error Handling
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/components/Navigation/ApplicationSwitcher.tsx` (modify)
- `src/components/Navigation/EmptyAppState.tsx` (new)

**Description:**
Implement graceful empty states and error handling throughout the navigation flow.

**Acceptance Criteria:**
- [ ] Empty state when user has no applications (with create CTA)
- [ ] Error state when app list fails to load
- [ ] Retry mechanism for failed loads
- [ ] Graceful handling if current app deleted/access revoked
- [ ] Loading skeleton during app fetch
- [ ] Offline state handling

**Test Criteria:**
- [ ] Test: Empty state renders create button
- [ ] Test: Error state shows retry
- [ ] Test: Deleted app redirects appropriately

---

### 4.3 Performance Optimization
**Assignee:** Claude
**Effort:** 2 hours
**Files:**
- `src/components/Navigation/ApplicationSwitcher.tsx` (modify)
- `src/lib/swr/useApplications.ts` (modify)

**Description:**
Ensure the application switcher performs well even with many applications.

**Acceptance Criteria:**
- [ ] Switcher opens in <100ms
- [ ] Search filters in <50ms
- [ ] Virtualize list if >50 applications
- [ ] SWR caching prevents redundant fetches
- [ ] Prefetch apps on hover over switcher trigger

**Test Criteria:**
- [ ] Performance test: Open time <100ms
- [ ] Performance test: Search time <50ms
- [ ] Test: Large app list renders smoothly

---

### 4.4 Accessibility & Mobile
**Assignee:** Cursor
**Effort:** 2 hours
**Files:**
- `src/components/Navigation/ApplicationSwitcher.tsx` (modify)
- `src/components/Navigation/AppNavBar.tsx` (modify)

**Description:**
Ensure all navigation components are fully accessible and work well on mobile.

**Acceptance Criteria:**
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on all buttons and regions
- [ ] Focus management in modal (focus trap)
- [ ] Screen reader announces app changes
- [ ] Mobile: Touch-friendly tap targets
- [ ] Mobile: Switcher adapts to small screens
- [ ] Mobile: Swipe gestures for navigation (optional)

**Test Criteria:**
- [ ] A11y audit passes
- [ ] Screen reader test
- [ ] Mobile viewport test

---

### 4.5 QA & Integration Testing
**Assignee:** Claude + Cursor
**Effort:** 4 hours (split)

**Description:**
Comprehensive testing of all navigation paths and edge cases.

**Test Scenarios:**
- [ ] New user: First login → Create app → Navigate
- [ ] Returning user: Login → Auto-navigate to last app
- [ ] Multi-app user: Switch between apps via switcher
- [ ] Multi-org user: Switch apps across organizations
- [ ] Deep link: Share URL → Opens correct app context
- [ ] Old URL: Bookmark with old format → Redirects correctly
- [ ] Delete app: Current app deleted → Graceful handling
- [ ] Permissions: Access revoked → Appropriate error
- [ ] Offline: Network failure → Cached state works
- [ ] Performance: 100+ apps → Still responsive

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] No accessibility violations
- [ ] Performance budgets met

---

## Summary: Assignment Distribution

### Claude (AI Assistant) Tasks
| Phase | Task | Effort |
|-------|------|--------|
| 1.1 | ApplicationContext Provider | 4h |
| 1.3 | Recent Applications API | 3h |
| 2.1 | Application Switcher Modal | 6h |
| 2.3 | Header with App Context | 4h |
| 3.1 | Auto-Navigate on Login | 3h |
| 3.3 | New URL Routes | 4h |
| 4.1 | Multi-Org Handling | 2h |
| 4.3 | Performance Optimization | 2h |
| 4.5 | QA (partial) | 2h |
| **Total** | | **30h** |

### Cursor (Auto) Tasks
| Phase | Task | Effort |
|-------|------|--------|
| 1.2 | useApplications SWR Hook | 2h |
| 1.4 | Grouped Applications API | 2h |
| 2.2 | Keyboard Shortcut Handler | 2h |
| 2.4 | Switcher Navigation Integration | 3h |
| 3.2 | LocalStorage Sync | 2h |
| 3.4 | Legacy URL Redirects | 2h |
| 4.2 | Empty States & Error Handling | 2h |
| 4.4 | Accessibility & Mobile | 2h |
| 4.5 | QA (partial) | 2h |
| **Total** | | **19h** |

---

## Definition of Done

A task is complete when:
1. ✅ All acceptance criteria met
2. ✅ All test criteria passing
3. ✅ Code reviewed and approved
4. ✅ No TypeScript errors
5. ✅ No ESLint warnings
6. ✅ Accessible (keyboard + screen reader)
7. ✅ Responsive (mobile + desktop)
8. ✅ Documentation updated if needed

---

## Success Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Clicks to switch apps | 3-4 | 1 | Manual audit |
| Time to first form (new user) | ~60s | <20s | Analytics funnel |
| App switcher usage | N/A | 80%+ | Feature analytics |
| Keyboard nav usage | N/A | 20%+ | Shortcut analytics |
| Page load (with context) | N/A | <500ms | Performance monitoring |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User confusion during transition | Medium | Medium | In-app tooltip; changelog |
| URL redirects break external links | Low | High | Comprehensive redirect testing |
| Performance with many apps | Low | Medium | Virtualization; pagination |
| Multi-org edge cases | Low | Low | Dedicated QA for multi-org |
| Conflict with existing shortcuts | Medium | Low | Audit existing shortcuts first |

---

## Dependencies

1. **No blocking dependencies** - All APIs and components can be built independently
2. **Suggested order:**
   - Phase 1 tasks can run in parallel
   - Phase 2.1 requires 1.2 (SWR hook)
   - Phase 2.3 requires 2.1 (switcher component)
   - Phase 3 requires Phase 2 complete
   - Phase 4 requires Phase 3 complete

---

## Post-Sprint Considerations

Out of scope but recommended for future sprints:
1. **Favorites/Pinning** - Pin frequently-used apps
2. **Application Templates** - Pre-built app scaffolds
3. **Cross-App Search** - Search forms/workflows across apps
4. **Team Views** - Different defaults for team members
5. **Application Archiving** - Soft-delete without losing data

---

*Document created: January 2025*
*Last updated: Sprint planning session*
