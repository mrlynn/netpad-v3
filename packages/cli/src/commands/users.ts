/**
 * Users Command
 * 
 * Manage organization members
 */

import chalk from 'chalk';
import { get, post, patch, del, requireOrgId, handleError, ApiOptions } from '../lib/api.js';

interface Member {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
  joinedAt: string;
  lastLoginAt?: string;
}

interface CommandOptions extends ApiOptions {
  role?: string;
}

const ROLE_COLORS: Record<string, typeof chalk.red> = {
  owner: chalk.red,
  admin: chalk.yellow,
  member: chalk.green,
  viewer: chalk.blue,
};

function formatRole(role: string): string {
  const colorFn = ROLE_COLORS[role] || chalk.gray;
  return colorFn(role);
}

/**
 * List organization members
 */
async function listUsers(options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);
  
  const response = await get<{ members: Member[] }>(
    `/api/platform/orgs/${orgId}/members`,
    options
  );

  if (!response.success) {
    handleError(response, 'List members');
  }

  const members = response.data?.members || [];
  
  console.log(chalk.bold('Organization Members\n'));
  
  if (members.length === 0) {
    console.log(chalk.dim('No members found.'));
    return;
  }

  // Header
  console.log(
    chalk.dim('EMAIL'.padEnd(35)) +
    chalk.dim('ROLE'.padEnd(12)) +
    chalk.dim('JOINED')
  );
  console.log(chalk.dim('─'.repeat(60)));

  // Rows
  for (const member of members) {
    const email = member.email.padEnd(35);
    const role = formatRole(member.role.padEnd(12));
    const joined = new Date(member.joinedAt).toLocaleDateString();
    console.log(`${email}${role}${chalk.dim(joined)}`);
  }

  console.log(chalk.dim(`\n${members.length} member(s) total`));
}

/**
 * Add/invite a user to the organization
 */
async function addUser(email: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);
  const role = options.role || 'member';

  if (!['admin', 'member', 'viewer'].includes(role)) {
    console.error(chalk.red('Invalid role. Must be: admin, member, or viewer'));
    process.exit(1);
  }

  const response = await post(
    `/api/platform/orgs/${orgId}/invitations`,
    { email, role },
    options
  );

  if (!response.success) {
    handleError(response, 'Invite user');
  }

  console.log(chalk.green(`✓ Invitation sent to ${email} as ${role}`));
}

/**
 * Remove a user from the organization
 */
async function removeUser(userId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await del(
    `/api/platform/orgs/${orgId}/members/${encodeURIComponent(userId)}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Remove user');
  }

  console.log(chalk.green(`✓ Removed ${userId} from organization`));
}

/**
 * Show user info
 */
async function showUserInfo(userId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);

  const response = await get<Member>(
    `/api/platform/orgs/${orgId}/members/${encodeURIComponent(userId)}`,
    options
  );

  if (!response.success) {
    handleError(response, 'Get user info');
  }

  const user = response.data!;
  
  console.log(chalk.bold('User Info\n'));
  console.log(`  Email: ${chalk.cyan(user.email)}`);
  console.log(`  User ID: ${chalk.dim(user.userId)}`);
  if (user.displayName) {
    console.log(`  Name: ${user.displayName}`);
  }
  console.log(`  Role: ${formatRole(user.role)}`);
  console.log(`  Joined: ${new Date(user.joinedAt).toLocaleDateString()}`);
  if (user.lastLoginAt) {
    console.log(`  Last Login: ${new Date(user.lastLoginAt).toLocaleString()}`);
  }
}

/**
 * Update user role
 */
async function updateUser(userId: string, options: CommandOptions): Promise<void> {
  const orgId = requireOrgId(options);
  const role = options.role;

  if (!role) {
    console.error(chalk.red('Role is required. Use: --role <role>'));
    process.exit(1);
  }

  if (!['admin', 'member', 'viewer'].includes(role)) {
    console.error(chalk.red('Invalid role. Must be: admin, member, or viewer'));
    process.exit(1);
  }

  const response = await patch(
    `/api/platform/orgs/${orgId}/members/${encodeURIComponent(userId)}`,
    { role },
    options
  );

  if (!response.success) {
    handleError(response, 'Update user');
  }

  console.log(chalk.green(`✓ Updated ${userId} role to ${role}`));
}

/**
 * Main users command handler
 */
export async function usersCommand(
  action: string | undefined,
  target: string | undefined,
  options: CommandOptions
): Promise<void> {
  switch (action?.toLowerCase()) {
    case 'list':
    case 'ls':
      await listUsers(options);
      break;

    case 'add':
    case 'invite':
      if (!target) {
        console.error(chalk.red('Email is required. Usage: netpad users add <email>'));
        process.exit(1);
      }
      await addUser(target, options);
      break;

    case 'remove':
    case 'rm':
      if (!target) {
        console.error(chalk.red('User ID or email required. Usage: netpad users remove <userId>'));
        process.exit(1);
      }
      await removeUser(target, options);
      break;

    case 'info':
    case 'show':
      if (!target) {
        console.error(chalk.red('User ID or email required. Usage: netpad users info <userId>'));
        process.exit(1);
      }
      await showUserInfo(target, options);
      break;

    case 'update':
      if (!target) {
        console.error(chalk.red('User ID or email required. Usage: netpad users update <userId> --role <role>'));
        process.exit(1);
      }
      await updateUser(target, options);
      break;

    default:
      console.log(chalk.bold('netpad users') + ' - Manage organization members\n');
      console.log(chalk.cyan('Commands:'));
      console.log('  users list                    List all org members');
      console.log('  users add <email>             Invite a new user');
      console.log('  users remove <userId>         Remove user from org');
      console.log('  users info <userId>           Show user details');
      console.log('  users update <userId> --role  Change user\'s role');
      console.log();
      console.log(chalk.cyan('Options:'));
      console.log('  -o, --org <orgId>    Organization ID');
      console.log('  --role <role>        Role to assign (admin|member|viewer)');
  }
}
