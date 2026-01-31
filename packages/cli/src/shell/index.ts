/**
 * NetPad Interactive Shell
 * 
 * Provides a REPL interface that mirrors the web terminal experience
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { printBanner, printHelp } from './banner.js';
import { ShellAPIClient } from './api.js';
import { executeLocalCommand, isLocalCommand } from './commands.js';
import { buildPrompt } from './prompt.js';
import { withLoader } from './loader.js';

export interface ShellState {
  currentPath: string;
  history: string[];
  aliases: Record<string, string>;
  env: Record<string, string>;
}

export async function startShell(): Promise<void> {
  const api = new ShellAPIClient();
  
  // Initialize state
  const state: ShellState = {
    currentPath: '/',
    history: [],
    aliases: {
      'll': 'ls -la',
      'la': 'ls -a',
      '..': 'cd ..',
    },
    env: {},
  };

  // Print banner
  printBanner();

  // Check authentication
  if (!api.isAuthenticated()) {
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow('  ⚠  Not authenticated'));
    console.log(chalk.gray('  Most commands require login. To authenticate:'));
    console.log(`     ${chalk.cyan('netpad login')} ${chalk.gray('(run in another terminal)')}`);
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  } else {
    console.log(chalk.green('✓ Authenticated') + chalk.gray(` (org: ${api.getOrgId() || 'none'})\n`));
  }

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
    removeHistoryDuplicates: true,
    completer: async (line: string, callback: (err: Error | null, result: [string[], string]) => void) => {
      try {
        const completions = await getCompletions(line, state, api);
        const hits = completions.filter(c => c.startsWith(line.split(' ').pop() || ''));
        callback(null, [hits.length ? hits : completions, line.split(' ').pop() || '']);
      } catch {
        callback(null, [[], line]);
      }
    },
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log('\n(To exit, type "exit" or "quit")');
    rl.prompt();
  });

  // Prompt function
  const prompt = () => {
    const promptStr = buildPrompt(state.currentPath);
    rl.setPrompt(promptStr);
    rl.prompt();
  };

  // Process line
  rl.on('line', async (input: string) => {
    const trimmed = input.trim();
    
    if (!trimmed) {
      prompt();
      return;
    }

    // Add to history
    state.history.push(trimmed);

    // Handle aliases
    const expandedInput = expandAliases(trimmed, state.aliases);

    // Handle exit
    if (['exit', 'quit', 'q'].includes(expandedInput.toLowerCase())) {
      console.log(chalk.green('\nGoodbye! 👋'));
      rl.close();
      process.exit(0);
    }

    // Handle clear
    if (expandedInput.toLowerCase() === 'clear') {
      console.clear();
      printBanner();
      prompt();
      return;
    }

    // Handle help - now delegated to handleHelp for dynamic help
    // (static printHelp is only used for --help flag)

    // Handle history
    if (expandedInput.toLowerCase() === 'history') {
      state.history.forEach((cmd, i) => {
        console.log(chalk.gray(`${String(i + 1).padStart(4)}  `) + cmd);
      });
      prompt();
      return;
    }

    // Parse command and args
    const parts = parseCommandLine(expandedInput);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    // Check for local commands (don't need API)
    if (isLocalCommand(command)) {
      const result = await executeLocalCommand(command, args, state, api);
      
      if (result.output) {
        console.log(result.output);
      }
      if (result.error) {
        console.log(chalk.red(result.error));
      }
      if (result.newPath !== undefined) {
        state.currentPath = result.newPath;
      }

      prompt();
      return;
    }

    // Execute via API (with AI processing for natural language)
    try {
      // Show loader while AI processes
      const result = await withLoader(
        api.executeCommand(expandedInput, {
          path: state.currentPath,
          history: state.history,
        })
      );

      if (result.output) {
        console.log(result.output);
      }
      if (result.error) {
        console.log(chalk.red(result.error));
      }
      if (result.suggestions?.length) {
        console.log(chalk.gray('Suggestions:'));
        result.suggestions.forEach(s => console.log(`  ${chalk.cyan(s)}`));
      }
    } catch (error) {
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }

    prompt();
  });

  // Handle close
  rl.on('close', () => {
    process.exit(0);
  });

  // Start prompt
  prompt();
}

function expandAliases(input: string, aliases: Record<string, string>): string {
  const parts = input.split(/\s+/);
  const command = parts[0];
  
  if (aliases[command]) {
    return aliases[command] + (parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '');
  }
  
  return input;
}

function parseCommandLine(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if ((char === '"' || char === "'") && input[i - 1] !== '\\') {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === ' ' && !inQuote) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current);
  }
  
  return parts;
}

async function getCompletions(line: string, state: ShellState, api: ShellAPIClient): Promise<string[]> {
  const parts = line.split(/\s+/);
  const lastPart = parts[parts.length - 1] || '';
  
  // Command completion
  if (parts.length <= 1) {
    const commands = [
      'ls', 'cd', 'pwd', 'cat', 'tree', 'find', 'grep',
      'list', 'show', 'create', 'delete', 'deploy',
      'users', 'groups', 'roles', 'assign', 'unassign', 'permissions', 'whoami',
      'search', 'install', 'login', 'logout',
      'help', 'clear', 'history', 'exit', 'quit',
    ];
    return commands.filter(c => c.startsWith(lastPart));
  }
  
  // Path completion for filesystem commands
  const fsCommands = ['ls', 'cd', 'cat', 'tree', 'find', 'grep'];
  if (fsCommands.includes(parts[0].toLowerCase())) {
    const completions = await api.getCompletions(state.currentPath);
    return completions.filter(c => c.toLowerCase().startsWith(lastPart.toLowerCase()));
  }
  
  // Subcommand completion
  const subcommands: Record<string, string[]> = {
    list: ['forms', 'workflows', 'templates', 'submissions'],
    show: ['form', 'workflow', 'template'],
    create: ['form', 'workflow', 'template'],
    users: ['list', 'add', 'remove', 'info', 'update'],
    groups: ['list', 'create', 'delete', 'info', 'add-member', 'remove-member'],
    roles: ['list', 'create', 'delete', 'info', 'grant', 'revoke'],
    permissions: ['list', 'check', 'me'],
  };
  
  const cmd = parts[0].toLowerCase();
  if (parts.length === 2 && subcommands[cmd]) {
    return subcommands[cmd].filter(s => s.startsWith(lastPart));
  }
  
  return [];
}
