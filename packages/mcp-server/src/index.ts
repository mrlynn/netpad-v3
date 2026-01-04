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

const server = new McpServer({
  name: '@netpad/mcp-server',
  version: '0.1.0',
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
