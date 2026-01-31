/**
 * Assign/Unassign Commands
 * 
 * Manage role assignments for users and groups
 */

import chalk from 'chalk';
import { get, post, del, requireOrgId, handleError, ApiOptions } from '../lib/api.js';

interface Assignment {
  assignmentId: string;
  targetType: 'user' | 'group';
  targetId: string;
  roleType: string;
  roleId: string;
  scope?: {
    type: string;
    resourceId?: string;
  };
  grantedAt: string;
}

interface CommandOptions extends ApiOptions {
  scope?: string;
  expires?: string;
  reason?: string;
}

/**
 * Assign a role to a user or group
 */
export async function assignCommand(
  targetType: string | undefined,
  targetId: string | undefined,
  roleId: string | undefined,
  options: CommandOptions
): Promise<void> {
  if (!targetType || !['user', 'group'].includes(targetType)) {
    showAssignHelp();
    return;
  }

  if (!targetId || !roleId) {
    console.error(chalk.red(`Usage: netpad assign ${targetType} <target> <role>`));
    process.exit(1);
  }

  const orgId = requireOrgId(options);

  // Determine if builtin or custom
  const isBuiltin = ['owner', 'admin', 'member', 'viewer'].includes(roleId);

  const body: Record<string, unknown> = {
    targetType,
    targetId,
    roleType: isBuiltin ? 'builtin' : 'custom',
    roleId,
  };

  // Parse scope option (e.g., project:proj_123)
  if (options.scope) {
    const [scopeType, scopeId] = options.scope.split(':');
    body.scope = { type: scopeType, resourceId: scopeId };
  }

  if (options.expires) {
    body.expiresAt = new Date(options.expires).toISOString();
  }

  if (options.reason) {
    body.reason = options.reason;
  }

  const response = await post(
    `/api/platform/orgs/${orgId}/assignments`,
    body,
    options
  );

  if (!response.success) {
    handleError(response, 'Assign role');
  }

  console.log(chalk.green(`✓ Assigned ${roleId} to ${targetType} ${targetId}`));
}

/**
 * Remove a role assignment from a user or group
 */
export async function unassignCommand(
  targetType: string | undefined,
  targetId: string | undefined,
  roleId: string | undefined,
  options: CommandOptions
): Promise<void> {
  if (!targetType || !['user', 'group'].includes(targetType)) {
    showUnassignHelp();
    return;
  }

  if (!targetId || !roleId) {
    console.error(chalk.red(`Usage: netpad unassign ${targetType} <target> <role>`));
    process.exit(1);
  }

  const orgId = requireOrgId(options);

  // First find the assignment
  const listResponse = await get<{ assignments: Assignment[] }>(
    `/api/platform/orgs/${orgId}/assignments?targetType=${targetType}&targetId=${targetId}&roleId=${roleId}`,
    options
  );

  if (!listResponse.success) {
    handleError(listResponse, 'Find assignment');
  }

  const assignments = listResponse.data?.assignments || [];
  if (assignments.length === 0) {
    console.error(chalk.yellow('No matching assignment found'));
    process.exit(1);
  }

  const assignmentId = assignments[0].assignmentId;

  const response = await del(
    `/api/platform/orgs/${orgId}/assignments?assignmentId=${assignmentId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Remove assignment');
  }

  console.log(chalk.green(`✓ Removed ${roleId} from ${targetType} ${targetId}`));
}

function showAssignHelp(): void {
  console.log(chalk.bold('netpad assign') + ' - Assign a role to a user or group\n');
  console.log(chalk.cyan('Usage:'));
  console.log('  netpad assign user <email|userId> <role>');
  console.log('  netpad assign group <groupId|name> <role>');
  console.log();
  console.log(chalk.cyan('Options:'));
  console.log('  -o, --org <orgId>          Organization ID');
  console.log('  --scope <type:id>          Scope to project or form');
  console.log('  --expires <date>           Expiration date (e.g., 2025-03-01)');
  console.log('  --reason <text>            Reason for assignment');
  console.log();
  console.log(chalk.cyan('Examples:'));
  console.log('  netpad assign user jane@example.com editor');
  console.log('  netpad assign group engineering admin');
  console.log('  netpad assign user bob@example.com viewer --scope project:proj_123');
}

function showUnassignHelp(): void {
  console.log(chalk.bold('netpad unassign') + ' - Remove a role assignment\n');
  console.log(chalk.cyan('Usage:'));
  console.log('  netpad unassign user <email|userId> <role>');
  console.log('  netpad unassign group <groupId|name> <role>');
  console.log();
  console.log(chalk.cyan('Options:'));
  console.log('  -o, --org <orgId>          Organization ID');
}
