# NetPad RBAC CLI Guide

**Version:** 1.0.0
**Last Updated:** January 31, 2026

## Overview

NetPad's Role-Based Access Control (RBAC) system provides fine-grained permission management for your organization. This guide covers using the CLI to manage users, groups, roles, and permissions.

## Table of Contents

1. [RBAC Concepts](#rbac-concepts)
2. [Users Management](#users-management)
3. [Groups Management](#groups-management)
4. [Roles Management](#roles-management)
5. [Permissions Management](#permissions-management)
6. [Role Assignment](#role-assignment)
7. [Permission Model](#permission-model)
8. [Examples & Workflows](#examples--workflows)

---

## RBAC Concepts

### Core Entities

| Entity | Description | Example |
|--------|-------------|---------|
| **User** | Individual organization member | john@acme.com |
| **Group** | Collection of users (teams, departments) | Engineering, Marketing, Support |
| **Role** | Set of permissions | owner, admin, member, viewer, custom roles |
| **Permission** | Specific action allowance | `forms:create`, `workflows:execute` |

### Permission Hierarchy

```
User
  ├── Direct Role Assignment (highest priority)
  └── Group Memberships
       └── Group's Default Role
```

**Effective Permissions** = Union of all permissions from direct role + group roles

---

## Users Management

### List Organization Members

```bash
users list
users ls                               # Short form
```

**Example output:**

```
Members

EMAIL                   NAME                    ROLE       GROUPS
─────────────────────────────────────────────────────────────────────
john@acme.com          John Doe                owner      -
sarah@acme.com         Sarah Johnson           admin      Engineering
mike@acme.com          Mike Chen               member     Engineering, Support
jane@acme.com          Jane Smith              viewer     Marketing

4 member(s) total
```

### Show User Details

```bash
users info <userId>
users show <email>
```

**Example:**

```bash
$ users info user_abc123

User: Sarah Johnson
Email: sarah@acme.com
ID: user_abc123
Role: admin
Joined: 1/15/2026

Groups (2)
  • Engineering (member)
  • Support (admin)

Effective Permissions (42)
  org:
    ✓ org:read
    ✓ org:update
  forms:
    ✓ forms:read
    ✓ forms:create
    ✓ forms:update
    ✓ forms:delete
  ...
```

### Invite New Users

```bash
users invite <email> --role <role>
users invite <email> --group <groupId>
```

**Examples:**

```bash
# Invite with direct role
users invite newuser@acme.com --role member

# Invite and add to group
users invite newuser@acme.com --role viewer --group grp_support

# Invite multiple users
users invite user1@acme.com user2@acme.com --role member
```

### Remove Users

```bash
users remove <userId>
users rm <email>
```

**Example:**

```bash
$ users remove user_abc123
✓ Removed user user_abc123 from organization
```

---

## Groups Management

### List Groups

```bash
groups list
groups ls
```

**Example output:**

```
Groups

NAME                    MEMBERS     DEFAULT ROLE
────────────────────────────────────────────────
Engineering             12          member
Marketing               8           member
Support                 5           member
Leadership              3           admin
Contractors             7           viewer

5 group(s) total
```

### Create Group

```bash
groups create <name> [--role <role>] [--description <desc>]
```

**Examples:**

```bash
# Basic group
groups create "Customer Success"

# With default role
groups create "Product Team" --role member

# With description
groups create "Executives" --role admin --description "Executive leadership team"
```

**Output:**

```
✓ Created group "Customer Success" (grp_abc123)
```

### Show Group Details

```bash
groups info <groupId>
groups show <groupId>
```

**Example:**

```bash
$ groups info grp_eng

Group: Engineering

  ID: grp_eng
  Default Role: member
  Created: 1/10/2026

Members (12)
  • john@acme.com
  • sarah@acme.com
  • mike@acme.com
  • alex@acme.com
  ... and 8 more
```

### Manage Group Members

```bash
# Add member to group
groups add-member <groupId> <userId>

# Remove member from group
groups remove-member <groupId> <userId>
```

**Examples:**

```bash
$ groups add-member grp_eng user_abc123
✓ Added user_abc123 to group

$ groups remove-member grp_eng user_abc123
✓ Removed user_abc123 from group
```

### Delete Group

```bash
groups delete <groupId>
groups rm <groupId>
```

**Example:**

```bash
$ groups delete grp_temp
✓ Deleted group grp_temp
```

---

## Roles Management

### List Roles

```bash
roles list
roles ls
```

**Example output:**

```
Roles

Built-in Roles:
  owner        Full control over the organization
  admin        Manage members, forms, and settings
  member       Create and manage own forms
  viewer       View-only access

Custom Roles:
  Form Manager (extends member)
    role_formmgr - 8 permissions
  Workflow Developer (extends member)
    role_wfdev - 12 permissions
```

### Create Custom Role

```bash
roles create <name> [--base <builtin-role>] [--description <desc>]
```

**Examples:**

```bash
# Create custom role extending member
roles create "Form Manager" --base member --description "Can manage all forms"

# Create from scratch (no base)
roles create "API Developer"
```

**Output:**

```
✓ Created role "Form Manager" (role_formmgr)
```

### Show Role Details

```bash
roles info <roleId>
roles show <roleId>
```

**Example:**

```bash
$ roles info admin

Role: admin

  ID: admin
  Type: Built-in
  Description: Manage members, forms, and settings

Permissions (38)
  org:
    ✓ org:read
    ✓ org:update
    ✓ org:manage_settings
  members:
    ✓ members:read
    ✓ members:invite
    ✓ members:remove
    ✓ members:update_role
  groups:
    ✓ groups:read
    ✓ groups:create
    ✓ groups:update
    ✓ groups:delete
    ✓ groups:manage_members
  forms:
    ✓ forms:read
    ✓ forms:create
    ✓ forms:update
    ✓ forms:delete
    ✓ forms:publish
  ...
```

### Grant Permission to Role

```bash
roles grant <roleId> <permission>
```

**Example:**

```bash
$ roles grant role_formmgr forms:manage_permissions
✓ Granted forms:manage_permissions to role_formmgr
```

**Note:** Cannot modify built-in roles (owner, admin, member, viewer)

### Revoke Permission from Role

```bash
roles revoke <roleId> <permission>
```

**Example:**

```bash
$ roles revoke role_formmgr forms:delete
✓ Revoked forms:delete from role_formmgr
```

### Delete Custom Role

```bash
roles delete <roleId>
roles rm <roleId>
```

**Example:**

```bash
$ roles delete role_temp
✓ Deleted role role_temp
```

**Note:** Cannot delete built-in roles

---

## Permissions Management

### List All Available Permissions

```bash
permissions list
permissions ls
```

**Example output:**

```
Available Permissions

org:
  org:read
  org:update
  org:delete
  org:manage_billing
  org:manage_settings

members:
  members:read
  members:invite
  members:remove
  members:update_role

groups:
  groups:read
  groups:create
  groups:update
  groups:delete
  groups:manage_members

roles:
  roles:read
  roles:create
  roles:update
  roles:delete
  roles:assign

projects:
  projects:read
  projects:create
  projects:update
  projects:delete

forms:
  forms:read
  forms:create
  forms:update
  forms:delete
  forms:publish
  forms:manage_permissions

responses:
  responses:read
  responses:export
  responses:delete

connections:
  connections:read
  connections:create
  connections:update
  connections:delete
  connections:use
  connections:view_credentials

workflows:
  workflows:read
  workflows:create
  workflows:update
  workflows:delete
  workflows:execute

integrations:
  integrations:read
  integrations:create
  integrations:update
  integrations:delete

audit:
  audit:read
```

### Check Your Permissions

```bash
permissions me
permissions mine
permissions show
```

**Example output:**

```
Your Permissions

User: john@acme.com
Organization Role: member

Effective Permissions (24)
  forms:
    ✓ forms:read
    ✓ forms:create
    ✓ forms:update
  workflows:
    ✓ workflows:read
    ✓ workflows:create
    ✓ workflows:execute
  responses:
    ✓ responses:read
    ✓ responses:export
  ...

Permission Sources
  • Direct assignment: member (role)
  • Engineering team (group)
```

### Check Specific Permission

```bash
permissions check <permission>
```

**Examples:**

```bash
$ permissions check forms:create
✓ You have permission: forms:create

$ permissions check forms:delete
✗ You do NOT have permission: forms:delete
```

---

## Role Assignment

### Assign Role to User

```bash
assign user <userId> <roleId>
assign <userId> <roleId>              # Short form
```

**Examples:**

```bash
# Assign admin role
assign user user_abc123 admin

# Assign custom role
assign user user_abc123 role_formmgr
```

**Output:**

```
✓ Assigned role admin to user user_abc123
```

### Assign Role to Group

```bash
assign group <groupId> <roleId>
```

**Example:**

```bash
$ assign group grp_eng member
✓ Updated group grp_eng default role to member
```

### Unassign Role from User

```bash
unassign user <userId>
unassign <userId>                     # Short form
```

**Example:**

```bash
$ unassign user user_abc123
✓ Removed role assignment from user user_abc123
```

**Note:** User will still have permissions from group memberships

---

## Permission Model

### Built-in Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **owner** | Full organization control | All permissions |
| **admin** | Manage organization | All except billing, delete org |
| **member** | Create and manage own content | Create/update own forms, workflows |
| **viewer** | Read-only access | Read forms, workflows, responses |

### Permission Categories

#### Organization Permissions

| Permission | Description |
|------------|-------------|
| `org:read` | View organization details |
| `org:update` | Update organization settings |
| `org:delete` | Delete organization |
| `org:manage_billing` | Manage billing and subscriptions |
| `org:manage_settings` | Manage organization-wide settings |

#### Member Permissions

| Permission | Description |
|------------|-------------|
| `members:read` | View organization members |
| `members:invite` | Invite new members |
| `members:remove` | Remove members |
| `members:update_role` | Change member roles |

#### Group Permissions

| Permission | Description |
|------------|-------------|
| `groups:read` | View groups |
| `groups:create` | Create new groups |
| `groups:update` | Update group details |
| `groups:delete` | Delete groups |
| `groups:manage_members` | Add/remove group members |

#### Role Permissions

| Permission | Description |
|------------|-------------|
| `roles:read` | View roles |
| `roles:create` | Create custom roles |
| `roles:update` | Modify custom roles |
| `roles:delete` | Delete custom roles |
| `roles:assign` | Assign roles to users |

#### Form Permissions

| Permission | Description |
|------------|-------------|
| `forms:read` | View forms |
| `forms:create` | Create new forms |
| `forms:update` | Edit forms |
| `forms:delete` | Delete forms |
| `forms:publish` | Publish/unpublish forms |
| `forms:manage_permissions` | Manage form-level permissions |

#### Response Permissions

| Permission | Description |
|------------|-------------|
| `responses:read` | View form submissions |
| `responses:export` | Export submission data |
| `responses:delete` | Delete submissions |

#### Workflow Permissions

| Permission | Description |
|------------|-------------|
| `workflows:read` | View workflows |
| `workflows:create` | Create workflows |
| `workflows:update` | Edit workflows |
| `workflows:delete` | Delete workflows |
| `workflows:execute` | Run/trigger workflows |

#### Connection Permissions

| Permission | Description |
|------------|-------------|
| `connections:read` | View connection list |
| `connections:create` | Create new connections |
| `connections:update` | Edit connections |
| `connections:delete` | Delete connections |
| `connections:use` | Use connections in forms/workflows |
| `connections:view_credentials` | View sensitive connection credentials |

---

## Examples & Workflows

### Example 1: Create a "Support Team" with Limited Permissions

```bash
# Step 1: Create a support group
groups create "Support Team" --role viewer

# Step 2: Create a custom role for support
roles create "Support Agent" --base viewer --description "Customer support access"

# Step 3: Grant additional permissions
roles grant support_agent responses:read
roles grant support_agent responses:export
roles grant support_agent forms:read

# Step 4: Update group to use custom role
assign group grp_support support_agent

# Step 5: Add support team members
groups add-member grp_support user_sarah
groups add-member grp_support user_mike

# Step 6: Verify permissions
$ users info user_sarah
User: Sarah Johnson
Role: viewer (from group: Support Team)
Effective Permissions:
  forms:read ✓
  responses:read ✓
  responses:export ✓
```

### Example 2: Grant a User Temporary Admin Access

```bash
# Step 1: Check current role
$ users info user_john
User: John Smith
Role: member

# Step 2: Assign admin role
$ assign user user_john admin
✓ Assigned role admin to user user_john

# Step 3: Verify new permissions
$ users info user_john
User: John Smith
Role: admin
Effective Permissions: (38)
  members:invite ✓
  members:remove ✓
  groups:create ✓
  ...

# When no longer needed, revert to member
$ assign user user_john member
✓ Assigned role member to user user_john
```

### Example 3: Create a "Form Manager" Role

```bash
# Step 1: Create custom role based on member
$ roles create "Form Manager" --base member --description "Full form management access"
✓ Created role "Form Manager" (role_formmgr)

# Step 2: Grant additional form permissions
$ roles grant role_formmgr forms:delete
✓ Granted forms:delete to role_formmgr

$ roles grant role_formmgr forms:publish
✓ Granted forms:publish to role_formmgr

$ roles grant role_formmgr forms:manage_permissions
✓ Granted forms:manage_permissions to role_formmgr

$ roles grant role_formmgr responses:export
✓ Granted responses:export to role_formmgr

# Step 3: Verify role permissions
$ roles info role_formmgr
Role: Form Manager

  ID: role_formmgr
  Type: Custom
  Extends: member
  Description: Full form management access

Permissions (28)
  forms:
    ✓ forms:read (inherited)
    ✓ forms:create (inherited)
    ✓ forms:update (inherited)
    ✓ forms:delete (custom)
    ✓ forms:publish (custom)
    ✓ forms:manage_permissions (custom)
  responses:
    ✓ responses:read (inherited)
    ✓ responses:export (custom)
  ...

# Step 4: Assign to users
$ assign user user_alice role_formmgr
✓ Assigned role Form Manager to user user_alice
```

### Example 4: Audit User Access

```bash
# Check a specific user's access
$ users info user_bob

User: Bob Williams
Email: bob@acme.com
Role: member
Groups: Engineering, Contractors

Effective Permissions (32)
  org:
    ✓ org:read
  projects:
    ✓ projects:read
    ✓ projects:create
  forms:
    ✓ forms:read
    ✓ forms:create
    ✓ forms:update
  workflows:
    ✓ workflows:read
    ✓ workflows:create
    ✓ workflows:execute
  ...

Permission Sources
  • Direct assignment: member (role)
  • Engineering (group)
  • Contractors (group)

# Check specific permission
$ permissions check forms:delete
✗ You do NOT have permission: forms:delete

# Verify Bob can't delete forms
# (would need admin or form manager role)
```

### Example 5: Department-Based Access Control

```bash
# Create department groups
$ groups create "Engineering" --role member
$ groups create "Marketing" --role member
$ groups create "Sales" --role viewer

# Create department-specific roles
$ roles create "Marketing Lead" --base member
$ roles grant marketing_lead forms:publish
$ roles grant marketing_lead responses:export

$ roles create "Engineering Lead" --base member
$ roles grant engineering_lead workflows:execute
$ roles grant engineering_lead integrations:create

# Assign leads
$ assign user user_sarah marketing_lead
$ assign user user_john engineering_lead

# Add team members to groups
$ groups add-member grp_marketing user_alice
$ groups add-member grp_marketing user_charlie
$ groups add-member grp_engineering user_bob
$ groups add-member grp_engineering user_david

# Verify hierarchical access
$ users info user_sarah
User: Sarah (Marketing Lead)
  • Can create, update, publish forms
  • Can export response data
  • Group: Marketing

$ users info user_alice
User: Alice (Marketing member)
  • Can create, update forms (via Marketing group)
  • Cannot publish or export (no lead role)
```

---

## Best Practices

### 1. Use Groups for Team-Based Access

Instead of assigning roles individually, use groups:

```bash
# ✓ Good - Use groups
groups create "Support Team" --role viewer
groups add-member grp_support user1
groups add-member grp_support user2

# ✗ Avoid - Individual assignments
assign user user1 viewer
assign user user2 viewer
```

### 2. Create Custom Roles for Specific Needs

Don't give users more permissions than they need:

```bash
# ✓ Good - Custom role with minimal permissions
roles create "Data Exporter" --base viewer
roles grant data_exporter responses:export

# ✗ Avoid - Over-permissioning
assign user user_sarah admin  # Just to export data
```

### 3. Regularly Audit Permissions

Check user permissions periodically:

```bash
users list                           # See all members
users info <userId>                  # Check individual access
permissions me                       # Verify your own access
```

### 4. Document Custom Roles

Use descriptions when creating roles:

```bash
roles create "Contract Worker" \
  --base viewer \
  --description "Temporary access for contractors - expires Q2 2026"
```

### 5. Test Permissions Before Rollout

Verify permission changes with `permissions check`:

```bash
permissions check forms:delete       # Test before deleting
permissions check workflows:execute  # Test before running
```

---

## Troubleshooting

### Permission Denied

**Problem:** User can't perform an action

**Solution:**
```bash
# 1. Check user's effective permissions
users info <userId>

# 2. Check specific permission
permissions check <permission>

# 3. Verify role has the permission
roles info <roleId>

# 4. Grant if needed
assign user <userId> <appropriate-role>
# OR
roles grant <custom-roleId> <permission>
```

### Can't Modify Built-in Role

**Problem:** `Cannot modify built-in roles`

**Solution:**
Create a custom role instead:
```bash
roles create "Custom Admin" --base admin
roles grant custom_admin <additional-permission>
assign user <userId> custom_admin
```

### Group Members Not Getting Permissions

**Problem:** Users in group don't have expected permissions

**Solution:**
```bash
# 1. Check group's default role
groups info <groupId>

# 2. Verify group role has permissions
roles info <groupRole>

# 3. Update group role if needed
assign group <groupId> <correct-role>
```

---

## Next Steps

- [CLI & Virtual Filesystem Guide](./CLI_VIRTUAL_FILESYSTEM.md) - Navigate and manage resources
- [CLI Testing Guide](./CLI_TESTING_GUIDE.md) - Test scenarios for RBAC
- [RBAC Schema Guide](./RBAC_SCHEMA_GUIDE.md) - Technical implementation details

---

*For support or questions, visit [docs.netpad.io](https://docs.netpad.io) or contact support@netpad.io*
