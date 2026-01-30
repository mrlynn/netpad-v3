/**
 * Advanced Shell Features for NetPad Terminal
 * 
 * Implements: aliases, pipes, environment, .netpadrc support
 */

export interface ShellState {
  aliases: Record<string, string>;
  env: Record<string, string>;
  lastExitCode: number;
  lastOutput: string;
}

export interface PipeSegment {
  command: string;
  args: string[];
}

// Default aliases
const DEFAULT_ALIASES: Record<string, string> = {
  'll': 'ls -l',
  'la': 'ls -la',
  'l': 'ls',
  '..': 'cd ..',
  '...': 'cd ../..',
  'forms': 'cd forms',
  'workflows': 'cd workflows',
  'data': 'cd data',
};

/**
 * Initialize shell state
 */
export function createShellState(): ShellState {
  return {
    aliases: { ...DEFAULT_ALIASES },
    env: {},
    lastExitCode: 0,
    lastOutput: '',
  };
}

/**
 * Parse a command line, handling aliases and pipes
 */
export function parseCommandLine(
  input: string, 
  state: ShellState
): { segments: PipeSegment[]; isPiped: boolean } {
  // Split by pipes (but not inside quotes)
  const pipeSegments = splitByPipes(input);
  const isPiped = pipeSegments.length > 1;
  
  const segments: PipeSegment[] = pipeSegments.map(segment => {
    const trimmed = segment.trim();
    const parts = parseArgs(trimmed);
    let command = parts[0] || '';
    let args = parts.slice(1);
    
    // Expand alias if exists
    if (state.aliases[command]) {
      const expanded = parseArgs(state.aliases[command]);
      command = expanded[0];
      args = [...expanded.slice(1), ...args];
    }
    
    return { command, args };
  });
  
  return { segments, isPiped };
}

/**
 * Split command by pipes, respecting quotes
 */
function splitByPipes(input: string): string[] {
  const segments: string[] = [];
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
      }
      current += char;
    } else if (char === '|' && !inQuote) {
      segments.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current) {
    segments.push(current);
  }
  
  return segments;
}

/**
 * Parse arguments, handling quoted strings
 */
export function parseArgs(input: string): string[] {
  const args: string[] = [];
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
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

/**
 * Handle alias command
 */
export function handleAliasCommand(
  args: string[], 
  state: ShellState
): { output: string; newState: ShellState } {
  // No args - list all aliases
  if (args.length === 0) {
    const lines = Object.entries(state.aliases)
      .map(([name, value]) => `\x1b[32m${name}\x1b[0m='\x1b[33m${value}\x1b[0m'`)
      .sort();
    
    return {
      output: lines.length > 0 ? lines.join('\r\n') : '\x1b[90m(no aliases defined)\x1b[0m',
      newState: state,
    };
  }
  
  // Setting an alias: alias ll='ls -l'
  const input = args.join(' ');
  const match = input.match(/^(\w+)=(['"]?)(.+)\2$/);
  
  if (match) {
    const [, name, , value] = match;
    const newState = {
      ...state,
      aliases: { ...state.aliases, [name]: value },
    };
    return {
      output: `\x1b[32m✓\x1b[0m Alias set: ${name}='${value}'`,
      newState,
    };
  }
  
  // Show specific alias
  const aliasName = args[0];
  if (state.aliases[aliasName]) {
    return {
      output: `\x1b[32m${aliasName}\x1b[0m='\x1b[33m${state.aliases[aliasName]}\x1b[0m'`,
      newState: state,
    };
  }
  
  return {
    output: `\x1b[31malias: ${aliasName}: not found\x1b[0m`,
    newState: state,
  };
}

/**
 * Handle unalias command
 */
export function handleUnaliasCommand(
  args: string[], 
  state: ShellState
): { output: string; newState: ShellState } {
  if (args.length === 0) {
    return {
      output: '\x1b[31munalias: usage: unalias name\x1b[0m',
      newState: state,
    };
  }
  
  const name = args[0];
  if (!state.aliases[name]) {
    return {
      output: `\x1b[31munalias: ${name}: not found\x1b[0m`,
      newState: state,
    };
  }
  
  const { [name]: _, ...rest } = state.aliases;
  return {
    output: `\x1b[32m✓\x1b[0m Removed alias: ${name}`,
    newState: { ...state, aliases: rest },
  };
}

/**
 * Filter output through grep
 */
export function grepFilter(input: string, pattern: string, options: { ignoreCase?: boolean; invert?: boolean } = {}): string {
  const lines = input.split(/\r?\n/);
  const flags = options.ignoreCase ? 'i' : '';
  const regex = new RegExp(pattern, flags);
  
  const filtered = lines.filter(line => {
    const matches = regex.test(line);
    return options.invert ? !matches : matches;
  });
  
  // Highlight matches
  if (!options.invert) {
    return filtered.map(line => 
      line.replace(new RegExp(`(${pattern})`, 'g' + flags), '\x1b[31m$1\x1b[0m')
    ).join('\r\n');
  }
  
  return filtered.join('\r\n');
}

/**
 * Execute a piped command chain
 */
export async function executePipeline(
  segments: PipeSegment[],
  executeCommand: (cmd: string, args: string[], pipeInput?: string) => Promise<{ success: boolean; output: string }>,
): Promise<{ success: boolean; output: string }> {
  let currentOutput = '';
  let success = true;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    
    // Special handling for grep in pipeline
    if (segment.command === 'grep' && i > 0) {
      const pattern = segment.args[0] || '';
      const ignoreCase = segment.args.includes('-i');
      const invert = segment.args.includes('-v');
      currentOutput = grepFilter(currentOutput, pattern, { ignoreCase, invert });
      continue;
    }
    
    // Special handling for head/tail in pipeline
    if (segment.command === 'head' && i > 0) {
      const lines = currentOutput.split(/\r?\n/);
      const n = parseInt(segment.args[0]?.replace('-', '') || '10', 10);
      currentOutput = lines.slice(0, n).join('\r\n');
      continue;
    }
    
    if (segment.command === 'tail' && i > 0 && !segment.args.includes('-f')) {
      const lines = currentOutput.split(/\r?\n/);
      const n = parseInt(segment.args[0]?.replace('-', '') || '10', 10);
      currentOutput = lines.slice(-n).join('\r\n');
      continue;
    }
    
    // Special handling for wc (word count)
    if (segment.command === 'wc' && i > 0) {
      const lines = currentOutput.split(/\r?\n/);
      const words = currentOutput.split(/\s+/).filter(Boolean);
      const chars = currentOutput.length;
      
      if (segment.args.includes('-l')) {
        currentOutput = String(lines.length);
      } else if (segment.args.includes('-w')) {
        currentOutput = String(words.length);
      } else if (segment.args.includes('-c')) {
        currentOutput = String(chars);
      } else {
        currentOutput = `  ${lines.length}  ${words.length}  ${chars}`;
      }
      continue;
    }
    
    // Execute the command with pipe input
    const result = await executeCommand(segment.command, segment.args, i > 0 ? currentOutput : undefined);
    
    if (!result.success && !isLast) {
      // Pipeline broken
      return { success: false, output: result.output };
    }
    
    currentOutput = result.output;
    success = result.success;
  }
  
  return { success, output: currentOutput };
}

/**
 * Save shell state to localStorage (for .netpadrc persistence)
 */
export function saveShellState(state: ShellState): void {
  try {
    localStorage.setItem('netpad-shell-state', JSON.stringify({
      aliases: state.aliases,
      env: state.env,
    }));
  } catch (e) {
    console.error('[Shell] Failed to save state:', e);
  }
}

/**
 * Load shell state from localStorage
 */
export function loadShellState(): Partial<ShellState> {
  try {
    const stored = localStorage.getItem('netpad-shell-state');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        aliases: { ...DEFAULT_ALIASES, ...parsed.aliases },
        env: parsed.env || {},
      };
    }
  } catch (e) {
    console.error('[Shell] Failed to load state:', e);
  }
  return {};
}
