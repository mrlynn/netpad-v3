import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  FIELD_TYPES,
  OPERATORS,
  FORMULA_FUNCTIONS,
  VALIDATION_OPTIONS,
  THEME_OPTIONS,
} from './constants.js';
import {
  generateFormSchema,
  generateFieldConfig,
  generateConditionalLogic,
  generateComputedField,
  generateMultiPageConfig,
  validateFormConfig,
} from './generators.js';
import {
  DOCUMENTATION,
  QUICK_START_GUIDE,
  ARCHITECTURE_GUIDE,
  EXAMPLES,
} from './documentation.js';
import {
  generateNextJsApp,
  generateWorkflowIntegration,
  generateMongoDbQuery,
  generateApiRoute,
  BEST_PRACTICES,
  USE_CASE_TEMPLATES,
} from './application-tools.js';
import {
  APPLICATION_TEMPLATES,
  generateApplicationContract,
  generateContractFromForms,
  generateApplicationRelease,
  generateReleaseCreationCode,
  generateExportBundleStructure,
  type ApplicationTemplateId,
  type ContractInput,
  type ContractOutput,
  type ContractSideEffect,
  type ContractEvent,
} from './application-management-tools.js';
import {
  MARKETPLACE_CATEGORIES,
  SAMPLE_MARKETPLACE_APPS,
  generatePublishToMarketplaceCode,
  generatePublishConfig,
  searchMarketplace,
  generateSearchMarketplaceCode,
  generateInstallFromMarketplaceCode,
  generateNpmPackageJson,
  generateSyncToNpmCode,
  generateImportFromNpmCode,
  validateNpmPackageName,
  type MarketplaceSearchOptions,
  type PublishOptions,
  type InstallOptions,
  type NpmSyncOptions,
  type NpmImportOptions,
} from './marketplace-tools.js';
import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_TEMPLATES,
  generateAddNodeCode,
  generateConnectNodesCode,
  generateConfigureTriggerCode,
  generateTestWorkflowCode,
  generateGetExecutionHistoryCode,
  getNodeCategories,
  getNodesByCategory,
  type WorkflowNodeConfig,
  type WorkflowEdgeConfig,
  type TriggerConfig,
  type TestWorkflowOptions,
} from './workflow-tools.js';
import {
  CONVERSATIONAL_TEMPLATES,
  SEARCH_OPERATORS,
  generateCreateConversationalFormCode,
  generateConfigureRAGCode,
  generateAddRAGDocumentCode,
  generateCreateSearchFormCode,
  generateConfigureSearchOperatorsCode,
  generateTestConversationalFormCode,
  generateTestSearchFormCode,
  generateConversationalFormConfig,
  generateSearchFormConfig,
  getOperatorsForFieldType,
  type ConversationalFormOptions,
  type RAGConfigOptions,
  type SearchFormOptions,
} from './conversational-search-tools.js';
import {
  FORM_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  getTemplateById,
  searchTemplates,
  generateFormConfigFromTemplate,
  generateCreateFormFromTemplateCode,
  type FormTemplate,
  type TemplateCustomizations,
} from './template-tools.js';
import {
  CONNECTION_TYPES,
  QUERY_TEMPLATES,
  generateConnectionConfigCode,
  generateDataBrowserQueryCode,
  generateAggregationPipelineCode,
  generateIndexRecommendation,
  generateSchemaAnalysisCode,
  generateDataExportCode,
  getQueryTemplate,
  listQueryTemplates,
  generateConnectionTestCode,
  generateListDatabasesCode,
  generateListCollectionsCode,
  type ConnectionConfig,
  type DataBrowserQueryOptions,
  type AggregationPipelineOptions,
} from './data-browser-tools.js';
import {
  NODE_CATEGORIES,
  CONFIG_FIELD_TYPES,
  COMMON_ICONS,
  SUGGESTED_COLORS,
  generateExtensionPackage,
  generateExtensionId,
  type GenerateExtensionOptions,
  type NodeCategory,
  type ConfigFieldType,
} from './extension-tools.js';
import {
  createToolOutput,
  formatToolOutput,
  generateSelfContainedCode,
  STANDARD_ENV_VARS,
} from './validation.js';

/**
 * Create a configured NetPad MCP server instance.
 * This factory function can be used by both the CLI (stdio) and remote (HTTP) servers.
 *
 * @param options - Optional configuration for the server
 * @returns A configured McpServer instance
 */
export function createNetPadMcpServer(options?: {
  name?: string;
  version?: string;
}): McpServer {
  const server = new McpServer({
    name: options?.name ?? '@netpad/mcp-server',
    version: options?.version ?? '2.3.0',
  });

// ============================================================================
// RESOURCES - Documentation and reference materials
// ============================================================================

server.resource(
  'netpad-docs',
  'netpad://docs/readme',
  async () => ({
    contents: [
      {
        uri: 'netpad://docs/readme',
        mimeType: 'text/markdown',
        text: DOCUMENTATION.readme,
      },
    ],
  })
);

server.resource(
  'netpad-architecture',
  'netpad://docs/architecture',
  async () => ({
    contents: [
      {
        uri: 'netpad://docs/architecture',
        mimeType: 'text/markdown',
        text: DOCUMENTATION.architecture,
      },
    ],
  })
);

server.resource(
  'netpad-quick-start',
  'netpad://docs/quick-start',
  async () => ({
    contents: [
      {
        uri: 'netpad://docs/quick-start',
        mimeType: 'text/markdown',
        text: QUICK_START_GUIDE,
      },
    ],
  })
);

server.resource(
  'netpad-examples',
  'netpad://docs/examples',
  async () => ({
    contents: [
      {
        uri: 'netpad://docs/examples',
        mimeType: 'text/markdown',
        text: EXAMPLES,
      },
    ],
  })
);

server.resource(
  'netpad-field-types',
  'netpad://reference/field-types',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/field-types',
        mimeType: 'application/json',
        text: JSON.stringify(FIELD_TYPES, null, 2),
      },
    ],
  })
);

server.resource(
  'netpad-operators',
  'netpad://reference/operators',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/operators',
        mimeType: 'application/json',
        text: JSON.stringify(OPERATORS, null, 2),
      },
    ],
  })
);

server.resource(
  'netpad-formulas',
  'netpad://reference/formulas',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/formulas',
        mimeType: 'application/json',
        text: JSON.stringify(FORMULA_FUNCTIONS, null, 2),
      },
    ],
  })
);

server.resource(
  'netpad-extensions',
  'netpad://docs/extensions',
  async () => ({
    contents: [
      {
        uri: 'netpad://docs/extensions',
        mimeType: 'text/markdown',
        text: DOCUMENTATION.extensions,
      },
    ],
  })
);

server.resource(
  'netpad-demo-node',
  'netpad://examples/demo-node',
  async () => ({
    contents: [
      {
        uri: 'netpad://examples/demo-node',
        mimeType: 'text/markdown',
        text: `# @netpad/demo-node Extension Example

The demo-node extension is a complete, working example of how to create NetPad workflow node extensions. Use it as a template for your own extensions.

## What It Provides

A single workflow node called **"Log Message"** that:
- Logs configurable messages to the console
- Supports different log levels (info, warn, error)
- Can pass through input data to downstream nodes
- Demonstrates all key extension concepts

## Node Details

**Type:** \`demo:log-message\`
**Category:** Custom
**Icon:** Terminal (MUI icon)
**Color:** #FF6B35 (orange)

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| Message | textarea | The message to log. Supports \`{{variable}}\` syntax for dynamic values |
| Log Level | select | info, warn, or error |
| Label | text | Custom label for the log entry |
| Pass Through | boolean | Include input data in output (default: true) |

### Example Usage

1. Drag the "Log Message" node onto the workflow canvas
2. Connect it after a form trigger or other node
3. Configure the message: \`New submission from {{formData.email}}\`
4. The node will log the message and pass data to the next node

## Using as a Template

1. **Copy the package** to a new directory
2. **Update package.json** with your extension name
3. **Modify src/index.ts**:
   - Change extension metadata (id, name, version)
   - Update node definition (type, label, icon, color, config fields)
   - Implement your business logic in the handler
4. **Export the extension** as default export

## Key Concepts Demonstrated

- **Extension Metadata**: Identifies your extension in the system
- **Workflow Nodes**: Custom nodes that appear in the workflow editor palette
- **Node Definition**: Describes the node's appearance and configuration UI
- **Node Handler**: The function that executes when the node runs
- **Configuration Fields**: UI fields for node configuration
- **Output Handles**: Connection points for downstream nodes
- **Lifecycle Hooks**: initialize() and cleanup() functions

## File Structure

\`\`\`
packages/demo-node/
├── package.json          # Package metadata
├── README.md             # Documentation
└── src/
    └── index.ts          # Extension + node definition + handler
\`\`\`

## Extension Structure

\`\`\`typescript
export const demoNodeExtension: NetPadExtension = {
  metadata: {
    id: 'netpad-demo-node',
    name: 'Demo Node Extension',
    version: '1.0.0',
  },
  features: ['custom:demo-node'],
  workflowNodes: [
    {
      definition: {
        type: 'demo:log-message',
        label: 'Log Message',
        category: 'custom',
        // ... node appearance config
      },
      handler: async (context) => {
        // ... execution logic
        return { success: true, data: {...} };
      },
    },
  ],
  initialize: async () => { /* setup */ },
  cleanup: async () => { /* teardown */ },
};
\`\`\`

## Handler Implementation

The handler receives a \`NodeExecutionContext\` with:
- \`resolvedConfig\`: Configuration with variables resolved
- \`inputs\`: Data from previous nodes
- \`trigger\`: Workflow trigger information
- Helper functions for connections and credentials

See the full source code in \`packages/demo-node/src/index.ts\` for complete implementation details.
`,
      },
    ],
  })
);

// ============================================================================
// TOOLS - Form building capabilities
// ============================================================================

// Tool: Generate a complete form schema
server.tool(
  'generate_form',
  'Generate a complete NetPad form configuration from a description. Returns validated TypeScript code by default (can optionally return JSON). The TypeScript output includes inline types, form config, and API functions - ready to run with `npx tsx`.',
  {
    description: z.string().describe('Natural language description of the form to generate'),
    formName: z.string().describe('Name of the form'),
    includeMultiPage: z.boolean().optional().describe('Whether to organize fields into multiple pages'),
    includeTheme: z.boolean().optional().describe('Whether to include theme configuration'),
    outputFormat: z.enum(['typescript', 'json']).optional().describe('Output format: "typescript" (default) for complete working code, "json" for raw config'),
  },
  async ({ description, formName, includeMultiPage, includeTheme, outputFormat = 'typescript' }) => {
    const schema = generateFormSchema(description, formName, {
      multiPage: includeMultiPage,
      theme: includeTheme,
    });

    // If JSON format requested, return the raw schema
    if (outputFormat === 'json') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    }

    // Generate complete TypeScript file with inline types
    const slug = formName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const configCode = `export const formConfig: FormConfig = ${JSON.stringify({
      ...schema,
      slug,
    }, null, 2)};`;

    const functionsCode = `/**
 * Submit form data to the NetPad API.
 */
export async function submitForm(data: Record<string, unknown>): Promise<SubmitResult> {
  try {
    const response = await fetch(
      \`\${CONFIG.baseUrl}/api/forms/\${formConfig.slug}/submit\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${CONFIG.apiKey}\`,
        },
        body: JSON.stringify({ data }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json() as { submissionId: string };
    return { success: true, submissionId: result.submissionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create the form in NetPad (run once to set up).
 */
export async function createForm(): Promise<{ formId: string } | { error: string }> {
  try {
    const response = await fetch(\`\${CONFIG.baseUrl}/api/forms\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${CONFIG.apiKey}\`,
      },
      body: JSON.stringify({
        ...formConfig,
        organizationId: CONFIG.organizationId,
        projectId: CONFIG.projectId,
      }),
    });

    if (!response.ok) {
      return { error: await response.text() };
    }

    const result = await response.json() as { form: { formId: string } };
    return { formId: result.form.formId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}`;

    const mainCode = `// Example usage
async function main() {
  console.log('Creating form:', formConfig.name);

  // Create the form (run once)
  const createResult = await createForm();
  if ('error' in createResult) {
    console.error('Failed to create form:', createResult.error);
    return;
  }

  console.log('✅ Form created with ID:', createResult.formId);
  console.log('Form slug:', formConfig.slug);
}

// Uncomment to run:
// main().catch(console.error);
`;

    const code = generateSelfContainedCode({
      title: formName,
      description: schema.description,
      includeFormTypes: true,
      configCode,
      functionsCode,
      mainCode,
    });

    const output = createToolOutput({
      code,
      filename: `${slug}.ts`,
      envVars: STANDARD_ENV_VARS,
    });

    // Generate import URL (base64-encoded config for direct import)
    const importConfig = {
      name: schema.name,
      description: schema.description,
      fieldConfigs: schema.fieldConfigs,
      multiPage: schema.multiPage,
      theme: schema.theme,
    };
    const base64Config = Buffer.from(JSON.stringify(importConfig)).toString('base64');
    const baseUrl = process.env.NETPAD_URL || 'https://netpad.io';
    const importUrl = `${baseUrl}/api/forms/import?config=${base64Config}&source=claude-mcp`;

    // Add import URL to output
    const outputWithImport = formatToolOutput(output) + `

---

## Quick Import (No Code Required!)

Click this link to import the form directly into NetPad:
**[Import to NetPad](${importUrl})**

Or use the create_import_link tool for a shorter, more reliable link (recommended for complex forms).
`;

    return {
      content: [
        {
          type: 'text',
          text: outputWithImport,
        },
      ],
    };
  }
);

// Tool: Create an import link for a form configuration
server.tool(
  'create_import_link',
  'Create a shareable import link for a NetPad form configuration. Use this to generate a short, reliable import URL that users can click to import the form directly into their NetPad account. Recommended for complex forms or when the base64 URL would be too long.',
  {
    config: z.object({
      name: z.string().describe('Form name'),
      description: z.string().optional().describe('Form description'),
      fieldConfigs: z.array(z.object({
        path: z.string(),
        label: z.string(),
        type: z.string(),
        included: z.boolean(),
        required: z.boolean().optional(),
        placeholder: z.string().optional(),
        options: z.array(z.any()).optional(),
        validation: z.any().optional(),
        conditionalLogic: z.any().optional(),
      })).describe('Array of field configurations'),
      multiPage: z.any().optional().describe('Multi-page configuration'),
      theme: z.any().optional().describe('Theme configuration'),
    }).describe('Form configuration object'),
    projectId: z.string().optional().describe('Target project ID (user will pick if not specified)'),
    expiresIn: z.number().optional().describe('Expiry time in seconds (default: 24 hours, max: 7 days)'),
  },
  async ({ config, projectId, expiresIn }) => {
    const baseUrl = process.env.NETPAD_URL || 'https://netpad.io';

    try {
      // Call NetPad API to create import record
      const response = await fetch(`${baseUrl}/api/forms/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          projectId,
          source: 'claude-mcp',
          expiresIn: expiresIn || 86400, // Default 24 hours
          mcpVersion: '2.3.0',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to create import link: ${error.error || response.statusText}\n\nFallback: Use the generate_form tool with outputFormat: "json" and manually import the config.`,
            },
          ],
        };
      }

      const result = await response.json() as { importId: string; importUrl: string; expiresAt: string };

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Import Link Created!**

**Form:** ${config.name}
**Fields:** ${config.fieldConfigs.length}
**Expires:** ${new Date(result.expiresAt).toLocaleString()}

---

## Click to Import

[**→ Import "${config.name}" to NetPad**](${result.importUrl})

---

**Import ID:** \`${result.importId}\`
**Direct URL:** ${result.importUrl}

The user will be prompted to log in (if needed) and select a project before importing.`,
          },
        ],
      };
    } catch (error) {
      // Fallback to base64 URL if API call fails
      const base64Config = Buffer.from(JSON.stringify(config)).toString('base64');
      const fallbackUrl = `${baseUrl}/api/forms/import?config=${base64Config}&source=claude-mcp`;

      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Could not create short import link (API unavailable). Using fallback URL.

**Form:** ${config.name}
**Fields:** ${config.fieldConfigs.length}

---

## Fallback Import Link

[**→ Import "${config.name}" to NetPad**](${fallbackUrl})

Note: This URL may be long. If it doesn't work, ask the user to use the NetPad form builder directly.`,
          },
        ],
      };
    }
  }
);

// Tool: Generate a single field configuration
server.tool(
  'generate_field',
  'Generate a single field configuration for a NetPad form. Use this when you need to add a specific field to an existing form.',
  {
    path: z.string().describe('Unique field path (e.g., "email" or "address.city" for nested)'),
    label: z.string().describe('Display label for the field'),
    type: z.string().describe('Field type (e.g., "short_text", "email", "dropdown", "date")'),
    required: z.boolean().optional().describe('Whether the field is required'),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional().describe('Options for dropdown/select/radio/checkbox fields'),
    placeholder: z.string().optional().describe('Placeholder text'),
    helpText: z.string().optional().describe('Help text shown below the field'),
    fieldWidth: z.enum(['full', 'half', 'third', 'quarter']).optional().describe('Width of the field'),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      errorMessage: z.string().optional(),
    }).optional().describe('Validation rules'),
  },
  async (params) => {
    const field = generateFieldConfig(params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(field, null, 2),
        },
      ],
    };
  }
);

// Tool: Generate conditional logic
server.tool(
  'generate_conditional_logic',
  'Generate conditional logic configuration to show or hide a field based on other field values.',
  {
    action: z.enum(['show', 'hide']).describe('Whether to show or hide the field when conditions are met'),
    logicType: z.enum(['all', 'any']).describe('Whether all conditions must be met (AND) or any (OR)'),
    conditions: z.array(z.object({
      field: z.string().describe('The field path to check'),
      operator: z.string().describe('The comparison operator'),
      value: z.union([z.string(), z.number(), z.boolean()]).optional().describe('The value to compare against'),
    })).describe('The conditions to evaluate'),
  },
  async ({ action, logicType, conditions }) => {
    const logic = generateConditionalLogic(action, logicType, conditions);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(logic, null, 2),
        },
      ],
    };
  }
);

// Tool: Generate computed field
server.tool(
  'generate_computed_field',
  'Generate a computed field configuration with a formula that calculates values from other fields.',
  {
    path: z.string().describe('Unique field path for the computed field'),
    label: z.string().describe('Display label'),
    formula: z.string().describe('The formula expression (e.g., "quantity * price * (1 - discount)")'),
    outputType: z.enum(['string', 'number', 'boolean', 'date']).optional().describe('Output type of the computed value'),
  },
  async ({ path, label, formula, outputType }) => {
    const field = generateComputedField(path, label, formula, outputType);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(field, null, 2),
        },
      ],
    };
  }
);

// Tool: Generate multi-page configuration
server.tool(
  'generate_multipage_config',
  'Generate a multi-page wizard configuration for organizing form fields into steps.',
  {
    pages: z.array(z.object({
      id: z.string().describe('Unique page identifier'),
      title: z.string().describe('Page title'),
      description: z.string().optional().describe('Page description'),
      fields: z.array(z.string()).describe('Field paths to include on this page'),
    })).describe('The pages to create'),
    showProgressBar: z.boolean().optional().describe('Whether to show a progress bar'),
    showPageTitles: z.boolean().optional().describe('Whether to show page titles'),
    allowSkip: z.boolean().optional().describe('Whether users can skip pages'),
    showReview: z.boolean().optional().describe('Whether to show a review page at the end'),
  },
  async ({ pages, showProgressBar, showPageTitles, allowSkip, showReview }) => {
    const config = generateMultiPageConfig(pages, {
      showProgressBar,
      showPageTitles,
      allowSkip,
      showReview,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }
);

// Tool: Validate a form configuration
server.tool(
  'validate_form_config',
  'Validate a NetPad form configuration and check for errors or issues.',
  {
    config: z.string().describe('The form configuration JSON to validate'),
  },
  async ({ config }) => {
    try {
      const parsed = JSON.parse(config);
      const result = validateFormConfig(parsed);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              valid: false,
              errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
            }, null, 2),
          },
        ],
      };
    }
  }
);

// ============================================================================
// CONSOLIDATED REFERENCE TOOL
// ============================================================================

// Tool: Get reference information (consolidates 6 tools)
server.tool(
  'get_reference',
  'Get NetPad reference information: field types, operators, formula functions, validation options, theme options, or documentation. This is the recommended way to access all reference data.',
  {
    type: z.enum([
      'field_types',
      'operators',
      'formula_functions',
      'validation_options',
      'theme_options',
      'documentation'
    ]).describe('The type of reference to retrieve'),
    category: z.string().optional().describe('Filter by category (for field_types: "text", "selection", "date"; for formula_functions: "math", "string", "date")'),
    topic: z.enum(['readme', 'architecture', 'quick-start', 'examples', 'api-client']).optional().describe('Documentation topic (required when type is "documentation")'),
  },
  async ({ type, category, topic }) => {
    switch (type) {
      case 'field_types': {
        let types = FIELD_TYPES;
        if (category) {
          types = types.filter(t => t.category.toLowerCase() === category.toLowerCase());
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              referenceType: 'field_types',
              count: types.length,
              categories: [...new Set(FIELD_TYPES.map(t => t.category))],
              data: types,
            }, null, 2),
          }],
        };
      }
      case 'operators': {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              referenceType: 'operators',
              count: OPERATORS.length,
              data: OPERATORS,
            }, null, 2),
          }],
        };
      }
      case 'formula_functions': {
        let functions = FORMULA_FUNCTIONS;
        if (category) {
          functions = functions.filter(f => f.category.toLowerCase() === category.toLowerCase());
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              referenceType: 'formula_functions',
              count: functions.length,
              categories: [...new Set(FORMULA_FUNCTIONS.map(f => f.category))],
              data: functions,
            }, null, 2),
          }],
        };
      }
      case 'validation_options': {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              referenceType: 'validation_options',
              data: VALIDATION_OPTIONS,
            }, null, 2),
          }],
        };
      }
      case 'theme_options': {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              referenceType: 'theme_options',
              data: THEME_OPTIONS,
            }, null, 2),
          }],
        };
      }
      case 'documentation': {
        const docs: Record<string, string> = {
          'readme': DOCUMENTATION.readme,
          'architecture': ARCHITECTURE_GUIDE,
          'quick-start': QUICK_START_GUIDE,
          'examples': EXAMPLES,
          'api-client': DOCUMENTATION.apiClient,
        };
        const selectedTopic = topic || 'readme';
        return {
          content: [{
            type: 'text',
            text: `# NetPad Documentation: ${selectedTopic}\n\n${docs[selectedTopic] || 'Documentation not found'}\n\n---\nAvailable topics: ${Object.keys(docs).join(', ')}`,
          }],
        };
      }
      default:
        return {
          content: [{
            type: 'text',
            text: 'Invalid reference type. Use: field_types, operators, formula_functions, validation_options, theme_options, or documentation',
          }],
        };
    }
  }
);

// ============================================================================
// CONSOLIDATED TEMPLATE BROWSING TOOL
// ============================================================================

// Tool: Browse all templates (consolidates 11 template tools)
server.tool(
  'browse_templates',
  'Browse all NetPad templates: forms (25+), applications (7), workflows (5), conversational (4), and query templates. This is the recommended way to discover and access all templates.',
  {
    templateType: z.enum([
      'form',
      'application',
      'workflow',
      'conversational',
      'query',
      'use_case',
      'all'
    ]).describe('Type of templates to browse'),
    action: z.enum(['list', 'get', 'categories']).optional().describe('Action: "list" (default) returns summaries, "get" returns full details, "categories" lists available categories'),
    templateId: z.string().optional().describe('Template ID (required when action is "get")'),
    category: z.string().optional().describe('Filter templates by category'),
    search: z.string().optional().describe('Search templates by name, description, or tags (form templates only)'),
  },
  async ({ templateType, action = 'list', templateId, category, search }) => {
    // Helper to format template summary
    const formatSummary = (id: string, name: string, desc: string, cat: string, extra: Record<string, unknown> = {}) => ({
      id, name, description: desc, category: cat, ...extra
    });

    switch (templateType) {
      case 'form': {
        if (action === 'categories') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                templateType: 'form',
                categories: TEMPLATE_CATEGORIES,
                totalTemplates: Object.keys(FORM_TEMPLATES).length,
              }, null, 2),
            }],
          };
        }
        if (action === 'get' && templateId) {
          const template = getTemplateById(templateId);
          if (!template) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Form template "${templateId}" not found`,
                  availableTemplates: Object.keys(FORM_TEMPLATES),
                }, null, 2),
              }],
            };
          }
          return { content: [{ type: 'text', text: JSON.stringify(template, null, 2) }] };
        }
        // List form templates
        let templates: FormTemplate[];
        if (search) {
          templates = searchTemplates(search);
        } else if (category) {
          templates = getTemplatesByCategory(category);
        } else {
          templates = Object.values(FORM_TEMPLATES);
        }
        const summary = templates.map(t => formatSummary(t.id, t.name, t.description, t.category, {
          tags: t.tags, icon: t.icon, fieldCount: t.fields.length, hasMultiPage: !!t.multiPage?.enabled,
        }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              templateType: 'form',
              templates: summary,
              total: summary.length,
              categories: [...new Set(templates.map(t => t.category))],
            }, null, 2),
          }],
        };
      }

      case 'application': {
        if (action === 'categories') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                templateType: 'application',
                categories: [...new Set(Object.values(APPLICATION_TEMPLATES).map(t => t.category))],
                totalTemplates: Object.keys(APPLICATION_TEMPLATES).length,
              }, null, 2),
            }],
          };
        }
        if (action === 'get' && templateId) {
          const template = APPLICATION_TEMPLATES[templateId as ApplicationTemplateId];
          if (!template) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Application template "${templateId}" not found`,
                  availableTemplates: Object.keys(APPLICATION_TEMPLATES),
                }, null, 2),
              }],
            };
          }
          return { content: [{ type: 'text', text: JSON.stringify(template, null, 2) }] };
        }
        // List application templates
        let templates = Object.values(APPLICATION_TEMPLATES);
        if (category) {
          templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
        }
        const summary = templates.map(t => formatSummary(t.id, t.name, t.description, t.category, {
          tags: t.tags, formsCount: t.structure.forms.length, workflowsCount: t.structure.workflows.length,
        }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              templateType: 'application',
              templates: summary,
              total: summary.length,
              categories: [...new Set(Object.values(APPLICATION_TEMPLATES).map(t => t.category))],
            }, null, 2),
          }],
        };
      }

      case 'workflow': {
        if (action === 'categories') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                templateType: 'workflow',
                categories: [...new Set(Object.values(WORKFLOW_TEMPLATES).map(t => t.category))],
                totalTemplates: Object.keys(WORKFLOW_TEMPLATES).length,
              }, null, 2),
            }],
          };
        }
        if (action === 'get' && templateId) {
          const template = WORKFLOW_TEMPLATES[templateId as keyof typeof WORKFLOW_TEMPLATES];
          if (!template) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Workflow template "${templateId}" not found`,
                  availableTemplates: Object.keys(WORKFLOW_TEMPLATES),
                }, null, 2),
              }],
            };
          }
          // Wrap nodes and edges in canvas object for NetPad UI compatibility
          const workflowForUI = {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            tags: template.tags,
            canvas: {
              nodes: template.nodes,
              edges: template.edges,
            },
          };
          return { content: [{ type: 'text', text: JSON.stringify(workflowForUI, null, 2) }] };
        }
        // List workflow templates
        let templates = Object.values(WORKFLOW_TEMPLATES);
        if (category) {
          templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
        }
        const summary = templates.map(t => formatSummary(t.id, t.name, t.description, t.category, {
          tags: t.tags, nodesCount: t.nodes.length, edgesCount: t.edges.length,
        }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              templateType: 'workflow',
              templates: summary,
              total: summary.length,
              categories: [...new Set(Object.values(WORKFLOW_TEMPLATES).map(t => t.category))],
            }, null, 2),
          }],
        };
      }

      case 'conversational': {
        if (action === 'categories') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                templateType: 'conversational',
                categories: [...new Set(Object.values(CONVERSATIONAL_TEMPLATES).map(t => t.category))],
                totalTemplates: Object.keys(CONVERSATIONAL_TEMPLATES).length,
              }, null, 2),
            }],
          };
        }
        if (action === 'get' && templateId) {
          const template = CONVERSATIONAL_TEMPLATES[templateId as keyof typeof CONVERSATIONAL_TEMPLATES];
          if (!template) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Conversational template "${templateId}" not found`,
                  availableTemplates: Object.keys(CONVERSATIONAL_TEMPLATES),
                }, null, 2),
              }],
            };
          }
          return { content: [{ type: 'text', text: JSON.stringify(template, null, 2) }] };
        }
        // List conversational templates
        let templates = Object.values(CONVERSATIONAL_TEMPLATES);
        if (category) {
          templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
        }
        const summary = templates.map(t => formatSummary(t.id, t.name, t.description, t.category, {
          tags: t.tags, topicsCount: t.defaultConfig.topics.length, extractionFieldsCount: t.defaultConfig.extractionSchema.length,
        }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              templateType: 'conversational',
              templates: summary,
              total: summary.length,
              categories: [...new Set(Object.values(CONVERSATIONAL_TEMPLATES).map(t => t.category))],
            }, null, 2),
          }],
        };
      }

      case 'query': {
        if (action === 'get' && templateId) {
          const template = getQueryTemplate(templateId);
          if (!template) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Query template "${templateId}" not found`,
                  availableTemplates: listQueryTemplates(),
                }, null, 2),
              }],
            };
          }
          return { content: [{ type: 'text', text: JSON.stringify(template, null, 2) }] };
        }
        // List query templates
        const templates = listQueryTemplates();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              templateType: 'query',
              templates,
              total: templates.length,
            }, null, 2),
          }],
        };
      }

      case 'use_case': {
        if (action === 'get' && templateId) {
          const template = USE_CASE_TEMPLATES[templateId as keyof typeof USE_CASE_TEMPLATES];
          if (!template) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Use case template "${templateId}" not found`,
                  availableTemplates: Object.keys(USE_CASE_TEMPLATES),
                }, null, 2),
              }],
            };
          }
          return { content: [{ type: 'text', text: JSON.stringify(template, null, 2) }] };
        }
        // List use case templates
        const useCaseIds = Object.keys(USE_CASE_TEMPLATES);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              templateType: 'use_case',
              templates: useCaseIds,
              total: useCaseIds.length,
              note: 'Use action="get" with templateId to retrieve full template details',
            }, null, 2),
          }],
        };
      }

      case 'all': {
        // Return overview of all template types
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              overview: 'NetPad Template Catalog',
              templateTypes: [
                { type: 'form', count: Object.keys(FORM_TEMPLATES).length, categories: TEMPLATE_CATEGORIES.length, description: 'Pre-built form configurations with fields, validation, and styling' },
                { type: 'application', count: Object.keys(APPLICATION_TEMPLATES).length, description: 'Complete applications with forms, workflows, and settings' },
                { type: 'workflow', count: Object.keys(WORKFLOW_TEMPLATES).length, description: 'Automated workflow patterns with triggers, conditions, and actions' },
                { type: 'conversational', count: Object.keys(CONVERSATIONAL_TEMPLATES).length, description: 'AI-powered conversational form templates' },
                { type: 'query', count: listQueryTemplates().length, description: 'MongoDB query patterns for common operations' },
                { type: 'use_case', count: Object.keys(USE_CASE_TEMPLATES).length, description: 'Industry use case blueprints' },
              ],
              totalTemplates:
                Object.keys(FORM_TEMPLATES).length +
                Object.keys(APPLICATION_TEMPLATES).length +
                Object.keys(WORKFLOW_TEMPLATES).length +
                Object.keys(CONVERSATIONAL_TEMPLATES).length +
                listQueryTemplates().length +
                Object.keys(USE_CASE_TEMPLATES).length,
              usage: 'Use templateType to filter, action="get" with templateId to get details, or action="categories" to see available categories',
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: 'Invalid templateType. Use: form, application, workflow, conversational, query, use_case, or all',
          }],
        };
    }
  }
);

// ============================================================================
// DEPRECATED REFERENCE TOOLS (use get_reference instead)
// ============================================================================

// Tool: List all supported field types [DEPRECATED]
server.tool(
  'list_field_types',
  '[DEPRECATED - use get_reference with type="field_types" instead] List all supported field types in @netpad/forms with their descriptions and usage.',
  {
    category: z.string().optional().describe('Filter by category (e.g., "text", "selection", "date")'),
  },
  async ({ category }) => {
    let types = FIELD_TYPES;
    if (category) {
      types = types.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }
    return {
      content: [
        {
          type: 'text',
          text: `DEPRECATED: This tool is deprecated. Use get_reference with type="field_types" instead.\n\n${JSON.stringify(types, null, 2)}`,
        },
      ],
    };
  }
);

// Tool: List conditional logic operators [DEPRECATED]
server.tool(
  'list_operators',
  '[DEPRECATED - use get_reference with type="operators" instead] List all available conditional logic operators with descriptions.',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: `DEPRECATED: This tool is deprecated. Use get_reference with type="operators" instead.\n\n${JSON.stringify(OPERATORS, null, 2)}`,
        },
      ],
    };
  }
);

// Tool: List formula functions [DEPRECATED]
server.tool(
  'list_formula_functions',
  '[DEPRECATED - use get_reference with type="formula_functions" instead] List all available formula functions for computed fields.',
  {
    category: z.string().optional().describe('Filter by category (e.g., "math", "string", "date")'),
  },
  async ({ category }) => {
    let functions = FORMULA_FUNCTIONS;
    if (category) {
      functions = functions.filter(f => f.category.toLowerCase() === category.toLowerCase());
    }
    return {
      content: [
        {
          type: 'text',
          text: `DEPRECATED: This tool is deprecated. Use get_reference with type="formula_functions" instead.\n\n${JSON.stringify(functions, null, 2)}`,
        },
      ],
    };
  }
);

// Tool: List validation options [DEPRECATED]
server.tool(
  'list_validation_options',
  '[DEPRECATED - use get_reference with type="validation_options" instead] List all available validation options for form fields.',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: `DEPRECATED: This tool is deprecated. Use get_reference with type="validation_options" instead.\n\n${JSON.stringify(VALIDATION_OPTIONS, null, 2)}`,
        },
      ],
    };
  }
);

// Tool: List theme options [DEPRECATED]
server.tool(
  'list_theme_options',
  '[DEPRECATED - use get_reference with type="theme_options" instead] List all available theme customization options.',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: `DEPRECATED: This tool is deprecated. Use get_reference with type="theme_options" instead.\n\n${JSON.stringify(THEME_OPTIONS, null, 2)}`,
        },
      ],
    };
  }
);

// Tool: Get documentation [DEPRECATED]
server.tool(
  'get_documentation',
  '[DEPRECATED - use get_reference with type="documentation" instead] Get NetPad forms documentation. Use this to learn about features, APIs, and best practices.',
  {
    topic: z.enum(['readme', 'architecture', 'quick-start', 'examples', 'api-client']).describe('The documentation topic to retrieve'),
  },
  async ({ topic }) => {
    const docs: Record<string, string> = {
      'readme': DOCUMENTATION.readme,
      'architecture': ARCHITECTURE_GUIDE,
      'quick-start': QUICK_START_GUIDE,
      'examples': EXAMPLES,
      'api-client': DOCUMENTATION.apiClient,
    };
    return {
      content: [
        {
          type: 'text',
          text: `DEPRECATED: This tool is deprecated. Use get_reference with type="documentation" and topic="${topic}" instead.\n\n${docs[topic] || 'Documentation not found'}`,
        },
      ],
    };
  }
);

// Tool: Generate React component code
server.tool(
  'generate_react_code',
  'Generate a complete, self-contained React component with inline types and fetch-based API calls. No external @netpad/* imports required - ready to copy-paste and use.',
  {
    formConfig: z.string().describe('The form configuration JSON'),
    componentName: z.string().optional().describe('Name of the React component'),
    includeSubmitHandler: z.boolean().optional().describe('Whether to include a submit handler'),
    includeApiSubmission: z.boolean().optional().describe('Whether to submit to NetPad API via fetch (default: true)'),
  },
  async ({ formConfig, componentName = 'MyForm', includeSubmitHandler = true, includeApiSubmission = true }) => {
    // Parse the config to extract form name/slug
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(formConfig);
    } catch {
      parsedConfig = { name: componentName, slug: componentName.toLowerCase().replace(/\s+/g, '-') };
    }

    const formSlug = parsedConfig.slug || parsedConfig.name?.toLowerCase().replace(/\s+/g, '-') || 'form';

    const code = `/**
 * ${componentName} - React Form Component
 * Generated by NetPad
 *
 * This is a self-contained component with inline types.
 * No @netpad/* imports required.
 */

'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';

// ============================================================================
// Types (inline - no external dependencies)
// ============================================================================

interface FormFieldOption {
  label: string;
  value: string;
}

interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage?: string;
}

interface FormField {
  path: string;
  label: string;
  type: string;
  included?: boolean;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
}

interface FormConfig {
  name: string;
  slug?: string;
  description?: string;
  fieldConfigs: FormField[];
  submitButtonText?: string;
  successMessage?: string;
}

interface SubmitResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL ?? 'https://api.netpad.io',
  apiKey: process.env.NEXT_PUBLIC_NETPAD_API_KEY ?? '',
};

const formConfig: FormConfig = ${formConfig};

// ============================================================================
// API Functions (using fetch - no SDK required)
// ============================================================================

${includeApiSubmission ? `async function submitToApi(data: Record<string, unknown>): Promise<SubmitResult> {
  try {
    const response = await fetch(
      \`\${CONFIG.baseUrl}/api/forms/${formSlug}/submit\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${CONFIG.apiKey}\`,
        },
        body: JSON.stringify({ data }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const result = await response.json() as { submissionId: string };
    return { success: true, submissionId: result.submissionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}` : ''}

// ============================================================================
// Component
// ============================================================================

export function ${componentName}() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of formConfig.fieldConfigs) {
      if (!field.included) continue;

      const value = formData[field.path] || '';

      if (field.required && !value) {
        newErrors[field.path] = \`\${field.label} is required\`;
      }

      if (field.validation) {
        if (field.validation.minLength && value.length < field.validation.minLength) {
          newErrors[field.path] = field.validation.errorMessage || \`Minimum \${field.validation.minLength} characters required\`;
        }
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          newErrors[field.path] = field.validation.errorMessage || \`Maximum \${field.validation.maxLength} characters allowed\`;
        }
        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
          newErrors[field.path] = field.validation.errorMessage || 'Invalid format';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

${includeSubmitHandler ? `  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
${includeApiSubmission ? `      const result = await submitToApi(formData);
      setSubmitResult(result);` : `      // TODO: Implement your submission logic
      console.log('Form data:', formData);
      setSubmitResult({ success: true });`}
    } catch (error) {
      setSubmitResult({
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };` : ''}

  const renderField = (field: FormField) => {
    if (!field.included) return null;

    const commonProps = {
      id: field.path,
      name: field.path,
      value: formData[field.path] || '',
      onChange: handleChange,
      required: field.required,
      placeholder: field.placeholder,
      disabled: isSubmitting,
      className: \`form-field \${errors[field.path] ? 'error' : ''}\`,
    };

    let input;

    switch (field.type) {
      case 'long_text':
        input = <textarea {...commonProps} rows={4} />;
        break;
      case 'email':
        input = <input {...commonProps} type="email" />;
        break;
      case 'number':
        input = <input {...commonProps} type="number" />;
        break;
      case 'phone':
        input = <input {...commonProps} type="tel" />;
        break;
      case 'date':
        input = <input {...commonProps} type="date" />;
        break;
      case 'dropdown':
      case 'select':
        input = (
          <select {...commonProps}>
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
        break;
      default:
        input = <input {...commonProps} type="text" />;
    }

    return (
      <div key={field.path} className={\`form-group field-width-\${field.fieldWidth || 'full'}\`}>
        <label htmlFor={field.path}>
          {field.label}
          {field.required && <span className="required">*</span>}
        </label>
        {input}
        {field.helpText && <small className="help-text">{field.helpText}</small>}
        {errors[field.path] && <span className="error-message">{errors[field.path]}</span>}
      </div>
    );
  };

  if (submitResult?.success) {
    return (
      <div className="form-success">
        <h3>✓ {formConfig.successMessage || 'Thank you for your submission!'}</h3>
        {submitResult.submissionId && (
          <p>Confirmation ID: {submitResult.submissionId}</p>
        )}
        <button onClick={() => {
          setSubmitResult(null);
          setFormData({});
        }}>
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>{formConfig.name}</h2>
      {formConfig.description && <p className="form-description">{formConfig.description}</p>}

      <form onSubmit={${includeSubmitHandler ? 'handleSubmit' : '(e) => e.preventDefault()'}}>
        {formConfig.fieldConfigs.map(renderField)}

        {submitResult?.error && (
          <div className="form-error">
            <p>Error: {submitResult.error}</p>
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="submit-button">
          {isSubmitting ? 'Submitting...' : (formConfig.submitButtonText || 'Submit')}
        </button>
      </form>

      <style>{\`
        .form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #1976d2;
        }
        .form-group .error {
          border-color: #d32f2f;
        }
        .required {
          color: #d32f2f;
          margin-left: 4px;
        }
        .help-text {
          display: block;
          color: #666;
          margin-top: 4px;
        }
        .error-message {
          display: block;
          color: #d32f2f;
          font-size: 12px;
          margin-top: 4px;
        }
        .submit-button {
          background: #1976d2;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        .submit-button:hover {
          background: #1565c0;
        }
        .submit-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .form-success {
          text-align: center;
          padding: 40px;
        }
        .form-error {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        .field-width-half {
          display: inline-block;
          width: calc(50% - 8px);
          margin-right: 8px;
        }
        .field-width-third {
          display: inline-block;
          width: calc(33.33% - 8px);
          margin-right: 8px;
        }
        .field-width-quarter {
          display: inline-block;
          width: calc(25% - 8px);
          margin-right: 8px;
        }
      \`}</style>
    </div>
  );
}

export default ${componentName};
`;

    const output = createToolOutput({
      code,
      filename: `${componentName}.tsx`,
      envVars: [
        { name: 'NEXT_PUBLIC_NETPAD_URL', description: 'NetPad API URL (client-side accessible)', example: 'https://api.netpad.io' },
        { name: 'NEXT_PUBLIC_NETPAD_API_KEY', description: 'NetPad API key (client-side accessible)', example: 'np_live_xxxxx' },
      ],
      dependencies: ['react'],
    });

    return {
      content: [
        {
          type: 'text',
          text: formatToolOutput(output),
        },
      ],
    };
  }
);

// ============================================================================
// APPLICATION BUILDING TOOLS
// ============================================================================

// Tool: Scaffold a complete Next.js application
server.tool(
  'scaffold_nextjs_app',
  'Generate a complete Next.js application with NetPad forms integration. Returns all the files needed to create a working form application.',
  {
    appName: z.string().describe('Name of the application'),
    formConfig: z.string().describe('The form configuration JSON'),
    includeWorkflows: z.boolean().optional().describe('Include workflow integration code'),
    includeMongoDb: z.boolean().optional().describe('Include MongoDB connection code'),
    styling: z.enum(['tailwind', 'mui', 'none']).optional().describe('Styling framework to use'),
  },
  async ({ appName, formConfig, includeWorkflows, includeMongoDb, styling }) => {
    const result = generateNextJsApp({
      appName,
      formConfig,
      includeWorkflows,
      includeMongoDb,
      styling,
    });
    return {
      content: [{ type: 'text', text: result }],
    };
  }
);

// Tool: Generate workflow integration code
server.tool(
  'generate_workflow_integration',
  'Generate code for integrating forms with NetPad workflows. Supports saving to MongoDB, sending notifications, or full processing pipelines.',
  {
    formConfig: z.string().describe('The form configuration JSON'),
    workflowType: z.enum(['save_to_mongodb', 'send_notification', 'full_pipeline']).describe('Type of workflow integration'),
    collectionName: z.string().optional().describe('MongoDB collection name for saving data'),
    emailTo: z.string().optional().describe('Email address for notifications'),
  },
  async ({ formConfig, workflowType, collectionName, emailTo }) => {
    const result = generateWorkflowIntegration({
      formConfig,
      workflowType,
      collectionName,
      emailTo,
    });
    return {
      content: [{ type: 'text', text: result }],
    };
  }
);

// Tool: Generate MongoDB queries
server.tool(
  'generate_mongodb_query',
  'Generate MongoDB query code for common operations on form submission data.',
  {
    operation: z.enum(['find', 'aggregate', 'insert', 'update', 'delete']).describe('The database operation'),
    collection: z.string().describe('The collection name'),
    description: z.string().describe('Description of what the query should do'),
    formFields: z.array(z.string()).optional().describe('Field names from the form for reference'),
  },
  async ({ operation, collection, description, formFields }) => {
    const result = generateMongoDbQuery({
      operation,
      collection,
      description,
      formFields,
    });
    return {
      content: [{ type: 'text', text: result }],
    };
  }
);

// Tool: Generate API route
server.tool(
  'generate_api_route',
  'Generate Next.js API route code for form operations.',
  {
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP method'),
    path: z.string().describe('API path (e.g., "forms/submit")'),
    formSlug: z.string().optional().describe('Form slug for NetPad API calls'),
    includeAuth: z.boolean().optional().describe('Include authentication checks'),
  },
  async ({ method, path, formSlug, includeAuth }) => {
    const result = generateApiRoute({ method, path, formSlug, includeAuth });
    return {
      content: [{ type: 'text', text: result }],
    };
  }
);

// Tool: Get best practices
server.tool(
  'get_best_practices',
  'Get best practices and guidelines for building NetPad form applications.',
  {
    topic: z.enum(['formDesign', 'workflowPatterns', 'securityGuidelines', 'troubleshooting']).describe('The topic to get best practices for'),
  },
  async ({ topic }) => {
    return {
      content: [{ type: 'text', text: BEST_PRACTICES[topic] }],
    };
  }
);

// Tool: Get use case template [DEPRECATED]
server.tool(
  'get_use_case_template',
  '[DEPRECATED - use browse_templates with templateType="use_case" and action="get"] Get a pre-built template for common form use cases including form configuration and workflow setup.',
  {
    useCase: z.enum(['leadCapture', 'eventRegistration', 'feedbackSurvey']).describe('The use case template to retrieve'),
  },
  async ({ useCase }) => {
    const template = USE_CASE_TEMPLATES[useCase];
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(template, null, 2),
      }],
    };
  }
);

// Tool: Suggest form fields for a use case
server.tool(
  'suggest_form_fields',
  'Suggest appropriate form fields for a given use case or industry.',
  {
    useCase: z.string().describe('Description of the use case (e.g., "job application", "customer onboarding", "event registration")'),
    industry: z.string().optional().describe('Industry context (e.g., "healthcare", "finance", "education")'),
  },
  async ({ useCase, industry }) => {
    const suggestions = generateFieldSuggestions(useCase, industry);
    return {
      content: [{ type: 'text', text: JSON.stringify(suggestions, null, 2) }],
    };
  }
);

// Tool: Debug form configuration
server.tool(
  'debug_form_config',
  'Analyze a form configuration and identify potential issues, missing fields, or improvements.',
  {
    config: z.string().describe('The form configuration JSON to debug'),
  },
  async ({ config }) => {
    try {
      const parsed = JSON.parse(config);
      const analysis = analyzeFormConfig(parsed);
      return {
        content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Invalid JSON',
            message: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        }],
      };
    }
  }
);

// Tool: Explain error
server.tool(
  'explain_error',
  'Explain a NetPad error code or message and provide solutions.',
  {
    error: z.string().describe('The error code or message to explain'),
    context: z.string().optional().describe('Additional context about when the error occurred'),
  },
  async ({ error, context }) => {
    const explanation = explainError(error, context);
    return {
      content: [{ type: 'text', text: explanation }],
    };
  }
);

// Helper function for field suggestions
function generateFieldSuggestions(useCase: string, industry?: string): object {
  const useCaseLower = useCase.toLowerCase();
  const suggestions: { recommended: object[]; optional: object[]; tips: string[] } = {
    recommended: [],
    optional: [],
    tips: [],
  };

  // Common patterns
  if (useCaseLower.includes('contact') || useCaseLower.includes('inquiry')) {
    suggestions.recommended = [
      { path: 'name', label: 'Full Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'message', label: 'Message', type: 'long_text', required: true },
    ];
    suggestions.optional = [
      { path: 'phone', label: 'Phone', type: 'phone' },
      { path: 'company', label: 'Company', type: 'short_text' },
      { path: 'subject', label: 'Subject', type: 'dropdown' },
    ];
    suggestions.tips = [
      'Keep the form short - 3-5 fields maximum for better conversion',
      'Add a clear call-to-action on the submit button',
      'Consider adding a privacy policy checkbox if collecting personal data',
    ];
  } else if (useCaseLower.includes('registration') || useCaseLower.includes('signup')) {
    suggestions.recommended = [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
    ];
    suggestions.optional = [
      { path: 'phone', label: 'Phone', type: 'phone' },
      { path: 'organization', label: 'Organization', type: 'short_text' },
      { path: 'role', label: 'Role/Title', type: 'short_text' },
      { path: 'terms', label: 'I agree to the terms', type: 'checkbox', required: true },
    ];
    suggestions.tips = [
      'Use multi-page wizard for forms with more than 7 fields',
      'Put terms and conditions at the end',
      'Consider social login options to reduce friction',
    ];
  } else if (useCaseLower.includes('survey') || useCaseLower.includes('feedback')) {
    suggestions.recommended = [
      { path: 'overallRating', label: 'Overall Rating', type: 'rating', required: true },
      { path: 'nps', label: 'How likely to recommend?', type: 'nps' },
      { path: 'feedback', label: 'Comments', type: 'long_text' },
    ];
    suggestions.optional = [
      { path: 'name', label: 'Name (optional)', type: 'short_text' },
      { path: 'email', label: 'Email (optional)', type: 'email' },
      { path: 'canContact', label: 'May we follow up?', type: 'yes_no' },
    ];
    suggestions.tips = [
      'Make identifying fields optional to increase response rate',
      'Use conditional logic to show follow-up questions based on rating',
      'Keep surveys under 5 minutes to complete',
    ];
  } else if (useCaseLower.includes('application') || useCaseLower.includes('job')) {
    suggestions.recommended = [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'position', label: 'Position Applied For', type: 'dropdown', required: true },
    ];
    suggestions.optional = [
      { path: 'experience', label: 'Years of Experience', type: 'number' },
      { path: 'startDate', label: 'Available Start Date', type: 'date' },
      { path: 'salary', label: 'Expected Salary', type: 'number' },
      { path: 'coverLetter', label: 'Cover Letter', type: 'long_text' },
      { path: 'linkedin', label: 'LinkedIn Profile', type: 'url' },
    ];
    suggestions.tips = [
      'Use multi-page wizard: Personal Info → Experience → Documents',
      'Add file upload for resume (requires NetPad Pro)',
      'Include equal opportunity / diversity questions as optional',
    ];
  } else if (useCaseLower.includes('order') || useCaseLower.includes('purchase')) {
    suggestions.recommended = [
      { path: 'product', label: 'Product', type: 'dropdown', required: true },
      { path: 'quantity', label: 'Quantity', type: 'number', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
    ];
    suggestions.optional = [
      { path: 'shipping.address', label: 'Shipping Address', type: 'short_text' },
      { path: 'shipping.city', label: 'City', type: 'short_text', fieldWidth: 'half' },
      { path: 'shipping.zip', label: 'ZIP', type: 'short_text', fieldWidth: 'half' },
      { path: 'notes', label: 'Order Notes', type: 'long_text' },
    ];
    suggestions.tips = [
      'Use computed fields for totals and discounts',
      'Add conditional shipping fields based on delivery preference',
      'Consider adding a "same as billing" checkbox',
    ];
  } else {
    // Generic suggestions
    suggestions.recommended = [
      { path: 'name', label: 'Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
    ];
    suggestions.optional = [
      { path: 'phone', label: 'Phone', type: 'phone' },
      { path: 'message', label: 'Additional Information', type: 'long_text' },
    ];
    suggestions.tips = [
      'Start with the minimum required fields',
      'Group related fields with section headers',
      'Use appropriate field types for better validation',
    ];
  }

  // Add industry-specific suggestions
  if (industry) {
    const industryLower = industry.toLowerCase();
    if (industryLower.includes('health')) {
      suggestions.tips.push('Ensure HIPAA compliance for health data');
      suggestions.tips.push('Add clear consent checkboxes for data usage');
    } else if (industryLower.includes('finance')) {
      suggestions.tips.push('Include regulatory compliance disclaimers');
      suggestions.tips.push('Consider PCI-DSS requirements for payment data');
    } else if (industryLower.includes('education')) {
      suggestions.tips.push('Consider FERPA requirements for student data');
      suggestions.tips.push('Add parent/guardian consent for minors');
    }
  }

  return suggestions;
}

// Helper function to analyze form configuration
function analyzeFormConfig(config: Record<string, unknown>): object {
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const fields = (config.fieldConfigs as Array<Record<string, unknown>>) || [];

  // Check for common issues
  if (!config.name) {
    issues.push('Form is missing a name');
  }

  if (fields.length === 0) {
    issues.push('Form has no fields');
  }

  // Check field configurations
  let hasEmail = false;
  let hasRequired = false;
  const paths = new Set<string>();

  for (const field of fields) {
    const path = field.path as string;

    // Check for duplicates
    if (paths.has(path)) {
      issues.push(`Duplicate field path: ${path}`);
    }
    paths.add(path);

    // Track field types
    if (field.type === 'email') hasEmail = true;
    if (field.required) hasRequired = true;

    // Check for selection fields without options
    const selectionTypes = ['dropdown', 'select', 'radio', 'multiple_choice', 'checkboxes'];
    if (selectionTypes.includes(field.type as string) && !field.options) {
      warnings.push(`Field "${path}" is a selection field but has no options`);
    }

    // Check for computed fields without formula
    if (field.computed && !(field.computed as Record<string, unknown>).formula) {
      issues.push(`Computed field "${path}" is missing a formula`);
    }

    // Check conditional logic references
    if (field.conditionalLogic) {
      const logic = field.conditionalLogic as Record<string, unknown>;
      const conditions = logic.conditions as Array<Record<string, unknown>> || [];
      for (const condition of conditions) {
        const refField = condition.field as string;
        if (!paths.has(refField) && refField !== path) {
          // Field might be defined later, just warn
          warnings.push(`Field "${path}" references "${refField}" in conditional logic - ensure it exists`);
        }
      }
    }
  }

  // Suggestions
  if (!hasEmail) {
    suggestions.push('Consider adding an email field for follow-up communication');
  }

  if (!hasRequired) {
    suggestions.push('Consider marking important fields as required');
  }

  if (fields.length > 10 && !config.multiPage) {
    suggestions.push('Form has many fields - consider using multi-page wizard for better UX');
  }

  if (!config.submitButtonText) {
    suggestions.push('Add custom submitButtonText for clearer call-to-action');
  }

  if (!config.successMessage) {
    suggestions.push('Add a successMessage to confirm submission to users');
  }

  return {
    valid: issues.length === 0,
    fieldCount: fields.length,
    issues,
    warnings,
    suggestions,
    summary: issues.length === 0
      ? `Form looks good with ${fields.length} fields`
      : `Found ${issues.length} issues that need to be fixed`,
  };
}

// Helper function to explain errors
function explainError(error: string, context?: string): string {
  const errorPatterns: Record<string, { explanation: string; solutions: string[] }> = {
    '401': {
      explanation: 'Authentication failed. The API key is missing, invalid, or expired.',
      solutions: [
        'Verify your API key is correct in environment variables',
        'Check that the key starts with np_live_ or np_test_',
        'Ensure the key has not been revoked in the NetPad dashboard',
        'For test environments, use np_test_ prefixed keys',
      ],
    },
    '403': {
      explanation: 'Authorization failed. You do not have permission to perform this action.',
      solutions: [
        'Check that your API key has the required permissions',
        'Verify you have access to the organization/form',
        'Contact your admin to grant necessary permissions',
      ],
    },
    '404': {
      explanation: 'The requested resource was not found.',
      solutions: [
        'Verify the form ID or slug is correct',
        'Check if the form exists in your NetPad dashboard',
        'Ensure the form is published (not in draft status)',
        'For workflows, verify the workflow ID exists',
      ],
    },
    '422': {
      explanation: 'Validation error. The submitted data does not match the expected format.',
      solutions: [
        'Check that all required fields are provided',
        'Verify field values match expected types (string, number, etc.)',
        'Ensure email fields contain valid email addresses',
        'Check validation rules in the form configuration',
      ],
    },
    '429': {
      explanation: 'Rate limit exceeded. Too many requests in a short period.',
      solutions: [
        'Implement exponential backoff in your retry logic',
        'Reduce the frequency of API calls',
        'Consider upgrading your plan for higher limits',
        'Cache responses where appropriate',
      ],
    },
    '500': {
      explanation: 'Internal server error. Something went wrong on the NetPad server.',
      solutions: [
        'Check the NetPad status page for any ongoing issues',
        'Retry the request after a short delay',
        'If the issue persists, contact NetPad support',
        'Check your request payload for unusual characters or large data',
      ],
    },
    'NETWORK_ERROR': {
      explanation: 'Unable to connect to the NetPad API.',
      solutions: [
        'Check your internet connection',
        'Verify the baseUrl is correct (should be https)',
        'Check if there are any firewall or proxy restrictions',
        'Ensure the NetPad service is accessible from your environment',
      ],
    },
    'FORM_NOT_RENDERING': {
      explanation: 'The form component is not displaying correctly.',
      solutions: [
        'Ensure all peer dependencies are installed (@mui/material, @emotion/*)',
        'Verify the form config is valid JSON',
        'Wrap FormRenderer in a MUI ThemeProvider',
        'Check browser console for specific React errors',
      ],
    },
    'CONDITIONAL_LOGIC_NOT_WORKING': {
      explanation: 'Conditional show/hide logic is not behaving as expected.',
      solutions: [
        'Verify field paths match exactly (case-sensitive)',
        'Check that the operator is appropriate for the field type',
        'Test with simpler conditions first',
        'Use browser dev tools to inspect the form state',
        'Ensure the referenced field is rendered before the conditional field',
      ],
    },
  };

  // Try to match the error
  const errorKey = Object.keys(errorPatterns).find(key =>
    error.includes(key) || error.toUpperCase().includes(key.toUpperCase())
  );

  if (errorKey) {
    const info = errorPatterns[errorKey];
    let response = `## Error: ${errorKey}\n\n`;
    response += `**Explanation:** ${info.explanation}\n\n`;
    response += `**Solutions:**\n`;
    info.solutions.forEach((s, i) => {
      response += `${i + 1}. ${s}\n`;
    });

    if (context) {
      response += `\n**Context-specific advice:**\n`;
      if (context.includes('submit')) {
        response += '- Verify the form slug/ID in your submitForm() call\n';
        response += '- Check that the form accepts submissions (not view-only)\n';
      }
      if (context.includes('workflow')) {
        response += '- Ensure the workflow is in "active" status\n';
        response += '- Verify the organizationId is set in the workflow client\n';
      }
    }

    return response;
  }

  // Generic response for unknown errors
  return `## Unknown Error: ${error}

**General troubleshooting steps:**
1. Check the browser console for more details
2. Verify your configuration and API credentials
3. Try the operation in a simpler test case
4. Check the NetPad documentation for this error
5. If the issue persists, contact NetPad support with:
   - The full error message
   - Steps to reproduce
   - Your form configuration (without sensitive data)

${context ? `\n**Context:** ${context}` : ''}
`;
}

// ============================================================================
// APPLICATION MANAGEMENT TOOLS (Phase 1 - Version 2.0.0)
// ============================================================================

// Tool: List application templates [DEPRECATED]
server.tool(
  'list_application_templates',
  '[DEPRECATED - use browse_templates with templateType="application"] List all available application templates for creating new NetPad applications. Templates include pre-configured forms, workflows, and settings.',
  {
    category: z.string().optional().describe('Filter by category (e.g., "lead-generation", "events", "surveys", "hr", "ecommerce")'),
  },
  async ({ category }) => {
    let templates = Object.values(APPLICATION_TEMPLATES);
    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    const summary = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      formsCount: t.structure.forms.length,
      workflowsCount: t.structure.workflows.length,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          templates: summary,
          total: summary.length,
          categories: [...new Set(Object.values(APPLICATION_TEMPLATES).map(t => t.category))],
        }, null, 2),
      }],
    };
  }
);

// Tool: Get application template details [DEPRECATED]
server.tool(
  'get_application_template',
  '[DEPRECATED - use browse_templates with templateType="application" and action="get"] Get detailed information about a specific application template including its forms, workflows, and field configurations.',
  {
    templateId: z.enum(['contact-form', 'lead-capture', 'event-registration', 'feedback-survey', 'job-application', 'order-form', 'blank']).describe('The template ID'),
  },
  async ({ templateId }) => {
    const template = APPLICATION_TEMPLATES[templateId as ApplicationTemplateId];
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Template "${templateId}" not found` }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(template, null, 2),
      }],
    };
  }
);

// Tool: Create application (generates code)
server.tool(
  'create_application',
  'Generate a single, complete TypeScript file that creates a NetPad application with all forms and workflows. Run with `npx tsx` - no SDK required.',
  {
    name: z.string().describe('Name of the application'),
    description: z.string().optional().describe('Description of the application'),
    slug: z.string().optional().describe('URL-friendly slug (auto-generated if not provided)'),
    templateId: z.enum(['contact-form', 'lead-capture', 'event-registration', 'feedback-survey', 'job-application', 'order-form', 'blank']).optional().describe('Template to use'),
    icon: z.string().optional().describe('Icon name or emoji'),
    color: z.string().optional().describe('Color hex code (e.g., "#00ED64")'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
    projectId: z.string().describe('Project ID to create application in'),
    organizationId: z.string().describe('Organization ID'),
  },
  async (options) => {
    const { name, description, templateId, icon, color, tags, projectId, organizationId } = options;
    const slug = options.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const template = templateId ? APPLICATION_TEMPLATES[templateId] : null;

    // Generate form configs from template
    const formConfigs = template?.structure.forms.map(form => ({
      name: form.name,
      slug: form.slug,
      fieldConfigs: form.fields.map(f => ({ ...f, included: true })),
      submitButtonText: 'Submit',
      successMessage: 'Thank you for your submission!',
    })) || [];

    // Generate workflow configs from template
    const workflowConfigs = template?.structure.workflows.map((workflow) => ({
      name: workflow.name,
      description: `Triggered on ${workflow.trigger}`,
      nodes: [
        {
          id: 'trigger_1',
          type: workflow.trigger === 'form_submission' ? 'form-trigger' : 'manual-trigger',
          label: 'Trigger',
          position: { x: 100, y: 200 },
          config: { formSlug: formConfigs[0]?.slug || '' },
          enabled: true,
        },
        ...workflow.steps.map((step, stepIdx) => ({
          id: `step_${stepIdx + 1}`,
          type: step.includes('email') ? 'email-send' : step.includes('database') ? 'mongodb-write' : 'transform',
          label: step.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          position: { x: 100 + (stepIdx + 1) * 250, y: 200 },
          config: {},
          enabled: true,
        })),
      ],
      edges: [
        { id: 'edge_1', source: 'trigger_1', sourceHandle: 'form_data', target: 'step_1', targetHandle: 'input' },
      ],
    })) || [];

    const configCode = `// Application Configuration
const APPLICATION_CONFIG = {
  name: ${JSON.stringify(name)},
  description: ${JSON.stringify(description || `Application created from ${templateId || 'scratch'}`)},
  slug: ${JSON.stringify(slug)},
  icon: ${JSON.stringify(icon || '📋')},
  color: ${JSON.stringify(color || '#00ED64')},
  tags: ${JSON.stringify(tags || [])},
  projectId: CONFIG.projectId,
  organizationId: CONFIG.organizationId,
};

// Form Configurations
const FORM_CONFIGS: FormConfig[] = ${JSON.stringify(formConfigs, null, 2)};

// Workflow Configurations
const WORKFLOW_CONFIGS: WorkflowConfig[] = ${JSON.stringify(workflowConfigs, null, 2)};`;

    const functionsCode = `// ============================================================================
// API Helper Functions
// ============================================================================

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(\`\${CONFIG.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${CONFIG.apiKey}\`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json() as T;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Application Setup Functions
// ============================================================================

async function createApplication(): Promise<string | null> {
  console.log('📱 Creating application:', APPLICATION_CONFIG.name);

  const result = await apiCall<{ application: { applicationId: string } }>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(APPLICATION_CONFIG),
  });

  if (!result.success || !result.data) {
    console.error('❌ Failed to create application:', result.error);
    return null;
  }

  console.log('✅ Application created:', result.data.application.applicationId);
  return result.data.application.applicationId;
}

async function createForms(applicationId: string): Promise<string[]> {
  const formIds: string[] = [];

  for (const formConfig of FORM_CONFIGS) {
    console.log('📝 Creating form:', formConfig.name);

    const result = await apiCall<{ form: { formId: string } }>('/api/forms', {
      method: 'POST',
      body: JSON.stringify({
        ...formConfig,
        applicationId,
        projectId: CONFIG.projectId,
        organizationId: CONFIG.organizationId,
      }),
    });

    if (result.success && result.data) {
      console.log('✅ Form created:', result.data.form.formId);
      formIds.push(result.data.form.formId);
    } else {
      console.error('❌ Failed to create form:', formConfig.name, result.error);
    }
  }

  return formIds;
}

async function createWorkflows(applicationId: string, formIds: string[]): Promise<string[]> {
  const workflowIds: string[] = [];

  for (const workflowConfig of WORKFLOW_CONFIGS) {
    console.log('⚡ Creating workflow:', workflowConfig.name);

    // Update trigger with actual form ID if available
    const updatedNodes = workflowConfig.nodes.map(node => {
      if (node.type === 'form-trigger' && formIds.length > 0) {
        return { ...node, config: { ...node.config, formId: formIds[0] } };
      }
      return node;
    });

    const result = await apiCall<{ workflow: { id: string } }>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({
        ...workflowConfig,
        nodes: updatedNodes,
        applicationId,
        projectId: CONFIG.projectId,
        organizationId: CONFIG.organizationId,
      }),
    });

    if (result.success && result.data) {
      console.log('✅ Workflow created:', result.data.workflow.id);
      workflowIds.push(result.data.workflow.id);
    } else {
      console.error('❌ Failed to create workflow:', workflowConfig.name, result.error);
    }
  }

  return workflowIds;
}

async function activateWorkflows(workflowIds: string[]): Promise<void> {
  for (const workflowId of workflowIds) {
    console.log('🔄 Activating workflow:', workflowId);

    const result = await apiCall(\`/api/workflows/\${workflowId}/activate\`, {
      method: 'POST',
    });

    if (result.success) {
      console.log('✅ Workflow activated');
    } else {
      console.warn('⚠️ Failed to activate workflow:', result.error);
    }
  }
}`;

    const mainCode = `// ============================================================================
// Main Setup Script
// ============================================================================

async function setup() {
  console.log('\\n🚀 Setting up ${name}...\\n');
  console.log('Template: ${templateId || 'blank'}');
  console.log('Project: ${projectId}');
  console.log('Organization: ${organizationId}\\n');

  // Validate configuration
  if (!CONFIG.apiKey) {
    console.error('❌ Error: NETPAD_API_KEY environment variable is required');
    console.log('\\nSet it in your environment or .env file:');
    console.log('  export NETPAD_API_KEY="np_live_xxxxx"\\n');
    process.exit(1);
  }

  // Step 1: Create application
  const applicationId = await createApplication();
  if (!applicationId) {
    process.exit(1);
  }

  // Step 2: Create forms
  const formIds = await createForms(applicationId);
  console.log(\`\\n📊 Created \${formIds.length} form(s)\\n\`);

  // Step 3: Create workflows
  const workflowIds = await createWorkflows(applicationId, formIds);
  console.log(\`\\n⚡ Created \${workflowIds.length} workflow(s)\\n\`);

  // Step 4: Activate workflows
  if (workflowIds.length > 0) {
    await activateWorkflows(workflowIds);
  }

  // Summary
  console.log('\\n' + '='.repeat(50));
  console.log('✅ Setup Complete!');
  console.log('='.repeat(50));
  console.log(\`
Application: ${name}
Application ID: \${applicationId}
Forms: \${formIds.length}
Workflows: \${workflowIds.length}

Next steps:
1. Visit your NetPad dashboard to customize forms and workflows
2. Test form submissions
3. Configure email templates and integrations
\`);
}

// Run setup
setup().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});`;

    const code = generateSelfContainedCode({
      title: `${name} Setup`,
      description: description || `Complete setup script for ${name}`,
      includeFormTypes: true,
      includeWorkflowTypes: true,
      configCode,
      functionsCode,
      mainCode,
    });

    const output = createToolOutput({
      code,
      filename: `setup-${slug}.ts`,
      envVars: STANDARD_ENV_VARS,
    });

    return {
      content: [{
        type: 'text',
        text: formatToolOutput(output),
      }],
    };
  }
);

// Tool: Generate application contract
server.tool(
  'generate_application_contract',
  'Generate an application contract that defines the public API surface, inputs, outputs, and behavioral guarantees.',
  {
    applicationId: z.string().describe('Application ID'),
    version: z.string().describe('Semantic version (e.g., "1.0.0")'),
    inputs: z.array(z.object({
      key: z.string().describe('Input field key'),
      type: z.enum(['string', 'number', 'boolean', 'object', 'array']).describe('Data type'),
      required: z.boolean().describe('Whether the input is required'),
      description: z.string().optional().describe('Description of the input'),
      source: z.enum(['form', 'api', 'webhook', 'config']).optional().describe('Source of the input'),
    })).optional().describe('Input contract fields'),
    outputs: z.array(z.object({
      key: z.string().describe('Output field key'),
      type: z.enum(['string', 'number', 'boolean', 'object', 'array']).describe('Data type'),
      guaranteed: z.boolean().describe('Whether the output is always present'),
      description: z.string().optional().describe('Description of the output'),
    })).optional().describe('Output contract fields'),
    sideEffects: z.array(z.object({
      type: z.enum(['write', 'api_call', 'notification', 'workflow_trigger']).describe('Type of side effect'),
      target: z.string().describe('Target (e.g., collection name, API endpoint)'),
      description: z.string().optional().describe('Description'),
    })).optional().describe('Side effects'),
    events: z.array(z.object({
      name: z.string().describe('Event name'),
      description: z.string().optional().describe('Event description'),
    })).optional().describe('Events the application emits'),
  },
  async ({ applicationId, version, inputs, outputs, sideEffects, events }) => {
    const contract = generateApplicationContract({
      applicationId,
      version,
      inputs: inputs as ContractInput[],
      outputs: outputs as ContractOutput[],
      sideEffects: sideEffects as ContractSideEffect[],
      events: events as ContractEvent[],
    });

    return {
      content: [{
        type: 'text',
        text: `## Application Contract\n\n\`\`\`json\n${JSON.stringify(contract, null, 2)}\n\`\`\`\n\n### Contract API Code\n\n\`\`\`typescript
// Create contract via API
const response = await fetch(\`/api/applications/\${applicationId}/contracts\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(${JSON.stringify(contract, null, 2)}),
});
\`\`\``,
      }],
    };
  }
);

// Tool: Generate contract from forms (infer from existing forms)
server.tool(
  'infer_contract_from_forms',
  'Infer an application contract from existing form configurations. Useful for generating contracts for applications with existing forms.',
  {
    applicationId: z.string().describe('Application ID'),
    version: z.string().describe('Contract version'),
    forms: z.array(z.object({
      name: z.string().describe('Form name'),
      slug: z.string().describe('Form slug'),
      fields: z.array(z.object({
        path: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
      })).describe('Form fields'),
    })).describe('Forms to infer contract from'),
  },
  async ({ applicationId, version, forms }) => {
    const contract = generateContractFromForms(applicationId, version, forms);

    return {
      content: [{
        type: 'text',
        text: `## Inferred Contract\n\n\`\`\`json\n${JSON.stringify(contract, null, 2)}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate application release
server.tool(
  'generate_application_release',
  'Generate an application release manifest for versioned deployment. Releases snapshot the current state of forms and workflows.',
  {
    applicationId: z.string().describe('Application ID'),
    version: z.string().describe('Release version (e.g., "1.0.0")'),
    changelog: z.string().optional().describe('Release notes/changelog'),
    forms: z.array(z.object({
      formId: z.string(),
      role: z.enum(['primary', 'secondary']),
    })).optional().describe('Forms to include in release'),
    workflows: z.array(z.object({
      workflowId: z.string(),
      role: z.enum(['core', 'extension']),
    })).optional().describe('Workflows to include in release'),
    contractId: z.string().optional().describe('Contract ID for this release'),
  },
  async (options) => {
    const release = generateApplicationRelease(options);
    const code = generateReleaseCreationCode(options);

    return {
      content: [{
        type: 'text',
        text: `## Release Manifest\n\n\`\`\`json\n${JSON.stringify(release, null, 2)}\n\`\`\`\n\n## Release Creation Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate export bundle structure
server.tool(
  'generate_export_bundle',
  'Generate an application export bundle structure for sharing or marketplace publishing.',
  {
    applicationName: z.string().describe('Name of the application'),
  },
  async ({ applicationName }) => {
    const bundle = generateExportBundleStructure(applicationName);

    return {
      content: [{
        type: 'text',
        text: `## Export Bundle Structure\n\n\`\`\`json\n${JSON.stringify(bundle, null, 2)}\n\`\`\`\n\n### Usage\n\nFill in the bundle structure with your application components, then use the export API:\n\n\`\`\`typescript
// Export application
const response = await fetch(\`/api/applications/\${applicationId}/export\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
});
const bundle = await response.json();
\`\`\``,
      }],
    };
  }
);

// Resource: Application Templates Reference
server.resource(
  'netpad-app-templates',
  'netpad://reference/application-templates',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/application-templates',
        mimeType: 'application/json',
        text: JSON.stringify(APPLICATION_TEMPLATES, null, 2),
      },
    ],
  })
);

// ============================================================================
// MARKETPLACE & NPM TOOLS (Phase 2 - Version 2.0.0)
// ============================================================================

// Tool: List marketplace categories
server.tool(
  'list_marketplace_categories',
  'List all available marketplace categories for applications.',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          categories: MARKETPLACE_CATEGORIES,
          total: MARKETPLACE_CATEGORIES.length,
        }, null, 2),
      }],
    };
  }
);

// Tool: Search marketplace
server.tool(
  'search_marketplace',
  'Search the NetPad marketplace for applications. Returns matching applications with download counts, ratings, and metadata.',
  {
    query: z.string().optional().describe('Search query'),
    category: z.string().optional().describe('Filter by category (e.g., "lead-generation", "surveys", "events")'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    official: z.boolean().optional().describe('Filter to only official NetPad applications'),
    verified: z.boolean().optional().describe('Filter to only verified applications'),
    sortBy: z.enum(['relevance', 'downloads', 'rating', 'newest']).optional().describe('Sort order'),
    page: z.number().optional().describe('Page number'),
    pageSize: z.number().optional().describe('Results per page'),
  },
  async (options) => {
    const results = searchMarketplace(options as MarketplaceSearchOptions);
    const code = generateSearchMarketplaceCode(options as MarketplaceSearchOptions);

    return {
      content: [{
        type: 'text',
        text: `## Marketplace Search Results\n\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n\n## API Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Get marketplace app details
server.tool(
  'get_marketplace_app',
  'Get detailed information about a specific application in the marketplace.',
  {
    applicationId: z.string().describe('Application ID or package name'),
  },
  async ({ applicationId }) => {
    const app = SAMPLE_MARKETPLACE_APPS.find(
      a => a.id === applicationId || a.packageName === applicationId
    );

    if (!app) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Application "${applicationId}" not found in marketplace` }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(app, null, 2),
      }],
    };
  }
);

// Tool: Publish to marketplace
server.tool(
  'publish_to_marketplace',
  'Generate code and configuration for publishing an application to the NetPad marketplace.',
  {
    applicationId: z.string().describe('Application ID to publish'),
    version: z.string().describe('Version to publish (e.g., "1.0.0")'),
    changelog: z.string().optional().describe('Release notes'),
    visibility: z.enum(['public', 'private', 'organization']).describe('Visibility level'),
    category: z.string().describe('Marketplace category'),
    tags: z.array(z.string()).optional().describe('Tags for discoverability'),
    screenshots: z.array(z.string()).optional().describe('Screenshot URLs'),
    readme: z.string().optional().describe('README content'),
    license: z.string().optional().describe('License (default: MIT)'),
  },
  async (options) => {
    const code = generatePublishToMarketplaceCode(options as PublishOptions);
    const config = generatePublishConfig(options as PublishOptions);

    return {
      content: [{
        type: 'text',
        text: `## Publish to Marketplace\n\n### Configuration\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\`\n\n### API Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Install from marketplace
server.tool(
  'install_from_marketplace',
  'Generate code for installing an application from the NetPad marketplace into a project.',
  {
    applicationId: z.string().optional().describe('Application ID to install'),
    packageName: z.string().optional().describe('npm package name (alternative to applicationId)'),
    version: z.string().optional().describe('Version to install (default: latest)'),
    projectId: z.string().describe('Target project ID'),
    organizationId: z.string().describe('Organization ID'),
    configuration: z.record(z.string(), z.any()).optional().describe('Initial configuration for the application'),
  },
  async (options) => {
    const code = generateInstallFromMarketplaceCode(options as InstallOptions);

    return {
      content: [{
        type: 'text',
        text: `## Install from Marketplace\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Sync to npm
server.tool(
  'sync_to_npm',
  'Generate code and package.json for publishing a NetPad application to npm registry.',
  {
    applicationId: z.string().describe('Application ID to sync'),
    packageName: z.string().optional().describe('npm package name (auto-generated if not provided)'),
    scope: z.string().optional().describe('npm scope (e.g., "@myorg")'),
    author: z.union([
      z.string(),
      z.object({
        name: z.string(),
        email: z.string().optional(),
        url: z.string().optional(),
      })
    ]).optional().describe('Package author'),
    license: z.string().optional().describe('License (default: MIT)'),
    repository: z.object({
      type: z.string(),
      url: z.string(),
    }).optional().describe('Repository URL'),
    homepage: z.string().optional().describe('Homepage URL'),
    keywords: z.array(z.string()).optional().describe('Additional npm keywords'),
  },
  async (options) => {
    const packageJson = generateNpmPackageJson(options as NpmSyncOptions);
    const code = generateSyncToNpmCode(options as NpmSyncOptions);

    return {
      content: [{
        type: 'text',
        text: `## Sync to npm\n\n### Generated package.json\n\n\`\`\`json\n${JSON.stringify(packageJson, null, 2)}\n\`\`\`\n\n### Sync Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Import from npm
server.tool(
  'import_from_npm',
  'Generate code for importing a NetPad application from the npm registry.',
  {
    packageName: z.string().describe('npm package name to import'),
    version: z.string().optional().describe('Version to import (default: latest)'),
    projectId: z.string().describe('Target project ID'),
    organizationId: z.string().describe('Organization ID'),
    applicationName: z.string().optional().describe('Custom name for the imported application'),
  },
  async (options) => {
    const validation = validateNpmPackageName(options.packageName);
    const code = generateImportFromNpmCode(options as NpmImportOptions);

    let output = `## Import from npm\n\n`;

    if (!validation.valid) {
      output += `### Validation Errors\n\n\`\`\`json\n${JSON.stringify(validation, null, 2)}\n\`\`\`\n\n`;
    } else if (validation.warnings.length > 0) {
      output += `### Validation Warnings\n\n${validation.warnings.map(w => `- ${w}`).join('\n')}\n\n`;
    }

    output += `### Import Code\n\n\`\`\`typescript\n${code}\n\`\`\``;

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  }
);

// Tool: Validate npm package name
server.tool(
  'validate_npm_package_name',
  'Validate an npm package name for NetPad conventions and npm registry rules.',
  {
    packageName: z.string().describe('Package name to validate'),
  },
  async ({ packageName }) => {
    const validation = validateNpmPackageName(packageName);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(validation, null, 2),
      }],
    };
  }
);

// Resource: Marketplace Categories Reference
server.resource(
  'netpad-marketplace-categories',
  'netpad://reference/marketplace-categories',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/marketplace-categories',
        mimeType: 'application/json',
        text: JSON.stringify(MARKETPLACE_CATEGORIES, null, 2),
      },
    ],
  })
);

// Resource: Sample Marketplace Apps
server.resource(
  'netpad-marketplace-apps',
  'netpad://reference/marketplace-apps',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/marketplace-apps',
        mimeType: 'application/json',
        text: JSON.stringify(SAMPLE_MARKETPLACE_APPS, null, 2),
      },
    ],
  })
);

// ============================================================================
// WORKFLOW AUTOMATION TOOLS (Phase 3 - Version 2.0.0)
// ============================================================================

// Tool: List workflow templates [DEPRECATED]
server.tool(
  'list_workflow_templates',
  '[DEPRECATED - use browse_templates with templateType="workflow"] List all available workflow templates for creating automated workflows.',
  {
    category: z.string().optional().describe('Filter by category (e.g., "notifications", "data", "sales")'),
  },
  async ({ category }) => {
    let templates = Object.values(WORKFLOW_TEMPLATES);
    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    const summary = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      nodesCount: t.nodes.length,
      edgesCount: t.edges.length,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          templates: summary,
          total: summary.length,
          categories: [...new Set(Object.values(WORKFLOW_TEMPLATES).map(t => t.category))],
        }, null, 2),
      }],
    };
  }
);

// Tool: Get workflow template details [DEPRECATED]
server.tool(
  'get_workflow_template',
  '[DEPRECATED - use browse_templates with templateType="workflow" and action="get"] Get detailed information about a specific workflow template including its nodes, edges, and configuration.',
  {
    templateId: z.enum(['form-to-email', 'form-to-database', 'lead-qualification', 'webhook-to-database', 'scheduled-report']).describe('The template ID'),
  },
  async ({ templateId }) => {
    const template = WORKFLOW_TEMPLATES[templateId];
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Template "${templateId}" not found` }, null, 2),
        }],
      };
    }

    // Wrap nodes and edges in canvas object for NetPad UI compatibility
    const workflowForUI = {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      canvas: {
        nodes: template.nodes,
        edges: template.edges,
      },
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(workflowForUI, null, 2),
      }],
    };
  }
);

// Tool: List workflow node types
server.tool(
  'list_workflow_node_types',
  'List all available workflow node types organized by category.',
  {
    category: z.enum(['triggers', 'logic', 'data', 'actions', 'ai']).optional().describe('Filter by node category'),
  },
  async ({ category }) => {
    if (category) {
      const nodes = getNodesByCategory(category);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            category,
            nodes,
            total: nodes.length,
          }, null, 2),
        }],
      };
    }

    const categories = getNodeCategories();
    const summary: Record<string, any> = {};
    for (const cat of categories) {
      summary[cat] = getNodesByCategory(cat).map((n: any) => ({
        type: n.type,
        name: n.name,
        description: n.description,
        stage: n.stage,
      }));
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          categories: summary,
          allCategories: categories,
        }, null, 2),
      }],
    };
  }
);

// Tool: Create workflow from template
server.tool(
  'create_workflow_from_template',
  'Generate a complete, self-contained TypeScript file to create a workflow. Returns validated code with inline types - run with `npx tsx`.',
  {
    name: z.string().describe('Name of the workflow'),
    description: z.string().optional().describe('Description of the workflow'),
    templateId: z.enum(['form-to-email', 'form-to-database', 'lead-qualification', 'webhook-to-database', 'scheduled-report']).optional().describe('Template to use'),
    formId: z.string().optional().describe('Form ID for form-triggered workflows'),
    formSlug: z.string().optional().describe('Form slug for form-triggered workflows'),
    applicationId: z.string().optional().describe('Application ID to attach workflow to'),
    projectId: z.string().describe('Project ID'),
    organizationId: z.string().describe('Organization ID'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
    salesEmail: z.string().optional().describe('Email address for sales notifications'),
  },
  async (options) => {
    const { name, description, templateId, formId, formSlug, applicationId, tags, salesEmail } = options;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Get template if specified
    const template = templateId ? WORKFLOW_TEMPLATES[templateId] : null;

    // Build workflow config
    const workflowNodes = template?.nodes || [
      {
        id: 'trigger_1',
        type: 'manual-trigger',
        label: 'Manual Trigger',
        position: { x: 100, y: 200 },
        config: {},
        enabled: true,
      },
    ];

    const workflowEdges = template?.edges || [];

    // Update form trigger with provided formId/slug if available
    const updatedNodes = workflowNodes.map(node => {
      if (node.type === 'form-trigger') {
        return {
          ...node,
          config: {
            ...node.config,
            formId: formId || node.config.formId || '',
            formSlug: formSlug || node.config.formSlug || '',
          },
        };
      }
      if (node.type === 'email-send' && salesEmail) {
        return {
          ...node,
          config: {
            ...node.config,
            to: salesEmail,
          },
        };
      }
      return node;
    });

    const configCode = `// Workflow Configuration
const WORKFLOW_CONFIG: WorkflowConfig = {
  name: ${JSON.stringify(name)},
  description: ${JSON.stringify(description || template?.description || 'Custom workflow')},
  tags: ${JSON.stringify(tags || template?.tags || [])},
  canvas: {
    nodes: ${JSON.stringify(updatedNodes, null, 2)},
    edges: ${JSON.stringify(workflowEdges, null, 2)},
  },
  settings: {
    executionMode: 'auto',
    maxExecutionTime: 300000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
    },
  },
};`;

    const functionsCode = `/**
 * Create the workflow via NetPad API.
 */
export async function createWorkflow(): Promise<CreateWorkflowResult> {
  try {
    const response = await fetch(\`\${CONFIG.baseUrl}/api/workflows\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${CONFIG.apiKey}\`,
      },
      body: JSON.stringify({
        ...WORKFLOW_CONFIG,
        ${applicationId ? `applicationId: '${applicationId}',` : ''}
        projectId: CONFIG.projectId,
        organizationId: CONFIG.organizationId,
      }),
    });

    if (!response.ok) {
      return { success: false, error: await response.text() };
    }

    const result = await response.json() as { workflow: { id: string } };
    return { success: true, workflowId: result.workflow.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Activate the workflow to start processing.
 */
export async function activateWorkflow(workflowId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      \`\${CONFIG.baseUrl}/api/workflows/\${workflowId}/activate\`,
      {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${CONFIG.apiKey}\`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: await response.text() };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the workflow with sample data.
 */
export async function testWorkflow(workflowId: string, testData: Record<string, unknown>): Promise<{ success: boolean; executionId?: string; error?: string }> {
  try {
    const response = await fetch(
      \`\${CONFIG.baseUrl}/api/workflows/\${workflowId}/execute\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${CONFIG.apiKey}\`,
        },
        body: JSON.stringify({ payload: testData }),
      }
    );

    if (!response.ok) {
      return { success: false, error: await response.text() };
    }

    const result = await response.json() as { executionId: string };
    return { success: true, executionId: result.executionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}`;

    const mainCode = `// ============================================================================
// Main Setup
// ============================================================================

async function setup() {
  console.log('⚡ Creating workflow:', WORKFLOW_CONFIG.name);
  console.log('Template: ${templateId || 'custom'}');
  ${formId ? `console.log('Form ID: ${formId}');` : ''}
  ${formSlug ? `console.log('Form Slug: ${formSlug}');` : ''}
  console.log('');

  // Validate configuration
  if (!CONFIG.apiKey) {
    console.error('❌ Error: NETPAD_API_KEY environment variable is required');
    process.exit(1);
  }

  // Create the workflow
  const createResult = await createWorkflow();
  if (!createResult.success) {
    console.error('❌ Failed to create workflow:', createResult.error);
    process.exit(1);
  }

  console.log('✅ Workflow created:', createResult.workflowId);

  // Activate the workflow
  console.log('\\n🔄 Activating workflow...');
  const activateResult = await activateWorkflow(createResult.workflowId!);
  if (activateResult.success) {
    console.log('✅ Workflow activated');
  } else {
    console.warn('⚠️ Failed to activate:', activateResult.error);
  }

  // Summary
  console.log('\\n' + '='.repeat(50));
  console.log('✅ Workflow Setup Complete!');
  console.log('='.repeat(50));
  console.log(\`
Workflow: ${name}
Workflow ID: \${createResult.workflowId}
Nodes: ${updatedNodes.length}
Edges: ${workflowEdges.length}
${templateId ? `Template: ${templateId}` : ''}

Next steps:
1. Configure node settings in the NetPad dashboard
2. Test with sample data
3. Monitor executions
\`);
}

// Uncomment to run:
// setup().catch(console.error);

// Export for use as module
export { WORKFLOW_CONFIG, createWorkflow, activateWorkflow, testWorkflow };`;

    const code = generateSelfContainedCode({
      title: name,
      description: description || `Workflow created from ${templateId || 'scratch'}`,
      includeFormTypes: false,
      includeWorkflowTypes: true,
      configCode,
      functionsCode,
      mainCode,
    });

    const output = createToolOutput({
      code,
      filename: `${slug}-workflow.ts`,
      envVars: STANDARD_ENV_VARS,
    });

    return {
      content: [{
        type: 'text',
        text: formatToolOutput(output),
      }],
    };
  }
);

// Tool: Add workflow node
server.tool(
  'add_workflow_node',
  'Generate code for adding a node to a workflow.',
  {
    workflowId: z.string().describe('Workflow ID'),
    nodeType: z.string().describe('Node type (e.g., "form-trigger", "email-send", "mongodb-query")'),
    label: z.string().optional().describe('Custom label for the node'),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).describe('Position on canvas'),
    config: z.record(z.string(), z.any()).describe('Node-specific configuration'),
  },
  async ({ workflowId, nodeType, label, position, config }) => {
    const nodeId = `node_${Date.now().toString(36)}`;
    const node: WorkflowNodeConfig = {
      id: nodeId,
      type: nodeType,
      label,
      position,
      config,
      enabled: true,
    };
    const code = generateAddNodeCode(workflowId, node);

    return {
      content: [{
        type: 'text',
        text: `## Add Node Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Connect workflow nodes
server.tool(
  'connect_workflow_nodes',
  'Generate code for connecting two nodes in a workflow.',
  {
    workflowId: z.string().describe('Workflow ID'),
    sourceNodeId: z.string().describe('Source node ID'),
    sourceHandle: z.string().describe('Source output handle (e.g., "form_data", "true", "output")'),
    targetNodeId: z.string().describe('Target node ID'),
    targetHandle: z.string().describe('Target input handle (e.g., "input", "data", "filter")'),
    condition: z.object({
      expression: z.string(),
      label: z.string().optional(),
    }).optional().describe('Optional condition for the edge'),
  },
  async ({ workflowId, sourceNodeId, sourceHandle, targetNodeId, targetHandle, condition }) => {
    const edgeId = `edge_${Date.now().toString(36)}`;
    const edge: WorkflowEdgeConfig = {
      id: edgeId,
      source: sourceNodeId,
      sourceHandle,
      target: targetNodeId,
      targetHandle,
      condition,
    };
    const code = generateConnectNodesCode(workflowId, edge);

    return {
      content: [{
        type: 'text',
        text: `## Connect Nodes Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Configure workflow trigger
server.tool(
  'configure_workflow_trigger',
  'Generate code for configuring a workflow trigger node.',
  {
    workflowId: z.string().describe('Workflow ID'),
    triggerNodeId: z.string().describe('Trigger node ID'),
    triggerType: z.enum(['form_submission', 'webhook', 'schedule', 'manual']).describe('Type of trigger'),
    formId: z.string().optional().describe('Form ID (for form_submission trigger)'),
    formSlug: z.string().optional().describe('Form slug (for form_submission trigger)'),
    schedule: z.string().optional().describe('Cron expression (for schedule trigger)'),
    timezone: z.string().optional().describe('Timezone (for schedule trigger)'),
    webhookMethod: z.string().optional().describe('HTTP method (for webhook trigger)'),
    webhookAuthentication: z.string().optional().describe('Authentication type (for webhook trigger)'),
  },
  async ({ workflowId, triggerNodeId, triggerType, ...rest }) => {
    const config: TriggerConfig = {
      type: triggerType,
      ...rest,
    };
    const code = generateConfigureTriggerCode(workflowId, triggerNodeId, config);

    return {
      content: [{
        type: 'text',
        text: `## Configure Trigger Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Test workflow
server.tool(
  'test_workflow',
  'Generate code for testing a workflow execution with sample data.',
  {
    workflowId: z.string().describe('Workflow ID'),
    organizationId: z.string().describe('Organization ID'),
    testData: z.record(z.string(), z.any()).optional().describe('Test data to pass to the trigger'),
    dryRun: z.boolean().optional().describe('Run without side effects (default: true)'),
  },
  async (options) => {
    const code = generateTestWorkflowCode(options as TestWorkflowOptions);

    return {
      content: [{
        type: 'text',
        text: `## Test Workflow Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Get workflow execution history
server.tool(
  'get_workflow_execution_history',
  'Generate code for retrieving workflow execution history.',
  {
    workflowId: z.string().describe('Workflow ID'),
    organizationId: z.string().describe('Organization ID'),
    page: z.number().optional().describe('Page number'),
    pageSize: z.number().optional().describe('Results per page'),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional().describe('Filter by status'),
  },
  async ({ workflowId, organizationId, page, pageSize, status }) => {
    const code = generateGetExecutionHistoryCode(workflowId, organizationId, { page, pageSize, status });

    return {
      content: [{
        type: 'text',
        text: `## Execution History Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Resource: Workflow Templates Reference
server.resource(
  'netpad-workflow-templates',
  'netpad://reference/workflow-templates',
  async () => {
    // Transform templates to wrap nodes/edges in canvas object for NetPad UI compatibility
    const templatesForUI = Object.fromEntries(
      Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => [
        key,
        {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          tags: template.tags,
          canvas: {
            nodes: template.nodes,
            edges: template.edges,
          },
        },
      ])
    );
    return {
      contents: [
        {
          uri: 'netpad://reference/workflow-templates',
          mimeType: 'application/json',
          text: JSON.stringify(templatesForUI, null, 2),
        },
      ],
    };
  }
);

// Resource: Workflow Node Types Reference
server.resource(
  'netpad-workflow-nodes',
  'netpad://reference/workflow-nodes',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/workflow-nodes',
        mimeType: 'application/json',
        text: JSON.stringify(WORKFLOW_NODE_TYPES, null, 2),
      },
    ],
  })
);

// ============================================================================
// CONVERSATIONAL & SEARCH FORMS TOOLS (Phase 4 - Version 2.0.0)
// ============================================================================

// Tool: List conversational form templates [DEPRECATED]
server.tool(
  'list_conversational_templates',
  '[DEPRECATED - use browse_templates with templateType="conversational"] List all available conversational form templates for AI-powered data collection.',
  {
    category: z.string().optional().describe('Filter by category (e.g., "support", "feedback", "intake")'),
  },
  async ({ category }) => {
    let templates = Object.values(CONVERSATIONAL_TEMPLATES);
    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    const summary = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      topicsCount: t.defaultConfig.topics.length,
      extractionFieldsCount: t.defaultConfig.extractionSchema.length,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          templates: summary,
          total: summary.length,
          categories: [...new Set(Object.values(CONVERSATIONAL_TEMPLATES).map(t => t.category))],
        }, null, 2),
      }],
    };
  }
);

// Tool: Get conversational template details [DEPRECATED]
server.tool(
  'get_conversational_template',
  '[DEPRECATED - use browse_templates with templateType="conversational" and action="get"] Get detailed information about a specific conversational form template including topics, extraction schema, and persona configuration.',
  {
    templateId: z.enum(['it-helpdesk', 'customer-feedback', 'lead-qualification', 'patient-intake']).describe('The template ID'),
  },
  async ({ templateId }) => {
    const template = CONVERSATIONAL_TEMPLATES[templateId];
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Template "${templateId}" not found` }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(template, null, 2),
      }],
    };
  }
);

// Tool: Create conversational form
server.tool(
  'create_conversational_form',
  'Generate code to create an AI-powered conversational form that collects data through natural dialogue.',
  {
    name: z.string().describe('Name of the conversational form'),
    description: z.string().optional().describe('Description of the form'),
    objective: z.string().describe('The goal/objective of the conversation'),
    context: z.string().optional().describe('Additional context for the AI'),
    templateId: z.enum(['it-helpdesk', 'customer-feedback', 'lead-qualification', 'patient-intake']).optional().describe('Template to use'),
    persona: z.object({
      style: z.enum(['professional', 'friendly', 'casual', 'empathetic', 'custom']).describe('Conversation style'),
      tone: z.string().optional().describe('Specific tone description'),
      behaviors: z.array(z.string()).optional().describe('Behaviors the AI should exhibit'),
      restrictions: z.array(z.string()).optional().describe('Things the AI should avoid'),
    }).describe('AI persona configuration'),
    topics: z.array(z.object({
      id: z.string().describe('Topic ID'),
      name: z.string().describe('Topic name'),
      description: z.string().describe('What information to gather'),
      priority: z.enum(['required', 'important', 'optional']).describe('Topic priority'),
      depth: z.enum(['surface', 'moderate', 'deep']).describe('How deep to explore'),
      extractionField: z.string().optional().describe('Field to extract data to'),
    })).describe('Topics to cover in conversation'),
    extractionSchema: z.array(z.object({
      field: z.string().describe('Field name'),
      type: z.enum(['string', 'number', 'boolean', 'enum', 'array', 'object', 'file']).describe('Field type'),
      required: z.boolean().describe('Whether required'),
      description: z.string().describe('Field description'),
      options: z.array(z.string()).optional().describe('Options for enum type'),
      topicId: z.string().optional().describe('Associated topic'),
    })).describe('Schema for extracted data'),
    conversationLimits: z.object({
      maxTurns: z.number().optional().describe('Maximum conversation turns'),
      maxDuration: z.number().optional().describe('Maximum duration in minutes'),
      minConfidence: z.number().optional().describe('Minimum confidence threshold'),
    }).optional().describe('Conversation limits'),
    projectId: z.string().describe('Project ID'),
    organizationId: z.string().describe('Organization ID'),
    applicationId: z.string().optional().describe('Application ID'),
  },
  async (options) => {
    const code = generateCreateConversationalFormCode(options as ConversationalFormOptions);
    const config = generateConversationalFormConfig(options as ConversationalFormOptions);

    return {
      content: [{
        type: 'text',
        text: `## Conversational Form Creation Code\n\n\`\`\`typescript\n${code}\n\`\`\`\n\n## Configuration\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
      }],
    };
  }
);

// Tool: Configure RAG settings
server.tool(
  'configure_rag_settings',
  'Generate code to configure Retrieval-Augmented Generation (RAG) for a conversational form. RAG enables the AI to reference uploaded documents during conversations.',
  {
    formId: z.string().describe('Form ID to configure RAG for'),
    enabled: z.boolean().describe('Enable or disable RAG'),
    documentIds: z.array(z.string()).optional().describe('Document IDs to use for retrieval'),
    retrievalConfig: z.object({
      maxChunks: z.number().optional().describe('Maximum chunks to retrieve'),
      minScore: z.number().optional().describe('Minimum relevance score (0-1)'),
      retrievalThreshold: z.number().optional().describe('Threshold for including results'),
    }).optional().describe('Retrieval configuration'),
  },
  async (options) => {
    const code = generateConfigureRAGCode(options as RAGConfigOptions);

    return {
      content: [{
        type: 'text',
        text: `## Configure RAG Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Add RAG document
server.tool(
  'add_rag_document',
  'Generate code for uploading a document to use with RAG in conversational forms.',
  {
    formId: z.string().describe('Form ID'),
    sourceType: z.enum(['pdf', 'txt', 'md', 'html', 'docx', 'json']).describe('Document type'),
    title: z.string().optional().describe('Document title'),
    description: z.string().optional().describe('Document description'),
  },
  async ({ formId, sourceType, title, description }) => {
    const code = generateAddRAGDocumentCode(formId, { sourceType, title, description });

    return {
      content: [{
        type: 'text',
        text: `## Upload RAG Document Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: List search operators
server.tool(
  'list_search_operators',
  'List all available search operators for different field types in search forms.',
  {
    fieldType: z.string().optional().describe('Filter by field type (e.g., "string", "number", "date", "enum", "boolean")'),
  },
  async ({ fieldType }) => {
    if (fieldType) {
      const operators = getOperatorsForFieldType(fieldType);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            fieldType,
            operators,
            total: operators.length,
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          operators: SEARCH_OPERATORS,
          fieldTypes: Object.keys(SEARCH_OPERATORS),
        }, null, 2),
      }],
    };
  }
);

// Tool: Create search form
server.tool(
  'create_search_form',
  'Generate code to create a search form for querying MongoDB collections with configurable operators and result views.',
  {
    name: z.string().describe('Name of the search form'),
    description: z.string().optional().describe('Description of the form'),
    connectionId: z.string().describe('MongoDB connection ID'),
    database: z.string().describe('Database name'),
    collection: z.string().describe('Collection name'),
    fields: z.array(z.object({
      path: z.string().describe('Field path in document'),
      label: z.string().describe('Display label'),
      type: z.string().describe('Field type (short_text, number, date, dropdown, etc.)'),
      operators: z.array(z.string()).describe('Allowed operators'),
      defaultOperator: z.string().describe('Default operator'),
      showInResults: z.boolean().describe('Show in results'),
      resultOrder: z.number().optional().describe('Order in results'),
      optionsSource: z.object({
        type: z.enum(['static', 'distinct', 'lookup']).describe('Source type'),
        showCounts: z.boolean().optional().describe('Show document counts'),
      }).optional().describe('Options source for dropdown fields'),
    })).describe('Search field configurations'),
    resultsConfig: z.object({
      layout: z.enum(['table', 'cards', 'list']).optional().describe('Results layout'),
      pageSize: z.number().optional().describe('Results per page'),
      allowView: z.boolean().optional().describe('Allow viewing documents'),
      allowEdit: z.boolean().optional().describe('Allow editing documents'),
      allowDelete: z.boolean().optional().describe('Allow deleting documents'),
      allowExport: z.boolean().optional().describe('Allow exporting results'),
      defaultSortField: z.string().optional().describe('Default sort field'),
      defaultSortDirection: z.enum(['asc', 'desc']).optional().describe('Default sort direction'),
    }).optional().describe('Results configuration'),
    projectId: z.string().describe('Project ID'),
    organizationId: z.string().describe('Organization ID'),
    applicationId: z.string().optional().describe('Application ID'),
  },
  async (options) => {
    const code = generateCreateSearchFormCode(options as SearchFormOptions);
    const config = generateSearchFormConfig(options as SearchFormOptions);

    return {
      content: [{
        type: 'text',
        text: `## Search Form Creation Code\n\n\`\`\`typescript\n${code}\n\`\`\`\n\n## Configuration\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
      }],
    };
  }
);

// Tool: Configure search operators for a field
server.tool(
  'configure_search_operators',
  'Generate code to configure search operators for a specific field in a search form.',
  {
    formId: z.string().describe('Form ID'),
    fieldPath: z.string().describe('Field path to configure'),
    operators: z.array(z.string()).describe('Operators to enable'),
    defaultOperator: z.string().describe('Default operator'),
  },
  async ({ formId, fieldPath, operators, defaultOperator }) => {
    const code = generateConfigureSearchOperatorsCode(formId, fieldPath, operators, defaultOperator);

    return {
      content: [{
        type: 'text',
        text: `## Configure Search Operators Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Test conversational form
server.tool(
  'test_conversational_form',
  'Generate code for testing a conversational form by simulating a conversation.',
  {
    formId: z.string().describe('Form ID'),
    organizationId: z.string().describe('Organization ID'),
  },
  async ({ formId, organizationId }) => {
    const code = generateTestConversationalFormCode(formId, organizationId);

    return {
      content: [{
        type: 'text',
        text: `## Test Conversational Form Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Test search form
server.tool(
  'test_search_form',
  'Generate code for testing a search form with a sample query.',
  {
    formId: z.string().describe('Form ID'),
    organizationId: z.string().describe('Organization ID'),
    exampleQuery: z.record(z.string(), z.any()).describe('Example search query'),
  },
  async ({ formId, organizationId, exampleQuery }) => {
    const code = generateTestSearchFormCode(formId, organizationId, exampleQuery);

    return {
      content: [{
        type: 'text',
        text: `## Test Search Form Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Resource: Conversational Templates Reference
server.resource(
  'netpad-conversational-templates',
  'netpad://reference/conversational-templates',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/conversational-templates',
        mimeType: 'application/json',
        text: JSON.stringify(CONVERSATIONAL_TEMPLATES, null, 2),
      },
    ],
  })
);

// Resource: Search Operators Reference
server.resource(
  'netpad-search-operators',
  'netpad://reference/search-operators',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/search-operators',
        mimeType: 'application/json',
        text: JSON.stringify(SEARCH_OPERATORS, null, 2),
      },
    ],
  })
);

// ============================================================================
// ENHANCED TEMPLATES TOOLS (Phase 6 - Version 2.0.0)
// ============================================================================

// Tool: List template categories [DEPRECATED]
server.tool(
  'list_template_categories',
  '[DEPRECATED - use browse_templates with templateType="form" and action="categories"] List all available form template categories with descriptions and template counts.',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          categories: TEMPLATE_CATEGORIES,
          total: TEMPLATE_CATEGORIES.length,
          totalTemplates: Object.keys(FORM_TEMPLATES).length,
        }, null, 2),
      }],
    };
  }
);

// Tool: List form templates [DEPRECATED]
server.tool(
  'list_form_templates',
  '[DEPRECATED - use browse_templates with templateType="form"] List all available form templates (25+) across multiple categories. Returns template summaries with field counts.',
  {
    category: z.string().optional().describe('Filter by category (business, events, feedback, support, ecommerce, healthcare, hr, finance, education, real-estate, or "all")'),
    search: z.string().optional().describe('Search templates by name, description, or tags'),
  },
  async ({ category, search }) => {
    let templates: FormTemplate[];

    if (search) {
      templates = searchTemplates(search);
    } else if (category) {
      templates = getTemplatesByCategory(category);
    } else {
      templates = Object.values(FORM_TEMPLATES);
    }

    const summary = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      icon: t.icon,
      fieldCount: t.fields.length,
      hasMultiPage: !!t.multiPage?.enabled,
      requiresEncryption: t.settings?.requiresEncryption ?? false,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          templates: summary,
          total: summary.length,
          categories: [...new Set(templates.map(t => t.category))],
        }, null, 2),
      }],
    };
  }
);

// Tool: Get form template details [DEPRECATED]
server.tool(
  'get_form_template',
  '[DEPRECATED - use browse_templates with templateType="form" and action="get"] Get detailed information about a specific form template including all fields, validation rules, and configuration.',
  {
    templateId: z.string().describe('Template ID (e.g., "contact-form", "lead-capture", "patient-intake")'),
  },
  async ({ templateId }) => {
    const template = getTemplateById(templateId);
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Template "${templateId}" not found`,
            availableTemplates: Object.keys(FORM_TEMPLATES),
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(template, null, 2),
      }],
    };
  }
);

// Tool: Create form from template
server.tool(
  'create_form_from_template',
  'Generate code to create a form from a template with optional customizations.',
  {
    templateId: z.string().describe('Template ID to use'),
    customizations: z.object({
      name: z.string().optional().describe('Custom form name'),
      description: z.string().optional().describe('Custom description'),
      includeOptionalFields: z.boolean().optional().describe('Include optional fields (default: true)'),
      submitButtonText: z.string().optional().describe('Custom submit button text'),
      successMessage: z.string().optional().describe('Custom success message'),
    }).optional().describe('Customization options'),
    projectId: z.string().optional().describe('Project ID'),
    organizationId: z.string().optional().describe('Organization ID'),
  },
  async ({ templateId, customizations, projectId, organizationId }) => {
    const template = getTemplateById(templateId);
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Template "${templateId}" not found` }, null, 2),
        }],
      };
    }

    const code = generateCreateFormFromTemplateCode(templateId, customizations as TemplateCustomizations, projectId, organizationId);
    const config = generateFormConfigFromTemplate(template, customizations as TemplateCustomizations);

    return {
      content: [{
        type: 'text',
        text: `## Create Form from Template: ${template.name}\n\n### Code\n\n\`\`\`typescript\n${code}\n\`\`\`\n\n### Generated Configuration\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
      }],
    };
  }
);

// Tool: Preview template form configuration
server.tool(
  'preview_template_config',
  'Preview the form configuration that would be generated from a template with customizations.',
  {
    templateId: z.string().describe('Template ID'),
    customizations: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      includeOptionalFields: z.boolean().optional(),
      submitButtonText: z.string().optional(),
      successMessage: z.string().optional(),
    }).optional().describe('Customization options'),
  },
  async ({ templateId, customizations }) => {
    const template = getTemplateById(templateId);
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Template "${templateId}" not found` }, null, 2),
        }],
      };
    }

    const config = generateFormConfigFromTemplate(template, customizations as TemplateCustomizations);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(config, null, 2),
      }],
    };
  }
);

// Resource: Form Templates Reference
server.resource(
  'netpad-form-templates',
  'netpad://reference/form-templates',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/form-templates',
        mimeType: 'application/json',
        text: JSON.stringify(FORM_TEMPLATES, null, 2),
      },
    ],
  })
);

// Resource: Template Categories Reference
server.resource(
  'netpad-template-categories',
  'netpad://reference/template-categories',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/template-categories',
        mimeType: 'application/json',
        text: JSON.stringify(TEMPLATE_CATEGORIES, null, 2),
      },
    ],
  })
);

// ============================================================================
// DATA BROWSER & CONNECTION TOOLS (Phase 7 - Version 2.0.0)
// ============================================================================

// Tool: List connection types
server.tool(
  'list_connection_types',
  'List all supported MongoDB connection types with setup instructions.',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          connectionTypes: Object.values(CONNECTION_TYPES),
          total: Object.keys(CONNECTION_TYPES).length,
        }, null, 2),
      }],
    };
  }
);

// Tool: Generate connection configuration
server.tool(
  'generate_connection_config',
  'Generate MongoDB connection configuration for the connection vault.',
  {
    name: z.string().describe('Descriptive name for the connection'),
    type: z.enum(['atlas', 'self-hosted', 'atlas-data-api']).describe('Connection type'),
    description: z.string().optional().describe('Description of this connection'),
    settings: z.object({
      useSSL: z.boolean().optional().describe('Use SSL/TLS'),
      retryWrites: z.boolean().optional().describe('Enable retry writes'),
      maxPoolSize: z.number().optional().describe('Maximum connection pool size'),
      connectTimeoutMS: z.number().optional().describe('Connection timeout in milliseconds'),
    }).optional().describe('Connection settings'),
  },
  async (config) => {
    const code = generateConnectionConfigCode(config as ConnectionConfig);
    const connectionType = CONNECTION_TYPES[config.type];

    return {
      content: [{
        type: 'text',
        text: `## Connection Configuration: ${config.name}\n\n### Type: ${connectionType.name}\n\n${connectionType.description}\n\n### Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: List query templates [DEPRECATED]
server.tool(
  'list_query_templates',
  '[DEPRECATED - use browse_templates with templateType="query"] List all available MongoDB query templates for common operations.',
  {},
  async () => {
    const templates = listQueryTemplates();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          templates,
          total: templates.length,
        }, null, 2),
      }],
    };
  }
);

// Tool: Get query template [DEPRECATED]
server.tool(
  'get_query_template',
  '[DEPRECATED - use browse_templates with templateType="query" and action="get"] Get a specific query template with example code.',
  {
    templateId: z.string().describe('Template ID (e.g., "find-all", "aggregate-group-count")'),
  },
  async ({ templateId }) => {
    const template = getQueryTemplate(templateId);
    if (!template) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Query template "${templateId}" not found`,
            availableTemplates: listQueryTemplates(),
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(template, null, 2),
      }],
    };
  }
);

// Tool: Generate data browser query
server.tool(
  'generate_data_browser_query',
  'Generate MongoDB queries for browsing and analyzing data.',
  {
    database: z.string().describe('Database name'),
    collection: z.string().describe('Collection name'),
    operation: z.enum(['find', 'aggregate', 'distinct', 'count', 'findOne']).describe('Query operation'),
    description: z.string().describe('What you want to query (natural language)'),
    filter: z.record(z.string(), z.any()).optional().describe('Query filter or aggregation pipeline'),
    projection: z.record(z.string(), z.any()).optional().describe('Fields to include/exclude'),
    sort: z.record(z.string(), z.number()).optional().describe('Sort order'),
    limit: z.number().optional().describe('Maximum documents to return'),
    skip: z.number().optional().describe('Documents to skip'),
  },
  async (options) => {
    const code = generateDataBrowserQueryCode(options as DataBrowserQueryOptions);

    return {
      content: [{
        type: 'text',
        text: `## Data Browser Query\n\n### ${options.description}\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate aggregation pipeline
server.tool(
  'generate_aggregation_pipeline',
  'Generate a MongoDB aggregation pipeline for complex data analysis.',
  {
    database: z.string().describe('Database name'),
    collection: z.string().describe('Collection name'),
    description: z.string().describe('What the aggregation should do'),
    stages: z.array(z.string()).optional().describe('Pipeline stages as JSON strings'),
  },
  async (options) => {
    const code = generateAggregationPipelineCode(options as AggregationPipelineOptions);

    return {
      content: [{
        type: 'text',
        text: `## Aggregation Pipeline\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate index recommendations
server.tool(
  'generate_index_recommendations',
  'Generate index recommendations based on query patterns.',
  {
    collection: z.string().describe('Collection name'),
    queryPatterns: z.array(z.string()).describe('List of query patterns (e.g., "find by email", "sort by createdAt")'),
  },
  async ({ collection, queryPatterns }) => {
    const recommendations = generateIndexRecommendation(collection, queryPatterns);

    return {
      content: [{
        type: 'text',
        text: `## Index Recommendations for ${collection}\n\n\`\`\`json\n${JSON.stringify(recommendations, null, 2)}\n\`\`\`\n\n### Create Indexes\n\n\`\`\`javascript\n${recommendations.map(r =>
          `db.${collection}.createIndex({ ${r.fields.map(f => `"${f}": 1`).join(', ')} })  // ${r.reason}`
        ).join('\n')}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate schema analysis code
server.tool(
  'generate_schema_analysis',
  'Generate code to analyze the schema of a MongoDB collection.',
  {
    database: z.string().describe('Database name'),
    collection: z.string().describe('Collection name'),
  },
  async ({ database, collection }) => {
    const code = generateSchemaAnalysisCode(database, collection);

    return {
      content: [{
        type: 'text',
        text: `## Schema Analysis Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate data export code
server.tool(
  'generate_data_export',
  'Generate code to export data from a MongoDB collection.',
  {
    database: z.string().describe('Database name'),
    collection: z.string().describe('Collection name'),
    format: z.enum(['json', 'csv', 'xlsx']).describe('Export format'),
    filter: z.record(z.string(), z.any()).optional().describe('Filter to apply'),
  },
  async ({ database, collection, format, filter }) => {
    const code = generateDataExportCode(database, collection, format, filter);

    return {
      content: [{
        type: 'text',
        text: `## Data Export Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate connection test code
server.tool(
  'generate_connection_test',
  'Generate code to test a MongoDB connection.',
  {
    connectionId: z.string().describe('Connection ID to test'),
  },
  async ({ connectionId }) => {
    const code = generateConnectionTestCode(connectionId);

    return {
      content: [{
        type: 'text',
        text: `## Connection Test Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate list databases code
server.tool(
  'generate_list_databases',
  'Generate code to list databases for a connection.',
  {
    connectionId: z.string().describe('Connection ID'),
  },
  async ({ connectionId }) => {
    const code = generateListDatabasesCode(connectionId);

    return {
      content: [{
        type: 'text',
        text: `## List Databases Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Tool: Generate list collections code
server.tool(
  'generate_list_collections',
  'Generate code to list collections in a database.',
  {
    connectionId: z.string().describe('Connection ID'),
    database: z.string().describe('Database name'),
  },
  async ({ connectionId, database }) => {
    const code = generateListCollectionsCode(connectionId, database);

    return {
      content: [{
        type: 'text',
        text: `## List Collections Code\n\n\`\`\`typescript\n${code}\n\`\`\``,
      }],
    };
  }
);

// Resource: Connection Types Reference
server.resource(
  'netpad-connection-types',
  'netpad://reference/connection-types',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/connection-types',
        mimeType: 'application/json',
        text: JSON.stringify(CONNECTION_TYPES, null, 2),
      },
    ],
  })
);

// Resource: Query Templates Reference
server.resource(
  'netpad-query-templates',
  'netpad://reference/query-templates',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/query-templates',
        mimeType: 'application/json',
        text: JSON.stringify(QUERY_TEMPLATES, null, 2),
      },
    ],
  })
);

// ============================================================================
// EXTENSION TOOLS - Create custom NetPad extensions
// ============================================================================

// Tool: Generate a complete NetPad extension
server.tool(
  'generate_extension',
  'Generate a complete NetPad extension with custom workflow nodes. Returns all files needed to create an extension package that can be installed in NetPad.',
  {
    name: z.string().describe('Name of the extension (e.g., "My Custom Extension")'),
    description: z.string().optional().describe('Description of what the extension does'),
    author: z.string().optional().describe('Extension author name'),
    version: z.string().optional().default('1.0.0').describe('Semantic version'),
    workflowNodes: z.array(z.object({
      label: z.string().describe('Display name for the node (e.g., "Send SMS")'),
      description: z.string().describe('What the node does'),
      category: z.enum(['triggers', 'logic', 'integrations', 'actions', 'data', 'ai', 'forms', 'custom', 'annotations'])
        .optional()
        .default('custom')
        .describe('Node palette category'),
      icon: z.string().optional().default('Extension').describe('MUI icon name (e.g., "Terminal", "Email", "Code")'),
      color: z.string().optional().default('#FF6B35').describe('Hex color for the node'),
      configFields: z.array(z.object({
        name: z.string().describe('Field key in config object'),
        label: z.string().describe('Display label'),
        type: z.enum(['text', 'textarea', 'number', 'boolean', 'select', 'json', 'expression', 'connection'])
          .describe('Input type'),
        required: z.boolean().optional().describe('Whether field is required'),
        defaultValue: z.unknown().optional().describe('Default value'),
        placeholder: z.string().optional().describe('Placeholder text'),
        helpText: z.string().optional().describe('Help text shown below field'),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
        })).optional().describe('Options for select fields'),
      })).optional().describe('Configuration fields for the node'),
      outputs: z.array(z.object({
        id: z.string().describe('Output handle ID'),
        label: z.string().describe('Display label'),
        primary: z.boolean().optional().describe('Whether this is the primary output'),
      })).optional().describe('Output handles for the node'),
      handlerDescription: z.string().optional().describe('Description of what the handler should do'),
    })).optional().describe('Workflow nodes to include in the extension'),
    includeRoutes: z.boolean().optional().default(false).describe('Include scaffolding for API routes'),
    includeServices: z.boolean().optional().default(false).describe('Include scaffolding for services'),
  },
  async ({ name, description, author, version, workflowNodes, includeRoutes, includeServices }) => {
    const options: GenerateExtensionOptions = {
      metadata: {
        id: generateExtensionId(name),
        name,
        version: version || '1.0.0',
        description,
        author,
      },
      workflowNodes: workflowNodes?.map(node => ({
        definition: {
          label: node.label,
          description: node.description,
          category: (node.category || 'custom') as NodeCategory,
          icon: node.icon || 'Extension',
          color: node.color || '#FF6B35',
          version: '1.0.0',
          configFields: node.configFields?.map(field => ({
            name: field.name,
            label: field.label,
            type: field.type as ConfigFieldType,
            required: field.required,
            defaultValue: field.defaultValue,
            placeholder: field.placeholder,
            helpText: field.helpText,
            options: field.options,
          })),
          outputs: node.outputs,
        },
        handlerDescription: node.handlerDescription,
      })),
      includeRoutes,
      includeServices,
    };

    const pkg = generateExtensionPackage(options);

    // Format the output
    let output = `# Generated Extension: ${name}\n\n`;
    output += `Extension ID: \`${pkg.metadata.id}\`\n\n`;

    output += `## Setup Instructions\n\n`;
    output += `1. Create a new directory for your extension:\n`;
    output += `\`\`\`bash\nmkdir -p packages/${pkg.metadata.id}/src\ncd packages/${pkg.metadata.id}\n\`\`\`\n\n`;
    output += `2. Create the files below\n`;
    output += `3. Install dependencies: \`npm install\`\n`;
    output += `4. Build: \`npm run build\`\n`;
    output += `5. Enable in .env.local: \`NETPAD_EXTENSIONS=@netpad/${pkg.metadata.id}\`\n`;
    output += `6. Restart NetPad\n\n`;

    // Add each file
    for (const file of pkg.files) {
      const lang = file.path.endsWith('.json') ? 'json' : file.path.endsWith('.md') ? 'markdown' : 'typescript';
      output += `## ${file.path}\n\n`;
      output += `\`\`\`${lang}\n${file.content}\n\`\`\`\n\n`;
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  }
);

// Tool: List available node categories
server.tool(
  'list_node_categories',
  'List all available workflow node categories with descriptions. Use this to understand where custom nodes should be placed in the palette.',
  {},
  async () => {
    const categories = Object.entries(NODE_CATEGORIES).map(([key, value]) => ({
      category: key,
      ...value,
    }));

    return {
      content: [{
        type: 'text',
        text: `# Workflow Node Categories\n\n${categories.map(c =>
          `## ${c.label} (\`${c.category}\`)\n${c.description}`
        ).join('\n\n')}`,
      }],
    };
  }
);

// Tool: List available config field types
server.tool(
  'list_config_field_types',
  'List all available configuration field types for workflow node editors.',
  {},
  async () => {
    const types = Object.entries(CONFIG_FIELD_TYPES).map(([key, value]) => ({
      type: key,
      ...value,
    }));

    return {
      content: [{
        type: 'text',
        text: `# Configuration Field Types\n\n${types.map(t =>
          `- **${t.label}** (\`${t.type}\`): ${t.description}`
        ).join('\n')}`,
      }],
    };
  }
);

// Tool: List suggested icons for workflow nodes
server.tool(
  'list_workflow_icons',
  'List commonly used MUI icons for workflow nodes.',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: `# Suggested Icons for Workflow Nodes\n\nThese are commonly used MUI icon names:\n\n${COMMON_ICONS.map(icon => `- ${icon}`).join('\n')}\n\nFor the full list, see: https://mui.com/material-ui/material-icons/`,
      }],
    };
  }
);

// Tool: List suggested colors for workflow nodes
server.tool(
  'list_workflow_colors',
  'List suggested colors for workflow nodes with their hex values.',
  {},
  async () => {
    const colors = Object.entries(SUGGESTED_COLORS).map(([name, hex]) => `- **${name}**: \`${hex}\``);

    return {
      content: [{
        type: 'text',
        text: `# Suggested Colors for Workflow Nodes\n\n${colors.join('\n')}\n\nYou can use any valid hex color.`,
      }],
    };
  }
);

// Resource: Extension reference
server.resource(
  'netpad-extension-reference',
  'netpad://reference/extensions',
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/extensions',
        mimeType: 'application/json',
        text: JSON.stringify({
          categories: NODE_CATEGORIES,
          configFieldTypes: CONFIG_FIELD_TYPES,
          commonIcons: COMMON_ICONS,
          suggestedColors: SUGGESTED_COLORS,
        }, null, 2),
      },
    ],
  })
);

// ============================================================================
// PROMPTS - Pre-built prompts for common tasks
// ============================================================================

server.prompt(
  'create-contact-form',
  'Generate a basic contact form with name, email, and message fields',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a simple contact form with the following fields:
- Full name (required)
- Email address (required)
- Phone number (optional)
- Message (required, multiline)

The form should validate the email format and require a minimum message length of 10 characters.`,
        },
      },
    ],
  })
);

server.prompt(
  'create-registration-form',
  'Generate a user registration form with validation',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a user registration form with:
- First name and last name (required, on same row)
- Email address (required, validated)
- Password (required, minimum 8 characters)
- Confirm password (required)
- Date of birth (optional)
- Country selection (dropdown)
- Terms and conditions checkbox (required)

Include appropriate validation and help text.`,
        },
      },
    ],
  })
);

server.prompt(
  'create-survey-form',
  'Generate a multi-page survey form',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a customer satisfaction survey as a multi-page wizard with:

Page 1 - Basic Info:
- Name (optional)
- Email (optional)
- How did you hear about us? (dropdown)

Page 2 - Experience:
- Overall satisfaction (rating 1-5)
- Would you recommend us? (NPS 0-10)
- What did you like most? (multiple choice)
- What could we improve? (long text)

Page 3 - Follow-up:
- May we contact you? (yes/no)
- If yes, show preferred contact method (conditional field)
- Additional comments (optional)

Include a progress bar and show a summary at the end.`,
        },
      },
    ],
  })
);

server.prompt(
  'create-order-form',
  'Generate an order form with computed totals',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a product order form with:
- Product selection (dropdown)
- Quantity (number, min 1, max 100)
- Unit price (number, pre-filled or from lookup)
- Discount percentage (number, 0-100)
- Subtotal (computed: quantity * unit price)
- Discount amount (computed: subtotal * discount / 100)
- Total (computed: subtotal - discount amount)
- Shipping address fields (nested under "shipping")
- Same as billing checkbox
- Billing address fields (nested under "billing", conditional on checkbox)

The computed fields should be read-only and automatically calculated.`,
        },
      },
    ],
  })
);

server.prompt(
  'explain-conditional-logic',
  'Explain how to use conditional logic in NetPad forms',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Explain how conditional logic works in @netpad/forms with examples. Cover:
1. Basic show/hide based on field values
2. Using multiple conditions with AND/OR logic
3. All available operators
4. Common use cases and patterns`,
        },
      },
    ],
  })
);

server.prompt(
  'create-workflow-extension',
  'Generate a custom NetPad extension with workflow nodes',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a NetPad extension with:

1. Extension name: "My Custom Workflow Nodes"
2. A custom workflow node called "Log Message" that:
   - Logs a configurable message to the console
   - Has a "message" textarea field
   - Has a "log level" select field (info, warn, error)
   - Has a "passthrough" boolean to include input data in output
   - Uses the Terminal icon with an orange color
   - Is in the "custom" category

Include all necessary files (package.json, tsconfig.json, tsup.config.ts, src/index.ts, README.md) and explain how to install and use the extension.`,
        },
      },
    ],
  })
);

server.prompt(
  'create-integration-extension',
  'Generate a NetPad extension for external service integration',
  async () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a NetPad extension for integrating with an external service (like Slack, Twilio, or a webhook).

The extension should include:
1. A workflow node that sends data to the external service
2. Configuration fields for API credentials, endpoint URL, and message template
3. Proper error handling with retryable vs non-retryable errors
4. API routes for configuration management
5. A service layer for the integration logic

Explain how to:
- Configure the extension with API keys
- Use the workflow node in automation
- Handle rate limiting and errors`,
        },
      },
    ],
  })
);

  // Return the configured server
  return server;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export useful types and utilities for consumers
export {
  FIELD_TYPES,
  OPERATORS,
  FORMULA_FUNCTIONS,
  VALIDATION_OPTIONS,
  THEME_OPTIONS,
} from './constants.js';

export {
  generateFormSchema,
  generateFieldConfig,
  generateConditionalLogic,
  generateComputedField,
  generateMultiPageConfig,
  validateFormConfig,
} from './generators.js';

export {
  DOCUMENTATION,
  QUICK_START_GUIDE,
  ARCHITECTURE_GUIDE,
  EXAMPLES,
} from './documentation.js';

export {
  NODE_CATEGORIES,
  CONFIG_FIELD_TYPES,
  COMMON_ICONS,
  SUGGESTED_COLORS,
  generateExtensionPackage,
  generateExtensionId,
} from './extension-tools.js';

export type { GenerateExtensionOptions, NodeCategory, ConfigFieldType } from './extension-tools.js';

// ============================================================================
// START THE SERVER (CLI mode)
// ============================================================================

async function main() {
  const server = createNetPadMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('@netpad/mcp-server started');
}

// Only run main() if this file is executed directly (not imported)
// Check if we're being run as the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('netpad-mcp') ||
  process.argv[1]?.endsWith('index.js');

if (isMainModule) {
  main().catch(console.error);
}
