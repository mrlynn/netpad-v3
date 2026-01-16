# NetPad Strategic Position Paper
## Application-Centric Navigation Architecture

**Document Version:** 1.0  
**Date:** January 2025  
**Author:** Product & Architecture  
**Audience:** Engineering Team  
**Status:** Approved for Sprint Planning

---

## Executive Summary

NetPad's current navigation model requires users to traverse a hierarchy (Organization → Project → Application) before reaching their work. While this structure provides necessary governance and multi-tenancy support, it creates friction that contradicts how developers actually think about their work.

**The core insight:** Developers think in terms of *applications they've built*, not organizational hierarchies they must navigate. The IT Help Desk, the Customer Feedback system, the Job Application portal—these are the mental anchors, not "Acme Corp's IT Systems project."

**Our strategic direction:** Elevate Applications to first-class navigation citizens while preserving Organization and Project as supporting metadata. Users should feel like they're "switching apps" rather than "drilling through folders."

---

## Problem Statement

### Current State

```
User Login
    ↓
Select Organization (if multiple)
    ↓
Select Project
    ↓
Select Application
    ↓
Finally: Access Forms/Workflows
```

Each layer introduces a decision point and cognitive load. For users with simple setups (one org, few projects), this feels bureaucratic. For power users with complex setups, it's repetitive navigation they perform dozens of times daily.

### Observed Pain Points

| Issue | Impact | Frequency |
|-------|--------|-----------|
| Cold start friction | New users abandon before creating first form | High |
| Context amnesia | "Where was that form I was editing?" | High |
| Switching overhead | 3+ clicks to move between applications | Daily |
| URL complexity | Links are long, hard to share/remember | Medium |
| Mental model confusion | "What's the difference between project and application?" | Onboarding |

### Why This Matters Now

As NetPad scales to support more complex use cases (IT help desks, multi-form workflows, enterprise deployments), navigation friction compounds. A 3-second delay repeated 50 times daily costs users 2.5 minutes—and more importantly, breaks their flow state.

---

## Strategic Direction

### Guiding Principle

> **Applications are what developers build and understand. Make them the star. Let Organization and Project play supporting roles.**

### The Mental Model Shift

| Concept | Old Role | New Role |
|---------|----------|----------|
| **Organization** | Navigation container | Auth/billing context (implicit) |
| **Project** | Navigation container | Grouping attribute (metadata) |
| **Application** | Leaf node to find | Primary navigation target |
| **Forms/Workflows** | The actual work | Components within app context |

### Target User Experience

**Before (Hierarchy-First):**
```
User thinks: "Let me find where that app lives"

[Select Org] → [Select Project] → [Select App] → [Work]
```

**After (App-First):**
```
User thinks: "I want to work on Help Desk"

[Switch to Help Desk] → [Work]
```

---

## Architecture Decisions

### Decision 1: Application Switcher as Primary Navigation

**What:** A unified application switcher (accessible via `Cmd+K` / `Ctrl+K` or header dropdown) becomes the primary way users navigate between contexts.

**Behavior:**
- Recent applications always shown first (80% of navigation is to recently-used apps)
- Applications grouped by Project (collapsible sections)
- Type-ahead search filters instantly
- Organization shown as subtle context, not navigation step
- Single action to switch—no intermediate screens

**Rationale:** Mirrors patterns from tools developers already use (VS Code's `Cmd+P`, Slack's `Cmd+K`, Linear's navigation). Reduces clicks from 3+ to 1.

### Decision 2: Persistent Application Context

**What:** Once an application is selected, it remains the active context until explicitly changed. Context persists across:
- Page refreshes
- Browser sessions (via localStorage)
- New tabs (via URL structure)

**Behavior:**
- On login, auto-navigate to last-used application
- If user has only one application, skip selection entirely
- URL always reflects current application (enables sharing/bookmarking)

**Rationale:** Eliminates "context amnesia" and respects user intent.

### Decision 3: Simplified URL Structure

**Current:**
```
/organizations/{orgSlug}/projects/{projectSlug}/applications/{appSlug}/forms/{formSlug}
```

**Proposed:**
```
/{orgSlug}/{appSlug}/forms/{formSlug}
```

Or if org can be inferred from subdomain/auth:
```
/apps/{appSlug}/forms/{formSlug}
```

**Rationale:** 
- Project is metadata, not a routing concern
- Shorter URLs are easier to share and remember
- App slug uniqueness scoped to organization (enforced at creation)

**Migration:** Old URLs redirect to new structure (301 permanent redirects).

### Decision 4: Project as Application Attribute

**What:** Project becomes a property of an Application, manageable in Application Settings, rather than a navigation container.

**Implications:**
- Applications can be reassigned to different projects
- Project selection happens at app creation (with smart defaults)
- Portfolio/reporting views group by project for administrative purposes
- Project CRUD moves to a dedicated "Projects" section in org settings

**Rationale:** Aligns data model with mental model. Developers think "this app belongs to the IT project" not "I must enter the IT project to find this app."

### Decision 5: Organization Context Handling

**Single-org users (majority):**
- Organization is completely invisible in navigation
- Inferred from authentication
- Appears only in account/billing settings

**Multi-org users (agencies, consultants, enterprise):**
- Subtle org indicator in header
- Org switcher in account menu (not primary nav)
- App switcher shows org context when apps span multiple orgs

---

## UI/UX Specifications

### Primary Header Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [NetPad Logo]   🎫 IT Help Desk ▼         [Search] [Notifications] [👤]│
│                 Acme Corp · IT Systems                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [Forms]    [Workflows]    [Data]    [Settings]    [Deploy]             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Elements:**
- **App name + icon:** Primary, prominent, clickable (opens switcher)
- **Org · Project:** Secondary line, muted text, informational only
- **Tab navigation:** Scoped to current application

### Application Switcher Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔍 Search applications...                                      ⌘K     │
├─────────────────────────────────────────────────────────────────────────┤
│  RECENT                                                                 │
│    🎫 IT Help Desk                              IT Systems              │
│    📋 Job Applications                          HR                      │
│    ⭐ Customer Feedback                         Product                 │
│─────────────────────────────────────────────────────────────────────────│
│  IT SYSTEMS                                                       ▾     │
│    🎫 IT Help Desk                                                      │
│    🖥️ Asset Tracker                                                     │
│    📊 Outage Reports                                                    │
│─────────────────────────────────────────────────────────────────────────│
│  HR                                                               ▾     │
│    📋 Job Applications                                                  │
│    📝 Employee Onboarding                                               │
│─────────────────────────────────────────────────────────────────────────│
│  + Create new application                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- `↑/↓` arrows navigate list
- `Enter` selects highlighted app
- Typing filters results instantly
- `Esc` closes modal
- Click outside closes modal
- Project groups are collapsible (state persisted)

### Create Application Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Create New Application                                           ✕     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ IT Help Desk                                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Project                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ IT Systems                                                    ▼ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│    └─ Or create a new project...                                        │
│                                                                         │
│  Start from                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  Blank  │ │Help Desk│ │Feedback │ │  Portal │ │  More...│          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                         │
│                                              [Cancel]  [Create App]     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Project defaults to last-used project
- Template selection optional (blank is default)
- Single "Create" action—no multi-step wizard

---

## Data Model Implications

### Current Relationships
```
Organization (1) ──────< Project (N)
Project (1) ──────< Application (N)
Application (1) ──────< Form (N)
Application (1) ──────< Workflow (N)
```

### Proposed Changes

**No structural changes to relationships.** The hierarchy remains for data integrity and access control. Changes are purely navigational/presentational.

**New fields/indexes:**
```typescript
// Application model additions
interface Application {
  // ... existing fields
  
  lastAccessedAt: Date;        // For "recent" sorting
  lastAccessedBy: ObjectId;    // Per-user recency (optional)
  icon: string;                // Emoji or icon identifier
  color: string;               // Brand color for visual distinction
}

// User preferences additions
interface UserPreferences {
  // ... existing fields
  
  lastApplicationId: ObjectId;           // Auto-navigate on login
  recentApplicationIds: ObjectId[];      // For switcher "recent" section
  collapsedProjectIds: ObjectId[];       // Switcher UI state
}
```

### API Considerations

**New endpoints:**
```
GET  /api/applications/recent          # User's recent apps (sorted)
GET  /api/applications/grouped         # Apps grouped by project (for switcher)
POST /api/applications/:id/access      # Record access (updates lastAccessedAt)
```

**Deprecated patterns:**
```
# Phase out explicit org/project selection flows
# Old URLs still work but redirect
```

---

## Sprint Plan

### Sprint Goal

> Enable application-centric navigation so users can switch between applications in a single action, with automatic context persistence across sessions.

### Sprint Duration
2 weeks (10 working days)

---

### Phase 1: Foundation (Days 1-4)

#### Task 1.1: Application Switcher Component
**Effort:** 3 days  
**Owner:** Frontend  

**Acceptance Criteria:**
- [ ] Modal opens via `Cmd+K` / `Ctrl+K` keyboard shortcut
- [ ] Modal opens via header app name click
- [ ] Search input filters applications in real-time (<50ms)
- [ ] Recent applications section shows last 5 accessed
- [ ] Applications grouped by project (collapsible)
- [ ] Keyboard navigation (arrows, enter, escape)
- [ ] Click outside / Escape closes modal
- [ ] Selection navigates to application and closes modal

**Technical Notes:**
- Use existing modal/dialog component system
- Implement as global component (available on all pages)
- Consider virtualization if user has 100+ apps (unlikely but possible)

#### Task 1.2: Recent Applications API
**Effort:** 1 day  
**Owner:** Backend  

**Acceptance Criteria:**
- [ ] `GET /api/applications/recent` returns user's 10 most recent apps
- [ ] `GET /api/applications/grouped` returns all accessible apps grouped by project
- [ ] `POST /api/applications/:id/access` updates lastAccessedAt timestamp
- [ ] Endpoints respect existing RBAC/permissions

**Technical Notes:**
- Add `lastAccessedAt` field to Application model
- Consider per-user tracking (separate collection) vs. global timestamp
- Index on `lastAccessedAt` for query performance

#### Task 1.3: User Preferences Storage
**Effort:** 1 day  
**Owner:** Backend  

**Acceptance Criteria:**
- [ ] Store `lastApplicationId` in user preferences
- [ ] Store `recentApplicationIds` array (max 10)
- [ ] API to update preferences on application access
- [ ] Preferences loaded with auth/session

---

### Phase 2: Context Persistence (Days 5-7)

#### Task 2.1: Auto-Navigate on Login
**Effort:** 1 day  
**Owner:** Frontend  

**Acceptance Criteria:**
- [ ] On login, redirect to last-used application (if exists)
- [ ] If no last application, show application switcher
- [ ] If user has exactly one application, go directly to it
- [ ] Respect URL if user navigated to specific deep link

**Technical Notes:**
- Handle race condition: preferences load vs. initial render
- Consider loading state/skeleton during resolution

#### Task 2.2: LocalStorage Fallback
**Effort:** 0.5 days  
**Owner:** Frontend  

**Acceptance Criteria:**
- [ ] Cache last application ID in localStorage
- [ ] Use as fallback if API preferences not yet loaded
- [ ] Sync localStorage when API preferences update

#### Task 2.3: Header Redesign
**Effort:** 1.5 days  
**Owner:** Frontend  

**Acceptance Criteria:**
- [ ] App name + icon prominent in header
- [ ] Org · Project shown as secondary text below app name
- [ ] Clicking app name opens switcher
- [ ] Dropdown indicator on app name
- [ ] Responsive: collapses appropriately on mobile

---

### Phase 3: URL Simplification (Days 8-9)

#### Task 3.1: New URL Routes
**Effort:** 1 day  
**Owner:** Full-stack  

**Acceptance Criteria:**
- [ ] `/apps/:appSlug/forms` routes to application forms
- [ ] `/apps/:appSlug/workflows` routes to application workflows
- [ ] `/apps/:appSlug/data` routes to application data explorer
- [ ] `/apps/:appSlug/settings` routes to application settings
- [ ] App slug uniqueness enforced within organization

**Technical Notes:**
- Determine org from authenticated user context
- Handle edge case: user has access to same-named apps in different orgs (rare)

#### Task 3.2: Legacy URL Redirects
**Effort:** 1 day  
**Owner:** Full-stack  

**Acceptance Criteria:**
- [ ] Old URLs (`/organizations/.../applications/...`) redirect to new structure
- [ ] 301 permanent redirect (SEO-friendly)
- [ ] All internal links updated to new format
- [ ] Documentation updated

---

### Phase 4: Polish & QA (Day 10)

#### Task 4.1: Edge Case Handling
**Effort:** 0.5 days  
**Owner:** Frontend  

**Acceptance Criteria:**
- [ ] Multi-org users see org indicator (subtle, in header)
- [ ] Empty state: user with no applications sees create prompt
- [ ] Permission denied: graceful handling if app deleted/access revoked
- [ ] Loading states for all async operations

#### Task 4.2: QA & Bug Fixes
**Effort:** 0.5 days  
**Owner:** Team  

**Acceptance Criteria:**
- [ ] Test all navigation paths
- [ ] Test keyboard accessibility
- [ ] Test on mobile viewports
- [ ] Performance check: switcher opens in <100ms

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Clicks to switch apps | 3-4 | 1 | Manual audit |
| Time to first form (new user) | ~60s | <20s | Analytics funnel |
| App switcher usage | N/A | 80%+ of navigation | Feature analytics |
| Support tickets re: "can't find" | Baseline | -50% | Support queue |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User confusion during transition | Medium | Medium | In-app tooltip explaining new nav; changelog announcement |
| URL redirects break external links | Low | High | Comprehensive redirect mapping; test with known external links |
| Performance degradation (large app counts) | Low | Medium | Virtualize switcher list; paginate API responses |
| Multi-org edge cases | Low | Low | Dedicated QA for multi-org accounts |

---

## Future Considerations (Post-Sprint)

These items are explicitly **out of scope** for this sprint but should be considered for future work:

1. **Project Management UI:** Dedicated section for creating/managing projects (currently embedded in navigation)

2. **Application Templates:** Pre-built apps (Help Desk, Feedback, etc.) that scaffold forms + workflows

3. **Favorites/Pinning:** Let users pin frequently-used apps to top of switcher

4. **Team/Shared Views:** Different default apps for different team members

5. **Application Archiving:** Soft-delete apps without losing data

6. **Cross-App Search:** Search for forms/workflows across all applications

---

## Appendix A: Competitive Reference

| Product | Navigation Model | What We Can Learn |
|---------|------------------|-------------------|
| **Notion** | Workspace → Pages (flat + nested) | Sidebar with recent, favorites, then hierarchy |
| **Linear** | Workspace → Team → Issues | `Cmd+K` for everything; team is subtle context |
| **Figma** | Org → Team → Project → File | Recent files prominent; project is metadata |
| **Vercel** | Team → Project → Deployment | Project switcher is primary nav |
| **Retool** | Org → App | Simple two-level; app is primary |

**Common pattern:** Recent/favorites first, hierarchy second, powerful search always available.

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Organization** | Top-level tenant; owns billing, team membership, SSO configuration |
| **Project** | Logical grouping of applications; used for portfolio management and reporting |
| **Application** | A complete solution (e.g., IT Help Desk); contains forms and workflows that work together |
| **Form** | Data collection interface; belongs to exactly one application |
| **Workflow** | Automation logic; triggered by forms or schedules; belongs to exactly one application |
| **Context** | The currently-active organization + project + application scope |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product | | | |
| Engineering Lead | | | |
| Design | | | |

---

*This document represents our strategic direction for Q1 2025. Implementation details may evolve during development; significant deviations should be discussed with the product team.*