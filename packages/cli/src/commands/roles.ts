/**
 * Roles Command
 * 
 * Manage roles and permissions
 */

import chalk from 'chalk';
import { get, post, patch, del, requireOrgId, handleError, ApiOptions } from '../lib/api.js';

interface Role {
  roleId: string;
  name: string;
  description?: string;
  type: 'builtin' | 'custom';
  baseRole?: string;
  permissions: string[];
  isSystem?: boolean;
}

interface CommandOptions extends ApiOptions {
  base?: string;
  description?: string;
}

const BUILTIN_INFO: Record<string, { description: string; color: typeof chalk.red }> = {
  owner: { description: 'Full control over the organization', color: chalk.red },
  admin: { description: 'Manage members, forms, and settings', color: chalk.yellow },
  member: { description: 'Create and manage own forms', color: chalk.green },
  viewer: { description: 'View-only access', color: chalk.blue },
};

/**
 * List all roles
 */
async function listRoles(options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);
  
  const response = await get<{ roles: Role[] }>(
    `/api/platform/orgs/${orgId}/roles`,
    options
  );

  if (!response.success) {
    handleError(response, 'List roles');
  }

  const roles = response.data?.roles || [];
  const builtinRoles = roles.filter(r => r.type === 'builtin');
  const customRoles = roles.filter(r => r.type === 'custom');
  
  console.log(chalk.bold('Roles\n'));
  
  // Built-in roles
  console.log(chalk.cyan('Built-in Roles:'));
  for (const role of builtinRoles) {
    const info = BUILTIN_INFO[role.roleId];
    const colorFn = info?.color || chalk.gray;
    console.log(`  ${colorFn(role.roleId.padEnd(12))} ${chalk.dim(info?.description || '')}`);
  }

  // Custom roles
  if (customRoles.length > 0) {
    console.log(chalk.cyan('\nCustom Roles:'));
    for (const role of customRoles) {
      const base = role.baseRole ? ` (extends ${role.baseRole})` : '';
      console.log(`  ${chalk.yellow(role.name)}${chalk.dim(base)}`);
      console.log(`    ${chalk.dim(role.roleId)} - ${role.permissions?.length || 0} permissions`);
    }
  }
}

/**
 * Create a custom role
 */
async function createRole(name: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await post<{ role: Role }>(
    `/api/platform/orgs/${orgId}/roles`,
    {
      name,
      description: options.description,
      baseRole: options.base,
      permissions: [],
    },
    options
  );

  if (!response.success) {
    handleError(response, 'Create role');
  }

  console.log(chalk.green(`✓ Created role "${name}" (${response.data?.role.roleId})`));
}

/**
 * Delete a custom role
 */
async function deleteRole(roleId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  // Check if it's a builtin role
  if (['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
    console.error(chalk.red('Cannot delete built-in roles'));
    process.exit(1);
  }

  const response = await del(
    `/api/platform/orgs/${orgId}/roles/${roleId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Delete role');
  }

  console.log(chalk.green(`✓ Deleted role ${roleId}`));
}

/**
 * Show role info
 */
async function showRoleInfo(roleId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await get<{ role: Role; effectivePermissions?: string[] }>(
    `/api/platform/orgs/${orgId}/roles/${roleId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Get role info');
  }

  const role = response.data!.role;
  const effectivePerms = response.data?.effectivePermissions || role.permissions;
  
  console.log(chalk.bold(`Role: ${role.name || role.roleId}\n`));
  console.log(`  ID: ${chalk.dim(role.roleId)}`);
  console.log(`  Type: ${role.type === 'builtin' ? chalk.blue('Built-in') : chalk.yellow('Custom')}`);
  if (role.baseRole) {
    console.log(`  Extends: ${role.baseRole}`);
  }
  if (role.description) {
    console.log(`  Description: ${role.description}`);
  }
  
  console.log(chalk.bold(`\nPermissions (${effectivePerms.length})`));
  
  // Group by category
  const grouped: Record<string, string[]> = {};
  for (const perm of effectivePerms) {
    const [category] = perm.split(':');
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(perm);
  }
  
  for (const [category, perms] of Object.entries(grouped)) {
    console.log(`  ${chalk.cyan(category)}:`);
    for (const perm of perms) {
      console.log(`    ${chalk.green('✓')} ${perm}`);
    }
  }
}

/**
 * Grant a permission to a role
 */
async function grantPermission(roleId: string, permission: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  // Check if it's a builtin role
  if (['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
    console.error(chalk.red('Cannot modify built-in roles'));
    process.exit(1);
  }

  const response = await patch(
    `/api/platform/orgs/${orgId}/roles/${roleId}`,
    { addPermissions: [permission] },
    options
  );

  if (!response.success) {
    handleError(response, 'Grant permission');
  }

  console.log(chalk.green(`✓ Granted ${permission} to ${roleId}`));
}

/**
 * Revoke a permission from a role
 */
async function revokePermission(roleId: string, permission: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  // Check if it's a builtin role
  if (['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
    console.error(chalk.red('Cannot modify built-in roles'));
    process.exit(1);
  }

  const response = await patch(
    `/api/platform/orgs/${orgId}/roles/${roleId}`,
    { removePermissions: [permission] },
    options
  );

  if (!response.success) {
    handleError(response, 'Revoke permission');
  }

  console.log(chalk.green(`✓ Revoked ${permission} from ${roleId}`));
}

/**
 * Main roles command handler
 */
export async function rolesCommand(
  action: string | undefined,
  arg1: string | undefined,
  arg2: string | undefined,
  options: CommandOptions
): Promise<void> {
  switch (action?.toLowerCase()) {
    case 'list':
    case 'ls':
      await listRoles(options);
      break;

    case 'create':
      if (!arg1) {
        console.error(chalk.red('Name is required. Usage: netpad roles create <name>'));
        process.exit(1);
      }
      await createRole(arg1, options);
      break;

    case 'delete':
    case 'rm':
      if (!arg1) {
        console.error(chalk.red('Role ID required. Usage: netpad roles delete <roleId>'));
        process.exit(1);
      }
      await deleteRole(arg1, options);
      break;

    case 'info':
    case 'show':
      if (!arg1) {
        console.error(chalk.red('Role ID required. Usage: netpad roles info <roleId>'));
        process.exit(1);
      }
      await showRoleInfo(arg1, options);
      break;

    case 'grant':
      if (!arg1 || !arg2) {
        console.error(chalk.red('Usage: netpad roles grant <roleId> <permission>'));
        process.exit(1);
      }
      await grantPermission(arg1, arg2, options);
      break;

    case 'revoke':
      if (!arg1 || !arg2) {
        console.error(chalk.red('Usage: netpad roles revoke <roleId> <permission>'));
        process.exit(1);
      }
      await revokePermission(arg1, arg2, options);
      break;

    default:
      console.log(chalk.bold('netpad roles') + ' - Manage roles and permissions\n');
      console.log(chalk.cyan('Commands:'));
      console.log('  roles list                         List all roles (builtin + custom)');
      console.log('  roles create <name>                Create a custom role');
      console.log('  roles delete <roleId>              Delete a custom role');
      console.log('  roles info <roleId>                Show role permissions');
      console.log('  roles grant <roleId> <permission>  Add permission to role');
      console.log('  roles revoke <roleId> <permission> Remove permission from role');
      console.log();
      console.log(chalk.cyan('Options:'));
      console.log('  -o, --org <orgId>        Organization ID');
      console.log('  --base <role>            Inherit from builtin role');
      console.log('  --description <desc>     Role description');
      console.log();
      console.log(chalk.cyan('Built-in Roles:') + ' owner, admin, member, viewer');
  }
}
