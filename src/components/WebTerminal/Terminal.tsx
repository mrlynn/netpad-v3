'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Typography, Chip, CircularProgress } from '@mui/material';
import { Close, OpenInFull, CloseFullscreen } from '@mui/icons-material';
import { parseCommand, COMMAND_HELP } from './commandInterpreter';
import { TerminalTheme, CommandResult } from './types';
import { executeFileSystemCommand, isFileSystemCommand } from './fileSystemCommands';
import { buildPrompt, VFSContext } from './virtualFileSystem';
import { 
  ShellState, 
  createShellState, 
  parseCommandLine, 
  handleAliasCommand, 
  handleUnaliasCommand,
  executePipeline,
  loadShellState,
  saveShellState,
} from './shellFeatures';
import { expandGlobsInArgs, hasGlobChars } from './globExpansion';
import {
  handleUsersCommand,
  handleGroupsCommand,
  handleRolesCommand,
  handleAssignCommand,
  handleUnassignCommand,
  handlePermissionsCommand,
  handleWhoamiCommand,
} from './rbacCommands';

// NetPad dark theme
const NETPAD_THEME: TerminalTheme = {
  background: '#0A0F1C',
  foreground: '#E4E4E7',
  cursor: '#00ED64',
  cursorAccent: '#0A0F1C',
  selectionBackground: 'rgba(0, 237, 100, 0.3)',
  black: '#1E1E2E',
  red: '#F87171',
  green: '#00ED64',
  yellow: '#FBBF24',
  blue: '#60A5FA',
  magenta: '#C084FC',
  cyan: '#22D3EE',
  white: '#E4E4E7',
  brightBlack: '#6B7280',
  brightRed: '#FCA5A5',
  brightGreen: '#4ADE80',
  brightYellow: '#FDE047',
  brightBlue: '#93C5FD',
  brightMagenta: '#D8B4FE',
  brightCyan: '#67E8F9',
  brightWhite: '#FFFFFF',
};

// Edgy dev humor for the terminal
const TERMINAL_SAYINGS = [
  "It's not a bug, it's a surprise feature.",
  "sudo make me a sandwich",
  "There's no place like 127.0.0.1",
  "I don't always test my code, but when I do, I do it in production.",
  "// TODO: fix this later  — committed 4 years ago",
  "Works on my machine ¯\\_(ツ)_/¯",
  "git commit -m \"fixed it for real this time\"",
  "SELECT * FROM users WHERE clue > 0;  — 0 rows returned",
  "Debugging: Being the detective in a crime movie where you're also the murderer.",
  "A SQL query walks into a bar, walks up to two tables and asks: \"Can I join you?\"",
  "There are only 10 types of people: those who understand binary and those who don't.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "rm -rf / — just kidding, please don't.",
  "In case of fire: git commit, git push, leave building.",
  "99 little bugs in the code, 99 little bugs... Take one down, patch it around... 127 little bugs in the code.",
  "My code doesn't have bugs, it just develops random features.",
  "A programmer's wife tells him: \"Go to the store and get a loaf of bread. If they have eggs, get a dozen.\" He comes home with 12 loaves.",
  "The best thing about a boolean is that even if you're wrong, you're only off by a bit.",
  "Weeks of coding can save you hours of planning.",
  "It compiles. Ship it.",
  "Have you tried turning it off and on again?",
  "chmod 777 — because security is overrated.",
  "console.log('here');  // the pinnacle of debugging",
  "localhost: where all my relationships work.",
  "I would love to change the world, but they won't give me the source code.",
];

const getRandomSaying = () => TERMINAL_SAYINGS[Math.floor(Math.random() * TERMINAL_SAYINGS.length)];

// AI Thinking Animation Frames
const AI_LOADER_FRAMES = {
  spinner: [
    '\x1b[35m⠋\x1b[0m AI processing',
    '\x1b[35m⠙\x1b[0m AI processing',
    '\x1b[35m⠹\x1b[0m AI processing',
    '\x1b[35m⠸\x1b[0m AI processing',
    '\x1b[35m⠼\x1b[0m AI processing',
    '\x1b[35m⠴\x1b[0m AI processing',
    '\x1b[35m⠦\x1b[0m AI processing',
    '\x1b[35m⠧\x1b[0m AI processing',
    '\x1b[35m⠇\x1b[0m AI processing',
    '\x1b[35m⠏\x1b[0m AI processing',
  ],
  wave: [
    '\x1b[36m∿∿∿\x1b[90m∿∿∿∿\x1b[0m interpreting',
    '\x1b[90m∿\x1b[36m∿∿∿\x1b[90m∿∿∿\x1b[0m interpreting',
    '\x1b[90m∿∿\x1b[36m∿∿∿\x1b[90m∿∿\x1b[0m interpreting',
    '\x1b[90m∿∿∿\x1b[36m∿∿∿\x1b[90m∿\x1b[0m interpreting',
    '\x1b[90m∿∿∿∿\x1b[36m∿∿∿\x1b[0m interpreting',
  ],
  sparkle: [
    '\x1b[33m✦\x1b[0m \x1b[90m·\x1b[0m \x1b[90m·\x1b[0m AI thinking',
    '\x1b[90m·\x1b[0m \x1b[33m✦\x1b[0m \x1b[90m·\x1b[0m AI thinking',
    '\x1b[90m·\x1b[0m \x1b[90m·\x1b[0m \x1b[33m✦\x1b[0m AI thinking',
    '\x1b[90m·\x1b[0m \x1b[33m✦\x1b[0m \x1b[90m·\x1b[0m AI thinking',
  ],
  matrix: [
    '\x1b[32m[\x1b[92m▓▓▓\x1b[32m░░░░░░░]\x1b[0m parsing',
    '\x1b[32m[\x1b[92m▓▓▓▓▓\x1b[32m░░░░░]\x1b[0m analyzing',
    '\x1b[32m[\x1b[92m▓▓▓▓▓▓▓\x1b[32m░░░]\x1b[0m thinking',
    '\x1b[32m[\x1b[92m▓▓▓▓▓▓▓▓▓\x1b[32m░]\x1b[0m computing',
  ],
  brain: [
    '\x1b[36m◐\x1b[0m thinking...',
    '\x1b[36m◓\x1b[0m thinking...',
    '\x1b[36m◑\x1b[0m thinking...',
    '\x1b[36m◒\x1b[0m thinking...',
  ],
};

// Get random loader style
const getRandomLoaderFrames = () => {
  const styles = Object.keys(AI_LOADER_FRAMES) as (keyof typeof AI_LOADER_FRAMES)[];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  return AI_LOADER_FRAMES[randomStyle];
};

const WELCOME_BANNER = `
\x1b[32m
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   \x1b[1m\x1b[36m███╗   ██╗███████╗████████╗██████╗  █████╗ ██████╗ \x1b[0m\x1b[32m    ║
║   \x1b[1m\x1b[36m████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗\x1b[0m\x1b[32m    ║
║   \x1b[1m\x1b[36m██╔██╗ ██║█████╗     ██║   ██████╔╝███████║██║  ██║\x1b[0m\x1b[32m    ║
║   \x1b[1m\x1b[36m██║╚██╗██║██╔══╝     ██║   ██╔═══╝ ██╔══██║██║  ██║\x1b[0m\x1b[32m    ║
║   \x1b[1m\x1b[36m██║ ╚████║███████╗   ██║   ██║     ██║  ██║██████╔╝\x1b[0m\x1b[32m    ║
║   \x1b[1m\x1b[36m╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═════╝ \x1b[0m\x1b[32m    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝\x1b[0m
\x1b[0m`;

const getWelcomeMessage = () => `${WELCOME_BANNER}
  \x1b[33m"\x1b[3m${getRandomSaying()}\x1b[0m\x1b[33m"\x1b[0m

\x1b[90mCommands:\x1b[0m  \x1b[36mls\x1b[0m  \x1b[36mcd\x1b[0m  \x1b[36mpwd\x1b[0m  \x1b[36mcat\x1b[0m  \x1b[36mtree\x1b[0m  \x1b[36mfind\x1b[0m  \x1b[36mhelp\x1b[0m
\x1b[90mHierarchy:\x1b[0m \x1b[35morg\x1b[0m / \x1b[34mproject\x1b[0m / \x1b[36mapp\x1b[0m / \x1b[33mforms|workflows|data\x1b[0m / \x1b[32mitems\x1b[0m

`;

const DEFAULT_PROMPT = '\x1b[32m❯\x1b[0m ';

interface WebTerminalProps {
  onClose?: () => void;
  currentProject?: string;
  currentOrg?: string;
  onCommand?: (command: string, result: CommandResult) => void;
  apiEndpoint?: string;
  /** When true, fills container height and hides internal header */
  embedded?: boolean;
}

// Known commands and subcommands for tab completion
const FS_COMMANDS = ['ls', 'cd', 'pwd', 'cat', 'tree', 'find', 'grep', 'mv', 'cp', 'touch', 'rm', 'tail', 'head'];
const SHELL_COMMANDS = ['alias', 'unalias', 'echo'];
const OTHER_COMMANDS = ['list', 'show', 'search', 'stats', 'explain', 'help', 'clear'];
const ALL_COMMANDS = [...FS_COMMANDS, ...SHELL_COMMANDS, ...OTHER_COMMANDS];
const LIST_TYPES = ['forms', 'workflows', 'templates'];
const SHOW_TYPES = ['form', 'workflow', 'template'];

export function WebTerminal({
  onClose,
  currentProject,
  currentOrg,
  onCommand,
  apiEndpoint = '/api/terminal',
  embedded = false,
}: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const inputBufferRef = useRef('');
  const cursorPositionRef = useRef(0);
  
  // AI loader animation state
  const loaderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loaderFramesRef = useRef<string[]>([]);
  const loaderFrameIndexRef = useRef(0);
  
  // Filesystem state
  const [currentPath, setCurrentPath] = useState('/');
  const [fsContext, setFsContext] = useState<VFSContext>({});
  const currentPromptRef = useRef(DEFAULT_PROMPT);
  
  // Shell state (aliases, env, etc.)
  const shellStateRef = useRef<ShellState>(createShellState());
  
  // Cache for path-based completions (directory listings)
  const pathCompletionCacheRef = useRef<{ 
    path: string; 
    items: string[];      // All items (files + dirs with / suffix)
    directories: string[]; // Only directories (with / suffix) for cd completion
  }>({ path: '', items: [], directories: [] });
  
  // Load saved shell state on mount
  useEffect(() => {
    const savedState = loadShellState();
    shellStateRef.current = {
      ...shellStateRef.current,
      ...savedState,
    };
  }, []);
  
  // Update prompt and fetch completions when path changes
  useEffect(() => {
    currentPromptRef.current = buildPrompt(currentPath);
    
    // Fetch completions for the new path
    const fetchCurrentPathCompletions = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/fs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ls', path: currentPath }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.entries) {
            // Store both all items and directories-only for smarter completion
            const dirTypes = ['directory', 'org', 'project', 'application'];
            const allItems = data.entries.map((e: { name: string; type: string }) => ({
              name: e.name,
              isDir: dirTypes.includes(e.type),
              display: dirTypes.includes(e.type) ? e.name + '/' : e.name,
            }));
            pathCompletionCacheRef.current = { 
              path: currentPath, 
              items: allItems.map((i: { display: string }) => i.display),
              directories: allItems.filter((i: { isDir: boolean }) => i.isDir).map((i: { name: string }) => i.name + '/'),
            };
          }
        }
      } catch (error) {
        console.error('[Path Completions] Error:', error);
      }
    };
    
    fetchCurrentPathCompletions();
  }, [currentPath, apiEndpoint]);
  
  // Tab completion state
  const completionCacheRef = useRef<{ forms: string[]; workflows: string[]; templates: string[] }>({
    forms: [],
    workflows: [],
    templates: [],
  });
  const lastTabRef = useRef<{ input: string; index: number; matches: string[] } | null>(null);

  // Process input handler - stored in ref to avoid stale closures
  const processInputRef = useRef<(input: string) => Promise<void>>();
  
  // Fetch entity names for tab completion
  const fetchCompletions = useCallback(async () => {
    try {
      const response = await fetch(`${apiEndpoint}/completions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        completionCacheRef.current = {
          forms: data.forms || [],
          workflows: data.workflows || [],
          templates: data.templates || [],
        };
      }
    } catch (error) {
      console.error('[WebTerminal] Failed to fetch completions:', error);
    }
  }, [apiEndpoint]);
  
  // Get tab completions based on current input
  // Parse input to extract the last argument, respecting quotes
  const parseInputForCompletion = useCallback((input: string): { 
    command: string; 
    args: string[]; 
    partial: string; 
    partialStart: number;
  } => {
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let partialStart = 0;
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if ((char === '"' || char === "'") && input[i - 1] !== '\\') {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
          if (current === '') partialStart = i;
        } else if (char === quoteChar) {
          inQuote = false;
        } else {
          current += char;
        }
      } else if (char === ' ' && !inQuote) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        partialStart = i + 1;
      } else {
        if (current === '' && !inQuote) partialStart = i;
        current += char;
      }
    }
    
    const command = tokens[0]?.toLowerCase() || '';
    const args = tokens.slice(1);
    const partial = current.toLowerCase();
    
    return { command, args, partial, partialStart };
  }, []);

  // Fetch path completions from API (used for dynamic fetching if needed)
  const fetchPathCompletions = useCallback(async (path: string): Promise<string[]> => {
    // Check cache first
    if (pathCompletionCacheRef.current.path === path) {
      return pathCompletionCacheRef.current.items;
    }
    
    try {
      const response = await fetch(`${apiEndpoint}/fs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ls', path }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.entries) {
          const dirTypes = ['directory', 'org', 'project', 'application'];
          const items = data.entries.map((e: { name: string; type: string }) => 
            dirTypes.includes(e.type) ? e.name + '/' : e.name
          );
          const directories = data.entries
            .filter((e: { type: string }) => dirTypes.includes(e.type))
            .map((e: { name: string }) => e.name + '/');
          pathCompletionCacheRef.current = { path, items, directories };
          return items;
        }
      }
    } catch (error) {
      console.error('[fetchPathCompletions] Error:', error);
    }
    return [];
  }, [apiEndpoint]);

  const getCompletions = useCallback((input: string): string[] => {
    const { command, args, partial } = parseInputForCompletion(input);
    
    // No input yet - suggest commands
    if (!command && !input.endsWith(' ')) {
      return ALL_COMMANDS.filter(cmd => cmd.startsWith(partial || ''));
    }
    
    // Just a command with no space - complete the command
    if (command && args.length === 0 && !input.endsWith(' ') && !input.includes(' ')) {
      return ALL_COMMANDS.filter(cmd => cmd.startsWith(command));
    }
    
    // Filesystem commands - use path-based completions from cache
    const fsPathCommands = ['cd', 'ls', 'cat', 'tree', 'mv', 'cp', 'rm', 'touch', 'find', 'grep', 'head', 'tail'];
    if (fsPathCommands.includes(command)) {
      // For 'cd', only suggest directories; for others, suggest all items
      const items = command === 'cd' 
        ? pathCompletionCacheRef.current.directories 
        : pathCompletionCacheRef.current.items;
      
      if (input.endsWith(' ') || partial === '') {
        return items.slice(0, 15);
      }
      
      // Filter by partial match (case-insensitive), stripping trailing / for matching
      return items.filter(item => {
        const itemName = item.replace(/\/$/, '').toLowerCase();
        return itemName.startsWith(partial.toLowerCase());
      }).slice(0, 15);
    }
    
    // Legacy command completions
    if (command === 'list') {
      if (args.length === 0 && input.endsWith(' ')) {
        return LIST_TYPES;
      }
      if (args.length === 0) {
        return LIST_TYPES.filter(t => t.startsWith(partial));
      }
    }
    
    if (command === 'show') {
      if (args.length === 0 && input.endsWith(' ')) {
        return SHOW_TYPES;
      }
      if (args.length === 0) {
        return SHOW_TYPES.filter(t => t.startsWith(partial));
      }
      
      // After type, suggest entity names
      const type = args[0]?.toLowerCase();
      let entities: string[] = [];
      
      if (type === 'form' || type === 'forms') {
        entities = completionCacheRef.current.forms;
      } else if (type === 'workflow' || type === 'workflows') {
        entities = completionCacheRef.current.workflows;
      } else if (type === 'template' || type === 'templates') {
        entities = completionCacheRef.current.templates;
      }
      
      if (args.length === 1 && input.endsWith(' ')) {
        return entities.slice(0, 10);
      }
      
      if (args.length === 1) {
        return entities.filter(e => 
          e.toLowerCase().startsWith(partial)
        ).slice(0, 10);
      }
    }
    
    return [];
  }, [parseInputForCompletion]);
  
  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && xtermRef.current) {
        // Insert at cursor position
        const before = inputBufferRef.current.slice(0, cursorPositionRef.current);
        const after = inputBufferRef.current.slice(cursorPositionRef.current);
        inputBufferRef.current = before + text + after;
        cursorPositionRef.current += text.length;
        
        // Redraw the line
        xtermRef.current.write('\r' + currentPromptRef.current + inputBufferRef.current);
      }
    } catch (error) {
      console.error('[WebTerminal] Paste failed:', error);
    }
  }, []);
  
  // Handle copy selection
  const handleCopy = useCallback(() => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection).catch(err => {
          console.error('[WebTerminal] Copy failed:', err);
        });
      }
    }
  }, []);

  // Execute command via API
  // Execute a single command (used by pipeline)
  const executeSingleCommand = useCallback(async (
    command: string, 
    args: string[], 
    pipeInput?: string
  ): Promise<{ success: boolean; output: string; newPath?: string; newContext?: VFSContext }> => {
    // Handle local commands
    if (command === 'clear') {
      xtermRef.current?.clear();
      return { success: true, output: '' };
    }
    
    if (command === 'help') {
      return { success: true, output: generateHelpText(args[0]) };
    }
    
    // Handle alias command
    if (command === 'alias') {
      const result = handleAliasCommand(args, shellStateRef.current);
      shellStateRef.current = result.newState;
      saveShellState(result.newState);
      return { success: true, output: result.output };
    }
    
    // Handle unalias command
    if (command === 'unalias') {
      const result = handleUnaliasCommand(args, shellStateRef.current);
      shellStateRef.current = result.newState;
      saveShellState(result.newState);
      return { success: true, output: result.output };
    }
    
    // Handle filesystem commands
    if (isFileSystemCommand(command)) {
      // Expand glob patterns in arguments
      let expandedArgs = args;
      const hasGlobs = args.some(arg => hasGlobChars(arg));
      
      if (hasGlobs) {
        // Use cached items for glob expansion
        const availableItems = pathCompletionCacheRef.current.items;
        expandedArgs = expandGlobsInArgs(args, availableItems);
      }
      
      const result = await executeFileSystemCommand(command, expandedArgs, {
        currentPath,
        context: fsContext,
        apiEndpoint,
        pipeInput,
      });
      
      return result;
    }
    
    // Handle RBAC commands
    const rbacContext = {
      currentOrg: currentOrg || fsContext.orgId,
      currentProject: currentProject || fsContext.projectId,
      history: commandHistoryRef.current,
    };
    
    // Parse options from args
    const parseArgsAndOptions = (args: string[]): { parsedArgs: string[]; options: Record<string, string | boolean> } => {
      const parsedArgs: string[] = [];
      const options: Record<string, string | boolean> = {};
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
          const key = arg.slice(2);
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            options[key] = args[i + 1];
            i++;
          } else {
            options[key] = true;
          }
        } else if (arg.startsWith('-') && arg.length === 2) {
          const key = arg.slice(1);
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            options[key] = args[i + 1];
            i++;
          } else {
            options[key] = true;
          }
        } else {
          parsedArgs.push(arg);
        }
      }
      return { parsedArgs, options };
    };
    
    if (command === 'users') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handleUsersCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    if (command === 'groups') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handleGroupsCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    if (command === 'roles') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handleRolesCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    if (command === 'assign') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handleAssignCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    if (command === 'unassign') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handleUnassignCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    if (command === 'permissions') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handlePermissionsCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    if (command === 'whoami') {
      const { parsedArgs, options } = parseArgsAndOptions(args);
      const result = await handleWhoamiCommand(parsedArgs, options, rbacContext);
      return { success: result.success, output: result.output };
    }
    
    // Send to API for processing (legacy commands)
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: `${command} ${args.join(' ')}`.trim(),
          parsed: parseCommand(`${command} ${args.join(' ')}`.trim()),
          context: {
            project: currentProject,
            org: currentOrg,
            path: currentPath,
            fsContext,
            history: commandHistoryRef.current.slice(-10),
            pipeInput,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        output: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }, [apiEndpoint, currentProject, currentOrg, currentPath, fsContext]);

  const executeCommand = useCallback(async (input: string): Promise<CommandResult & { newPath?: string; newContext?: VFSContext }> => {
    // Parse command line (handles aliases and pipes)
    const { segments, isPiped } = parseCommandLine(input, shellStateRef.current);
    
    if (segments.length === 0 || !segments[0].command) {
      return { success: true, output: '' };
    }
    
    // If piped, use pipeline executor
    if (isPiped) {
      const result = await executePipeline(
        segments,
        async (cmd, args, pipeInput) => {
          const r = await executeSingleCommand(cmd, args, pipeInput);
          return { success: r.success, output: r.output || '' };
        }
      );
      return result;
    }
    
    // Single command
    const { command, args } = segments[0];
    const result = await executeSingleCommand(command, args);
    
    // Update path if command changed it
    if (result.newPath !== undefined) {
      setCurrentPath(result.newPath);
    }
    if (result.newContext) {
      setFsContext(result.newContext);
    }
    
    // Handle errors properly - FSCommandResult has separate error field
    const fsResult = result as { success: boolean; output: string; error?: string };
    
    return {
      success: fsResult.success,
      output: fsResult.output || '',
      error: fsResult.error,
    };
  }, [executeSingleCommand]);

  // Start the ASCII loader animation
  const startLoader = useCallback(() => {
    // Pick random animation style
    loaderFramesRef.current = getRandomLoaderFrames();
    loaderFrameIndexRef.current = 0;
    
    // Start animation
    loaderIntervalRef.current = setInterval(() => {
      const term = xtermRef.current;
      if (!term) return;
      
      const frame = loaderFramesRef.current[loaderFrameIndexRef.current];
      // Move to start of line, clear line, write frame
      term.write(`\r\x1b[K  ${frame}`);
      
      loaderFrameIndexRef.current = 
        (loaderFrameIndexRef.current + 1) % loaderFramesRef.current.length;
    }, 100);
  }, []);

  // Stop the ASCII loader animation
  const stopLoader = useCallback(() => {
    if (loaderIntervalRef.current) {
      clearInterval(loaderIntervalRef.current);
      loaderIntervalRef.current = null;
    }
    // Clear the loader line
    xtermRef.current?.write('\r\x1b[K');
  }, []);

  // Update processInput ref when dependencies change
  useEffect(() => {
    processInputRef.current = async (input: string) => {
      const prompt = currentPromptRef.current;
      const trimmed = input.trim();
      if (!trimmed) {
        xtermRef.current?.write('\r\n' + prompt);
        return;
      }
      
      // Add to history
      commandHistoryRef.current = [...commandHistoryRef.current, trimmed];
      historyIndexRef.current = -1;
      
      // Show processing indicator with animated loader
      setIsProcessing(true);
      xtermRef.current?.write('\r\n');
      startLoader();
      
      try {
        const result = await executeCommand(trimmed);
        
        // Stop loader before showing output
        stopLoader();
        
        if (result.output) {
          const formattedOutput = formatOutput(result);
          xtermRef.current?.write(formattedOutput);
        }
        
        if (result.error) {
          xtermRef.current?.write(`\x1b[31m${result.error}\x1b[0m\r\n`);
        }
        
        if (result.suggestions?.length) {
          xtermRef.current?.write('\x1b[90mSuggestions:\x1b[0m\r\n');
          result.suggestions.forEach(s => {
            xtermRef.current?.write(`  \x1b[36m${s}\x1b[0m\r\n`);
          });
        }
        
        onCommand?.(trimmed, result);
      } finally {
        stopLoader(); // Ensure loader is stopped on error too
        setIsProcessing(false);
        // Use updated prompt (path may have changed)
        xtermRef.current?.write('\r\n' + currentPromptRef.current);
        // Ensure cursor is visible after command execution
        setTimeout(() => xtermRef.current?.scrollToBottom(), 10);
      }
    };
  }, [executeCommand, onCommand, startLoader, stopLoader]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;
    
    let mounted = true;
    let term: import('@xterm/xterm').Terminal | null = null;
    let resizeHandler: (() => void) | null = null;

    async function initTerminal() {
      try {
        // Dynamically import xterm modules
        const [xtermModule, fitModule, webLinksModule] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
        ]);
        
        // Load CSS by creating a link element (avoids TypeScript issues with dynamic CSS imports)
        if (!document.querySelector('link[href*="xterm.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@6/css/xterm.min.css';
          document.head.appendChild(link);
        }
        
        if (!mounted || !terminalRef.current) return;
        
        term = new xtermModule.Terminal({
          theme: NETPAD_THEME,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
          fontSize: 14,
          lineHeight: 1.4,
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 1000,
          convertEol: true,
        });
        
        const fitAddon = new fitModule.FitAddon();
        const webLinksAddon = new webLinksModule.WebLinksAddon();
        
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        
        term.open(terminalRef.current);
        fitAddon.fit();
        
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        
        // Write welcome message
        term.write(getWelcomeMessage());
        term.write(currentPromptRef.current);
        
        // Scroll to bottom to ensure cursor is visible after welcome message
        term.scrollToBottom();
        
        // Capture Tab key before xterm processes it
        term.attachCustomKeyEventHandler((event) => {
          if (event.key === 'Tab') {
            event.preventDefault();
            // Return false to prevent xterm from handling it
            // We'll handle it in onKey
            return true; // Let it through to onKey
          }
          return true;
        });
        
        // Handle key input
        term.onKey(({ key, domEvent }) => {
          const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
          
          if (domEvent.key === 'Enter') {
            lastTabRef.current = null; // Reset tab completion
            const input = inputBufferRef.current;
            inputBufferRef.current = '';
            cursorPositionRef.current = 0;
            processInputRef.current?.(input);
          } else if (domEvent.key === 'Tab') {
            domEvent.preventDefault();
            domEvent.stopPropagation();
            
            const currentInput = inputBufferRef.current;
            const completions = getCompletions(currentInput);
            
            if (completions.length === 0) {
              // No completions available
              return;
            }
            
            // Helper: Quote a completion if it contains spaces
            const quoteIfNeeded = (s: string) => s.includes(' ') ? `"${s}"` : s;
            
            // Helper: Parse input respecting quotes to get the "last part"
            const getLastPart = (input: string): { prefix: string; partial: string; inQuote: boolean } => {
              let inQuote = false;
              let quoteChar = '';
              let lastPartStart = 0;
              
              for (let i = 0; i < input.length; i++) {
                const char = input[i];
                if ((char === '"' || char === "'") && input[i - 1] !== '\\') {
                  if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                    lastPartStart = i;
                  } else if (char === quoteChar) {
                    inQuote = false;
                  }
                } else if (char === ' ' && !inQuote) {
                  lastPartStart = i + 1;
                }
              }
              
              const partial = input.slice(lastPartStart);
              const prefix = input.slice(0, lastPartStart);
              // Remove leading quote from partial if present
              const cleanPartial = partial.replace(/^["']/, '');
              return { prefix, partial: cleanPartial, inQuote };
            };
            
            const { prefix, partial, inQuote } = getLastPart(currentInput);
            
            if (completions.length === 1) {
              // Single match - complete it
              const completion = completions[0];
              const quoted = quoteIfNeeded(completion);
              
              if (currentInput.endsWith(' ') || partial === '') {
                // Add the completion
                inputBufferRef.current = currentInput + quoted + ' ';
              } else {
                // Replace partial match
                inputBufferRef.current = prefix + quoted + ' ';
              }
              cursorPositionRef.current = inputBufferRef.current.length;
              term?.write('\r' + currentPromptRef.current + inputBufferRef.current);
              lastTabRef.current = null;
            } else {
              // Multiple matches - cycle through or show all
              if (lastTabRef.current && lastTabRef.current.input === currentInput) {
                // Cycle to next match
                lastTabRef.current.index = (lastTabRef.current.index + 1) % completions.length;
                const completion = completions[lastTabRef.current.index];
                const quoted = quoteIfNeeded(completion);
                
                if (currentInput.endsWith(' ') || partial === '') {
                  inputBufferRef.current = currentInput + quoted;
                } else {
                  inputBufferRef.current = prefix + quoted;
                }
                cursorPositionRef.current = inputBufferRef.current.length;
                term?.write('\r' + currentPromptRef.current + inputBufferRef.current);
              } else {
                // First Tab - show all completions
                lastTabRef.current = { input: currentInput, index: -1, matches: completions };
                term?.write('\r\n');
                term?.write('\x1b[90mCompletions:\x1b[0m ');
                // Show completions with quotes if they have spaces
                term?.write(completions.map(c => {
                  const display = c.includes(' ') ? `"${c}"` : c;
                  return `\x1b[36m${display}\x1b[0m`;
                }).join('  '));
                term?.write('\r\n' + currentPromptRef.current + currentInput);
              }
            }
          } else if (domEvent.key === 'Backspace') {
            lastTabRef.current = null;
            if (cursorPositionRef.current > 0) {
              inputBufferRef.current = 
                inputBufferRef.current.slice(0, cursorPositionRef.current - 1) +
                inputBufferRef.current.slice(cursorPositionRef.current);
              cursorPositionRef.current--;
              term?.write('\b \b');
            }
          } else if (domEvent.key === 'ArrowUp') {
            const history = commandHistoryRef.current;
            if (history.length > 0) {
              const newIndex = historyIndexRef.current === -1 
                ? history.length - 1 
                : Math.max(0, historyIndexRef.current - 1);
              historyIndexRef.current = newIndex;
              const cmd = history[newIndex];
              const p = currentPromptRef.current;
              term?.write('\r' + p + ' '.repeat(inputBufferRef.current.length) + '\r' + p + cmd);
              inputBufferRef.current = cmd;
              cursorPositionRef.current = cmd.length;
            }
          } else if (domEvent.key === 'ArrowDown') {
            const history = commandHistoryRef.current;
            if (historyIndexRef.current !== -1) {
              const newIndex = historyIndexRef.current + 1;
              const p = currentPromptRef.current;
              if (newIndex >= history.length) {
                historyIndexRef.current = -1;
                term?.write('\r' + p + ' '.repeat(inputBufferRef.current.length) + '\r' + p);
                inputBufferRef.current = '';
                cursorPositionRef.current = 0;
              } else {
                historyIndexRef.current = newIndex;
                const cmd = history[newIndex];
                term?.write('\r' + p + ' '.repeat(inputBufferRef.current.length) + '\r' + p + cmd);
                inputBufferRef.current = cmd;
                cursorPositionRef.current = cmd.length;
              }
            }
          } else if ((domEvent.ctrlKey || domEvent.metaKey) && domEvent.key === 'v') {
            // Paste
            domEvent.preventDefault();
            navigator.clipboard.readText().then(text => {
              if (text && term) {
                // Clean the text (remove newlines for single-line input)
                const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
                const before = inputBufferRef.current.slice(0, cursorPositionRef.current);
                const after = inputBufferRef.current.slice(cursorPositionRef.current);
                inputBufferRef.current = before + cleanText + after;
                cursorPositionRef.current += cleanText.length;
                term.write('\r' + currentPromptRef.current + inputBufferRef.current);
              }
            }).catch(err => console.error('Paste failed:', err));
          } else if ((domEvent.ctrlKey || domEvent.metaKey) && domEvent.key === 'c') {
            // Copy selection or cancel input
            const selection = term?.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection).catch(err => 
                console.error('Copy failed:', err)
              );
            } else {
              // No selection - cancel current input
              term?.write('^C\r\n' + currentPromptRef.current);
              inputBufferRef.current = '';
              cursorPositionRef.current = 0;
            }
          } else if (domEvent.ctrlKey && domEvent.key === 'l') {
            term?.clear();
            term?.write(currentPromptRef.current + inputBufferRef.current);
          } else if (printable) {
            lastTabRef.current = null;
            inputBufferRef.current = 
              inputBufferRef.current.slice(0, cursorPositionRef.current) +
              key +
              inputBufferRef.current.slice(cursorPositionRef.current);
            cursorPositionRef.current++;
            term?.write(key);
          }
        });
        
        // Handle window resize
        resizeHandler = () => {
          requestAnimationFrame(() => fitAddon.fit());
        };
        window.addEventListener('resize', resizeHandler);
        
        // Use ResizeObserver to handle container size changes (e.g., drawer opening)
        let resizeObserver: ResizeObserver | null = null;
        if (terminalRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
              if (fitAddonRef.current) {
                fitAddonRef.current.fit();
              }
            });
          });
          resizeObserver.observe(terminalRef.current);
        }
        
        // Store observer reference for cleanup
        (term as unknown as { _resizeObserver?: ResizeObserver })._resizeObserver = resizeObserver ?? undefined;
        
        // Fit after a short delay to ensure container is fully rendered
        setTimeout(() => {
          fitAddon.fit();
          term?.scrollToBottom();
        }, 50);
        setTimeout(() => {
          fitAddon.fit();
          term?.scrollToBottom();
        }, 200);
        // Additional scroll fix for drawer/embedded mode
        setTimeout(() => {
          fitAddon.fit();
          term?.scrollToBottom();
        }, 500);
        
        setIsReady(true);
        
        // Fetch entity names for tab completion
        fetchCompletions();
        
      } catch (error) {
        console.error('[WebTerminal] Failed to initialize:', error);
      }
    }
    
    initTerminal();
    
    return () => {
      mounted = false;
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      // Cleanup ResizeObserver
      const observer = (term as unknown as { _resizeObserver?: ResizeObserver })?._resizeObserver;
      observer?.disconnect();
      term?.dispose();
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [isFullscreen]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: embedded ? 'none' : (isFullscreen ? 'none' : 900),
        position: isFullscreen && !embedded ? 'fixed' : 'relative',
        top: isFullscreen && !embedded ? 0 : 'auto',
        left: isFullscreen && !embedded ? 0 : 'auto',
        right: isFullscreen && !embedded ? 0 : 'auto',
        bottom: isFullscreen && !embedded ? 0 : 'auto',
        zIndex: isFullscreen && !embedded ? 1300 : 1,
        height: embedded ? '100%' : (isFullscreen ? '100vh' : 500),
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0A0F1C',
        borderRadius: embedded ? 0 : (isFullscreen ? 0 : 2),
        overflow: 'hidden',
        border: embedded ? 'none' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Terminal Header - hidden when embedded */}
      {!embedded && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            bgcolor: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {/* Red - Close */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#EF4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: '#DC2626',
                  transform: 'scale(1.1)',
                },
              }}
              onClick={onClose}
              title="Close"
            />
            {/* Yellow - Minimize */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#FBBF24',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: '#F59E0B',
                  transform: 'scale(1.1)',
                },
              }}
              onClick={onClose}
              title="Minimize (Close)"
            />
            {/* Green - Fullscreen */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#00ED64',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: '#00C853',
                  transform: 'scale(1.1)',
                },
              }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            />
          </Box>
          
          <Typography
            variant="caption"
            sx={{ 
              flex: 1, 
              textAlign: 'center', 
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'monospace',
            }}
          >
            NetPad Terminal {currentProject && `• ${currentProject}`}
          </Typography>
          
          {isProcessing && (
            <Chip
              size="small"
              icon={<CircularProgress size={12} sx={{ color: '#00ED64' }} />}
              label="Processing..."
              sx={{ 
                bgcolor: 'rgba(0, 237, 100, 0.1)', 
                color: '#00ED64',
                height: 24,
              }}
            />
          )}
          
          <IconButton
            size="small"
            onClick={() => setIsFullscreen(!isFullscreen)}
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {isFullscreen ? <CloseFullscreen fontSize="small" /> : <OpenInFull fontSize="small" />}
          </IconButton>
          
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: 'rgba(255,255,255,0.6)' }}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      
      {/* Terminal Content */}
      <Box
        ref={terminalRef}
        sx={{
          flex: 1,
          p: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          '& .xterm': {
            height: '100%',
            flex: 1,
          },
          '& .xterm-viewport': {
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
            },
          },
          '& .xterm-screen': {
            paddingBottom: '1rem',
          },
        }}
      />
      
      {/* Loading state */}
      {!isReady && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#0A0F1C',
          }}
        >
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      )}
    </Box>
  );
}

// Helper: Generate help text
function generateHelpText(command?: string): string {
  // Full command help reference
  const allCommands: Record<string, { desc: string; usage: string; examples: string[] }> = {
    // Filesystem navigation
    ls: { desc: 'List directory contents', usage: 'ls [-l] [path]', examples: ['ls', 'ls -l', 'ls forms'] },
    cd: { desc: 'Change directory', usage: 'cd <path>', examples: ['cd forms', 'cd ..', 'cd /myorg/project1'] },
    pwd: { desc: 'Print working directory', usage: 'pwd', examples: ['pwd'] },
    cat: { desc: 'Show item details (use -j for JSON)', usage: 'cat [-j] <item>', examples: ['cat "My Form"', 'cat -j form.json'] },
    tree: { desc: 'Show directory tree', usage: 'tree [-d<depth>]', examples: ['tree', 'tree -d3'] },
    find: { desc: 'Search for items by name', usage: 'find <pattern>', examples: ['find feedback', 'find "user form"'] },
    // File operations
    mv: { desc: 'Move/rename items', usage: 'mv <source> <dest>', examples: ['mv "Old Form" "New Form"', 'mv form1 ../other-app/forms/'] },
    cp: { desc: 'Copy items', usage: 'cp <source> <dest>', examples: ['cp "My Form" "My Form Copy"'] },
    touch: { desc: 'Create new item', usage: 'touch <name>', examples: ['touch "Feedback Form"', 'touch "New Workflow"'] },
    rm: { desc: 'Delete item (requires -f)', usage: 'rm -f <item>', examples: ['rm -f "Old Form"'] },
    // Search & filter
    grep: { desc: 'Search within content', usage: 'grep [-i] <pattern> [path]', examples: ['grep email', 'ls | grep feedback'] },
    head: { desc: 'Show first N lines/items', usage: 'head [-n] [file]', examples: ['head -5 data/submissions', 'ls | head -3'] },
    tail: { desc: 'Show last N lines/items', usage: 'tail [-n] [-f] [file]', examples: ['tail -10 data/submissions', 'tail -f submissions'] },
    // Shell features
    alias: { desc: 'Create/list aliases', usage: 'alias [name=value]', examples: ['alias', 'alias ll="ls -l"', 'alias forms="cd forms"'] },
    unalias: { desc: 'Remove an alias', usage: 'unalias <name>', examples: ['unalias ll'] },
    echo: { desc: 'Print text', usage: 'echo <text>', examples: ['echo Hello World'] },
  };
  
  if (command) {
    // Check all commands
    if (allCommands[command]) {
      const cmd = allCommands[command];
      return [
        `\x1b[1m\x1b[36m${command}\x1b[0m - ${cmd.desc}`,
        '',
        `\x1b[33mUsage:\x1b[0m ${cmd.usage}`,
        '',
        '\x1b[33mExamples:\x1b[0m',
        ...cmd.examples.map(ex => `  \x1b[90m$\x1b[0m ${ex}`),
        '',
      ].join('\r\n');
    }
    
    if (COMMAND_HELP[command as keyof typeof COMMAND_HELP]) {
      const cmd = COMMAND_HELP[command as keyof typeof COMMAND_HELP];
      return [
        `\x1b[1m\x1b[36m${command}\x1b[0m - ${cmd.description}`,
        '',
        `\x1b[33mUsage:\x1b[0m ${cmd.usage}`,
        '',
        '\x1b[33mExamples:\x1b[0m',
        ...cmd.examples.map(ex => `  \x1b[90m$\x1b[0m ${ex}`),
        '',
      ].join('\r\n');
    }
  }
  
  return [
    '\x1b[1m\x1b[36mFilesystem Commands:\x1b[0m',
    '',
    '  \x1b[32mls\x1b[0m           List directory contents',
    '  \x1b[32mcd\x1b[0m           Change directory',
    '  \x1b[32mpwd\x1b[0m          Print working directory',
    '  \x1b[32mcat\x1b[0m          Show item details (-j for JSON)',
    '  \x1b[32mtree\x1b[0m         Show directory tree',
    '  \x1b[32mfind\x1b[0m         Search for items',
    '',
    '\x1b[1m\x1b[36mFile Operations:\x1b[0m',
    '',
    '  \x1b[32mmv\x1b[0m           Move/rename items',
    '  \x1b[32mcp\x1b[0m           Copy items',
    '  \x1b[32mtouch\x1b[0m        Create new form/workflow',
    '  \x1b[32mrm -f\x1b[0m        Delete items',
    '',
    '\x1b[1m\x1b[36mSearch & Filter:\x1b[0m',
    '',
    '  \x1b[32mgrep\x1b[0m         Search within content',
    '  \x1b[32mhead\x1b[0m         Show first N items',
    '  \x1b[32mtail\x1b[0m         Show last N items (-f to watch)',
    '',
    '\x1b[1m\x1b[36mShell Features:\x1b[0m',
    '',
    '  \x1b[32malias\x1b[0m        Create command shortcuts',
    '  \x1b[32munalias\x1b[0m      Remove shortcuts',
    '  \x1b[32m|\x1b[0m            Pipe commands together',
    '',
    '\x1b[33mHierarchy:\x1b[0m',
    '  \x1b[35morg\x1b[0m / \x1b[34mproject\x1b[0m / \x1b[36mapp\x1b[0m / \x1b[33m{forms,workflows,data}\x1b[0m / \x1b[32mitems\x1b[0m',
    '',
    '\x1b[33mPipe Examples:\x1b[0m',
    '  ls forms | grep feedback',
    '  cat form -j | grep email',
    '  tail -20 data/submissions | head -5',
    '',
    '\x1b[33mDefault Aliases:\x1b[0m ll, la, .., forms, workflows, data',
    '',
  ].join('\r\n');
}

// Helper: Format command output
function formatOutput(result: CommandResult): string {
  if (!result.output) return '';
  
  let output = result.output;
  
  // Highlight JSON
  if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(output);
      output = JSON.stringify(parsed, null, 2)
        .replace(/"([^"]+)":/g, '\x1b[36m"$1"\x1b[0m:')
        .replace(/: "([^"]+)"/g, ': \x1b[33m"$1"\x1b[0m')
        .replace(/: (\d+)/g, ': \x1b[35m$1\x1b[0m')
        .replace(/: (true|false)/g, ': \x1b[32m$1\x1b[0m');
    } catch {
      // Not valid JSON, use as-is
    }
  }
  
  return output.replace(/\n/g, '\r\n');
}

export default WebTerminal;
