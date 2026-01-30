# RBAC Feature Analysis: CLI vs Admin UI

**Date:** 2026-01-30  
**Branch:** `feature/rbac-cli-management`

## Executive Summary

The CLI now has comprehensive RBAC management commands. The Admin UI needs matching functionality for feature parity. This document maps CLI capabilities to required UI components.

---

## Feature Comparison Matrix

| Feature | CLI Command | API Endpoint | Admin UI | Status |
|---------|-------------|--------------|----------|--------|
| **Users** |
| List org members | `users list` | `GET /api/platform/orgs/{orgId}/members` | ❌ Missing | 🔴 |
| Invite user | `users add <email>` | `POST /api/platform/orgs/{orgId}/invitations` | ❌ Missing | 🔴 |
| Remove user | `users remove <email>` | `DELETE /api/platform/orgs/{orgId}/members/{id}` | ❌ Missing | 🔴 |
| View user details | `users info <email>` | `GET /api/platform/orgs/{orgId}/members/{id}` | ❌ Missing | 🔴 |
| Update user role | `users update --role` | `PATCH /api/platform/orgs/{orgId}/members/{id}` | ❌ Missing | 🔴 |
| **Groups** |
| List groups | `groups list` | `GET /api/platform/orgs/{orgId}/groups` | ❌ Missing | 🔴 |
| Create group | `groups create` | `POST /api/platform/orgs/{orgId}/groups` | ❌ Missing | 🔴 |
| Delete group | `groups delete` | `DELETE /api/platform/orgs/{orgId}/groups/{id}` | ❌ Missing | 🔴 |
| View group | `groups info` | `GET /api/platform/orgs/{orgId}/groups/{id}` | ❌ Missing | 🔴 |
| Add member to group | `groups add-member` | `PATCH /api/platform/orgs/{orgId}/groups/{id}` | ❌ Missing | 🔴 |
| Remove member | `groups remove-member` | `PATCH /api/platform/orgs/{orgId}/groups/{id}` | ❌ Missing | 🔴 |
| **Roles** |
| List roles | `roles list` | `GET /api/platform/orgs/{orgId}/roles` | ❌ Missing | 🔴 |
| Create custom role | `roles create` | `POST /api/platform/orgs/{orgId}/roles` | ❌ Missing | 🔴 |
| Delete custom role | `roles delete` | `DELETE /api/platform/orgs/{orgId}/roles/{id}` | ❌ Missing | 🔴 |
| View role permissions | `roles info` | `GET /api/platform/orgs/{orgId}/roles/{id}` | ❌ Missing | 🔴 |
| Grant permission | `roles grant` | `PATCH /api/platform/orgs/{orgId}/roles/{id}` | ❌ Missing | 🔴 |
| Revoke permission | `roles revoke` | `PATCH /api/platform/orgs/{orgId}/roles/{id}` | ❌ Missing | 🔴 |
| **Assignments** |
| Assign role | `assign user/group` | `POST /api/platform/orgs/{orgId}/assignments` | ❌ Missing | 🔴 |
| Remove assignment | `unassign user/group` | `DELETE /api/platform/orgs/{orgId}/assignments` | ❌ Missing | 🔴 |
| View assignments | - | `GET /api/platform/orgs/{orgId}/assignments` | ❌ Missing | 🔴 |
| **Permissions** |
| List all permissions | `permissions list` | (static list) | ❌ Missing | 🔴 |
| Check permission | `permissions check` | `GET /api/platform/users/me/permissions` | ❌ Missing | 🔴 |
| View user perms | `whoami --effective` | `GET /api/platform/users/me/permissions` | ❌ Missing | 🔴 |

---

## Required Admin UI Pages

### 1. Organization Members Page
**Route:** `/orgs/[orgId]/settings/members`

**Components needed:**
- MembersTable
  - Columns: Avatar, Email, Name, Role, Joined, Last Active, Actions
  - Row actions: Edit Role, Remove
- InviteMemberDialog
  - Email input
  - Role selector (owner/admin/member/viewer)
- EditMemberDialog
  - Change role
  - View permissions

**Mockup:**
```
┌────────────────────────────────────────────────────────────┐
│ Organization Members                    [+ Invite Member] │
├────────────────────────────────────────────────────────────┤
│ 🔍 Search members...                                       │
├────────────────────────────────────────────────────────────┤
│ ○ EMAIL                ROLE      JOINED       ACTIONS      │
│ ──────────────────────────────────────────────────────────│
│ • mike@example.com     Owner     Jan 1, 2026  [...]       │
│ • jane@example.com     Admin     Jan 15, 2026 [Edit][Rm]  │
│ • bob@example.com      Member    Jan 20, 2026 [Edit][Rm]  │
└────────────────────────────────────────────────────────────┘
```

### 2. Groups Management Page
**Route:** `/orgs/[orgId]/settings/groups`

**Components needed:**
- GroupsTable
  - Columns: Name, Description, Members Count, Default Role, Actions
  - Row actions: View, Edit, Delete
- CreateGroupDialog
  - Name, Description, Default Role
- GroupDetailPanel
  - Group info
  - Members list with add/remove
  - Role assignments

**Mockup:**
```
┌────────────────────────────────────────────────────────────┐
│ Groups                                    [+ Create Group] │
├────────────────────────────────────────────────────────────┤
│ NAME              MEMBERS   DEFAULT ROLE   ACTIONS         │
│ ──────────────────────────────────────────────────────────│
│ Engineering       12        Member         [View][Edit][⌫] │
│ Billing Team      3         Viewer         [View][Edit][⌫] │
│ Admins            2         Admin          [View][Edit][⌫] │
└────────────────────────────────────────────────────────────┘
```

### 3. Roles Management Page
**Route:** `/orgs/[orgId]/settings/roles`

**Components needed:**
- RolesTable
  - Columns: Name, Type (builtin/custom), Base Role, Permissions Count
  - Builtin roles: Read-only, show permissions
  - Custom roles: Edit, Delete
- CreateRoleDialog
  - Name, Description, Base Role
- RoleDetailPanel
  - Permission checkboxes grouped by category
  - Inheritance visualization

**Mockup:**
```
┌────────────────────────────────────────────────────────────┐
│ Roles                                     [+ Create Role]  │
├────────────────────────────────────────────────────────────┤
│ ROLE NAME         TYPE       PERMISSIONS    ACTIONS        │
│ ──────────────────────────────────────────────────────────│
│ 🔒 Owner          Built-in   45             [View]         │
│ 🔒 Admin          Built-in   38             [View]         │
│ 🔒 Member         Built-in   22             [View]         │
│ 🔒 Viewer         Built-in   12             [View]         │
│ ──────────────────────────────────────────────────────────│
│ ✏️ Billing Admin   Custom     15             [Edit][⌫]     │
│ ✏️ Form Reviewer   Custom     8              [Edit][⌫]     │
└────────────────────────────────────────────────────────────┘
```

### 4. Role Assignments Page (or integrate into Members/Groups)
**Route:** `/orgs/[orgId]/settings/access` (or inline)

Shows who has what role, both direct and via groups.

---

## Required Components

### Shared Components
1. **PermissionSelector** - Grouped checkboxes for selecting permissions
2. **RoleBadge** - Colored badge showing role (owner=red, admin=yellow, etc.)
3. **UserAvatar** - Avatar with email tooltip
4. **ConfirmDeleteDialog** - Reusable deletion confirmation
5. **InheritanceIndicator** - Shows where permission comes from

### API Hooks
1. `useOrgMembers(orgId)` - List/invite/remove/update members
2. `useOrgGroups(orgId)` - CRUD groups
3. `useOrgRoles(orgId)` - List/create/update/delete roles
4. `useRoleAssignments(orgId)` - Manage assignments
5. `useMyPermissions(orgId)` - Current user's effective permissions

---

## Implementation Priority

### Phase 1: Core Member Management (High Priority)
1. `/orgs/[orgId]/settings/members/page.tsx` - List, invite, remove
2. Member role editing
3. Pending invitations view

### Phase 2: Groups (Medium Priority)
1. `/orgs/[orgId]/settings/groups/page.tsx`
2. Group CRUD
3. Member management within groups

### Phase 3: Custom Roles (Lower Priority - Enterprise)
1. `/orgs/[orgId]/settings/roles/page.tsx`
2. Role CRUD (custom only)
3. Permission assignment UI

### Phase 4: Advanced Features
1. Role assignment with scoping (project/form level)
2. Time-limited access
3. Audit log integration

---

## Navigation Integration

Add to org settings navigation:

```typescript
// src/app/orgs/[orgId]/settings/layout.tsx
const settingsNav = [
  { label: 'General', href: '/settings' },
  { label: 'Members', href: '/settings/members' },    // NEW
  { label: 'Groups', href: '/settings/groups' },      // NEW  
  { label: 'Roles', href: '/settings/roles' },        // NEW (Enterprise)
  { label: 'Billing', href: '/settings/billing' },
  { label: 'Integrations', href: '/settings/integrations' },
];
```

---

## Existing Admin UI to Audit

Current `/admin` pages that may need RBAC integration:
- `/admin/users` - Platform-level user management (different from org members)
- `/admin/audit-logs` - Should show RBAC-related events

---

## Notes

1. **Permission Gating**: All new pages must check user permissions before rendering
2. **Mobile Responsive**: Tables should collapse to cards on mobile
3. **Consistency**: Follow existing NetPad design patterns (MUI, dark theme)
4. **Error Handling**: Show permission denied gracefully
5. **Optimistic Updates**: Use SWR/React Query for smooth UX

---

## Files to Create

```
src/app/orgs/[orgId]/settings/
├── layout.tsx              # Settings nav wrapper
├── page.tsx                # General settings (redirect or overview)
├── members/
│   └── page.tsx            # Member management
├── groups/
│   └── page.tsx            # Group management
└── roles/
    └── page.tsx            # Role management (enterprise)

src/components/rbac/
├── MembersTable.tsx
├── InviteMemberDialog.tsx
├── GroupsTable.tsx
├── CreateGroupDialog.tsx
├── GroupDetailPanel.tsx
├── RolesTable.tsx
├── CreateRoleDialog.tsx
├── PermissionSelector.tsx
├── RoleBadge.tsx
└── index.ts

src/hooks/
├── useOrgMembers.ts
├── useOrgGroups.ts
├── useOrgRoles.ts
└── useMyPermissions.ts
```

---

## Estimated Effort

| Component | Effort | Notes |
|-----------|--------|-------|
| Members page + components | 4-6 hours | Core functionality |
| Groups page + components | 4-6 hours | Similar patterns |
| Roles page + components | 6-8 hours | Permission UI is complex |
| Hooks + API integration | 2-3 hours | Shared utilities |
| Navigation + layout | 1-2 hours | Wiring |
| Testing | 2-4 hours | Unit + integration |

**Total estimate: 19-29 hours**

---

*Generated by Moltbot after implementing CLI RBAC commands*
