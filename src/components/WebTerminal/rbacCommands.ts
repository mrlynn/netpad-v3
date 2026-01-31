/**
 * RBAC Command Handlers
 * 
 * Terminal commands for managing users, groups, roles, and permissions.
 */

import { CommandResult, TerminalContext } from './types';

// ANSI color helpers for terminal output
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Handle 'users' command
 */
export async function handleUsersCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const action = args[0]?.toLowerCase();
  const orgId = context.currentOrg;
  
  if (!orgId) {
    return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
  }

  switch (action) {
    case 'list':
    case 'ls':
      return await listUsers(orgId);
    
    case 'add':
    case 'invite':
      if (!args[1]) {
        return { output: colors.red('Usage: users add <email>'), success: false };
      }
      return await inviteUser(orgId, args[1], options.role as string);
    
    case 'remove':
    case 'rm':
      if (!args[1]) {
        return { output: colors.red('Usage: users remove <email|userId>'), success: false };
      }
      return await removeUser(orgId, args[1]);
    
    case 'info':
    case 'show':
      if (!args[1]) {
        return { output: colors.red('Usage: users info <email|userId>'), success: false };
      }
      return await showUserInfo(orgId, args[1]);
    
    case 'update':
      if (!args[1]) {
        return { output: colors.red('Usage: users update <email|userId> --role <role>'), success: false };
      }
      return await updateUser(orgId, args[1], options);
    
    default:
      return {
        output: `${colors.bold('users')} - Manage organization members

${colors.cyan('Commands:')}
  users list                    List all org members
  users add <email>             Invite a new user
  users remove <email>          Remove user from org
  users info <email>            Show user details
  users update <email> --role   Change user's role

${colors.cyan('Options:')}
  --role <role>    Role to assign (owner|admin|member|viewer)`,
        success: true,
      };
  }
}

/**
 * Handle 'groups' command
 */
export async function handleGroupsCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const action = args[0]?.toLowerCase();
  const orgId = context.currentOrg;
  
  if (!orgId) {
    return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
  }

  switch (action) {
    case 'list':
    case 'ls':
      return await listGroups(orgId);
    
    case 'create':
      if (!args[1]) {
        return { output: colors.red('Usage: groups create <name>'), success: false };
      }
      return await createGroup(orgId, args[1], options);
    
    case 'delete':
    case 'rm':
      if (!args[1]) {
        return { output: colors.red('Usage: groups delete <groupId|name>'), success: false };
      }
      return await deleteGroup(orgId, args[1]);
    
    case 'info':
    case 'show':
      if (!args[1]) {
        return { output: colors.red('Usage: groups info <groupId|name>'), success: false };
      }
      return await showGroupInfo(orgId, args[1]);
    
    case 'add-member':
      if (!args[1] || !args[2]) {
        return { output: colors.red('Usage: groups add-member <group> <email|userId>'), success: false };
      }
      return await addGroupMember(orgId, args[1], args[2]);
    
    case 'remove-member':
      if (!args[1] || !args[2]) {
        return { output: colors.red('Usage: groups remove-member <group> <email|userId>'), success: false };
      }
      return await removeGroupMember(orgId, args[1], args[2]);
    
    default:
      return {
        output: `${colors.bold('groups')} - Manage user groups/teams

${colors.cyan('Commands:')}
  groups list                           List all groups
  groups create <name>                  Create a new group
  groups delete <group>                 Delete a group
  groups info <group>                   Show group details
  groups add-member <group> <user>      Add user to group
  groups remove-member <group> <user>   Remove user from group

${colors.cyan('Options:')}
  --role <role>        Default role for group members
  --description <desc> Group description`,
        success: true,
      };
  }
}

/**
 * Handle 'roles' command
 */
export async function handleRolesCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const action = args[0]?.toLowerCase();
  const orgId = context.currentOrg;
  
  if (!orgId) {
    return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
  }

  switch (action) {
    case 'list':
    case 'ls':
      return await listRoles(orgId);
    
    case 'create':
      if (!args[1]) {
        return { output: colors.red('Usage: roles create <name> [--base <role>]'), success: false };
      }
      return await createRole(orgId, args[1], options);
    
    case 'delete':
    case 'rm':
      if (!args[1]) {
        return { output: colors.red('Usage: roles delete <roleId|name>'), success: false };
      }
      return await deleteRole(orgId, args[1]);
    
    case 'info':
    case 'show':
      if (!args[1]) {
        return { output: colors.red('Usage: roles info <roleId|name>'), success: false };
      }
      return await showRoleInfo(orgId, args[1]);
    
    case 'grant':
      if (!args[1] || !args[2]) {
        return { output: colors.red('Usage: roles grant <role> <permission>'), success: false };
      }
      return await grantPermission(orgId, args[1], args[2]);
    
    case 'revoke':
      if (!args[1] || !args[2]) {
        return { output: colors.red('Usage: roles revoke <role> <permission>'), success: false };
      }
      return await revokePermission(orgId, args[1], args[2]);
    
    default:
      return {
        output: `${colors.bold('roles')} - Manage roles and permissions

${colors.cyan('Commands:')}
  roles list                         List all roles (builtin + custom)
  roles create <name>                Create a custom role
  roles delete <role>                Delete a custom role
  roles info <role>                  Show role permissions
  roles grant <role> <permission>    Add permission to role
  roles revoke <role> <permission>   Remove permission from role

${colors.cyan('Options:')}
  --base <role>        Inherit from builtin role
  --description <desc> Role description

${colors.cyan('Built-in Roles:')} owner, admin, member, viewer`,
        success: true,
      };
  }
}

/**
 * Handle 'assign' command
 */
export async function handleAssignCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const orgId = context.currentOrg;
  
  if (!orgId) {
    return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
  }

  const targetType = args[0]?.toLowerCase();
  const targetId = args[1];
  const roleId = args[2];

  if (!targetType || !['user', 'group'].includes(targetType)) {
    return {
      output: `${colors.bold('assign')} - Assign a role to a user or group

${colors.cyan('Usage:')}
  assign user <email|userId> <role>
  assign group <groupId|name> <role>

${colors.cyan('Options:')}
  --scope <type:id>    Scope to project or form (e.g., project:proj_123)
  --expires <date>     Expiration date (e.g., 2025-03-01)
  --reason <text>      Reason for assignment

${colors.cyan('Examples:')}
  assign user jane@example.com editor
  assign group engineering admin
  assign user bob@example.com viewer --scope project:proj_123`,
      success: true,
    };
  }

  if (!targetId || !roleId) {
    return { output: colors.red(`Usage: assign ${targetType} <target> <role>`), success: false };
  }

  return await assignRole(orgId, targetType as 'user' | 'group', targetId, roleId, options);
}

/**
 * Handle 'unassign' command
 */
export async function handleUnassignCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const orgId = context.currentOrg;
  
  if (!orgId) {
    return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
  }

  const targetType = args[0]?.toLowerCase();
  const targetId = args[1];
  const roleId = args[2];

  if (!targetType || !['user', 'group'].includes(targetType) || !targetId || !roleId) {
    return {
      output: `${colors.bold('unassign')} - Remove a role assignment

${colors.cyan('Usage:')}
  unassign user <email|userId> <role>
  unassign group <groupId|name> <role>`,
      success: true,
    };
  }

  return await unassignRole(orgId, targetType as 'user' | 'group', targetId, roleId);
}

/**
 * Handle 'permissions' command
 */
export async function handlePermissionsCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const action = args[0]?.toLowerCase();
  const orgId = context.currentOrg;

  switch (action) {
    case 'list':
    case 'ls':
      return await listPermissions();
    
    case 'check':
      if (!orgId) {
        return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
      }
      if (!args[1]) {
        return { output: colors.red('Usage: permissions check <permission>'), success: false };
      }
      return await checkPermission(orgId, args[1]);
    
    case 'user':
      if (!orgId) {
        return { output: colors.red('No organization selected. Use: use org <orgId>'), success: false };
      }
      if (!args[1]) {
        return { output: colors.red('Usage: permissions user <email|userId>'), success: false };
      }
      return await showUserPermissions(orgId, args[1]);
    
    default:
      return {
        output: `${colors.bold('permissions')} - View and check permissions

${colors.cyan('Commands:')}
  permissions list              List all available permissions
  permissions check <perm>      Check if you have a permission
  permissions user <email>      Show a user's effective permissions`,
        success: true,
      };
  }
}

/**
 * Handle 'whoami' command
 */
export async function handleWhoamiCommand(
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalContext
): Promise<CommandResult> {
  const showEffective = options.effective || options.e;
  const orgId = context.currentOrg;

  try {
    const url = orgId 
      ? `/api/platform/users/me/permissions?orgId=${orgId}`
      : '/api/platform/users/me/permissions';
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error || 'Failed to fetch user info'}`), success: false };
    }

    const data = await response.json();
    let output = '';

    output += colors.bold('Current User\n');
    output += `  Email: ${colors.cyan(data.user.email)}\n`;
    output += `  ID: ${colors.dim(data.user.userId)}\n`;
    if (data.user.displayName) {
      output += `  Name: ${data.user.displayName}\n`;
    }
    if (data.user.platformRole) {
      output += `  Platform Role: ${colors.yellow(data.user.platformRole)}\n`;
    }

    if (data.organization) {
      output += `\n${colors.bold('Organization')}\n`;
      output += `  Role: ${colors.green(data.organization.directRole)}\n`;
      output += `  Joined: ${new Date(data.organization.joinedAt).toLocaleDateString()}\n`;
      
      if (showEffective && data.effectivePermissions) {
        output += `\n${colors.bold('Effective Permissions')} (${data.effectivePermissions.permissions.length})\n`;
        const grouped = groupPermissions(data.effectivePermissions.permissions);
        for (const [category, perms] of Object.entries(grouped)) {
          output += `  ${colors.cyan(category)}:\n`;
          for (const perm of perms) {
            output += `    ${colors.green('✓')} ${perm}\n`;
          }
        }
      }
    } else if (data.organizations) {
      output += `\n${colors.bold('Organizations')} (${data.organizations.length})\n`;
      for (const org of data.organizations) {
        output += `  ${colors.cyan(org.orgName)} - ${colors.green(org.directRole)}\n`;
      }
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

// ============================================
// API Helper Functions
// ============================================

async function listUsers(orgId: string): Promise<CommandResult> {
  try {
    // Use the members endpoint from organizations API
    const response = await fetch(`/api/platform/orgs/${orgId}/members`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    let output = colors.bold('Organization Members\n\n');
    
    if (!data.members?.length) {
      output += colors.dim('No members found.');
      return { output, success: true };
    }

    // Table header
    output += `${colors.dim('EMAIL'.padEnd(35))} ${colors.dim('ROLE'.padEnd(10))} ${colors.dim('JOINED')}\n`;
    output += `${colors.dim('─'.repeat(60))}\n`;

    for (const member of data.members) {
      const email = (member.email || '').padEnd(35);
      const role = (member.role || 'member').padEnd(10);
      const joined = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-';
      output += `${email} ${roleColor(member.role)} ${colors.dim(joined)}\n`;
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function inviteUser(orgId: string, email: string, role?: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: role || 'member' }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Invitation sent to ${email}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function removeUser(orgId: string, userIdOrEmail: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/members/${encodeURIComponent(userIdOrEmail)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Removed ${userIdOrEmail} from organization`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function showUserInfo(orgId: string, userIdOrEmail: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/members/${encodeURIComponent(userIdOrEmail)}`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    let output = colors.bold('User Info\n\n');
    output += `  Email: ${colors.cyan(data.email)}\n`;
    output += `  User ID: ${colors.dim(data.userId)}\n`;
    if (data.displayName) output += `  Name: ${data.displayName}\n`;
    output += `  Role: ${roleColor(data.role)}\n`;
    output += `  Joined: ${new Date(data.joinedAt).toLocaleDateString()}\n`;
    if (data.lastLoginAt) {
      output += `  Last Login: ${new Date(data.lastLoginAt).toLocaleString()}\n`;
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function updateUser(orgId: string, userIdOrEmail: string, options: Record<string, string | boolean>): Promise<CommandResult> {
  if (!options.role) {
    return { output: colors.red('Usage: users update <email> --role <role>'), success: false };
  }

  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/members/${encodeURIComponent(userIdOrEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: options.role }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Updated ${userIdOrEmail} role to ${options.role}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function listGroups(orgId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/groups`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    let output = colors.bold('Groups\n\n');
    
    if (!data.groups?.length) {
      output += colors.dim('No groups found. Create one with: groups create <name>');
      return { output, success: true };
    }

    output += `${colors.dim('NAME'.padEnd(25))} ${colors.dim('MEMBERS'.padEnd(10))} ${colors.dim('DEFAULT ROLE')}\n`;
    output += `${colors.dim('─'.repeat(55))}\n`;

    for (const group of data.groups) {
      const name = group.name.padEnd(25);
      const members = String(group.memberIds?.length || 0).padEnd(10);
      const role = group.defaultRole || '-';
      output += `${colors.cyan(name)} ${members} ${roleColor(role)}\n`;
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function createGroup(orgId: string, name: string, options: Record<string, string | boolean>): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: options.description,
        defaultRole: options.role,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    return { 
      output: colors.green(`✓ Created group "${name}" (${data.group.groupId})`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function deleteGroup(orgId: string, groupId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/groups/${groupId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Deleted group ${groupId}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function showGroupInfo(orgId: string, groupId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/groups/${groupId}`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    let output = colors.bold(`Group: ${data.group.name}\n\n`);
    output += `  ID: ${colors.dim(data.group.groupId)}\n`;
    if (data.group.description) output += `  Description: ${data.group.description}\n`;
    output += `  Default Role: ${roleColor(data.group.defaultRole || 'none')}\n`;
    output += `  Created: ${new Date(data.group.createdAt).toLocaleDateString()}\n`;
    
    output += `\n${colors.bold('Members')} (${data.members?.length || 0})\n`;
    if (data.members?.length) {
      for (const member of data.members) {
        output += `  • ${member.email || member.userId}\n`;
      }
    } else {
      output += colors.dim('  No members');
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function addGroupMember(orgId: string, groupId: string, userId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addMembers: [userId] }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Added ${userId} to group`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function removeGroupMember(orgId: string, groupId: string, userId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeMembers: [userId] }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Removed ${userId} from group`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function listRoles(orgId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/roles`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    let output = colors.bold('Roles\n\n');
    
    output += colors.cyan('Built-in Roles:\n');
    const builtinRoles = data.roles.filter((r: any) => r.type === 'builtin');
    for (const role of builtinRoles) {
      output += `  ${roleColor(role.roleId).padEnd(20)} ${colors.dim(role.description || '')}\n`;
    }

    const customRoles = data.roles.filter((r: any) => r.type === 'custom');
    if (customRoles.length) {
      output += `\n${colors.cyan('Custom Roles:')}\n`;
      for (const role of customRoles) {
        const base = role.baseRole ? ` (extends ${role.baseRole})` : '';
        output += `  ${colors.yellow(role.name)}${colors.dim(base)}\n`;
        output += `    ${colors.dim(role.roleId)} - ${role.permissions?.length || 0} permissions\n`;
      }
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function createRole(orgId: string, name: string, options: Record<string, string | boolean>): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: options.description,
        baseRole: options.base,
        permissions: [],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    return { 
      output: colors.green(`✓ Created role "${name}" (${data.role.roleId})`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function deleteRole(orgId: string, roleId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/roles/${roleId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Deleted role ${roleId}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function showRoleInfo(orgId: string, roleId: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/roles/${roleId}`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    let output = colors.bold(`Role: ${data.role.name || data.role.roleId}\n\n`);
    output += `  ID: ${colors.dim(data.role.roleId)}\n`;
    output += `  Type: ${data.role.type === 'builtin' ? colors.blue('Built-in') : colors.yellow('Custom')}\n`;
    if (data.role.baseRole) output += `  Extends: ${roleColor(data.role.baseRole)}\n`;
    if (data.role.description) output += `  Description: ${data.role.description}\n`;
    
    const permissions = data.effectivePermissions || data.role.permissions || [];
    output += `\n${colors.bold('Permissions')} (${permissions.length})\n`;
    
    const grouped = groupPermissions(permissions);
    for (const [category, perms] of Object.entries(grouped)) {
      output += `  ${colors.cyan(category)}:\n`;
      for (const perm of perms) {
        output += `    ${colors.green('✓')} ${perm}\n`;
      }
    }

    return { output, success: true };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function grantPermission(orgId: string, roleId: string, permission: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addPermissions: [permission] }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Granted ${permission} to ${roleId}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function revokePermission(orgId: string, roleId: string, permission: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/orgs/${orgId}/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removePermissions: [permission] }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Revoked ${permission} from ${roleId}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function assignRole(
  orgId: string, 
  targetType: 'user' | 'group', 
  targetId: string, 
  roleId: string,
  options: Record<string, string | boolean>
): Promise<CommandResult> {
  try {
    // Determine if builtin or custom
    const isBuiltin = ['owner', 'admin', 'member', 'viewer'].includes(roleId);
    
    const body: any = {
      targetType,
      targetId,
      roleType: isBuiltin ? 'builtin' : 'custom',
      roleId,
    };

    if (options.scope && typeof options.scope === 'string') {
      const [scopeType, scopeId] = options.scope.split(':');
      body.scope = { type: scopeType, resourceId: scopeId };
    }

    if (options.expires) {
      body.expiresAt = new Date(options.expires as string).toISOString();
    }

    if (options.reason) {
      body.reason = options.reason;
    }

    const response = await fetch(`/api/platform/orgs/${orgId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Assigned ${roleId} to ${targetType} ${targetId}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function unassignRole(
  orgId: string, 
  targetType: 'user' | 'group', 
  targetId: string, 
  roleId: string
): Promise<CommandResult> {
  try {
    // First find the assignment
    const listResponse = await fetch(
      `/api/platform/orgs/${orgId}/assignments?targetType=${targetType}&targetId=${targetId}&roleId=${roleId}`
    );
    
    if (!listResponse.ok) {
      return { output: colors.red('Error: Failed to find assignment'), success: false };
    }

    const data = await listResponse.json();
    if (!data.assignments?.length) {
      return { output: colors.yellow('No matching assignment found'), success: false };
    }

    const assignmentId = data.assignments[0].assignmentId;
    
    const response = await fetch(
      `/api/platform/orgs/${orgId}/assignments?assignmentId=${assignmentId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    return { 
      output: colors.green(`✓ Removed ${roleId} from ${targetType} ${targetId}`), 
      success: true 
    };
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function listPermissions(): Promise<CommandResult> {
  // Import from types - we'll use a static list for now
  const permissions = [
    'org:read', 'org:update', 'org:delete', 'org:manage_billing', 'org:manage_settings',
    'members:read', 'members:invite', 'members:remove', 'members:update_role',
    'groups:read', 'groups:create', 'groups:update', 'groups:delete', 'groups:manage_members',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:assign',
    'projects:read', 'projects:create', 'projects:update', 'projects:delete',
    'forms:read', 'forms:create', 'forms:update', 'forms:delete', 'forms:publish', 'forms:manage_permissions',
    'responses:read', 'responses:export', 'responses:delete',
    'connections:read', 'connections:create', 'connections:update', 'connections:delete', 'connections:use', 'connections:view_credentials',
    'workflows:read', 'workflows:create', 'workflows:update', 'workflows:delete', 'workflows:execute',
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete',
    'audit:read',
  ];

  let output = colors.bold('Available Permissions\n\n');
  const grouped = groupPermissions(permissions);
  
  for (const [category, perms] of Object.entries(grouped)) {
    output += `${colors.cyan(category)}:\n`;
    for (const perm of perms) {
      output += `  ${perm}\n`;
    }
    output += '\n';
  }

  return { output, success: true };
}

async function checkPermission(orgId: string, permission: string): Promise<CommandResult> {
  try {
    const response = await fetch(`/api/platform/users/me/permissions?orgId=${orgId}`);
    if (!response.ok) {
      const error = await response.json();
      return { output: colors.red(`Error: ${error.error}`), success: false };
    }

    const data = await response.json();
    const hasIt = data.effectivePermissions?.permissions?.includes(permission);
    
    if (hasIt) {
      return { output: colors.green(`✓ You have permission: ${permission}`), success: true };
    } else {
      return { output: colors.red(`✗ You do NOT have permission: ${permission}`), success: true };
    }
  } catch (error) {
    return { output: colors.red(`Error: ${error}`), success: false };
  }
}

async function showUserPermissions(orgId: string, userIdOrEmail: string): Promise<CommandResult> {
  // This would need an admin API to get another user's permissions
  // For now, show a message
  return { 
    output: colors.yellow('Viewing other users\' permissions requires admin access.\nUse the admin UI or API directly.'), 
    success: true 
  };
}

// ============================================
// Helpers
// ============================================

function roleColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'owner': return colors.red(role);
    case 'admin': return colors.yellow(role);
    case 'member': return colors.green(role);
    case 'viewer': return colors.blue(role);
    default: return colors.dim(role || '-');
  }
}

function groupPermissions(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const perm of permissions) {
    const [category] = perm.split(':');
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(perm);
  }
  return grouped;
}
