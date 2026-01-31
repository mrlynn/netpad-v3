/**
 * Shell Command Handlers
 * 
 * Handles commands that can be executed locally or via API
 */

import chalk from 'chalk';
import { ShellState } from './index.js';
import { ShellAPIClient, FSEntry } from './api.js';
import { getConfig, clearCredentials, saveConfig, loadConfig } from '../lib/config.js';
import * as readline from 'readline';

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  newPath?: string;
}

// Commands that don't require API calls or are handled specially
const LOCAL_COMMANDS = [
  'pwd', 'ls', 'cd', 'cat', 'tree', 'find', 'grep',
  'alias', 'unalias', 'echo', 'env', 'export',
  'users', 'groups', 'roles', 'assign', 'unassign', 'permissions', 'whoami',
  'login', 'logout',
];

// Helper for auth required errors
function authRequiredError(): CommandResult {
  return {
    success: false,
    error: chalk.yellow('⚠ Not authenticated') + '\n\n' +
      'To use this command, you need to log in first:\n' +
      `  ${chalk.cyan('netpad login')} ${chalk.gray('(run outside the shell)')}\n\n` +
      chalk.gray('Get an API key at: https://app.netpad.app/settings/api'),
  };
}

// Helper for API errors
function handleApiError(error?: string): CommandResult {
  if (error?.includes('401') || error?.includes('Unauthorized')) {
    return {
      success: false,
      error: chalk.yellow('⚠ Session expired or invalid') + '\n' +
        `Run ${chalk.cyan('netpad login')} to re-authenticate`,
    };
  }
  return { success: false, error: error || 'Command failed' };
}

export function isLocalCommand(command: string): boolean {
  return LOCAL_COMMANDS.includes(command?.toLowerCase());
}

export async function executeLocalCommand(
  command: string,
  args: string[],
  state: ShellState,
  api: ShellAPIClient
): Promise<CommandResult> {
  const cmd = command.toLowerCase();

  switch (cmd) {
    case 'pwd':
      return { success: true, output: state.currentPath };

    case 'ls':
      return handleLs(args, state, api);

    case 'cd':
      return handleCd(args, state, api);

    case 'cat':
      return handleCat(args, state, api);

    case 'tree':
      return handleTree(args, state, api);

    case 'find':
      return handleFind(args, state, api);

    case 'grep':
      return handleGrep(args, state, api);

    case 'alias':
      return handleAlias(args, state);

    case 'unalias':
      return handleUnalias(args, state);

    case 'echo':
      return { success: true, output: args.join(' ') };

    case 'env':
      return handleEnv(state);

    case 'export':
      return handleExport(args, state);

    // RBAC commands - execute via API
    case 'users':
    case 'groups':
    case 'roles':
    case 'assign':
    case 'unassign':
    case 'permissions':
    case 'whoami':
      return executeRBACCommand(cmd, args, state, api);

    case 'login':
      return handleLogin(state);

    case 'logout':
      return handleLogout();

    default:
      return { success: false, error: `Unknown command: ${command}` };
  }
}

async function handleLs(args: string[], state: ShellState, api: ShellAPIClient): Promise<CommandResult> {
  // Check if authenticated
  if (!api.isAuthenticated()) {
    return {
      success: false,
      error: chalk.yellow('⚠ Not authenticated') + '\n\n' +
        'To use this command, you need to log in first:\n' +
        `  ${chalk.cyan('netpad login')} ${chalk.gray('(run outside the shell)')}\n\n` +
        chalk.gray('Or get an API key at: https://app.netpad.app/settings/api'),
    };
  }
  
  const path = args[0] || state.currentPath;
  const showAll = args.includes('-a') || args.includes('--all');
  const longFormat = args.includes('-l') || args.includes('--long');
  
  const result = await api.executeFS('ls', path);
  
  if (!result.success) {
    // Check for auth errors specifically
    if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
      return {
        success: false,
        error: chalk.yellow('⚠ Session expired or invalid') + '\n' +
          `Run ${chalk.cyan('netpad login')} to re-authenticate`,
      };
    }
    return { success: false, error: result.error || 'Failed to list directory' };
  }
  
  if (!result.entries?.length) {
    return { success: true, output: chalk.gray('(empty)') };
  }
  
  const entries = result.entries;
  
  if (longFormat) {
    const output = entries.map(e => formatLongEntry(e)).join('\n');
    return { success: true, output };
  }
  
  // Simple format - colorize by type
  const output = entries.map(e => colorizeEntry(e)).join('  ');
  return { success: true, output };
}

async function handleCd(args: string[], state: ShellState, api: ShellAPIClient): Promise<CommandResult> {
  if (!args[0] || args[0] === '~') {
    return { success: true, newPath: '/' };
  }
  
  const target = args[0];
  let newPath: string;
  
  if (target === '..') {
    const parts = state.currentPath.split('/').filter(Boolean);
    parts.pop();
    newPath = '/' + parts.join('/');
  } else if (target.startsWith('/')) {
    newPath = target;
  } else {
    newPath = state.currentPath === '/' 
      ? `/${target}` 
      : `${state.currentPath}/${target}`;
  }
  
  // Normalize path (remove trailing slash, double slashes)
  newPath = newPath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  
  // Verify path exists
  const result = await api.executeFS('ls', newPath);
  
  if (!result.success) {
    return { success: false, error: `cd: ${target}: No such directory` };
  }
  
  return { success: true, newPath };
}

async function handleCat(args: string[], state: ShellState, api: ShellAPIClient): Promise<CommandResult> {
  if (!api.isAuthenticated()) {
    return authRequiredError();
  }
  
  if (!args[0]) {
    return { success: false, error: 'cat: missing file operand' };
  }
  
  const path = args[0].startsWith('/') ? args[0] : `${state.currentPath}/${args[0]}`;
  const result = await api.executeFS('cat', path);
  
  if (!result.success) {
    return handleApiError(result.error) || { success: false, error: `cat: ${args[0]}: No such file` };
  }
  
  return { success: true, output: result.content || result.output || '' };
}

async function handleTree(args: string[], state: ShellState, api: ShellAPIClient): Promise<CommandResult> {
  if (!api.isAuthenticated()) {
    return authRequiredError();
  }
  
  const path = args[0] || state.currentPath;
  const result = await api.executeFS('tree', path);
  
  if (!result.success) {
    return handleApiError(result.error);
  }
  
  return { success: true, output: result.output || '' };
}

async function handleFind(args: string[], state: ShellState, api: ShellAPIClient): Promise<CommandResult> {
  if (!api.isAuthenticated()) {
    return authRequiredError();
  }
  
  if (!args[0]) {
    return { success: false, error: 'find: missing search pattern' };
  }
  
  const result = await api.executeFS('find', state.currentPath, { pattern: args[0] });
  
  if (!result.success) {
    return handleApiError(result.error);
  }
  
  return { success: true, output: result.output || chalk.gray('No matches found') };
}

async function handleGrep(args: string[], state: ShellState, api: ShellAPIClient): Promise<CommandResult> {
  if (!api.isAuthenticated()) {
    return authRequiredError();
  }
  
  if (args.length < 2) {
    return { success: false, error: 'grep: usage: grep <pattern> <file>' };
  }
  
  const [pattern, file] = args;
  const path = file.startsWith('/') ? file : `${state.currentPath}/${file}`;
  
  const result = await api.executeFS('grep', path, { pattern });
  
  if (!result.success) {
    return handleApiError(result.error);
  }
  
  return { success: true, output: result.output || '' };
}

function handleAlias(args: string[], state: ShellState): CommandResult {
  if (!args[0]) {
    // List all aliases
    const output = Object.entries(state.aliases)
      .map(([k, v]) => `${chalk.cyan(k)}=${chalk.yellow(`'${v}'`)}`)
      .join('\n');
    return { success: true, output: output || chalk.gray('(no aliases)') };
  }
  
  // Set alias: alias ll='ls -la'
  const match = args.join(' ').match(/^(\w+)=(.+)$/);
  if (match) {
    const [, name, value] = match;
    state.aliases[name] = value.replace(/^['"]|['"]$/g, '');
    return { success: true };
  }
  
  return { success: false, error: 'alias: invalid syntax. Use: alias name=\'command\'' };
}

function handleUnalias(args: string[], state: ShellState): CommandResult {
  if (!args[0]) {
    return { success: false, error: 'unalias: missing alias name' };
  }
  
  if (state.aliases[args[0]]) {
    delete state.aliases[args[0]];
    return { success: true };
  }
  
  return { success: false, error: `unalias: ${args[0]}: not found` };
}

function handleEnv(state: ShellState): CommandResult {
  const output = Object.entries(state.env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  return { success: true, output: output || chalk.gray('(no environment variables)') };
}

function handleExport(args: string[], state: ShellState): CommandResult {
  if (!args[0]) {
    return handleEnv(state);
  }
  
  const match = args[0].match(/^(\w+)=(.*)$/);
  if (match) {
    const [, name, value] = match;
    state.env[name] = value;
    return { success: true };
  }
  
  return { success: false, error: 'export: invalid syntax. Use: export NAME=value' };
}

async function executeRBACCommand(
  command: string,
  args: string[],
  state: ShellState,
  api: ShellAPIClient
): Promise<CommandResult> {
  // Check auth first
  if (!api.isAuthenticated()) {
    return authRequiredError();
  }
  
  // Build full command string
  const fullCommand = [command, ...args].join(' ');
  
  const result = await api.executeCommand(fullCommand, {
    path: state.currentPath,
    history: state.history,
  });
  
  // Handle API errors
  if (!result.success && result.error) {
    return handleApiError(result.error);
  }
  
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  };
}

function colorizeEntry(entry: FSEntry): string {
  const name = entry.name;
  
  switch (entry.type) {
    case 'org':
      return chalk.magenta.bold(name + '/');
    case 'project':
      return chalk.blue.bold(name + '/');
    case 'application':
      return chalk.cyan.bold(name + '/');
    case 'directory':
      return chalk.cyan(name + '/');
    case 'form':
      return chalk.green(name);
    case 'workflow':
      return chalk.yellow(name);
    default:
      return name;
  }
}

function formatLongEntry(entry: FSEntry): string {
  const typeColors: Record<string, (s: string) => string> = {
    org: chalk.magenta,
    project: chalk.blue,
    application: chalk.cyan,
    directory: chalk.cyan,
    form: chalk.green,
    workflow: chalk.yellow,
    file: chalk.white,
  };
  
  const colorFn = typeColors[entry.type] || chalk.white;
  const typeStr = entry.type.padEnd(12);
  const name = colorFn(entry.name + (entry.type !== 'file' && entry.type !== 'form' && entry.type !== 'workflow' ? '/' : ''));
  
  return `${chalk.gray(typeStr)} ${name}`;
}

/**
 * Handle login command - launches interactive login
 */
async function handleLogin(state: ShellState): Promise<CommandResult> {
  const config = getConfig();
  
  if (config.apiKey || config.sessionToken) {
    return {
      success: true,
      output: chalk.green('✓ Already authenticated') + 
        (config.orgId ? `\n  Organization: ${chalk.cyan(config.orgId)}` : '') +
        '\n\n' + chalk.gray('To re-authenticate, run "logout" first, then "login"'),
    };
  }
  
  // Spawn the login command as a child process
  const { spawn } = await import('child_process');
  const apiUrl = config.apiUrl || 'http://localhost:3000';
  
  console.log(chalk.blue('\nStarting login flow...\n'));
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['netpad', 'login', '--api-url', apiUrl], {
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: chalk.green('\n✓ Login complete! You can now use all commands.'),
        });
      } else {
        resolve({
          success: false,
          error: chalk.red('\nLogin failed or was cancelled.'),
        });
      }
    });
    
    child.on('error', (err) => {
      resolve({
        success: false,
        error: `${chalk.yellow('Could not start login process.')}\n` +
          `Run ${chalk.cyan(`netpad login --api-url ${apiUrl}`)} in another terminal.`,
      });
    });
  });
}

/**
 * Handle logout command
 */
function handleLogout(): CommandResult {
  const config = getConfig();
  
  if (!config.apiKey && !config.sessionToken) {
    return { success: true, output: chalk.gray('Not logged in') };
  }
  
  clearCredentials();
  
  return {
    success: true,
    output: chalk.green('✓ Logged out successfully') +
      '\n' + chalk.gray('Credentials cleared from ~/.netpad/config.json'),
  };
}
