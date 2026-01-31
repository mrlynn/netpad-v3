# RBAC Feature Parity Matrix

## Overview

This document tracks feature parity between the three RBAC interfaces:
- **CLI**: `@netpad/cli` package
- **Terminal**: In-app web terminal (`/terminal`)
- **Web UI**: Admin and org settings pages

---

## Feature Matrix

### Users / Members Management

| Feature | CLI | Terminal | Web UI (Org) | Web UI (Admin) | API |
|---------|:---:|:--------:|:------------:|:--------------:|:---:|
| List org members | ✅ `users list` | ✅ `users list` | ✅ `/orgs/[orgId]/settings/members` | ✅ `/admin/users` | ✅ `/api/platform/orgs/[orgId]/members` |
| Invite user | ✅ `users add` | ✅ `users add` | ✅ Members page | ❌ | ✅ `/api/platform/orgs/[orgId]/invitations` |
| Remove user | ✅ `users remove` | ✅ `users remove` | ✅ Members page | ❌ | ✅ `/api/platform/orgs/[orgId]/members/[id]` DELETE |
| View user info | ✅ `users info` | ✅ `users info` | ✅ Click user | ✅ `/admin/users` | ✅ |
| Update user role | ✅ `users update --role` | ✅ `users update` | ✅ Members page | ❌ | ✅ PATCH |
| Search users | ❌ | ❌ | ✅ | ✅ | ✅ |

### Groups Management

| Feature | CLI | Terminal | Web UI (Org) | Web UI (Admin) | API |
|---------|:---:|:--------:|:------------:|:--------------:|:---:|
| List groups | ✅ `groups list` | ✅ `groups list` | ✅ `/orgs/[orgId]/settings/groups` | ✅ `/admin/groups` | ✅ `/api/platform/orgs/[orgId]/groups` |
| Create group | ✅ `groups create` | ✅ `groups create` | ✅ Create dialog | ✅ Create dialog | ✅ POST |
| Delete group | ✅ `groups delete` | ✅ `groups delete` | ✅ Delete action | ✅ Delete action | ✅ DELETE |
| View group info | ✅ `groups info` | ✅ `groups info` | ✅ Click group | ❌ | ✅ GET |
| Add member to group | ✅ `groups add-member` | ✅ `groups add-member` | ✅ Dialog | ❌ | ✅ PATCH |
| Remove member from group | ✅ `groups remove-member` | ✅ `groups remove-member` | ✅ Dialog | ❌ | ✅ PATCH |
| Set default role | ✅ `--default-role` | ❓ | ✅ Form | ✅ Form | ✅ |

### Roles Management

| Feature | CLI | Terminal | Web UI (Org) | Web UI (Admin) | API |
|---------|:---:|:--------:|:------------:|:--------------:|:---:|
| List roles (builtin) | ✅ `roles list` | ✅ `roles list` | ✅ `/orgs/[orgId]/settings/roles` | ✅ `/admin/roles` | ✅ |
| List custom roles | ✅ `roles list` | ✅ `roles list` | ✅ | ✅ | ✅ |
| Create custom role | ✅ `roles create` | ✅ `roles create` | ✅ Create dialog | ✅ Create dialog | ✅ POST |
| Delete custom role | ✅ `roles delete` | ✅ `roles delete` | ✅ Delete action | ✅ Delete action | ✅ DELETE |
| View role permissions | ✅ `roles info` | ✅ `roles info` | ✅ View dialog | ✅ View dialog | ✅ GET |
| Edit role permissions | ✅ | ✅ | ✅ Edit dialog | ✅ Edit dialog | ✅ PATCH |

### Role Assignments (Connecting Users ↔ Roles)

| Feature | CLI | Terminal | Web UI (Org) | Web UI (Admin) | API |
|---------|:---:|:--------:|:------------:|:--------------:|:---:|
| Assign role to user | ✅ `assign` | ✅ `assign` | ✅ `/settings/assignments` | ❌ View only | ✅ `/api/platform/orgs/[orgId]/assignments` |
| Assign role to group | ✅ `assign --group` | ✅ `assign` | ✅ `/settings/assignments` | ❌ View only | ✅ |
| Unassign role | ✅ `unassign` | ✅ `unassign` | ✅ `/settings/assignments` | ❌ View only | ✅ DELETE |
| View role assignments | ✅ | ✅ | ✅ `/settings/assignments` | ✅ `/admin/assignments` | ✅ |
| Scoped assignments (project/form) | ✅ `--scope` | ✅ `--scope` | ❌ UI pending | ❌ | ✅ |

### Permissions

| Feature | CLI | Terminal | Web UI (Org) | Web UI (Admin) | API |
|---------|:---:|:--------:|:------------:|:--------------:|:---:|
| List all permissions | ✅ `permissions list` | ✅ `permissions list` | ❌ | ❌ | N/A (code) |
| Check user permission | ✅ `permissions check` | ✅ `permissions check` | ❌ | ❌ | ✅ |
| View user's effective perms | ✅ `permissions user` | ✅ `permissions user` | ✅ Members → View Permissions | ❌ | ✅ |

---

## Key Gaps (Resolved)

### ✅ 1. Role Assignments UI (COMPLETED)

**Solution**: Added `/orgs/[orgId]/settings/assignments` page with:
- Assign roles to users or groups
- View all assignments in filterable table
- Delete assignments
- Reason tracking for audit

### ✅ 2. Effective Permissions View (COMPLETED)

**Solution**: Added "View Permissions" dialog to Members page:
- Shows all permission sources (direct role, groups, assignments)
- Displays the final merged permission set
- Counts total permissions

### 3. Admin Member Management (LOW PRIORITY)

**Problem**: `/admin/users` shows all platform users but can't manage org membership.

**Consider**: Adding "Manage Org Membership" actions from admin view.

### 4. Scoped Assignments UI (FUTURE)

**Problem**: API supports project/form-level scoped assignments, but UI doesn't expose this yet.

**Consider**: Adding scope selection to the assignment dialog.

---

## Proposed Solutions

### Solution 1: Add Assignments UI to Org Settings

Add `/orgs/[orgId]/settings/assignments` page:

```typescript
// UI elements needed:
// 1. Table of all role assignments (user + group)
// 2. "Assign Role" button → dialog with:
//    - Target type (user/group)
//    - Target selection (dropdown)
//    - Role selection (builtin + custom)
//    - Scope selection (org/project/form)
// 3. Delete assignment action
```

### Solution 2: Add Role Assignment to User/Group Detail Views

Enhance existing pages:
- User detail → "Role Assignments" tab
- Group detail → "Role Assignments" tab

### Solution 3: Add Effective Permissions Dialog

Add "View Permissions" action to user rows that shows:
```
User: alice@acme.com
Effective Permissions:
├─ From org membership (admin):
│  └─ forms:*, workflows:*, members:view...
├─ From group "Engineering" (default: member):
│  └─ (inherited from admin)
├─ From direct assignment (role_billing_admin):
│  └─ billing:*, invoices:*
└─ Final: 47 permissions
```

---

## Action Items

1. [x] Create `/orgs/[orgId]/settings/assignments` page
2. [x] Add "Assign Role" dialog component
3. [x] Add "View Permissions" dialog to members list
4. [x] Add `/admin/assignments` for platform admins (view-only)
5. [ ] Add assignments tab to user detail view (optional enhancement)
6. [ ] Add assignments tab to group detail view (optional enhancement)
7. [ ] Add scoped assignment support to UI (project/form level)

---

## API Reference

### Existing APIs (Already Built)

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/platform/orgs/[orgId]/members` | GET, POST | List/add members |
| `/api/platform/orgs/[orgId]/members/[id]` | GET, PATCH, DELETE | Manage member |
| `/api/platform/orgs/[orgId]/groups` | GET, POST | List/create groups |
| `/api/platform/orgs/[orgId]/groups/[id]` | GET, PATCH, DELETE | Manage group |
| `/api/platform/orgs/[orgId]/roles` | GET, POST | List/create roles |
| `/api/platform/orgs/[orgId]/roles/[id]` | GET, PATCH, DELETE | Manage role |
| `/api/platform/orgs/[orgId]/assignments` | GET, POST | List/create assignments |
| `/api/platform/orgs/[orgId]/assignments/[id]` | DELETE | Remove assignment |

### API for Effective Permissions

Need to verify/create:
```
GET /api/platform/orgs/[orgId]/members/[id]/permissions
→ Returns effective permissions for a user
```
