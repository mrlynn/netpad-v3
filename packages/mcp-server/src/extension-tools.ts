/**
 * Extension Generation Tools for NetPad MCP Server
 *
 * Provides tools for creating custom NetPad extensions with workflow nodes.
 * Extensions can add custom functionality to NetPad installations through
 * modular, independently deployable packages.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Node categories available for workflow nodes
 */
export type NodeCategory =
  | 'triggers'
  | 'logic'
  | 'integrations'
  | 'actions'
  | 'data'
  | 'ai'
  | 'forms'
  | 'custom'
  | 'annotations';

/**
 * Configuration field types for node editor UI
 */
export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'expression'
  | 'connection';

/**
 * Configuration field definition for workflow node editor
 */
export interface NodeConfigField {
  name: string;
  label: string;
  type: ConfigFieldType;
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

/**
 * Node output definition
 */
export interface NodeOutput {
  id: string;
  label: string;
  description?: string;
  primary?: boolean;
}

/**
 * Workflow node definition for extension
 */
export interface WorkflowNodeDefinition {
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  color: string;
  icon: string;
  version: string;
  configFields?: NodeConfigField[];
  outputs?: NodeOutput[];
}

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
}

/**
 * Options for generating an extension
 */
export interface GenerateExtensionOptions {
  /** Extension metadata */
  metadata: ExtensionMetadata;
  /** Workflow nodes provided by this extension */
  workflowNodes?: Array<{
    definition: Omit<WorkflowNodeDefinition, 'type'> & { type?: string };
    /** Description of what the handler should do */
    handlerDescription?: string;
    /** Sample handler implementation (optional) */
    handlerCode?: string;
  }>;
  /** Feature flags this extension provides */
  features?: string[];
  /** Whether to include API routes scaffolding */
  includeRoutes?: boolean;
  /** Whether to include services scaffolding */
  includeServices?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Available node categories with descriptions
 */
export const NODE_CATEGORIES: Record<NodeCategory, { label: string; description: string }> = {
  triggers: {
    label: 'Triggers',
    description: 'Workflow entry points (form submission, webhook, schedule)',
  },
  logic: {
    label: 'Logic',
    description: 'Control flow (condition, switch, loop, delay)',
  },
  integrations: {
    label: 'Integrations',
    description: 'External services (Slack, email, HTTP)',
  },
  actions: {
    label: 'Actions',
    description: 'Side effects (send email, make API call)',
  },
  data: {
    label: 'Data',
    description: 'Data manipulation (MongoDB queries, transforms)',
  },
  ai: {
    label: 'AI',
    description: 'AI-powered operations (generate, classify, extract)',
  },
  forms: {
    label: 'Forms',
    description: 'Form-specific operations (field updates, reactions)',
  },
  custom: {
    label: 'Custom',
    description: 'Custom extensions (use this for your own nodes)',
  },
  annotations: {
    label: 'Annotations',
    description: 'Non-executable nodes (notes, labels)',
  },
};

/**
 * Available config field types with descriptions
 */
export const CONFIG_FIELD_TYPES: Record<ConfigFieldType, { label: string; description: string }> = {
  text: { label: 'Text', description: 'Single-line text input' },
  textarea: { label: 'Textarea', description: 'Multi-line text input' },
  number: { label: 'Number', description: 'Numeric input' },
  boolean: { label: 'Boolean', description: 'Toggle/checkbox' },
  select: { label: 'Select', description: 'Dropdown selection (requires options)' },
  json: { label: 'JSON', description: 'JSON editor' },
  expression: { label: 'Expression', description: 'Variable expression with {{variable}} syntax' },
  connection: { label: 'Connection', description: 'Database connection selector' },
};

/**
 * Common MUI icon names for workflow nodes
 */
export const COMMON_ICONS = [
  'Terminal',
  'Code',
  'Email',
  'Http',
  'Storage',
  'Transform',
  'Psychology',
  'Category',
  'Schedule',
  'Webhook',
  'Bolt',
  'Extension',
  'Settings',
  'Build',
  'Api',
  'DataObject',
  'Analytics',
  'CheckCircle',
  'Error',
  'Warning',
  'Info',
  'PlayArrow',
  'Stop',
  'Refresh',
  'Sync',
  'CloudUpload',
  'CloudDownload',
  'Send',
  'Notifications',
  'Message',
  'Chat',
  'Person',
  'Group',
  'Security',
  'Lock',
  'Verified',
];

/**
 * Suggested colors for workflow nodes
 */
export const SUGGESTED_COLORS = {
  orange: '#FF6B35',
  blue: '#2196F3',
  green: '#4CAF50',
  purple: '#9C27B0',
  pink: '#E91E63',
  teal: '#009688',
  amber: '#FF9800',
  indigo: '#3F51B5',
  cyan: '#00BCD4',
  red: '#F44336',
  grey: '#607D8B',
  lime: '#CDDC39',
};

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generate a valid extension ID from a name
 */
export function generateExtensionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/--+/g, '-');
}

/**
 * Generate a valid node type from extension ID and node name
 */
export function generateNodeType(extensionId: string, nodeName: string): string {
  const prefix = extensionId.replace(/-/g, '').replace(/^netpad/, '');
  const suffix = nodeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${prefix}:${suffix}`;
}

/**
 * Generate the package.json content for an extension
 */
export function generatePackageJson(metadata: ExtensionMetadata): string {
  const packageName = metadata.id.startsWith('@')
    ? metadata.id
    : `@netpad/${metadata.id}`;

  return JSON.stringify(
    {
      name: packageName,
      version: metadata.version,
      description: metadata.description || `NetPad extension: ${metadata.name}`,
      main: 'dist/index.js',
      module: 'dist/index.mjs',
      types: 'dist/index.d.ts',
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.mjs',
          require: './dist/index.js',
        },
      },
      scripts: {
        build: 'tsup',
        dev: 'tsup --watch',
        clean: 'rm -rf dist',
        prepublishOnly: 'npm run build',
      },
      author: metadata.author || 'NetPad Extension Developer',
      license: 'MIT',
      keywords: ['netpad', 'extension', 'workflow'],
      peerDependencies: {
        next: '>=14.0.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        tsup: '^8.0.0',
        typescript: '^5.0.0',
      },
      files: ['dist', 'README.md'],
    },
    null,
    2
  );
}

/**
 * Generate the tsconfig.json content for an extension
 */
export function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'bundler',
        declaration: true,
        declarationMap: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  );
}

/**
 * Generate the tsup.config.ts content for an extension
 */
export function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['next', 'react'],
});
`;
}

/**
 * Generate a default handler function for a workflow node
 */
function generateDefaultHandler(
  nodeName: string,
  configFields: NodeConfigField[],
  handlerDescription?: string
): string {
  const configTypeName = `${nodeName.replace(/\s+/g, '')}Config`;
  const configInterface = generateConfigInterface(configTypeName, configFields);

  const description = handlerDescription || `Execute the ${nodeName} node logic`;

  return `${configInterface}

/**
 * Handler for the ${nodeName} node.
 * ${description}
 */
const ${toCamelCase(nodeName)}Handler: NodeHandler = async (context): Promise<NodeExecutionResult> => {
  const startTime = Date.now();

  try {
    // Get the resolved config (with variables like {{formData.name}} already substituted)
    const config = context.resolvedConfig as ${configTypeName};

    // TODO: Implement your business logic here
    // Access config values: config.fieldName
    // Access input data: context.inputs
    // Access trigger info: context.trigger

    // Example: Log execution for debugging
    console.log(\`[${nodeName}] Executing with config:\`, config);
    console.log(\`[${nodeName}] Input data:\`, context.inputs);

    // Build output data for downstream nodes
    const outputData: Record<string, unknown> = {
      message: '${nodeName} executed successfully',
      config,
      inputs: context.inputs,
      timestamp: new Date().toISOString(),
    };

    // Return success result
    return {
      success: true,
      data: outputData,
      metadata: {
        durationMs: Date.now() - startTime,
      },
    };

  } catch (error) {
    // Return failure result with error details
    return {
      success: false,
      data: {},
      error: {
        code: 'OPERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: false,
      },
    };
  }
};`;
}

/**
 * Generate a TypeScript interface for node configuration
 */
function generateConfigInterface(typeName: string, configFields: NodeConfigField[]): string {
  if (configFields.length === 0) {
    return `interface ${typeName} {
  // No configuration fields
}`;
  }

  const fieldDefs = configFields.map((field) => {
    const optional = !field.required ? '?' : '';
    const type = getTypeScriptType(field.type, field.options);
    const comment = field.helpText ? `  /** ${field.helpText} */\n` : '';
    return `${comment}  ${field.name}${optional}: ${type};`;
  });

  return `interface ${typeName} {
${fieldDefs.join('\n')}
}`;
}

/**
 * Get TypeScript type for a config field type
 */
function getTypeScriptType(
  fieldType: ConfigFieldType,
  options?: Array<{ label: string; value: string }>
): string {
  switch (fieldType) {
    case 'text':
    case 'textarea':
    case 'expression':
    case 'connection':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'select':
      if (options && options.length > 0) {
        return options.map((o) => `'${o.value}'`).join(' | ');
      }
      return 'string';
    case 'json':
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

/**
 * Convert a string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toLowerCase());
}

/**
 * Generate the main extension source code
 */
export function generateExtensionSourceCode(options: GenerateExtensionOptions): string {
  const { metadata, workflowNodes = [], features = [], includeRoutes, includeServices } = options;

  // Start building the source code
  let code = `/**
 * ${metadata.name}
 *
 * ${metadata.description || 'A custom NetPad extension'}
 *
 * @author ${metadata.author || 'Extension Developer'}
 * @version ${metadata.version}
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * The result returned by a node handler after execution.
 */
interface NodeExecutionResult {
  /** Whether the node executed successfully */
  success: boolean;
  /** Output data from this node (available to downstream nodes) */
  data: Record<string, unknown>;
  /** Error details if success is false */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  /** Optional execution metadata */
  metadata?: {
    durationMs?: number;
    bytesProcessed?: number;
  };
}

/**
 * The context provided to a node handler during execution.
 */
interface NodeExecutionContext {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  resolvedConfig: Record<string, unknown>;
  inputs: Record<string, unknown>;
  trigger: {
    type: string;
    payload?: Record<string, unknown>;
  };
  getConnection: (vaultId: string) => Promise<{ connectionString: string; database: string } | null>;
  getEmailCredentials: (credentialId: string) => Promise<unknown>;
}

type NodeHandler = (context: NodeExecutionContext) => Promise<NodeExecutionResult>;

interface NodeConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json' | 'expression';
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

interface ExtensionWorkflowNode {
  definition: {
    type: string;
    label: string;
    description: string;
    category: 'triggers' | 'logic' | 'integrations' | 'actions' | 'data' | 'ai' | 'forms' | 'custom' | 'annotations';
    color: string;
    icon: string;
    version: string;
    configFields?: NodeConfigField[];
    outputs?: Array<{ id: string; label: string; primary?: boolean }>;
  };
  handler: NodeHandler;
}

interface NetPadExtension {
  metadata: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
  features?: string[];
  routes?: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    handler: (request: NextRequest) => Promise<NextResponse>;
    requiresAuth?: boolean;
  }>;
  workflowNodes?: ExtensionWorkflowNode[];
  services?: Record<string, unknown>;
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

`;

  // Generate handlers and definitions for each workflow node
  for (const node of workflowNodes) {
    const nodeName = node.definition.label;
    const nodeType =
      node.definition.type || generateNodeType(metadata.id, nodeName);
    const configFields = node.definition.configFields || [];

    // Generate handler
    code += `// ============================================================================
// ${nodeName.toUpperCase()} NODE
// ============================================================================

`;

    if (node.handlerCode) {
      // Use custom handler code if provided
      code += node.handlerCode + '\n\n';
    } else {
      // Generate default handler
      code += generateDefaultHandler(nodeName, configFields, node.handlerDescription) + '\n\n';
    }

    // Generate node definition
    const definitionName = `${toCamelCase(nodeName)}Definition`;
    code += `/**
 * Node definition for ${nodeName}
 */
const ${definitionName} = {
  type: '${nodeType}',
  label: '${nodeName}',
  description: '${node.definition.description.replace(/'/g, "\\'")}',
  category: '${node.definition.category}' as const,
  color: '${node.definition.color}',
  icon: '${node.definition.icon}',
  version: '${node.definition.version || '1.0.0'}',
`;

    // Add config fields
    if (configFields.length > 0) {
      code += `  configFields: ${JSON.stringify(configFields, null, 4).replace(/\n/g, '\n  ')},\n`;
    }

    // Add outputs
    const outputs = node.definition.outputs || [
      { id: 'output', label: 'Success', primary: true },
    ];
    code += `  outputs: ${JSON.stringify(outputs, null, 4).replace(/\n/g, '\n  ')},
};\n\n`;
  }

  // Generate API routes if requested
  if (includeRoutes) {
    code += `// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Example GET route handler
 */
async function handleGetData(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Implement your API logic
    return NextResponse.json({ message: 'Hello from ${metadata.name}!' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Example POST route handler
 */
async function handlePostData(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // TODO: Implement your API logic
    return NextResponse.json({ received: body });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

`;
  }

  // Generate services if requested
  if (includeServices) {
    code += `// ============================================================================
// SERVICES
// ============================================================================

/**
 * Example service for ${metadata.name}
 */
const ${toCamelCase(metadata.name)}Service = {
  // TODO: Add your service methods here
  async doSomething(input: unknown): Promise<unknown> {
    console.log('[${metadata.name}] Service called with:', input);
    return { success: true };
  },
};

`;
  }

  // Generate extension definition
  const extensionVarName = `${toCamelCase(metadata.name.replace(/\s+/g, ''))}Extension`;

  code += `// ============================================================================
// EXTENSION DEFINITION
// ============================================================================

/**
 * The ${metadata.name} Extension
 */
export const ${extensionVarName}: NetPadExtension = {
  metadata: {
    id: '${metadata.id}',
    name: '${metadata.name}',
    version: '${metadata.version}',
    description: '${(metadata.description || '').replace(/'/g, "\\'")}',
    author: '${(metadata.author || 'Extension Developer').replace(/'/g, "\\'")}',
  },

`;

  // Add features
  if (features.length > 0) {
    code += `  features: ${JSON.stringify(features)},\n\n`;
  }

  // Add routes
  if (includeRoutes) {
    const routePrefix = `/api/ext/${metadata.id}`;
    code += `  routes: [
    {
      path: '${routePrefix}/data',
      method: 'GET',
      handler: handleGetData,
    },
    {
      path: '${routePrefix}/data',
      method: 'POST',
      handler: handlePostData,
    },
  ],

`;
  }

  // Add workflow nodes
  if (workflowNodes.length > 0) {
    code += `  workflowNodes: [\n`;
    for (const node of workflowNodes) {
      const nodeName = node.definition.label;
      const definitionName = `${toCamelCase(nodeName)}Definition`;
      const handlerName = `${toCamelCase(nodeName)}Handler`;
      code += `    {
      definition: ${definitionName},
      handler: ${handlerName},
    },\n`;
    }
    code += `  ],\n\n`;
  }

  // Add services
  if (includeServices) {
    code += `  services: {
    ${toCamelCase(metadata.name)}Service,
  },

`;
  }

  // Add lifecycle hooks
  code += `  initialize: async () => {
    console.log('[${metadata.name}] Extension initialized! 🚀');
  },

  cleanup: async () => {
    console.log('[${metadata.name}] Extension cleaned up.');
  },
};

// Default export for the extension loader
export default ${extensionVarName};

// Named exports for direct access
export {
`;

  // Export handlers and definitions
  for (const node of workflowNodes) {
    const nodeName = node.definition.label;
    code += `  ${toCamelCase(nodeName)}Handler,\n`;
    code += `  ${toCamelCase(nodeName)}Definition,\n`;
  }

  code += `};
`;

  return code;
}

/**
 * Generate a complete README for the extension
 */
export function generateExtensionReadme(options: GenerateExtensionOptions): string {
  const { metadata, workflowNodes = [], includeRoutes } = options;

  let readme = `# ${metadata.name}

${metadata.description || 'A custom NetPad extension'}

## Installation

\`\`\`bash
npm install @netpad/${metadata.id}
\`\`\`

## Configuration

Add the extension to your \`.env.local\`:

\`\`\`bash
NETPAD_EXTENSIONS=@netpad/${metadata.id}
\`\`\`

Then restart NetPad.

`;

  // Document workflow nodes
  if (workflowNodes.length > 0) {
    readme += `## Workflow Nodes

This extension provides the following workflow nodes:

`;

    for (const node of workflowNodes) {
      const nodeType =
        node.definition.type || generateNodeType(metadata.id, node.definition.label);

      readme += `### ${node.definition.label}

**Type:** \`${nodeType}\`
**Category:** ${node.definition.category}
**Icon:** ${node.definition.icon}
**Color:** ${node.definition.color}

${node.definition.description}

`;

      // Document config fields
      if (node.definition.configFields && node.definition.configFields.length > 0) {
        readme += `#### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
`;
        for (const field of node.definition.configFields) {
          readme += `| ${field.label} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.helpText || '-'} |\n`;
        }
        readme += '\n';
      }

      // Document outputs
      const outputs = node.definition.outputs || [
        { id: 'output', label: 'Success', primary: true },
      ];
      readme += `#### Outputs

`;
      for (const output of outputs) {
        readme += `- **${output.label}** (\`${output.id}\`)${output.primary ? ' - Primary output' : ''}\n`;
      }
      readme += '\n';
    }
  }

  // Document API routes
  if (includeRoutes) {
    readme += `## API Routes

This extension provides the following API routes:

| Method | Path | Description |
|--------|------|-------------|
| GET | \`/api/ext/${metadata.id}/data\` | Get data |
| POST | \`/api/ext/${metadata.id}/data\` | Create data |

`;
  }

  readme += `## Development

### Building

\`\`\`bash
npm run build
\`\`\`

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

## License

MIT
`;

  return readme;
}

/**
 * Generate a complete extension package
 */
export function generateExtensionPackage(options: GenerateExtensionOptions): {
  files: Array<{ path: string; content: string }>;
  metadata: ExtensionMetadata;
} {
  const { metadata, workflowNodes = [] } = options;

  // Auto-generate extension ID if not provided
  if (!metadata.id) {
    metadata.id = generateExtensionId(metadata.name);
  }

  // Auto-generate node types if not provided
  for (const node of workflowNodes) {
    if (!node.definition.type) {
      node.definition.type = generateNodeType(metadata.id, node.definition.label);
    }
  }

  // Auto-generate features if not provided
  if (!options.features || options.features.length === 0) {
    options.features = [`custom:${metadata.id}`];
  }

  const files = [
    {
      path: 'package.json',
      content: generatePackageJson(metadata),
    },
    {
      path: 'tsconfig.json',
      content: generateTsConfig(),
    },
    {
      path: 'tsup.config.ts',
      content: generateTsupConfig(),
    },
    {
      path: 'src/index.ts',
      content: generateExtensionSourceCode(options),
    },
    {
      path: 'README.md',
      content: generateExtensionReadme(options),
    },
  ];

  return { files, metadata };
}

/**
 * Generate TypeScript code output for creating an extension
 */
export function generateCreateExtensionCode(options: GenerateExtensionOptions): string {
  const pkg = generateExtensionPackage(options);

  let code = `/**
 * Generated NetPad Extension: ${pkg.metadata.name}
 *
 * This file contains all the code needed for your extension.
 * Follow the setup instructions below to use it.
 */

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================
/*
1. Create a new directory for your extension:
   mkdir packages/${pkg.metadata.id}
   cd packages/${pkg.metadata.id}

2. Create the following files with the content below:
   - package.json
   - tsconfig.json
   - tsup.config.ts
   - src/index.ts
   - README.md

3. Install dependencies:
   npm install

4. Build the extension:
   npm run build

5. Enable the extension in your .env.local:
   NETPAD_EXTENSIONS=@netpad/${pkg.metadata.id}

6. Restart NetPad
*/

`;

  // Add each file content
  for (const file of pkg.files) {
    const lang = file.path.endsWith('.json')
      ? 'json'
      : file.path.endsWith('.md')
        ? 'markdown'
        : 'typescript';

    code += `// ============================================================================
// FILE: ${file.path}
// ============================================================================
/*
\`\`\`${lang}
${file.content}
\`\`\`
*/

`;
  }

  return code;
}
