/**
 * Groups Command
 * 
 * Manage organization groups/teams
 */

import chalk from 'chalk';
import { get, post, patch, del, requireOrgId, handleError, ApiOptions } from '../lib/api.js';

interface Group {
  groupId: string;
  name: string;
  slug: string;
  description?: string;
  memberIds: string[];
  defaultRole?: string;
  createdAt: string;
}

interface GroupMember {
  userId: string;
  email: string;
  displayName?: string;
}

interface CommandOptions extends ApiOptions {
  role?: string;
  description?: string;
}

/**
 * List organization groups
 */
async function listGroups(options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);
  
  const response = await get<{ groups: Group[] }>(
    `/api/platform/orgs/${orgId}/groups`,
    options
  );

  if (!response.success) {
    handleError(response, 'List groups');
  }

  const groups = response.data?.groups || [];
  
  console.log(chalk.bold('Groups\n'));
  
  if (groups.length === 0) {
    console.log(chalk.dim('No groups found. Create one with: netpad groups create <name>'));
    return;
  }

  // Header
  console.log(
    chalk.dim('NAME'.padEnd(25)) +
    chalk.dim('MEMBERS'.padEnd(10)) +
    chalk.dim('DEFAULT ROLE')
  );
  console.log(chalk.dim('─'.repeat(55)));

  // Rows
  for (const group of groups) {
    const name = chalk.cyan(group.name.padEnd(25));
    const members = String(group.memberIds.length).padEnd(10);
    const role = group.defaultRole || chalk.dim('-');
    console.log(`${name}${members}${role}`);
  }

  console.log(chalk.dim(`\n${groups.length} group(s) total`));
}

/**
 * Create a new group
 */
async function createGroup(name: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await post<{ group: Group }>(
    `/api/platform/orgs/${orgId}/groups`,
    {
      name,
      description: options.description,
      defaultRole: options.role,
    },
    options
  );

  if (!response.success) {
    handleError(response, 'Create group');
  }

  console.log(chalk.green(`✓ Created group "${name}" (${response.data?.group.groupId})`));
}

/**
 * Delete a group
 */
async function deleteGroup(groupId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await del(
    `/api/platform/orgs/${orgId}/groups/${groupId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Delete group');
  }

  console.log(chalk.green(`✓ Deleted group ${groupId}`));
}

/**
 * Show group info
 */
async function showGroupInfo(groupId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await get<{ group: Group; members: GroupMember[] }>(
    `/api/platform/orgs/${orgId}/groups/${groupId}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Get group info');
  }

  const group = response.data!.group;
  const members = response.data!.members || [];
  
  console.log(chalk.bold(`Group: ${group.name}\n`));
  console.log(`  ID: ${chalk.dim(group.groupId)}`);
  if (group.description) {
    console.log(`  Description: ${group.description}`);
  }
  console.log(`  Default Role: ${group.defaultRole || chalk.dim('none')}`);
  console.log(`  Created: ${new Date(group.createdAt).toLocaleDateString()}`);
  
  console.log(chalk.bold(`\nMembers (${members.length})`));
  if (members.length === 0) {
    console.log(chalk.dim('  No members'));
  } else {
    for (const member of members) {
      console.log(`  • ${member.email || member.userId}`);
    }
  }
}

/**
 * Add a member to a group
 */
async function addMember(groupId: string, userId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await patch(
    `/api/platform/orgs/${orgId}/groups/${groupId}`,
    { addMembers: [userId] },
    options
  );

  if (!response.success) {
    handleError(response, 'Add member');
  }

  console.log(chalk.green(`✓ Added ${userId} to group`));
}

/**
 * Remove a member from a group
 */
async function removeMember(groupId: string, userId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await patch(
    `/api/platform/orgs/${orgId}/groups/${groupId}`,
    { removeMembers: [userId] },
    options
  );

  if (!response.success) {
    handleError(response, 'Remove member');
  }

  console.log(chalk.green(`✓ Removed ${userId} from group`));
}

/**
 * Main groups command handler
 */
export async function groupsCommand(
  action: string | undefined,
  arg1: string | undefined,
  arg2: string | undefined,
  options: CommandOptions
): Promise<void> {
  switch (action?.toLowerCase()) {
    case 'list':
    case 'ls':
      await listGroups(options);
      break;

    case 'create':
      if (!arg1) {
        console.error(chalk.red('Name is required. Usage: netpad groups create <name>'));
        process.exit(1);
      }
      await createGroup(arg1, options);
      break;

    case 'delete':
    case 'rm':
      if (!arg1) {
        console.error(chalk.red('Group ID required. Usage: netpad groups delete <groupId>'));
        process.exit(1);
      }
      await deleteGroup(arg1, options);
      break;

    case 'info':
    case 'show':
      if (!arg1) {
        console.error(chalk.red('Group ID required. Usage: netpad groups info <groupId>'));
        process.exit(1);
      }
      await showGroupInfo(arg1, options);
      break;

    case 'add-member':
      if (!arg1 || !arg2) {
        console.error(chalk.red('Usage: netpad groups add-member <groupId> <userId>'));
        process.exit(1);
      }
      await addMember(arg1, arg2, options);
      break;

    case 'remove-member':
      if (!arg1 || !arg2) {
        console.error(chalk.red('Usage: netpad groups remove-member <groupId> <userId>'));
        process.exit(1);
      }
      await removeMember(arg1, arg2, options);
      break;

    default:
      console.log(chalk.bold('netpad groups') + ' - Manage user groups/teams\n');
      console.log(chalk.cyan('Commands:'));
      console.log('  groups list                           List all groups');
      console.log('  groups create <name>                  Create a new group');
      console.log('  groups delete <groupId>               Delete a group');
      console.log('  groups info <groupId>                 Show group details');
      console.log('  groups add-member <group> <user>      Add user to group');
      console.log('  groups remove-member <group> <user>   Remove user from group');
      console.log();
      console.log(chalk.cyan('Options:'));
      console.log('  -o, --org <orgId>        Organization ID');
      console.log('  --role <role>            Default role for group members');
      console.log('  --description <desc>     Group description');
  }
}
