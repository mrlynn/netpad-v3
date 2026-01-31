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
  'login', 'login-key', 'logout',
  'help', 'help-topic', 'help-search',
];

// Helper for auth required errors
function authRequiredError(): CommandResult {
  return {
    success: false,
    error: chalk.yellow('⚠ Not authenticated') + '\n\n' +
      'To use this command, you need to log in first:\n' +
      `  ${chalk.cyan('netpad login')} ${chalk.gray('(run outside the shell)')}\n\n` +
      chalk.gray('Get an API key at: https://netpad.io/settings/api'),
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
      return executeRBACCommand(cmd, args, state, api);

    case 'whoami':
      return handleWhoami(api);

    case 'login':
      return handleLogin(state);

    case 'login-key':
      return handleLoginKey(args);

    case 'logout':
      return handleLogout();

    case 'help':
      return handleHelp(args, api);

    case 'help-topic':
      return handleHelpTopic(args, api);

    case 'help-search':
      return handleHelpSearch(args, api);

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
        chalk.gray('Or get an API key at: https://netpad.io/settings/api'),
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
 * Handle help command
 * - help - Show quick command reference
 * - help <topic> - Show specific help topic
 * - help search <query> - Search help topics
 */
async function handleHelp(args: string[], api: ShellAPIClient): Promise<CommandResult> {
  // If no args, show quick help and topic categories
  if (args.length === 0) {
    return showQuickHelp(api);
  }

  // If first arg is "search", search topics
  if (args[0] === 'search' && args.length > 1) {
    return handleHelpSearch(args.slice(1), api);
  }

  // Otherwise, show specific topic
  return handleHelpTopic(args, api);
}

/**
 * Show quick command reference and topic list
 */
async function showQuickHelp(api: ShellAPIClient): Promise<CommandResult> {
  const quickHelp = `
${chalk.bold.cyan('NetPad CLI - Quick Reference')}

${chalk.bold('Navigation:')}
  ${chalk.cyan('ls')} [path]              List contents
  ${chalk.cyan('cd')} <path>              Change directory
  ${chalk.cyan('pwd')}                    Print working directory
  ${chalk.cyan('cat')} <file>             View file/entity details

${chalk.bold('Entity Commands:')}
  ${chalk.cyan('list')} forms|workflows   List entities
  ${chalk.cyan('show')} <type> <id>       Show entity details
  ${chalk.cyan('create')} <type> <name>   Create new entity

${chalk.bold('RBAC Commands:')}
  ${chalk.cyan('users')} list|add|remove  Manage members
  ${chalk.cyan('groups')} list|create     Manage groups
  ${chalk.cyan('roles')} list|create      Manage roles

${chalk.bold('Help System:')}
  ${chalk.cyan('help')} <topic>           View topic (e.g., ${chalk.yellow('help form-builder')})
  ${chalk.cyan('help search')} <query>    Search help topics
`;

  // Try to fetch topic categories from API
  try {
    const baseUrl = api.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/help`);
    
    if (response.ok) {
      const data = await response.json();
      
      let topicList = `\n${chalk.bold('Help Topics:')}`;
      for (const category of data.categories.slice(0, 5)) {
        topicList += `\n  ${chalk.yellow(category.category)}:`;
        const topicNames = category.topics.slice(0, 3).map((t: {id: string}) => chalk.cyan(t.id));
        topicList += ` ${topicNames.join(', ')}`;
        if (category.topics.length > 3) {
          topicList += chalk.gray(` +${category.topics.length - 3} more`);
        }
      }
      topicList += `\n\n${chalk.gray('Run "help <topic-id>" for details')}`;
      
      return { success: true, output: quickHelp + topicList };
    }
  } catch {
    // Ignore API errors, just show quick help
  }

  return { success: true, output: quickHelp };
}

/**
 * Handle help-topic command - show specific topic
 */
async function handleHelpTopic(args: string[], api: ShellAPIClient): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: `Usage: ${chalk.cyan('help <topic-id>')}\n` +
        `Example: ${chalk.cyan('help form-builder')}\n` +
        `Search: ${chalk.cyan('help search forms')}`,
    };
  }

  const topicId = args.join('-');
  const baseUrl = api.getBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/help/${topicId}?format=terminal`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Try searching instead
        const searchResponse = await fetch(`${baseUrl}/api/help?search=${encodeURIComponent(args.join(' '))}`);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.results?.length > 0) {
            const suggestions = searchData.results.slice(0, 5)
              .map((r: {id: string, title: string}) => `  ${chalk.cyan(r.id)} - ${r.title}`)
              .join('\n');
            return {
              success: false,
              error: `Topic "${topicId}" not found.\n\n${chalk.yellow('Did you mean:')}\n${suggestions}`,
            };
          }
        }
        return {
          success: false,
          error: `Help topic "${topicId}" not found.\nTry: ${chalk.cyan('help search <query>')}`,
        };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const content = await response.text();
    return { success: true, output: content };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch help: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle help-search command
 */
async function handleHelpSearch(args: string[], api: ShellAPIClient): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: `Usage: ${chalk.cyan('help search <query>')}\nExample: ${chalk.cyan('help search forms')}`,
    };
  }

  const query = args.join(' ');
  const baseUrl = api.getBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/help?search=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results?.length === 0) {
      return {
        success: true,
        output: chalk.yellow(`No help topics found for "${query}"`) + '\n' +
          chalk.gray('Try a different search term'),
      };
    }

    let output = `${chalk.bold(`Help topics matching "${query}"`)} (${data.count} results)\n\n`;
    
    for (const topic of data.results.slice(0, 10)) {
      output += `  ${chalk.cyan(topic.id)}\n`;
      output += `    ${topic.title}\n`;
      output += `    ${chalk.gray(topic.description.substring(0, 80))}${topic.description.length > 80 ? '...' : ''}\n\n`;
    }

    if (data.count > 10) {
      output += chalk.gray(`  ... and ${data.count - 10} more results\n`);
    }

    output += `\n${chalk.gray('View topic:')} ${chalk.cyan('help <topic-id>')}`;

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search help: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle whoami command - show current auth status
 */
function handleWhoami(api: ShellAPIClient): CommandResult {
  const config = getConfig();
  
  if (!api.isAuthenticated()) {
    return {
      success: true,
      output: chalk.yellow('Not authenticated') + '\n' +
        chalk.gray('Run "login" to authenticate'),
    };
  }
  
  const apiKeyDisplay = config.apiKey 
    ? config.apiKey.substring(0, 12) + '...' + config.apiKey.slice(-4)
    : chalk.gray('(none)');
  
  const output = `${chalk.green('✓ Authenticated')}\n\n` +
    `  ${chalk.gray('API Key:')}  ${apiKeyDisplay}\n` +
    `  ${chalk.gray('API URL:')}  ${config.apiUrl || 'http://localhost:3000'}\n` +
    `  ${chalk.gray('Org ID:')}   ${config.orgId || chalk.gray('(none)')}\n`;
  
  return { success: true, output };
}

/**
 * Handle login command - prompts for API key inline
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
  
  const apiUrl = config.apiUrl || 'http://localhost:3000';
  
  // In-shell login only supports API key (OAuth needs separate terminal)
  const output = `
${chalk.blue('NetPad Login')}

${chalk.bold('Option 1: API Key')} ${chalk.gray('(recommended for CLI)')}
  ${chalk.cyan('login-key')} ${chalk.yellow('<your-api-key>')}
  
  Get your API key at: ${chalk.cyan(apiUrl + '/settings/api')}

${chalk.bold('Option 2: Browser OAuth')} ${chalk.gray('(run in separate terminal)')}
  ${chalk.gray('$')} ${chalk.cyan('netpad login --api-url ' + apiUrl)}
`;
  
  return { success: true, output };
}

/**
 * Handle login-key command - direct API key authentication
 */
async function handleLoginKey(args: string[]): Promise<CommandResult> {
  if (!args[0]) {
    return {
      success: false,
      error: `Usage: ${chalk.cyan('login-key')} ${chalk.yellow('<api-key>')}\n\n` +
        chalk.gray('Example: login-key np_live_abc123...'),
    };
  }

  const apiKey = args[0];
  const config = loadConfig();
  const apiUrl = config.apiUrl || 'http://localhost:3000';

  // Validate the API key by making a test request
  console.log(chalk.gray('Validating API key...'));

  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: chalk.red('Invalid API key') + '\n' +
          chalk.gray(`Server returned: ${response.status} ${response.statusText}`),
      };
    }

    const data = await response.json();
    
    // Save the API key
    const newConfig = { ...config, apiKey };
    if (data.orgId) {
      newConfig.orgId = data.orgId;
    }
    saveConfig(newConfig);

    return {
      success: true,
      output: chalk.green('✓ Logged in successfully!') +
        (data.email ? `\n  Email: ${chalk.cyan(data.email)}` : '') +
        (data.orgId || newConfig.orgId ? `\n  Organization: ${chalk.cyan(data.orgId || newConfig.orgId)}` : '') +
        '\n\n' + chalk.gray('You can now use all commands.'),
    };
  } catch (error) {
    return {
      success: false,
      error: chalk.red('Failed to validate API key') + '\n' +
        chalk.gray(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
    };
  }
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
