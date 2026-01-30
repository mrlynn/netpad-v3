/**
 * Command Interpreter
 * 
 * Parses user input and routes to appropriate handlers.
 * Supports both structured CLI commands and natural language.
 */

import { ParsedCommand, CommandType, AIInterpretation } from './types';

// Structured command patterns
const NETPAD_COMMANDS = [
  // Core commands
  'create',
  'list',
  'show',
  'deploy',
  'export',
  'import',
  'search',
  'install',
  'delete',
  'edit',
  'help',
  'clear',
  'history',
  'whoami',
  'use',
  'describe',
  
  // RBAC commands
  'users',
  'groups',
  'roles',
  'assign',
  'unassign',
  'permissions',
];

// Natural language indicators
const NATURAL_LANGUAGE_PATTERNS = [
  /^(show|find|get|list|display)\s+(me\s+)?(all\s+)?/i,
  /^(create|make|build|generate|add)\s+(a\s+|an\s+)?/i,
  /^(how\s+(do\s+i|can\s+i|to))/i,
  /^(what|where|when|why|who)/i,
  /^(can\s+you|please|i\s+want|i\s+need)/i,
  /\?$/,
];

/**
 * Parse user input into a structured command
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { type: 'structured', raw: '' };
  }
  
  // Handle built-in commands
  if (trimmed.toLowerCase() === 'clear') {
    return { type: 'clear', raw: trimmed };
  }
  
  if (trimmed.toLowerCase() === 'help' || trimmed === '?') {
    return { type: 'help', raw: trimmed };
  }
  
  // Check if it's a structured netpad command
  const parts = trimmed.split(/\s+/);
  const firstWord = parts[0].toLowerCase();
  
  // Handle "netpad <command>" format
  if (firstWord === 'netpad' && parts.length > 1) {
    return parseStructuredCommand(parts.slice(1), trimmed);
  }
  
  // Handle direct command format (e.g., "create form")
  if (NETPAD_COMMANDS.includes(firstWord)) {
    return parseStructuredCommand(parts, trimmed);
  }
  
  // Check for natural language patterns
  if (isNaturalLanguage(trimmed)) {
    return {
      type: 'natural',
      raw: trimmed,
      naturalLanguage: trimmed,
    };
  }
  
  // Default: treat as natural language for AI interpretation
  return {
    type: 'natural',
    raw: trimmed,
    naturalLanguage: trimmed,
  };
}

/**
 * Parse a structured command with arguments and options
 */
function parseStructuredCommand(parts: string[], raw: string): ParsedCommand {
  const command = parts[0].toLowerCase();
  const args: string[] = [];
  const options: Record<string, string | boolean> = {};
  
  let i = 1;
  while (i < parts.length) {
    const part = parts[i];
    
    if (part.startsWith('--')) {
      // Long option
      const optName = part.slice(2);
      if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
        options[optName] = parts[i + 1];
        i += 2;
      } else {
        options[optName] = true;
        i++;
      }
    } else if (part.startsWith('-')) {
      // Short option
      const optName = part.slice(1);
      if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
        options[optName] = parts[i + 1];
        i += 2;
      } else {
        options[optName] = true;
        i++;
      }
    } else {
      // Argument (handle quoted strings)
      if (part.startsWith('"') || part.startsWith("'")) {
        const quote = part[0];
        let arg = part.slice(1);
        while (i + 1 < parts.length && !parts[i].endsWith(quote)) {
          i++;
          arg += ' ' + parts[i];
        }
        if (arg.endsWith(quote)) {
          arg = arg.slice(0, -1);
        }
        args.push(arg);
      } else {
        args.push(part);
      }
      i++;
    }
  }
  
  return {
    type: 'structured',
    command,
    args,
    options,
    raw,
  };
}

/**
 * Check if input looks like natural language
 */
function isNaturalLanguage(input: string): boolean {
  return NATURAL_LANGUAGE_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Generate AI interpretation prompt
 */
export function generateInterpretationPrompt(
  input: string,
  context: { 
    availableCommands: string[];
    currentProject?: string;
    recentHistory?: string[];
  }
): string {
  return `You are a CLI command interpreter for NetPad, a form builder and data management platform.

The user typed: "${input}"

Available commands:
${context.availableCommands.map(cmd => `- ${cmd}`).join('\n')}

${context.currentProject ? `Current project: ${context.currentProject}` : ''}
${context.recentHistory?.length ? `Recent commands:\n${context.recentHistory.slice(-5).join('\n')}` : ''}

Interpret the user's intent and respond with a JSON object:
{
  "intent": "Brief description of what user wants",
  "command": "The NetPad command to execute (or 'unknown' if unclear)",
  "args": ["array", "of", "arguments"],
  "confidence": 0.0-1.0,
  "explanation": "Why you chose this interpretation"
}

If the user is asking a question that can't be mapped to a command, use command "explain" with the topic as an argument.
If the user wants to see something, use command "show" or "list" as appropriate.
If creating something, use command "create" with the type as first argument.

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Parse AI interpretation response
 */
export function parseAIInterpretation(response: string): AIInterpretation | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    return {
      intent: parsed.intent || '',
      command: parsed.command || 'unknown',
      args: Array.isArray(parsed.args) ? parsed.args : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      explanation: parsed.explanation || '',
    };
  } catch (error) {
    console.error('Failed to parse AI interpretation:', error);
    return null;
  }
}

/**
 * Available commands for help display
 */
export const COMMAND_HELP = {
  create: {
    description: 'Create a new form, workflow, or template',
    usage: 'create <type> <name> [options]',
    examples: [
      'create form "Customer Feedback"',
      'create workflow "Approval Process"',
      'create template "Contact Form"',
    ],
  },
  list: {
    description: 'List forms, workflows, templates, or submissions',
    usage: 'list <type> [options]',
    examples: [
      'list forms',
      'list workflows --status active',
      'list submissions --form customer-feedback',
    ],
  },
  show: {
    description: 'Display details of a specific item',
    usage: 'show <type> <id>',
    examples: [
      'show form customer-feedback',
      'show workflow approval-123',
    ],
  },
  deploy: {
    description: 'Deploy a form or workflow',
    usage: 'deploy <type> <id> [--env <environment>]',
    examples: [
      'deploy form customer-feedback',
      'deploy form feedback --env production',
    ],
  },
  search: {
    description: 'Search forms, templates, or marketplace',
    usage: 'search <query> [--type <type>]',
    examples: [
      'search feedback',
      'search "customer onboarding" --type template',
    ],
  },
  export: {
    description: 'Export a form, data, or configuration',
    usage: 'export <type> <id> [--format <format>]',
    examples: [
      'export form customer-feedback --format json',
      'export data submissions --format csv',
    ],
  },
  help: {
    description: 'Show help for commands',
    usage: 'help [command]',
    examples: [
      'help',
      'help create',
    ],
  },
  clear: {
    description: 'Clear the terminal screen',
    usage: 'clear',
    examples: ['clear'],
  },
  
  // RBAC Commands
  users: {
    description: 'Manage organization users',
    usage: 'users <action> [args]',
    examples: [
      'users list',
      'users add jane@example.com',
      'users remove jane@example.com',
      'users info jane@example.com',
      'users update jane@example.com --role admin',
    ],
  },
  groups: {
    description: 'Manage user groups/teams',
    usage: 'groups <action> [args]',
    examples: [
      'groups list',
      'groups create "Engineering"',
      'groups delete engineering',
      'groups add-member engineering jane@example.com',
      'groups remove-member engineering jane@example.com',
      'groups info engineering',
    ],
  },
  roles: {
    description: 'Manage roles and permissions',
    usage: 'roles <action> [args]',
    examples: [
      'roles list',
      'roles create "Billing Admin" --base viewer',
      'roles delete billing-admin',
      'roles grant billing-admin org:manage_billing',
      'roles revoke billing-admin org:manage_billing',
      'roles info billing-admin',
    ],
  },
  assign: {
    description: 'Assign a role to a user or group',
    usage: 'assign <user|group> <target> <role>',
    examples: [
      'assign user jane@example.com editor',
      'assign group engineering admin',
      'assign user bob@example.com viewer --scope project:proj_123',
      'assign user temp@example.com member --expires 2025-03-01',
    ],
  },
  unassign: {
    description: 'Remove a role assignment',
    usage: 'unassign <user|group> <target> <role>',
    examples: [
      'unassign user jane@example.com editor',
      'unassign group engineering admin',
    ],
  },
  permissions: {
    description: 'View available permissions or check access',
    usage: 'permissions [action]',
    examples: [
      'permissions list',
      'permissions check forms:create',
      'permissions user jane@example.com',
    ],
  },
  whoami: {
    description: 'Show current user info and permissions',
    usage: 'whoami [--effective]',
    examples: [
      'whoami',
      'whoami --effective',
    ],
  },
};
