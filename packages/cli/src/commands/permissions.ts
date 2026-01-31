/**
 * Permissions Command
 * 
 * View and check permissions
 */

import chalk from 'chalk';
import { get, requireOrgId, handleError, ApiOptions } from '../lib/api.js';

interface EffectivePermissions {
  userId: string;
  organizationId: string;
  permissions: string[];
  sources: Array<{
    type: string;
    sourceId: string;
    sourceName: string;
    permissions: string[];
  }>;
}

// All available permissions
const ALL_PERMISSIONS = [
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

interface CommandOptions extends ApiOptions {}

/**
 * List all available permissions
 */
function listPermissions(): void {
  console.log(chalk.bold('Available Permissions\n'));
  
  // Group by category
  const grouped: Record<string, string[]> = {};
  for (const perm of ALL_PERMISSIONS) {
    const [category] = perm.split(':');
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(perm);
  }
  
  for (const [category, perms] of Object.entries(grouped)) {
    console.log(`${chalk.cyan(category)}:`);
    for (const perm of perms) {
      console.log(`  ${perm}`);
    }
    console.log();
  }
}

/**
 * Check if current user has a permission
 */
async function checkPermission(permission: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await get<{ effectivePermissions: EffectivePermissions }>(
    `/api/platform/users/me/permissions?orgId=${orgId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Check permission');
  }

  const perms = response.data?.effectivePermissions?.permissions || [];
  const hasIt = perms.includes(permission);

  if (hasIt) {
    console.log(chalk.green(`✓ You have permission: ${permission}`));
  } else {
    console.log(chalk.red(`✗ You do NOT have permission: ${permission}`));
  }
}

/**
 * Show current user's effective permissions
 */
async function showMyPermissions(options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await get<{ 
    user: { userId: string; email: string; displayName?: string };
    organization?: { orgId: string; directRole: string };
    effectivePermissions?: EffectivePermissions;
  }>(
    `/api/platform/users/me/permissions?orgId=${orgId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Get permissions');
  }

  const data = response.data!;
  
  console.log(chalk.bold('Your Permissions\n'));
  
  console.log(`User: ${chalk.cyan(data.user.email)}`);
  if (data.organization) {
    console.log(`Organization Role: ${chalk.green(data.organization.directRole)}`);
  }
  
  if (data.effectivePermissions) {
    const perms = data.effectivePermissions.permissions;
    console.log(`\n${chalk.bold('Effective Permissions')} (${perms.length})`);
    
    // Group by category
    const grouped: Record<string, string[]> = {};
    for (const perm of perms) {
      const [category] = perm.split(':');
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(perm);
    }
    
    for (const [category, categoryPerms] of Object.entries(grouped)) {
      console.log(`  ${chalk.cyan(category)}:`);
      for (const perm of categoryPerms) {
        console.log(`    ${chalk.green('✓')} ${perm}`);
      }
    }
    
    // Show sources
    if (data.effectivePermissions.sources?.length) {
      console.log(chalk.bold('\nPermission Sources'));
      for (const source of data.effectivePermissions.sources) {
        console.log(`  • ${source.sourceName} (${source.type})`);
      }
    }
  }
}

/**
 * Main permissions command handler
 */
export async function permissionsCommand(
  action: string | undefined,
  arg1: string | undefined,
  options: CommandOptions
): Promise<void> {
  switch (action?.toLowerCase()) {
    case 'list':
    case 'ls':
      listPermissions();
      break;

    case 'check':
      if (!arg1) {
        console.error(chalk.red('Permission is required. Usage: netpad permissions check <permission>'));
        process.exit(1);
      }
      await checkPermission(arg1, options);
      break;

    case 'me':
    case 'mine':
    case 'show':
      await showMyPermissions(options);
      break;

    default:
      console.log(chalk.bold('netpad permissions') + ' - View and check permissions\n');
      console.log(chalk.cyan('Commands:'));
      console.log('  permissions list              List all available permissions');
      console.log('  permissions check <perm>      Check if you have a permission');
      console.log('  permissions me                Show your effective permissions');
      console.log();
      console.log(chalk.cyan('Options:'));
      console.log('  -o, --org <orgId>             Organization ID');
  }
}
