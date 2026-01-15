# Phase 10: Application Permissions

**Status:** Draft  
**Dependencies:** Phase 1 (Applications Foundation) ✅  
**Timeline:** 2-3 weeks

---

## Overview

Phase 10 adds application-level permissions (RBAC) to enable fine-grained access control within applications. This allows organizations to control who can view, edit, or manage specific applications, independent of organization-level roles.

**Goal:** Enable per-application access control so teams can collaborate on applications with different permission levels.

---

## Problem Statement

Currently, permissions work at these levels:
- **Platform**: System-wide admin/support roles
- **Organization**: Owner, Admin, Member, Viewer roles (apply to all resources)
- **Connection**: Per-connection roles (owner, admin, user)
- **Form**: Per-form roles (owner, editor, analyst, viewer)

**Missing:** Application-level permissions. Currently:
- Org admins/owners have full access to all applications
- Org members can view all applications
- No way to restrict access to specific applications
- No way to grant application-specific roles (e.g., "Application Editor" vs "Application Viewer")

**Use Cases:**
1. **Multi-team Collaboration**: Team A works on "Customer Support" app, Team B works on "Sales CRM" app - they shouldn't see each other's apps
2. **Client Applications**: External clients should only see their specific application, not all org applications
3. **Graduated Access**: New team members should start as viewers, then be promoted to editors
4. **Contract Protection**: Applications with active contracts should restrict who can modify them

---

## Solution Design

### Application Roles

Add four application-level roles, similar to form roles:

| Role | Capabilities | Use Case |
|------|-------------|----------|
| **owner** | Full control: view, edit, delete, manage permissions, publish, create releases | Application creator or primary maintainer |
| **editor** | View, edit (forms/workflows), create releases, cannot delete or manage permissions | Team members who build features |
| **analyst** | View application, view forms/workflows, view responses/analytics, cannot edit | Data analysts, stakeholders |
| **viewer** | View application and forms/workflows (read-only), cannot see responses | External clients, auditors |

### Permission Hierarchy

```
Platform Admin
  └─> Full access to everything

Organization Owner/Admin
  └─> Full access to all applications (unless explicitly restricted)

Application Owner
  └─> Full control of this application

Application Editor
  └─> Can edit forms/workflows, create releases

Application Analyst
  └─> Can view application and analytics

Application Viewer
  └─> Read-only access

No Permission
  └─> Cannot see application at all
```

### Permission Resolution Logic

1. **Platform Admin**: Always allowed
2. **Org Owner/Admin**: Allowed by default (can be overridden)
3. **Application Permissions**: Check explicit application permissions
4. **Org Member/Viewer**: Fallback to org-level permissions (view only)
5. **No Permission**: Denied

---

## Implementation Steps

### Step 1: Database Schema

**New Collection: `application_permissions`**

```typescript
interface ApplicationPermission {
  _id?: ObjectId;
  permissionId: string;              // "perm_abc123"
  organizationId: string;            // "org_xyz789"
  applicationId: string;              // "app_def456"
  userId: string;                     // "user_ghi789"
  role: 'owner' | 'editor' | 'analyst' | 'viewer';
  grantedBy: string;                  // userId who granted this permission
  grantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// - { applicationId: 1, userId: 1 } (unique) - One role per user per application
// - { organizationId: 1, applicationId: 1 } - Query all permissions for an application
// - { userId: 1, organizationId: 1 } - Query all applications a user can access
```

**Modify `applications` Collection:**

Add optional field:
```typescript
interface Application {
  // ... existing fields ...
  permissions?: ApplicationPermission[];  // Optional: explicit permissions
  defaultAccess?: 'org_members' | 'explicit';  // Default: 'org_members'
}
```

- `defaultAccess: 'org_members'` (default): All org members can view (current behavior)
- `defaultAccess: 'explicit'`: Only users with explicit permissions can access

### Step 2: Permission Capabilities

**Define Application Role Capabilities:**

```typescript
export const APPLICATION_ROLE_CAPABILITIES: Record<ApplicationRole, string[]> = {
  owner: [
    'read',
    'edit',
    'delete',
    'manage_permissions',
    'create_release',
    'publish',
    'view_analytics',
    'export',
  ],
  editor: [
    'read',
    'edit',
    'create_release',
    'view_analytics',
    'export',
  ],
  analyst: [
    'read',
    'view_analytics',
    'export',
  ],
  viewer: [
    'read',
  ],
};

export type ApplicationRole = 'owner' | 'editor' | 'analyst' | 'viewer';
```

### Step 3: Permission Service

**New File: `src/lib/platform/applicationPermissions.ts`**

Functions:
- `checkApplicationPermission(userId, orgId, applicationId, capability): Promise<PermissionResult>`
- `getApplicationRole(userId, orgId, applicationId): Promise<ApplicationRole | null>`
- `grantApplicationPermission(orgId, applicationId, userId, role, grantedBy): Promise<ApplicationPermission>`
- `revokeApplicationPermission(orgId, applicationId, userId): Promise<void>`
- `updateApplicationPermission(orgId, applicationId, userId, newRole): Promise<ApplicationPermission>`
- `listApplicationPermissions(orgId, applicationId): Promise<ApplicationPermission[]>`
- `getUserApplications(userId, orgId): Promise<Application[]>` - Get all apps user can access

**Permission Resolution:**

```typescript
async function checkApplicationPermission(
  userId: string,
  orgId: string,
  applicationId: string,
  capability: string
): Promise<PermissionResult> {
  // 1. Platform admin: always allowed
  if (await isPlatformAdmin(userId)) {
    return { allowed: true, role: 'platform:admin' };
  }

  // 2. Get application
  const application = await getApplication(orgId, applicationId);
  if (!application) {
    return { allowed: false, reason: 'Application not found' };
  }

  // 3. Org owner/admin: allowed by default (unless defaultAccess: 'explicit')
  const orgRole = await getUserOrgRole(userId, orgId);
  if (orgRole === 'owner' || orgRole === 'admin') {
    if (application.defaultAccess !== 'explicit') {
      return { allowed: true, role: `org:${orgRole}` };
    }
    // If explicit-only, continue to check application permissions
  }

  // 4. Check explicit application permissions
  const permission = await getApplicationPermission(orgId, applicationId, userId);
  if (permission) {
    const capabilities = APPLICATION_ROLE_CAPABILITIES[permission.role];
    if (capabilities.includes(capability)) {
      return { allowed: true, role: `application:${permission.role}` };
    }
    return { allowed: false, reason: `Role '${permission.role}' does not have '${capability}'` };
  }

  // 5. Fallback: org members can view if defaultAccess !== 'explicit'
  if (application.defaultAccess !== 'explicit') {
    if ((orgRole === 'member' || orgRole === 'viewer') && capability === 'read') {
      return { allowed: true, role: `org:${orgRole}` };
    }
  }

  // 6. Application creator is implicit owner
  if (application.createdBy === userId) {
    return { allowed: true, role: 'application:owner' };
  }

  return { allowed: false, reason: 'No access to this application' };
}
```

### Step 4: API Endpoints

**New Routes:**

1. **GET `/api/applications/[applicationId]/permissions`**
   - List all permissions for an application
   - Requires: `manage_permissions` capability

2. **POST `/api/applications/[applicationId]/permissions`**
   - Grant permission to a user
   - Body: `{ userId: string, role: ApplicationRole }`
   - Requires: `manage_permissions` capability

3. **PATCH `/api/applications/[applicationId]/permissions/[permissionId]`**
   - Update permission role
   - Body: `{ role: ApplicationRole }`
   - Requires: `manage_permissions` capability

4. **DELETE `/api/applications/[applicationId]/permissions/[permissionId]`**
   - Revoke permission
   - Requires: `manage_permissions` capability

5. **GET `/api/applications/[applicationId]/permissions/me`**
   - Get current user's permission on this application
   - Public (for current user)

### Step 5: Update Existing APIs

**Protect Application APIs:**

Update all application API routes to check permissions:
- `GET /api/applications/[applicationId]` - Requires `read`
- `PATCH /api/applications/[applicationId]` - Requires `edit`
- `DELETE /api/applications/[applicationId]` - Requires `delete`
- `POST /api/applications/[applicationId]/releases` - Requires `create_release`
- `POST /api/applications/[applicationId]/publish` - Requires `publish`
- `GET /api/applications/[applicationId]/analytics` - Requires `view_analytics`

**Filter Application Lists:**

Update `GET /api/applications` to only return applications the user can access:
- Platform admin: all applications
- Org owner/admin: all applications in org
- Others: only applications with explicit permissions or `defaultAccess !== 'explicit'`

### Step 6: UI Components

**Application Permissions Tab:**

Add new tab to application detail page:
- List of users with permissions
- Add user button (with user search/autocomplete)
- Role selector (owner, editor, analyst, viewer)
- Remove permission button
- Change role dropdown
- Show who granted permission and when

**Permission Indicators:**

- Show user's role badge in application header
- Disable edit buttons if user doesn't have `edit` capability
- Show "No Access" message if user can't view application
- Filter application list to only show accessible applications

**Permission Management UI:**

```tsx
<ApplicationPermissionsTab
  applicationId={applicationId}
  orgId={orgId}
  currentUserRole={currentUserRole}
/>
```

Features:
- Table of users with permissions
- Add user dialog (search org members)
- Role change dropdown
- Remove permission confirmation
- Permission history (who granted, when)

### Step 7: Integration with Contracts

**Contract Protection Integration:**

- If application has active contract, restrict `edit` capability to application owners only
- Show warning when non-owners try to edit locked components
- Locked components require `application:owner` role to unlock

### Step 8: Migration & Defaults

**Migration Strategy:**

1. Existing applications: `defaultAccess: 'org_members'` (current behavior)
2. Application creators: Implicit `application:owner` (no DB record needed, check `createdBy`)
3. No breaking changes: Existing users continue to have access

**Default Behavior:**

- New applications: `defaultAccess: 'org_members'` (all org members can view)
- Application creator: Always has `owner` role (implicit)
- Org owners/admins: Always have full access (unless `defaultAccess: 'explicit'`)

---

## API Examples

### Grant Permission

```bash
POST /api/applications/app_123/permissions?orgId=org_456
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_789",
  "role": "editor"
}
```

### List Permissions

```bash
GET /api/applications/app_123/permissions?orgId=org_456
Authorization: Bearer <token>

Response:
{
  "success": true,
  "permissions": [
    {
      "permissionId": "perm_abc",
      "userId": "user_789",
      "userEmail": "john@example.com",
      "userName": "John Doe",
      "role": "editor",
      "grantedBy": "user_123",
      "grantedAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### Check My Permission

```bash
GET /api/applications/app_123/permissions/me?orgId=org_456
Authorization: Bearer <token>

Response:
{
  "success": true,
  "role": "editor",
  "capabilities": ["read", "edit", "create_release", "view_analytics", "export"]
}
```

---

## Testing Strategy

### Unit Tests

1. **Permission Resolution:**
   - Platform admin always allowed
   - Org owner/admin allowed by default
   - Explicit permissions work correctly
   - Application creator is implicit owner
   - Fallback to org role when no explicit permission

2. **Capability Checks:**
   - Each role has correct capabilities
   - Invalid capabilities are denied
   - Role changes update capabilities

3. **Permission Management:**
   - Grant permission creates record
   - Update permission changes role
   - Revoke permission removes record
   - Duplicate grants are prevented

### Integration Tests

1. **API Protection:**
   - All application APIs check permissions
   - Unauthorized requests return 403
   - Authorized requests succeed

2. **Application Filtering:**
   - User only sees accessible applications
   - Platform admin sees all
   - Org admin sees all in org

3. **UI Integration:**
   - Permission tab shows correct data
   - Add/remove permissions works
   - Role changes reflect immediately

### E2E Tests

1. **Permission Workflow:**
   - Grant permission → User can access
   - Revoke permission → User cannot access
   - Change role → Capabilities update

2. **Contract Integration:**
   - Locked components require owner role
   - Non-owners see warning when editing

---

## Success Criteria

✅ **Database Schema:**
- `application_permissions` collection created with indexes
- `applications` collection supports `defaultAccess` field

✅ **Permission Service:**
- All permission functions implemented
- Permission resolution logic correct
- Integration with existing permission system

✅ **API Protection:**
- All application APIs check permissions
- Application lists filtered by permissions
- Permission management APIs work

✅ **UI Components:**
- Permissions tab in application detail page
- Permission indicators in UI
- Application list filtered correctly

✅ **Testing:**
- Unit tests pass
- Integration tests pass
- E2E tests pass

---

## Future Enhancements (Out of Scope)

- **Group Permissions**: Grant permissions to groups/teams instead of individual users
- **Permission Templates**: Pre-defined permission sets (e.g., "Developer", "Stakeholder")
- **Audit Log**: Track all permission changes
- **Time-Limited Permissions**: Permissions that expire after a set time
- **Conditional Permissions**: Permissions based on conditions (e.g., "Can edit only in dev project")

---

## Dependencies

- ✅ Phase 1: Applications Foundation
- ✅ Phase 9: Contracts & Protection (for integration)

---

## Timeline

- **Week 1**: Database schema, permission service, API endpoints
- **Week 2**: UI components, integration with existing APIs, testing
- **Week 3**: Contract integration, migration, documentation, polish

**Total: 2-3 weeks**

---

*Last Updated: January 15, 2026*
