/**
 * TypeScript Code Validation Layer for NetPad MCP Server
 *
 * Provides compile-time validation for generated code to ensure
 * every tool output passes `tsc --noEmit`.
 */

import ts from 'typescript';

// ============================================================================
// TYPES FOR TOOL OUTPUT
// ============================================================================

export interface ToolOutput {
  /** The main code file - complete and working */
  code: string;

  /** Filename suggestion */
  filename: string;

  /** Any additional files needed (rare - prefer single file) */
  additionalFiles?: Array<{
    filename: string;
    code: string;
  }>;

  /** Environment variables needed */
  envVars: Array<{
    name: string;
    description: string;
    example: string;
  }>;

  /** npm packages to install (standard packages only, not @netpad/*) */
  dependencies?: string[];

  /** Validation status */
  validated: boolean;
  validationErrors?: string[];
}

// ============================================================================
// INLINE TYPES TO EMBED IN GENERATED CODE
// ============================================================================

/**
 * Core types that should be embedded in every code response.
 * These replace imports from @netpad/* packages.
 */
export const INLINE_TYPES = `
// ============================================================================
// Types (inline - no external dependencies)
// ============================================================================

interface NetPadConfig {
  baseUrl: string;
  apiKey: string;
  organizationId?: string;
  projectId?: string;
}

interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage?: string;
}

interface FormFieldOption {
  label: string;
  value: string;
}

interface ConditionalLogicCondition {
  field: string;
  operator: string;
  value?: string | number | boolean;
}

interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: ConditionalLogicCondition[];
}

interface FormField {
  path: string;
  label: string;
  type: string;
  included?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: unknown;
  conditionalLogic?: ConditionalLogic;
}

interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  errorColor?: string;
  successColor?: string;
  borderRadius?: number;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  inputStyle?: 'outlined' | 'filled' | 'standard';
  mode?: 'light' | 'dark';
}

interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: string[];
}

interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  showProgressBar?: boolean;
  showPageTitles?: boolean;
  allowSkip?: boolean;
  showReview?: boolean;
}

interface FormConfig {
  name: string;
  slug?: string;
  description?: string;
  fieldConfigs: FormField[];
  submitButtonText?: string;
  successMessage?: string;
  theme?: FormTheme;
  multiPage?: MultiPageConfig;
}

interface SubmitResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
`;

export const INLINE_WORKFLOW_TYPES = `
interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  enabled?: boolean;
}

interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  condition?: {
    expression: string;
    label?: string;
  };
}

interface WorkflowSettings {
  executionMode?: 'auto' | 'manual';
  maxExecutionTime?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

interface WorkflowConfig {
  name: string;
  description?: string;
  tags?: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

interface CreateWorkflowResult {
  success: boolean;
  workflowId?: string;
  error?: string;
}
`;

// ============================================================================
// TYPESCRIPT VALIDATION
// ============================================================================

/**
 * Errors to skip during validation - these are expected in generated code
 * that runs in a Node.js/browser environment with fetch API.
 */
const SKIPPED_ERROR_PATTERNS = [
  'Cannot find module',
  // Global types (not available in isolated compilation)
  'Cannot find global type',
  "Cannot find name 'Array'",
  "Cannot find name 'String'",
  "Cannot find name 'Number'",
  "Cannot find name 'Boolean'",
  "Cannot find name 'Object'",
  "Cannot find name 'Function'",
  "Cannot find name 'Symbol'",
  "Cannot find name 'Error'",
  "Cannot find name 'Promise'",
  "Cannot find name 'Record'",
  "Cannot find name 'Partial'",
  "Cannot find name 'Required'",
  "Cannot find name 'Readonly'",
  "Cannot find name 'Pick'",
  "Cannot find name 'Omit'",
  "Cannot find name 'Exclude'",
  "Cannot find name 'Extract'",
  "Cannot find name 'Map'",
  "Cannot find name 'Set'",
  "Cannot find name 'WeakMap'",
  "Cannot find name 'WeakSet'",
  "Cannot find name 'JSON'",
  "Cannot find name 'Date'",
  "Cannot find name 'RegExp'",
  "Cannot find name 'Math'",
  // Runtime globals
  "Cannot find name 'process'",
  "Cannot find name 'fetch'",
  "Cannot find name 'console'",
  "Cannot find name 'RequestInit'",
  "Cannot find name 'Response'",
  "Cannot find name 'Headers'",
  "Cannot find name 'URL'",
  "Cannot find name 'URLSearchParams'",
  "Cannot find name 'FormData'",
  "Cannot find name 'Blob'",
  "Cannot find name 'File'",
  "Cannot find name 'AbortController'",
  "Cannot find name 'AbortSignal'",
  "Cannot find name 'setTimeout'",
  "Cannot find name 'clearTimeout'",
  "Cannot find name 'setInterval'",
  "Cannot find name 'clearInterval'",
  // React-specific
  "Cannot find name 'React'",
  "Cannot find namespace 'React'",
  "Cannot find name 'JSX'",
  // Node.js specific
  "Cannot find name 'Buffer'",
  "Cannot find name '__dirname'",
  "Cannot find name '__filename'",
  "Cannot find name 'require'",
  "Cannot find name 'module'",
  "Cannot find name 'exports'",
  // DOM types
  "Cannot find name 'document'",
  "Cannot find name 'window'",
  "Cannot find name 'HTMLElement'",
  "Cannot find name 'Event'",
  "Cannot find name 'EventTarget'",
  // Library suggestions
  "Do you need to change your target library",
  // Strict mode catch clause errors (handled by instanceof checks at runtime)
  "is of type 'unknown'",
];

/**
 * Validation result with detailed information.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  fixable: boolean;
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  code?: number;
  fixable: boolean;
  fixSuggestion?: string;
}

/**
 * Validate TypeScript code using the TypeScript compiler API.
 * Returns a detailed validation result.
 */
export function validateTypeScript(code: string): string[] {
  const result = validateTypeScriptDetailed(code);
  return result.errors.map(e =>
    e.line ? `Line ${e.line}:${e.column}: ${e.message}` : e.message
  );
}

/**
 * Validate TypeScript code with detailed error information.
 */
export function validateTypeScriptDetailed(code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Create a virtual source file
  const sourceFile = ts.createSourceFile(
    'generated.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  // Create compiler options
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    // Don't require external type definitions
    types: [],
    lib: ['ES2020', 'DOM'],
    // JSX support for React components
    jsx: ts.JsxEmit.React,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
  };

  // Create a custom compiler host that provides our virtual file
  const defaultCompilerHost = ts.createCompilerHost(compilerOptions);
  const customCompilerHost: ts.CompilerHost = {
    ...defaultCompilerHost,
    getSourceFile: (fileName, languageVersion) => {
      if (fileName === 'generated.ts') {
        return sourceFile;
      }
      // Return empty file for any imports to avoid "file not found" errors
      if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
        return ts.createSourceFile(
          fileName,
          '',
          languageVersion,
          true
        );
      }
      return defaultCompilerHost.getSourceFile(fileName, languageVersion);
    },
    fileExists: (fileName) => {
      if (fileName === 'generated.ts') return true;
      return defaultCompilerHost.fileExists(fileName);
    },
    readFile: (fileName) => {
      if (fileName === 'generated.ts') return code;
      return defaultCompilerHost.readFile(fileName);
    },
  };

  // Create the program
  const program = ts.createProgram(
    ['generated.ts'],
    compilerOptions,
    customCompilerHost
  );

  // Get diagnostics
  const allDiagnostics = ts.getPreEmitDiagnostics(program);

  // Process diagnostics
  for (const diagnostic of allDiagnostics) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

    // Skip expected errors
    const shouldSkip = SKIPPED_ERROR_PATTERNS.some(pattern => message.includes(pattern));
    if (shouldSkip) {
      continue;
    }

    // Handle warnings vs errors
    if (diagnostic.category === ts.DiagnosticCategory.Warning) {
      warnings.push(message);
      continue;
    }

    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      const error: ValidationError = {
        message,
        code: diagnostic.code,
        fixable: isFixableError(diagnostic.code, message),
        fixSuggestion: getFixSuggestion(diagnostic.code, message),
      };

      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        error.line = line + 1;
        error.column = character + 1;
      }

      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixable: errors.some(e => e.fixable),
  };
}

/**
 * Check if an error is automatically fixable.
 */
function isFixableError(code: number | undefined, message: string): boolean {
  // TS1005: ';' expected
  if (code === 1005) return true;
  // TS7006: Parameter implicitly has an 'any' type
  if (code === 7006) return true;
  // TS1064: async function return type
  if (code === 1064) return true;
  // TS2304: Cannot find name - sometimes fixable with imports
  if (code === 2304 && message.includes("Cannot find name")) return false;
  // TS2345: Argument of type 'X' is not assignable
  if (code === 2345) return false;
  // TS2339: Property does not exist
  if (code === 2339) return false;

  return false;
}

/**
 * Get a suggestion for fixing an error.
 */
function getFixSuggestion(code: number | undefined, message: string): string | undefined {
  if (code === 1005) {
    return "Add missing semicolon";
  }
  if (code === 7006) {
    return "Add type annotation to parameter (e.g., ': unknown' or ': string')";
  }
  if (code === 1064) {
    return "Add Promise return type to async function";
  }
  if (code === 2304) {
    const match = message.match(/Cannot find name '(\w+)'/);
    if (match) {
      return `Ensure '${match[1]}' is defined or imported`;
    }
  }
  if (code === 2345) {
    return "Check that the argument type matches the expected parameter type";
  }
  if (code === 2339) {
    const match = message.match(/Property '(\w+)' does not exist/);
    if (match) {
      return `Add '${match[1]}' property to the type definition or use type assertion`;
    }
  }

  return undefined;
}

/**
 * Attempt to auto-fix common TypeScript errors in generated code.
 */
export function attemptAutoFix(code: string, _errors?: string[]): string {
  let fixedCode = code;
  const result = validateTypeScriptDetailed(code);

  for (const error of result.errors) {
    if (!error.fixable) continue;

    // Fix missing semicolons (TS1005)
    if (error.code === 1005 && error.message.includes("';' expected")) {
      // Add semicolons after closing braces before new statements
      fixedCode = fixedCode.replace(
        /(\})\s*(\n\s*(?:const|let|var|function|export|import|class|interface|type|async|if|for|while|switch|try))/g,
        '$1;\n$2'
      );
      // Add semicolons after assignments without them
      fixedCode = fixedCode.replace(
        /(\s=\s[^;{]+)\s*(\n\s*(?:const|let|var|function|export|import|class|interface|type|async))/g,
        '$1;$2'
      );
    }

    // Fix missing type annotations (TS7006)
    if (error.code === 7006 && error.message.includes('implicitly has an')) {
      // Add : unknown to function parameters without types
      // Be careful not to match parameters that already have types
      fixedCode = fixedCode.replace(
        /\(([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
        '($1: unknown)'
      );
      // Handle multiple parameters
      fixedCode = fixedCode.replace(
        /\(([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
        '($1: unknown, $2: unknown)'
      );
    }

    // Fix async function return types (TS1064)
    if (error.code === 1064) {
      // Add Promise<unknown> return type to async functions without one
      fixedCode = fixedCode.replace(
        /async function (\w+)\(([^)]*)\)\s*\{/g,
        (match, name, params) => {
          // Check if it already has a return type
          if (match.includes(':')) return match;
          return `async function ${name}(${params}): Promise<unknown> {`;
        }
      );
      // Arrow functions
      fixedCode = fixedCode.replace(
        /const (\w+) = async \(([^)]*)\)\s*=>/g,
        (match, name, params) => {
          if (match.includes(':')) return match;
          return `const ${name} = async (${params}): Promise<unknown> =>`;
        }
      );
    }
  }

  // Additional fixes not tied to specific error codes

  // Fix trailing commas in JSON-like objects (can cause issues)
  fixedCode = fixedCode.replace(/,(\s*[}\]])/g, '$1');

  // Ensure exports have semicolons
  fixedCode = fixedCode.replace(
    /export \{ ([^}]+) \}(\s*\n)/g,
    'export { $1 };$2'
  );

  return fixedCode;
}

/**
 * Apply multiple auto-fix passes until no more fixes are possible.
 */
export function attemptAutoFixIterative(code: string, maxIterations: number = 3): {
  code: string;
  fixed: boolean;
  iterations: number;
  remainingErrors: string[];
} {
  let currentCode = code;
  let iterations = 0;
  let previousErrorCount = Infinity;

  while (iterations < maxIterations) {
    const errors = validateTypeScript(currentCode);

    // Stop if no errors or no improvement
    if (errors.length === 0 || errors.length >= previousErrorCount) {
      return {
        code: currentCode,
        fixed: errors.length === 0,
        iterations,
        remainingErrors: errors,
      };
    }

    previousErrorCount = errors.length;
    currentCode = attemptAutoFix(currentCode, errors);
    iterations++;
  }

  const finalErrors = validateTypeScript(currentCode);
  return {
    code: currentCode,
    fixed: finalErrors.length === 0,
    iterations,
    remainingErrors: finalErrors,
  };
}

/**
 * Check if code is syntactically valid (quick check without full type checking).
 */
export function isSyntacticallyValid(code: string): boolean {
  const sourceFile = ts.createSourceFile(
    'check.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  // Check for parse errors
  const syntaxErrors = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];
  return syntaxErrors.length === 0;
}

/**
 * Extract and return only the syntax errors (faster than full validation).
 */
export function getSyntaxErrors(code: string): string[] {
  const sourceFile = ts.createSourceFile(
    'check.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  const syntaxErrors = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];

  return syntaxErrors.map(diagnostic => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (diagnostic.start !== undefined) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
      return `Line ${line + 1}:${character + 1}: ${message}`;
    }
    return message;
  });
}

// ============================================================================
// CODE GENERATION HELPERS
// ============================================================================

/**
 * Standard environment variables used by NetPad tools.
 */
export const STANDARD_ENV_VARS = [
  {
    name: 'NETPAD_URL',
    description: 'NetPad API URL',
    example: 'https://api.netpad.io',
  },
  {
    name: 'NETPAD_API_KEY',
    description: 'Your NetPad API key',
    example: 'np_live_xxxxx',
  },
  {
    name: 'NETPAD_ORG_ID',
    description: 'Your organization ID',
    example: 'org_xxxxx',
  },
  {
    name: 'NETPAD_PROJECT_ID',
    description: 'Your project ID',
    example: 'proj_xxxxx',
  },
];

/**
 * Generate a complete, self-contained TypeScript file with inline types.
 */
export function generateSelfContainedCode(options: {
  title: string;
  description?: string;
  includeFormTypes?: boolean;
  includeWorkflowTypes?: boolean;
  configCode: string;
  functionsCode: string;
  mainCode?: string;
}): string {
  const {
    title,
    description,
    includeFormTypes = true,
    includeWorkflowTypes = false,
    configCode,
    functionsCode,
    mainCode,
  } = options;

  let code = `/**
 * ${title}
 * ${description || 'Generated by NetPad'}
 *
 * Run with: npx tsx ${title.toLowerCase().replace(/\s+/g, '-')}.ts
 */

`;

  // Add inline types
  if (includeFormTypes) {
    code += INLINE_TYPES + '\n';
  }

  if (includeWorkflowTypes) {
    code += INLINE_WORKFLOW_TYPES + '\n';
  }

  // Add configuration section
  code += `// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  baseUrl: process.env.NETPAD_URL ?? 'https://api.netpad.io',
  apiKey: process.env.NETPAD_API_KEY ?? '',
  organizationId: process.env.NETPAD_ORG_ID ?? '',
  projectId: process.env.NETPAD_PROJECT_ID ?? '',
};

${configCode}

// ============================================================================
// API Functions
// ============================================================================

${functionsCode}
`;

  // Add main code if provided
  if (mainCode) {
    code += `
// ============================================================================
// Main
// ============================================================================

${mainCode}
`;
  }

  return code;
}

/**
 * Create a validated ToolOutput with error checking and auto-fixing.
 */
export function createToolOutput(options: {
  code: string;
  filename: string;
  additionalFiles?: Array<{ filename: string; code: string }>;
  envVars?: Array<{ name: string; description: string; example: string }>;
  dependencies?: string[];
  skipValidation?: boolean;
}): ToolOutput {
  const { code, filename, additionalFiles, envVars, dependencies, skipValidation } = options;

  // Skip validation if requested (for performance in certain cases)
  if (skipValidation) {
    return {
      code,
      filename,
      additionalFiles,
      envVars: envVars || STANDARD_ENV_VARS,
      dependencies,
      validated: true, // Assumed valid
    };
  }

  // Quick syntax check first (faster than full validation)
  const syntaxErrors = getSyntaxErrors(code);
  if (syntaxErrors.length > 0) {
    // Syntax errors are usually not auto-fixable
    return {
      code,
      filename,
      additionalFiles,
      envVars: envVars || STANDARD_ENV_VARS,
      dependencies,
      validated: false,
      validationErrors: syntaxErrors,
    };
  }

  // Full validation with iterative auto-fixing
  const fixResult = attemptAutoFixIterative(code);

  return {
    code: fixResult.code,
    filename,
    additionalFiles,
    envVars: envVars || STANDARD_ENV_VARS,
    dependencies,
    validated: fixResult.fixed,
    validationErrors: fixResult.remainingErrors.length > 0 ? fixResult.remainingErrors : undefined,
  };
}

/**
 * Format a ToolOutput for display to the user.
 */
export function formatToolOutput(output: ToolOutput): string {
  let result = '';

  // Validation status with more detail
  if (output.validated) {
    result += '✅ **Code validated successfully** - Ready to use!\n\n';
  } else {
    result += '⚠️ **Code validation warnings:**\n\n';
    result += 'The generated code has some issues that may need manual review:\n\n';
    for (const error of output.validationErrors || []) {
      result += `- ${error}\n`;
    }
    result += '\n> Note: The code may still work in most environments. These warnings are from strict TypeScript checking.\n\n';
  }

  // Quick start section
  result += '## Quick Start\n\n';
  result += '```bash\n';
  result += `# Save the code below to ${output.filename}\n`;
  result += `# Then run:\n`;
  result += `npx tsx ${output.filename}\n`;
  result += '```\n\n';

  // Environment variables
  if (output.envVars.length > 0) {
    result += '## Required Environment Variables\n\n';
    result += 'Create a `.env` file or export these variables:\n\n';
    result += '```bash\n';
    for (const env of output.envVars) {
      result += `# ${env.description}\n`;
      result += `export ${env.name}="${env.example}"\n`;
    }
    result += '```\n\n';
  }

  // Dependencies
  if (output.dependencies && output.dependencies.length > 0) {
    result += '## Dependencies\n\n';
    result += '```bash\n';
    result += `npm install ${output.dependencies.join(' ')}\n`;
    result += '```\n\n';
  }

  // Main code file
  result += `## ${output.filename}\n\n`;
  result += '```typescript\n';
  result += output.code;
  result += '\n```\n';

  // Additional files
  if (output.additionalFiles && output.additionalFiles.length > 0) {
    result += '\n## Additional Files\n';
    for (const file of output.additionalFiles) {
      result += `\n### ${file.filename}\n\n`;
      result += '```typescript\n';
      result += file.code;
      result += '\n```\n';
    }
  }

  return result;
}

/**
 * Format validation errors for display with fix suggestions.
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return '✅ No errors found';
  }

  let output = `Found ${result.errors.length} error(s):\n\n`;

  for (const error of result.errors) {
    const location = error.line ? `Line ${error.line}:${error.column}` : 'Unknown location';
    output += `**${location}**: ${error.message}\n`;

    if (error.fixSuggestion) {
      output += `  💡 Suggestion: ${error.fixSuggestion}\n`;
    }

    if (error.fixable) {
      output += `  🔧 This error may be auto-fixable\n`;
    }

    output += '\n';
  }

  if (result.warnings.length > 0) {
    output += `\n**Warnings (${result.warnings.length}):**\n`;
    for (const warning of result.warnings) {
      output += `- ${warning}\n`;
    }
  }

  return output;
}
