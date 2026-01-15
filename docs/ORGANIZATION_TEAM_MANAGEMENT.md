# Organization & Team Management

**Last Updated:** January 15, 2026

---

## Overview

NetPad has a two-tier permission system:

1. **Organization-Level**: Who can access the organization and its resources
2. **Application-Level** (Phase 10): Fine-grained permissions within specific applications

This document explains how organization membership works and how it relates to application permissions.

---

## Organization Membership

### How Users Join Organizations

**Method 1: Organization Creation**
- When a user creates an organization, they automatically become the **owner**
- The creator is added to the `users.organizations` array with role `'owner'`

**Method 2: Invitation**
- Organization owners/admins can invite users via email
- Invitations are created via `/api/organizations/[orgId]/invites` (POST)
- Invited users receive an invitation token
- When they accept, they're added to the organization with the specified role

**Method 3: Direct Addition** (Admin only)
- Platform admins can directly add users to organizations
- This is typically used for system setup or migrations

### Organization Roles

| Role | Capabilities |
|------|-------------|
| **owner** | Full control: manage org, delete org, manage billing, manage members, manage all resources |
| **admin** | Manage members, manage all forms/connections, create resources, view responses |
| **member** | Create forms, use connections, view forms, view responses |
| **viewer** | View forms, view responses (read-only) |

### Organization Management UI

**Location:** Settings → Organizations tab (`/settings?tab=organizations`)

**Features:**
- View all organizations you belong to
- Create new organizations
- Manage organization members
- Invite new members via email
- View member roles
- Delete organizations (owners only)

**Component:** `src/components/Settings/OrganizationSettings.tsx`

---

## Application Permissions (Phase 10)

### How Application Permissions Work

Application permissions are **separate** from organization roles. They provide fine-grained control within specific applications.

**Key Points:**
- Application permissions are **additive** to organization roles
- Organization owners/admins have full access to all applications by default
- Application permissions allow restricting access to specific applications
- Users must be **organization members first** before they can be granted application permissions

### Permission Flow

```
1. User must be organization member
   ↓
2. User can be granted application-specific permission
   ↓
3. Permission determines what user can do in that application
```

### Adding Users to Applications

**Prerequisites:**
- User must already be a member of the organization
- You must have `manage_permissions` capability on the application

**Steps:**
1. Go to Application → Permissions tab
2. Click "Add User"
3. Select user from organization members list
4. Choose role (owner, editor, analyst, viewer)
5. Grant permission

**If No Other Members:**
- If the organization only has one member (you), you'll see a message:
  - "No other members in this organization yet"
  - Link to Settings → Organizations to invite members first

---

## API Endpoints

### Organization Members

**GET `/api/organizations/[orgId]/members`**
- Lists all members of an organization
- Requires: Organization membership
- Returns: Array of members with userId, email, displayName, orgRole

**GET `/api/organizations/[orgId]`**
- Gets organization details
- If admin: Also returns members list
- Requires: Organization membership

### Organization Invitations

**GET `/api/organizations/[orgId]/invites`**
- Lists pending invitations
- Requires: `manage_members` capability

**POST `/api/organizations/[orgId]/invites`**
- Creates invitation
- Body: `{ email: string, role: 'admin' | 'member' | 'viewer' }`
- Requires: `manage_members` capability
- Returns: Invitation with token

### Application Permissions

**GET `/api/applications/[applicationId]/permissions`**
- Lists all permissions for application
- Requires: `manage_permissions` capability

**POST `/api/applications/[applicationId]/permissions`**
- Grants permission to user
- Body: `{ userId: string, role: ApplicationRole }`
- Requires: `manage_permissions` capability

---

## Common Workflows

### Workflow 1: Add Team Member to Application

1. **Invite to Organization** (if not already a member):
   - Go to Settings → Organizations
   - Click "Manage" on organization
   - Click "Invite Member"
   - Enter email and role
   - User accepts invitation

2. **Grant Application Permission**:
   - Go to Application → Permissions tab
   - Click "Add User"
   - Select user from list
   - Choose application role
   - Grant permission

### Workflow 2: Restrict Application Access

1. **Set Application to Explicit Access**:
   - Edit application
   - Set `defaultAccess: 'explicit'`
   - Save

2. **Grant Permissions**:
   - Only users with explicit permissions can access
   - Organization owners/admins still have full access

### Workflow 3: Multi-Team Collaboration

**Scenario:** Team A works on "Customer Support" app, Team B works on "Sales CRM" app

1. Both teams are organization members
2. Grant Team A permissions on "Customer Support" app
3. Grant Team B permissions on "Sales CRM" app
4. Each team only sees their assigned applications

---

## Troubleshooting

### "Only current user appears in user selection"

**Cause:** Organization only has one member (you)

**Solution:**
1. Go to Settings → Organizations
2. Click "Manage" on your organization
3. Click "Invite Member"
4. Enter email addresses of users to invite
5. Once they accept, they'll appear in application permissions

### "User not found in organization"

**Cause:** User hasn't been invited to organization yet

**Solution:**
- Invite user to organization first
- Wait for them to accept invitation
- Then grant application permission

### "Permission denied when trying to grant permission"

**Cause:** You don't have `manage_permissions` capability

**Solution:**
- You need to be:
  - Application owner (creator or explicit owner permission)
  - Organization owner/admin
  - Platform admin

---

## Data Model

### Organization Membership

Stored in `users` collection:
```typescript
{
  userId: "user_123",
  organizations: [
    {
      orgId: "org_456",
      role: "owner" | "admin" | "member" | "viewer",
      joinedAt: Date,
      invitedBy?: "user_789"
    }
  ]
}
```

### Application Permissions

Stored in `application_permissions` collection (org database):
```typescript
{
  permissionId: "perm_abc",
  organizationId: "org_456",
  applicationId: "app_789",
  userId: "user_123",
  role: "owner" | "editor" | "analyst" | "viewer",
  grantedBy: "user_456",
  grantedAt: Date
}
```

---

## Best Practices

1. **Invite First, Then Grant Permissions**
   - Always invite users to organization before granting application permissions
   - This ensures they have base access to the organization

2. **Use Explicit Access for Sensitive Applications**
   - Set `defaultAccess: 'explicit'` for client-facing or sensitive applications
   - Only grant permissions to specific users

3. **Regular Permission Audits**
   - Review application permissions periodically
   - Remove permissions for users who no longer need access

4. **Role Hierarchy**
   - Organization owners/admins: Full access (can override application permissions)
   - Application owners: Full control of specific application
   - Application editors: Can edit but not manage permissions
   - Application viewers: Read-only access

---

*For more information, see:*
- `docs/PHASE10_SPEC.md` - Application Permissions specification
- `src/components/Settings/OrganizationSettings.tsx` - Organization management UI
- `src/components/Applications/PermissionsTab.tsx` - Application permissions UI
