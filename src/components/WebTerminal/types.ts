/**
 * WebTerminal Types
 * 
 * Types for the AI-powered web CLI
 */

export type CommandType = 'structured' | 'natural' | 'help' | 'clear';

export interface ParsedCommand {
  type: CommandType;
  command?: string;
  args?: string[];
  options?: Record<string, string | boolean>;
  raw: string;
  naturalLanguage?: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  data?: unknown;
  suggestions?: string[];
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface NetPadCommand {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], options: Record<string, unknown>) => Promise<CommandResult>;
}

export interface AIInterpretation {
  intent: string;
  command: string;
  args: string[];
  confidence: number;
  explanation: string;
  didYouMean?: string;  // Shows typo correction if detected
}

export interface TerminalContextType {
  currentProject?: string;
  currentOrg?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  history: string[];
}

// Alias for command handlers
export type TerminalContext = TerminalContextType;
