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
  generateCreateApplicationCode,
  generateApplicationConfig,
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
  generateCreateWorkflowCode,
  generateWorkflowConfig,
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
  type CreateWorkflowOptions,
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

const server = new McpServer({
  name: '@netpad/mcp-server',
  version: '2.0.0',
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

// ============================================================================
// TOOLS - Form building capabilities
// ============================================================================

// Tool: Generate a complete form schema
server.tool(
  'generate_form',
  'Generate a complete NetPad form configuration from a description. Provide a natural language description of the form you want to create, and this tool will generate the full FormConfiguration object.',
  {
    description: z.string().describe('Natural language description of the form to generate'),
    formName: z.string().describe('Name of the form'),
    includeMultiPage: z.boolean().optional().describe('Whether to organize fields into multiple pages'),
    includeTheme: z.boolean().optional().describe('Whether to include theme configuration'),
  },
  async ({ description, formName, includeMultiPage, includeTheme }) => {
    const schema = generateFormSchema(description, formName, {
      multiPage: includeMultiPage,
      theme: includeTheme,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
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

// Tool: List all supported field types
server.tool(
  'list_field_types',
  'List all supported field types in @netpad/forms with their descriptions and usage.',
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
          text: JSON.stringify(types, null, 2),
        },
      ],
    };
  }
);

// Tool: List conditional logic operators
server.tool(
  'list_operators',
  'List all available conditional logic operators with descriptions.',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(OPERATORS, null, 2),
        },
      ],
    };
  }
);

// Tool: List formula functions
server.tool(
  'list_formula_functions',
  'List all available formula functions for computed fields.',
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
          text: JSON.stringify(functions, null, 2),
        },
      ],
    };
  }
);

// Tool: List validation options
server.tool(
  'list_validation_options',
  'List all available validation options for form fields.',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(VALIDATION_OPTIONS, null, 2),
        },
      ],
    };
  }
);

// Tool: List theme options
server.tool(
  'list_theme_options',
  'List all available theme customization options.',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(THEME_OPTIONS, null, 2),
        },
      ],
    };
  }
);

// Tool: Get documentation
server.tool(
  'get_documentation',
  'Get NetPad forms documentation. Use this to learn about features, APIs, and best practices.',
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
          text: docs[topic] || 'Documentation not found',
        },
      ],
    };
  }
);

// Tool: Generate React component code
server.tool(
  'generate_react_code',
  'Generate React component code that uses @netpad/forms to render a form.',
  {
    formConfig: z.string().describe('The form configuration JSON'),
    componentName: z.string().optional().describe('Name of the React component'),
    includeSubmitHandler: z.boolean().optional().describe('Whether to include a submit handler'),
    useNetPadClient: z.boolean().optional().describe('Whether to use NetPad API client for submission'),
  },
  async ({ formConfig, componentName = 'MyForm', includeSubmitHandler = true, useNetPadClient = false }) => {
    let code = `import { FormRenderer } from '@netpad/forms';\n`;

    if (useNetPadClient) {
      code += `import { createNetPadClient } from '@netpad/forms';\n`;
    }

    code += `import type { FormConfiguration } from '@netpad/forms';\n\n`;

    code += `const formConfig: FormConfiguration = ${formConfig};\n\n`;

    if (useNetPadClient) {
      code += `const client = createNetPadClient({
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL || 'https://your-netpad-instance.com',
  apiKey: process.env.NETPAD_API_KEY || '',
});\n\n`;
    }

    code += `export function ${componentName}() {\n`;

    if (includeSubmitHandler) {
      if (useNetPadClient) {
        code += `  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const result = await client.submitForm(formConfig.formId || formConfig.slug || '', data);
      console.log('Submission successful:', result);
      // Handle success (e.g., show notification, redirect)
    } catch (error) {
      console.error('Submission failed:', error);
      // Handle error
    }
  };\n\n`;
      } else {
        code += `  const handleSubmit = async (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    // TODO: Handle form submission
  };\n\n`;
      }
    }

    code += `  return (
    <FormRenderer
      config={formConfig}
      onSubmit={${includeSubmitHandler ? 'handleSubmit' : 'undefined'}}
      mode="create"
    />
  );
}\n`;

    return {
      content: [
        {
          type: 'text',
          text: code,
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

// Tool: Get use case template
server.tool(
  'get_use_case_template',
  'Get a pre-built template for common form use cases including form configuration and workflow setup.',
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

// Tool: List application templates
server.tool(
  'list_application_templates',
  'List all available application templates for creating new NetPad applications. Templates include pre-configured forms, workflows, and settings.',
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

// Tool: Get application template details
server.tool(
  'get_application_template',
  'Get detailed information about a specific application template including its forms, workflows, and field configurations.',
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
  'Generate code to create a new NetPad application. Can use a template or start from scratch. Returns API code and configuration.',
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
    const code = generateCreateApplicationCode(options);
    const config = generateApplicationConfig(options);

    return {
      content: [{
        type: 'text',
        text: `## Application Creation Code\n\n${code}\n\n## Application Configuration\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
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

// Tool: List workflow templates
server.tool(
  'list_workflow_templates',
  'List all available workflow templates for creating automated workflows.',
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

// Tool: Get workflow template details
server.tool(
  'get_workflow_template',
  'Get detailed information about a specific workflow template including its nodes, edges, and configuration.',
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(template, null, 2),
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
  'Generate code to create a new workflow, optionally using a template.',
  {
    name: z.string().describe('Name of the workflow'),
    description: z.string().optional().describe('Description of the workflow'),
    templateId: z.enum(['form-to-email', 'form-to-database', 'lead-qualification', 'webhook-to-database', 'scheduled-report']).optional().describe('Template to use'),
    applicationId: z.string().optional().describe('Application ID to attach workflow to'),
    projectId: z.string().describe('Project ID'),
    organizationId: z.string().describe('Organization ID'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
  },
  async (options) => {
    const code = generateCreateWorkflowCode(options as CreateWorkflowOptions);
    const config = generateWorkflowConfig(options as CreateWorkflowOptions);

    return {
      content: [{
        type: 'text',
        text: `## Workflow Creation Code\n\n\`\`\`typescript\n${code}\n\`\`\`\n\n## Workflow Configuration\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
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
  async () => ({
    contents: [
      {
        uri: 'netpad://reference/workflow-templates',
        mimeType: 'application/json',
        text: JSON.stringify(WORKFLOW_TEMPLATES, null, 2),
      },
    ],
  })
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

// Tool: List conversational form templates
server.tool(
  'list_conversational_templates',
  'List all available conversational form templates for AI-powered data collection.',
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

// Tool: Get conversational template details
server.tool(
  'get_conversational_template',
  'Get detailed information about a specific conversational form template including topics, extraction schema, and persona configuration.',
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
      type: z.enum(['string', 'number', 'boolean', 'enum', 'array', 'object']).describe('Field type'),
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

// Tool: List template categories
server.tool(
  'list_template_categories',
  'List all available form template categories with descriptions and template counts.',
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

// Tool: List form templates
server.tool(
  'list_form_templates',
  'List all available form templates (25+) across multiple categories. Returns template summaries with field counts.',
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

// Tool: Get form template details
server.tool(
  'get_form_template',
  'Get detailed information about a specific form template including all fields, validation rules, and configuration.',
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

// Tool: List query templates
server.tool(
  'list_query_templates',
  'List all available MongoDB query templates for common operations.',
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

// Tool: Get query template
server.tool(
  'get_query_template',
  'Get a specific query template with example code.',
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

// ============================================================================
// START THE SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('@netpad/mcp-server started');
}

main().catch(console.error);
