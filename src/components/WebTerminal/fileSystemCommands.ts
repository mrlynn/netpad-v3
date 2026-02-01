/**
 * Filesystem Commands for NetPad Terminal
 * 
 * Implements unix-like commands: cd, ls, pwd, cat, tree, find, mv, cp, touch, grep
 */

import {
  VFSState,
  VFSContext,
  normalizePath,
  parsePath,
  getPathType,
  getParentPath,
  getCategoryFromPath,
  getItemNameFromPath,
  formatPath,
  formatListEntry,
  buildPrompt,
  APP_CATEGORIES,
} from './virtualFileSystem';

export interface FSCommandResult {
  success: boolean;
  output: string;
  newPath?: string;
  newContext?: VFSContext;
  error?: string;
  data?: unknown; // For JSON output mode
}

export interface FSCommandContext {
  currentPath: string;
  context: VFSContext;
  apiEndpoint: string;
  pipeInput?: string; // Input from previous command in pipeline
}

/**
 * Execute a filesystem command
 */
export async function executeFileSystemCommand(
  command: string,
  args: string[],
  ctx: FSCommandContext
): Promise<FSCommandResult> {
  switch (command.toLowerCase()) {
    case 'pwd':
      return handlePwd(ctx);
    
    case 'cd':
      return handleCd(args, ctx);
    
    case 'ls':
      return handleLs(args, ctx);
    
    case 'cat':
    case 'show':
      return handleCat(args, ctx);
    
    case 'tree':
      return handleTree(args, ctx);
    
    case 'find':
      return handleFind(args, ctx);
    
    case 'grep':
      return handleGrep(args, ctx);
    
    case 'mkdir':
    case 'touch':
      return handleCreate(command, args, ctx);
    
    case 'rm':
      return handleRm(args, ctx);
    
    case 'mv':
      return handleMove(args, ctx);
    
    case 'cp':
      return handleCopy(args, ctx);
    
    case 'tail':
      return handleTail(args, ctx);
    
    case 'head':
      return handleHead(args, ctx);
    
    case 'echo':
      return { success: true, output: args.join(' ') };
    
    default:
      return {
        success: false,
        output: '',
        error: `Unknown command: ${command}`,
      };
  }
}

/**
 * PWD - Print working directory
 */
function handlePwd(ctx: FSCommandContext): FSCommandResult {
  return {
    success: true,
    output: formatPath(ctx.currentPath),
  };
}

/**
 * CD - Change directory
 */
async function handleCd(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const target = args[0] || '/';
  
  // Handle special cases
  if (target === '~' || target === '') {
    return {
      success: true,
      output: '',
      newPath: '/',
    };
  }
  
  if (target === '-') {
    // Go back to previous directory (would need history tracking)
    return {
      success: false,
      output: '',
      error: 'cd - (previous directory) not yet implemented',
    };
  }
  
  const newPath = normalizePath(ctx.currentPath, target);
  
  // Validate the path exists via API
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', path: newPath }),
    });
    
    const data = await response.json();
    
    if (!data.valid) {
      return {
        success: false,
        output: '',
        error: `cd: ${target}: No such directory`,
      };
    }
    
    if (!data.isDirectory) {
      return {
        success: false,
        output: '',
        error: `cd: ${target}: Not a directory`,
      };
    }
    
    return {
      success: true,
      output: '',
      newPath: newPath,
      newContext: data.context,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `cd: Failed to validate path: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * LS - List directory contents
 */
async function handleLs(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al');
  const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
  const targetPath = args.find(a => !a.startsWith('-')) || ctx.currentPath;
  
  const resolvedPath = normalizePath(ctx.currentPath, targetPath);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'ls',
        path: resolvedPath,
        long: longFormat,
        all: showAll,
      }),
    });
    
    const data = await response.json();
    
    console.log('[ls] API response:', { 
      path: resolvedPath, 
      success: data.success, 
      entriesCount: data.entries?.length, 
      error: data.error,
      responseStatus: response.status,
    });
    
    if (!data.success) {
      return {
        success: false,
        output: '',
        error: data.error || `ls: Cannot access '${targetPath}'`,
      };
    }
    
    // Handle missing or invalid entries
    if (!data.entries || !Array.isArray(data.entries)) {
      console.error('[ls] Invalid entries:', data);
      return {
        success: false,
        output: '',
        error: `ls: Invalid response from server`,
      };
    }
    
    if (data.entries.length === 0) {
      return {
        success: true,
        output: '\x1b[90m(empty)\x1b[0m',
      };
    }
    
    // Format output
    const lines: string[] = [];
    
    if (longFormat) {
      lines.push('\x1b[90mtype         updated      info         name\x1b[0m');
      lines.push('\x1b[90m' + '─'.repeat(60) + '\x1b[0m');
    }
    
    for (const entry of data.entries) {
      lines.push(formatListEntry(entry.name, entry.type, longFormat, entry.metadata));
    }
    
    if (!longFormat) {
      // Compact format - show in columns
      return {
        success: true,
        output: lines.join('  '),
      };
    }
    
    return {
      success: true,
      output: lines.join('\r\n'),
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `ls: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * CAT - Show item contents/details
 * Flags:
 *   -j  Output as JSON (pipe-friendly)
 *   -r  Raw output (no formatting)
 * Supports multiple files (from glob expansion)
 */
async function handleCat(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const jsonOutput = args.includes('-j') || args.includes('--json');
  const rawOutput = args.includes('-r') || args.includes('--raw');
  const filteredArgs = args.filter(a => !a.startsWith('-'));
  
  if (filteredArgs.length === 0) {
    // If we have pipe input, just output it
    if (ctx.pipeInput) {
      return { success: true, output: ctx.pipeInput };
    }
    return {
      success: false,
      output: '',
      error: 'cat: Missing operand',
    };
  }
  
  // Handle multiple files (e.g., from glob expansion like cat *)
  const outputs: string[] = [];
  const allData: unknown[] = [];
  let hasErrors = false;
  
  for (const file of filteredArgs) {
    const targetPath = normalizePath(ctx.currentPath, file);
    
    try {
      const response = await fetch(`${ctx.apiEndpoint}/fs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'cat',
          path: targetPath,
          format: jsonOutput ? 'json' : rawOutput ? 'raw' : 'formatted',
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        outputs.push(`\x1b[31mcat: ${file}: ${data.error || 'No such file'}\x1b[0m`);
        hasErrors = true;
        continue;
      }
      
      // Add file header if multiple files
      if (filteredArgs.length > 1) {
        outputs.push(`\x1b[1m\x1b[36m==> ${file} <==\x1b[0m`);
      }
      
      if (jsonOutput && data.data) {
        outputs.push(JSON.stringify(data.data, null, 2));
        allData.push(data.data);
      } else {
        outputs.push(data.output);
        if (data.data) allData.push(data.data);
      }
      
      // Add blank line between files
      if (filteredArgs.length > 1) {
        outputs.push('');
      }
    } catch (error) {
      outputs.push(`\x1b[31mcat: ${file}: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
      hasErrors = true;
    }
  }
  
  return {
    success: !hasErrors || outputs.some(o => !o.startsWith('\x1b[31m')),
    output: outputs.join('\r\n'),
    data: allData.length === 1 ? allData[0] : allData.length > 0 ? allData : undefined,
  };
}

/**
 * TREE - Show directory tree
 */
async function handleTree(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const targetPath = args[0] ? normalizePath(ctx.currentPath, args[0]) : ctx.currentPath;
  const depth = parseInt(args.find(a => a.startsWith('-d'))?.slice(2) || '2', 10);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tree', path: targetPath, depth }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        output: '',
        error: data.error || `tree: Cannot access '${args[0] || '.'}'`,
      };
    }
    
    return {
      success: true,
      output: data.output,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * FIND - Search for items
 */
async function handleFind(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      output: '',
      error: 'find: Missing search pattern',
    };
  }
  
  const pattern = args.join(' ');
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'find',
        path: ctx.currentPath,
        pattern,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        output: '',
        error: data.error || 'find: Search failed',
      };
    }
    
    if (data.results.length === 0) {
      return {
        success: true,
        output: `\x1b[33mNo matches found for "${pattern}"\x1b[0m`,
      };
    }
    
    const lines = data.results.map((r: { path: string; type: string; name: string }) => 
      `${formatPath(r.path)}`
    );
    
    return {
      success: true,
      output: lines.join('\r\n'),
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `find: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * MKDIR - Create directory (limited to certain contexts)
 */
async function handleMkdir(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      output: '',
      error: 'mkdir: Missing operand',
    };
  }
  
  // For now, creating via terminal is limited
  return {
    success: false,
    output: '',
    error: 'mkdir: Creating items via terminal is not yet supported. Please use the UI.',
  };
}

/**
 * RM - Remove item (with confirmation required)
 */
async function handleRm(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      output: '',
      error: 'rm: Missing operand',
    };
  }
  
  // For safety, require explicit confirmation
  const force = args.includes('-f') || args.includes('--force');
  
  if (!force) {
    return {
      success: false,
      output: '',
      error: 'rm: Destructive operation. Use "rm -f <item>" to confirm deletion.',
    };
  }
  
  // For now, deletion via terminal is limited
  return {
    success: false,
    output: '',
    error: 'rm: Deleting items via terminal is not yet supported. Please use the UI.',
  };
}

/**
 * GREP - Search within content or filter pipe input
 */
async function handleGrep(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const ignoreCase = args.includes('-i');
  const invert = args.includes('-v');
  const recursive = args.includes('-r') || args.includes('-R');
  const filteredArgs = args.filter(a => !a.startsWith('-'));
  
  if (filteredArgs.length === 0) {
    return {
      success: false,
      output: '',
      error: 'grep: Missing pattern',
    };
  }
  
  const pattern = filteredArgs[0];
  const target = filteredArgs[1];
  
  // If we have pipe input, filter it
  if (ctx.pipeInput) {
    const lines = ctx.pipeInput.split(/\r?\n/);
    const flags = ignoreCase ? 'i' : '';
    const regex = new RegExp(pattern, flags);
    
    const filtered = lines.filter(line => {
      const matches = regex.test(line);
      return invert ? !matches : matches;
    });
    
    // Highlight matches
    const output = filtered.map(line => 
      invert ? line : line.replace(new RegExp(`(${pattern})`, 'g' + flags), '\x1b[31m$1\x1b[0m')
    ).join('\r\n');
    
    return { success: true, output };
  }
  
  // Search within the filesystem
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'grep',
        path: target ? normalizePath(ctx.currentPath, target) : ctx.currentPath,
        pattern,
        options: { ignoreCase, recursive },
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, output: '', error: data.error };
    }
    
    return { success: true, output: data.output };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `grep: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * CREATE - Create new items (touch for forms)
 */
async function handleCreate(command: string, args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      output: '',
      error: `${command}: Missing operand`,
    };
  }
  
  const name = args[0];
  const targetPath = normalizePath(ctx.currentPath, name);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'create',
        path: targetPath,
        name: name.split('/').pop(),
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, output: '', error: data.error };
    }
    
    return { 
      success: true, 
      output: `\x1b[32m✓\x1b[0m Created: ${formatPath(targetPath)}`,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `${command}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * MOVE - Move/rename items
 */
async function handleMove(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      output: '',
      error: 'mv: Missing destination',
    };
  }
  
  const source = normalizePath(ctx.currentPath, args[0]);
  const dest = normalizePath(ctx.currentPath, args[1]);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'move',
        source,
        destination: dest,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, output: '', error: data.error };
    }
    
    return { 
      success: true, 
      output: `\x1b[32m✓\x1b[0m Moved: ${formatPath(source)} → ${formatPath(dest)}`,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `mv: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * COPY - Copy items
 */
async function handleCopy(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      output: '',
      error: 'cp: Missing destination',
    };
  }
  
  const source = normalizePath(ctx.currentPath, args[0]);
  const dest = normalizePath(ctx.currentPath, args[1]);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'copy',
        source,
        destination: dest,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, output: '', error: data.error };
    }
    
    return { 
      success: true, 
      output: `\x1b[32m✓\x1b[0m Copied: ${formatPath(source)} → ${formatPath(dest)}`,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `cp: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * TAIL - Show last lines or watch for changes
 */
async function handleTail(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const follow = args.includes('-f');
  const numLines = parseInt(args.find(a => /^-\d+$/.test(a))?.slice(1) || '10', 10);
  const target = args.find(a => !a.startsWith('-'));
  
  // If we have pipe input, just return last N lines
  if (ctx.pipeInput) {
    const lines = ctx.pipeInput.split(/\r?\n/);
    return { success: true, output: lines.slice(-numLines).join('\r\n') };
  }
  
  if (!target) {
    return { success: false, output: '', error: 'tail: Missing file operand' };
  }
  
  if (follow) {
    // tail -f for watching submissions
    return {
      success: true,
      output: '\x1b[33m⚡ Watching for new submissions... (Ctrl+C to stop)\x1b[0m\r\n\x1b[90mNote: Real-time watching requires WebSocket support (coming soon)\x1b[0m',
    };
  }
  
  // Get last N items from a collection
  const targetPath = normalizePath(ctx.currentPath, target);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'tail',
        path: targetPath,
        lines: numLines,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, output: '', error: data.error };
    }
    
    return { success: true, output: data.output };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `tail: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * HEAD - Show first lines
 */
async function handleHead(args: string[], ctx: FSCommandContext): Promise<FSCommandResult> {
  const numLines = parseInt(args.find(a => /^-\d+$/.test(a))?.slice(1) || '10', 10);
  const target = args.find(a => !a.startsWith('-'));
  
  // If we have pipe input, just return first N lines
  if (ctx.pipeInput) {
    const lines = ctx.pipeInput.split(/\r?\n/);
    return { success: true, output: lines.slice(0, numLines).join('\r\n') };
  }
  
  if (!target) {
    return { success: false, output: '', error: 'head: Missing file operand' };
  }
  
  const targetPath = normalizePath(ctx.currentPath, target);
  
  try {
    const response = await fetch(`${ctx.apiEndpoint}/fs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'head',
        path: targetPath,
        lines: numLines,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, output: '', error: data.error };
    }
    
    return { success: true, output: data.output };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `head: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check if a command is a filesystem command
 */
export function isFileSystemCommand(command: string): boolean {
  const fsCommands = [
    'pwd', 'cd', 'ls', 'cat', 'tree', 'find', 'grep', 
    'mkdir', 'touch', 'rm', 'mv', 'cp', 'tail', 'head', 'echo'
  ];
  return fsCommands.includes(command.toLowerCase());
}

/**
 * Get filesystem command completions
 */
export function getFileSystemCompletions(input: string, currentPath: string): string[] {
  const parts = input.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  
  // Command completion
  if (parts.length === 1 && !input.endsWith(' ')) {
    const fsCommands = [
      'pwd', 'cd', 'ls', 'cat', 'tree', 'find', 'grep',
      'mkdir', 'touch', 'rm', 'mv', 'cp', 'tail', 'head'
    ];
    return fsCommands.filter(c => c.startsWith(command));
  }
  
  // For cd, ls, cat - would need path completion from API
  // This is handled by the main completion system
  
  return [];
}
