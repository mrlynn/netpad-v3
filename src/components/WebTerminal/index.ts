/**
 * WebTerminal Component
 * 
 * Filesystem-style CLI for NetPad web application
 */

export { WebTerminal } from './Terminal';
export { TerminalButton } from './TerminalButton';
export { TerminalDrawer } from './TerminalDrawer';
export { TerminalProvider } from './TerminalProvider';
export { parseCommand, COMMAND_HELP, generateInterpretationPrompt, parseAIInterpretation } from './commandInterpreter';
export { executeFileSystemCommand, isFileSystemCommand } from './fileSystemCommands';
export { expandGlob, expandGlobsInArgs, hasGlobChars, globToRegex } from './globExpansion';
export * from './virtualFileSystem';
export type { 
  ParsedCommand, 
  CommandResult, 
  TerminalTheme, 
  NetPadCommand, 
  AIInterpretation,
  TerminalContextType,
} from './types';
