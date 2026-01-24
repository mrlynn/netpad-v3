import type { VercelRequest, VercelResponse } from '@vercel/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';

// Store transports by session ID for reconnection
const transports = new Map<string, StreamableHTTPServerTransport>();

// ============================================================================
// API KEY AUTHENTICATION
// ============================================================================

// Cache validated API keys for 5 minutes to reduce API calls
const apiKeyCache = new Map<string, { valid: boolean; organizationId?: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the NetPad API base URL from environment or default
 */
function getNetPadApiUrl(): string {
  return process.env.NETPAD_API_URL || 'https://netpad.io';
}

/**
 * Validate the API key by calling the NetPad API.
 * Uses the existing NetPad API key validation system.
 *
 * API keys should be in the format: np_live_xxx or np_test_xxx
 *
 * @returns null if valid, or an error response object if invalid
 */
async function validateApiKey(req: VercelRequest): Promise<{ status: number; error: string; code: string } | null> {
  const authHeader = req.headers['authorization'];

  // Check if Authorization header is present
  if (!authHeader) {
    return {
      status: 401,
      error: 'Missing Authorization header. Use: Authorization: Bearer np_live_xxx',
      code: 'MISSING_API_KEY',
    };
  }

  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      status: 401,
      error: 'Invalid Authorization header format. Use: Authorization: Bearer np_live_xxx',
      code: 'INVALID_AUTH_FORMAT',
    };
  }

  const apiKey = parts[1].trim();

  if (!apiKey) {
    return {
      status: 401,
      error: 'API key is empty',
      code: 'EMPTY_API_KEY',
    };
  }

  // Validate key format (must start with np_live_ or np_test_)
  if (!apiKey.startsWith('np_live_') && !apiKey.startsWith('np_test_')) {
    return {
      status: 401,
      error: 'Invalid API key format. Keys should start with np_live_ or np_test_. Generate one at netpad.io/settings',
      code: 'INVALID_API_KEY_FORMAT',
    };
  }

  // Check cache first
  const cached = apiKeyCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.valid) {
      return null; // Valid key from cache
    }
    return {
      status: 401,
      error: 'Invalid or expired API key',
      code: 'INVALID_API_KEY',
    };
  }

  // Validate against NetPad API
  try {
    const netpadUrl = getNetPadApiUrl();
    const response = await fetch(`${netpadUrl}/api/v1/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ source: 'mcp-server-remote' }),
    });

    if (response.ok) {
      const data = await response.json();
      // Cache the valid result
      apiKeyCache.set(apiKey, {
        valid: true,
        organizationId: data.organizationId,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return null; // Valid key
    }

    // Key is invalid - cache the negative result too (shorter TTL)
    apiKeyCache.set(apiKey, {
      valid: false,
      expiresAt: Date.now() + 60 * 1000, // Cache invalid keys for 1 minute
    });

    // Parse error response
    const errorData = await response.json().catch(() => ({}));
    return {
      status: response.status,
      error: errorData.error?.message || 'Invalid or expired API key',
      code: errorData.error?.code || 'INVALID_API_KEY',
    };
  } catch (error) {
    console.error('Error validating API key against NetPad:', error);

    // On network error, fall back to format validation only
    // This allows the MCP server to work even if NetPad API is temporarily unavailable
    // but only accepts properly formatted keys
    console.warn('NetPad API unavailable, accepting key based on format validation only');
    return null;
  }
}

// Create and configure the MCP server with NetPad tools
function createNetPadServer(): McpServer {
  const server = new McpServer({
    name: '@netpad/mcp-server-remote',
    version: '1.0.0',
  });

  // ============================================================================
  // RESOURCES - Documentation
  // ============================================================================

  server.resource(
    'netpad-docs',
    'netpad://docs/readme',
    async () => ({
      contents: [
        {
          uri: 'netpad://docs/readme',
          mimeType: 'text/markdown',
          text: `# NetPad MCP Server

NetPad is a form builder and workflow automation platform.

## Quick Start

Use the available tools to:
- Generate forms from natural language descriptions
- Create workflow automations
- Browse and query MongoDB data
- Search the marketplace for pre-built applications

## Available Tools

- \`generate_form\` - Generate a complete form configuration
- \`list_field_types\` - List all supported field types
- \`list_form_templates\` - Browse pre-built form templates
- \`create_form_from_template\` - Create a form from a template
- \`list_workflow_templates\` - Browse workflow automation templates

## Extensions System

NetPad supports extensions that add custom functionality:

**Built-in Extensions:**
- **@netpad/cloud-features**: Billing, Atlas provisioning, premium AI features (cloud only)
- **@netpad/collaborate**: Community gallery and collaboration features
- **@netpad/demo-node**: Example extension showing how to create custom workflow nodes (use as template)

**Extension Capabilities:**
- Custom API routes under /api/ext/{extension-name}/
- Custom workflow node types (see @netpad/demo-node for example)
- Shared services (billing, provisioning, analytics)
- Request/response middleware
- React UI components
- Feature flags

**Creating Custom Extensions:**
Use @netpad/demo-node as a template:
1. Copy the demo-node package
2. Update package.json with your extension name
3. Modify the node definition and handler in src/index.ts
4. Export your extension as default
5. Install and enable via NETPAD_EXTENSIONS

**Enabling Extensions:**
Set NETPAD_EXTENSIONS environment variable:
\`NETPAD_EXTENSIONS=@netpad/collaborate,@netpad/demo-node,@myorg/custom-extension\`

**Example: Demo Node Extension**
The @netpad/demo-node extension provides a "Log Message" workflow node that:
- Logs messages with configurable levels (info/warn/error)
- Supports {{variable}} syntax for dynamic values
- Can pass through input data to downstream nodes
- Demonstrates complete extension structure (metadata, node definition, handler, lifecycle hooks)

For more information, visit https://netpad.io and https://docs.netpad.io/docs/extensions/overview
`,
        },
      ],
    })
  );

  // ============================================================================
  // TOOLS - Form Building
  // ============================================================================

  server.tool(
    'generate_form',
    'Generate a complete NetPad form configuration from a natural language description',
    {
      description: z.string().describe('Description of the form to generate'),
      formName: z.string().describe('Name of the form'),
      includeMultiPage: z.boolean().optional().describe('Organize fields into multiple pages'),
    },
    async ({ description, formName, includeMultiPage }) => {
      const slug = formName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Parse description to generate appropriate fields
      const fields = parseDescriptionToFields(description);

      const config = {
        name: formName,
        slug,
        description,
        fieldConfigs: fields,
        multiPage: includeMultiPage ? {
          enabled: true,
          pages: [{ id: 'page-1', title: 'Form', fields: fields.map(f => f.path) }],
        } : undefined,
      };

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

  server.tool(
    'list_field_types',
    'List all supported field types in NetPad forms',
    {},
    async () => {
      const fieldTypes = [
        { id: 'short_text', name: 'Short Text', description: 'Single line text input' },
        { id: 'long_text', name: 'Long Text', description: 'Multi-line textarea' },
        { id: 'email', name: 'Email', description: 'Email input with validation' },
        { id: 'phone', name: 'Phone', description: 'Phone number input' },
        { id: 'number', name: 'Number', description: 'Numeric input' },
        { id: 'date', name: 'Date', description: 'Date picker' },
        { id: 'time', name: 'Time', description: 'Time picker' },
        { id: 'datetime', name: 'Date & Time', description: 'Combined date and time picker' },
        { id: 'dropdown', name: 'Dropdown', description: 'Single select dropdown' },
        { id: 'multiple_choice', name: 'Multiple Choice', description: 'Radio button selection' },
        { id: 'checkboxes', name: 'Checkboxes', description: 'Multi-select checkboxes' },
        { id: 'yes_no', name: 'Yes/No', description: 'Boolean toggle' },
        { id: 'rating', name: 'Rating', description: 'Star rating input' },
        { id: 'slider', name: 'Slider', description: 'Range slider' },
        { id: 'file', name: 'File Upload', description: 'File attachment' },
        { id: 'image', name: 'Image Upload', description: 'Image upload with preview' },
        { id: 'signature', name: 'Signature', description: 'Signature capture' },
        { id: 'url', name: 'URL', description: 'URL input with validation' },
        { id: 'currency', name: 'Currency', description: 'Monetary value input' },
        { id: 'address', name: 'Address', description: 'Address autocomplete' },
        { id: 'section_header', name: 'Section Header', description: 'Section divider with title' },
        { id: 'paragraph', name: 'Paragraph', description: 'Static text/instructions' },
        { id: 'hidden', name: 'Hidden', description: 'Hidden field for data' },
      ];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fieldTypes, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'list_form_templates',
    'List available pre-built form templates',
    {
      category: z.string().optional().describe('Filter by category'),
    },
    async ({ category }) => {
      const templates = [
        { id: 'contact-form', name: 'Contact Form', category: 'Business', description: 'Basic contact form' },
        { id: 'lead-capture', name: 'Lead Capture', category: 'Business', description: 'Sales lead collection' },
        { id: 'newsletter', name: 'Newsletter Signup', category: 'Business', description: 'Email subscription' },
        { id: 'event-registration', name: 'Event Registration', category: 'Events', description: 'Event signup form' },
        { id: 'rsvp', name: 'RSVP', category: 'Events', description: 'Event RSVP form' },
        { id: 'customer-feedback', name: 'Customer Feedback', category: 'Feedback', description: 'Customer satisfaction survey' },
        { id: 'nps-survey', name: 'NPS Survey', category: 'Feedback', description: 'Net Promoter Score survey' },
        { id: 'support-ticket', name: 'Support Ticket', category: 'Support', description: 'Help desk ticket form' },
        { id: 'job-application', name: 'Job Application', category: 'HR', description: 'Employment application' },
        { id: 'patient-intake', name: 'Patient Intake', category: 'Healthcare', description: 'Medical intake form' },
        { id: 'order-form', name: 'Order Form', category: 'E-commerce', description: 'Product order form' },
        { id: 'expense-report', name: 'Expense Report', category: 'Finance', description: 'Expense submission form' },
      ];

      const filtered = category
        ? templates.filter(t => t.category.toLowerCase() === category.toLowerCase())
        : templates;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filtered, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'create_form_from_template',
    'Create a form configuration from a pre-built template',
    {
      templateId: z.string().describe('Template ID (e.g., "contact-form", "lead-capture")'),
      formName: z.string().describe('Name for the new form'),
      customizations: z.object({
        additionalFields: z.array(z.string()).optional(),
        removeFields: z.array(z.string()).optional(),
      }).optional().describe('Optional customizations'),
    },
    async ({ templateId, formName, customizations }) => {
      const templateConfigs: Record<string, { fields: Array<{ path: string; label: string; type: string; required?: boolean; options?: Array<{ label: string; value: string }> }> }> = {
        'contact-form': {
          fields: [
            { path: 'name', label: 'Name', type: 'short_text', required: true },
            { path: 'email', label: 'Email', type: 'email', required: true },
            { path: 'phone', label: 'Phone', type: 'phone' },
            { path: 'message', label: 'Message', type: 'long_text', required: true },
          ],
        },
        'lead-capture': {
          fields: [
            { path: 'firstName', label: 'First Name', type: 'short_text', required: true },
            { path: 'lastName', label: 'Last Name', type: 'short_text', required: true },
            { path: 'email', label: 'Work Email', type: 'email', required: true },
            { path: 'company', label: 'Company', type: 'short_text', required: true },
            { path: 'jobTitle', label: 'Job Title', type: 'short_text' },
            { path: 'phone', label: 'Phone', type: 'phone' },
            { path: 'interest', label: 'Interest', type: 'dropdown', options: [
              { label: 'Product Demo', value: 'demo' },
              { label: 'Pricing', value: 'pricing' },
              { label: 'Partnership', value: 'partnership' },
              { label: 'Other', value: 'other' },
            ]},
          ],
        },
        'customer-feedback': {
          fields: [
            { path: 'satisfaction', label: 'Overall Satisfaction', type: 'rating', required: true },
            { path: 'recommend', label: 'How likely are you to recommend us?', type: 'slider' },
            { path: 'liked', label: 'What did you like?', type: 'checkboxes', options: [
              { label: 'Product Quality', value: 'quality' },
              { label: 'Customer Service', value: 'service' },
              { label: 'Pricing', value: 'pricing' },
              { label: 'Ease of Use', value: 'ease' },
            ]},
            { path: 'improvements', label: 'What could we improve?', type: 'long_text' },
            { path: 'email', label: 'Email (optional)', type: 'email' },
          ],
        },
        'support-ticket': {
          fields: [
            { path: 'name', label: 'Name', type: 'short_text', required: true },
            { path: 'email', label: 'Email', type: 'email', required: true },
            { path: 'category', label: 'Category', type: 'dropdown', required: true, options: [
              { label: 'Technical Issue', value: 'technical' },
              { label: 'Billing', value: 'billing' },
              { label: 'Feature Request', value: 'feature' },
              { label: 'General Inquiry', value: 'general' },
            ]},
            { path: 'priority', label: 'Priority', type: 'multiple_choice', options: [
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
              { label: 'Critical', value: 'critical' },
            ]},
            { path: 'subject', label: 'Subject', type: 'short_text', required: true },
            { path: 'description', label: 'Description', type: 'long_text', required: true },
            { path: 'attachment', label: 'Attachment', type: 'file' },
          ],
        },
      };

      const template = templateConfigs[templateId];
      if (!template) {
        return {
          content: [
            {
              type: 'text',
              text: `Template "${templateId}" not found. Available templates: ${Object.keys(templateConfigs).join(', ')}`,
            },
          ],
        };
      }

      let fields = [...template.fields];

      if (customizations?.removeFields) {
        fields = fields.filter(f => !customizations.removeFields!.includes(f.path));
      }

      const slug = formName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              name: formName,
              slug,
              templateId,
              fieldConfigs: fields,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ============================================================================
  // TOOLS - Workflow Templates
  // ============================================================================

  server.tool(
    'list_workflow_templates',
    'List available workflow automation templates',
    {},
    async () => {
      const templates = [
        {
          id: 'form-to-email',
          name: 'Form to Email',
          description: 'Send email notification on form submission',
          nodes: ['form-trigger', 'email-send'],
        },
        {
          id: 'form-to-database',
          name: 'Form to Database',
          description: 'Save form submissions to MongoDB',
          nodes: ['form-trigger', 'mongodb-insert'],
        },
        {
          id: 'lead-qualification',
          name: 'Lead Qualification',
          description: 'Score and route leads based on criteria',
          nodes: ['form-trigger', 'condition', 'email-send', 'slack-message'],
        },
        {
          id: 'scheduled-report',
          name: 'Scheduled Report',
          description: 'Generate and email periodic reports',
          nodes: ['schedule-trigger', 'mongodb-query', 'transform', 'email-send'],
        },
        {
          id: 'webhook-processor',
          name: 'Webhook Processor',
          description: 'Process incoming webhooks and store data',
          nodes: ['webhook-trigger', 'transform', 'mongodb-insert'],
        },
      ];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(templates, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'list_workflow_node_types',
    'List available workflow node types for building automations',
    {
      category: z.string().optional().describe('Filter by category'),
    },
    async ({ category }) => {
      const nodeTypes = [
        // Triggers
        { id: 'form-trigger', name: 'Form Submission', category: 'Triggers', description: 'Trigger on form submission' },
        { id: 'webhook-trigger', name: 'Webhook', category: 'Triggers', description: 'Trigger on webhook call' },
        { id: 'schedule-trigger', name: 'Schedule', category: 'Triggers', description: 'Trigger on schedule (cron)' },
        { id: 'manual-trigger', name: 'Manual', category: 'Triggers', description: 'Trigger manually' },

        // Logic
        { id: 'condition', name: 'Condition', category: 'Logic', description: 'Branch based on conditions' },
        { id: 'switch', name: 'Switch', category: 'Logic', description: 'Multi-way branching' },
        { id: 'loop', name: 'Loop', category: 'Logic', description: 'Iterate over items' },
        { id: 'delay', name: 'Delay', category: 'Logic', description: 'Wait for duration' },

        // Data
        { id: 'transform', name: 'Transform', category: 'Data', description: 'Transform data with expressions' },
        { id: 'code', name: 'Code', category: 'Data', description: 'Run custom JavaScript' },
        { id: 'set-variable', name: 'Set Variable', category: 'Data', description: 'Set workflow variable' },

        // Database
        { id: 'mongodb-query', name: 'MongoDB Query', category: 'Database', description: 'Query MongoDB collection' },
        { id: 'mongodb-insert', name: 'MongoDB Insert', category: 'Database', description: 'Insert document' },
        { id: 'mongodb-update', name: 'MongoDB Update', category: 'Database', description: 'Update documents' },
        { id: 'mongodb-delete', name: 'MongoDB Delete', category: 'Database', description: 'Delete documents' },

        // Communication
        { id: 'email-send', name: 'Send Email', category: 'Communication', description: 'Send email via SMTP' },
        { id: 'slack-message', name: 'Slack Message', category: 'Communication', description: 'Send Slack message' },
        { id: 'http-request', name: 'HTTP Request', category: 'Communication', description: 'Make HTTP API call' },

        // AI
        { id: 'ai-generate', name: 'AI Generate', category: 'AI', description: 'Generate text with AI' },
        { id: 'ai-classify', name: 'AI Classify', category: 'AI', description: 'Classify with AI' },
        { id: 'ai-extract', name: 'AI Extract', category: 'AI', description: 'Extract structured data' },
      ];

      const filtered = category
        ? nodeTypes.filter(n => n.category.toLowerCase() === category.toLowerCase())
        : nodeTypes;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filtered, null, 2),
          },
        ],
      };
    }
  );

  // ============================================================================
  // TOOLS - MongoDB Data Browser
  // ============================================================================

  server.tool(
    'generate_mongodb_query',
    'Generate a MongoDB query based on natural language description',
    {
      description: z.string().describe('Description of what to query'),
      collection: z.string().describe('Collection name'),
      operation: z.enum(['find', 'aggregate', 'count', 'distinct']).optional().describe('Query operation'),
    },
    async ({ description, collection, operation = 'find' }) => {
      // Simple query generation based on description
      const descLower = description.toLowerCase();

      let filter: Record<string, unknown> = {};
      let sort: Record<string, number> | undefined;
      let limit: number | undefined;

      if (descLower.includes('recent') || descLower.includes('latest')) {
        sort = { createdAt: -1 };
        limit = 10;
      }

      if (descLower.includes('active')) {
        filter['status'] = 'active';
      }

      if (descLower.includes('today')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter['createdAt'] = { $gte: today.toISOString() };
      }

      const query = {
        collection,
        operation,
        filter,
        sort,
        limit,
        code: operation === 'find'
          ? `db.collection('${collection}').find(${JSON.stringify(filter)})${sort ? `.sort(${JSON.stringify(sort)})` : ''}${limit ? `.limit(${limit})` : ''}.toArray()`
          : `db.collection('${collection}').${operation}(${JSON.stringify(filter)})`,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(query, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

// Helper function to parse natural language description into form fields
function parseDescriptionToFields(description: string): Array<{
  path: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}> {
  const fields: Array<{
    path: string;
    label: string;
    type: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }> = [];
  const descLower = description.toLowerCase();

  // Common field patterns
  if (descLower.includes('name') || descLower.includes('contact')) {
    fields.push({ path: 'name', label: 'Name', type: 'short_text', required: true });
  }
  if (descLower.includes('email')) {
    fields.push({ path: 'email', label: 'Email', type: 'email', required: true });
  }
  if (descLower.includes('phone') || descLower.includes('contact')) {
    fields.push({ path: 'phone', label: 'Phone', type: 'phone' });
  }
  if (descLower.includes('message') || descLower.includes('comment') || descLower.includes('feedback')) {
    fields.push({ path: 'message', label: 'Message', type: 'long_text' });
  }
  if (descLower.includes('date') || descLower.includes('when')) {
    fields.push({ path: 'date', label: 'Date', type: 'date' });
  }
  if (descLower.includes('address') || descLower.includes('location')) {
    fields.push({ path: 'address', label: 'Address', type: 'address' });
  }
  if (descLower.includes('rating') || descLower.includes('score')) {
    fields.push({ path: 'rating', label: 'Rating', type: 'rating' });
  }
  if (descLower.includes('file') || descLower.includes('upload') || descLower.includes('attachment')) {
    fields.push({ path: 'file', label: 'File Upload', type: 'file' });
  }

  // If no fields detected, create basic contact fields
  if (fields.length === 0) {
    fields.push(
      { path: 'name', label: 'Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'message', label: 'Message', type: 'long_text' }
    );
  }

  return fields;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ============================================================================
  // AUTHENTICATE REQUEST
  // ============================================================================
  const authError = await validateApiKey(req);
  if (authError) {
    res.status(authError.status).json({
      error: authError.error,
      code: authError.code,
      hint: 'Generate an API key at netpad.io/settings and add it to Claude\'s connector settings under "Advanced settings".',
    });
    return;
  }

  // Get session ID from headers
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // Handle GET requests for SSE streams
  if (req.method === 'GET') {
    // For initialization or reconnection
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    const server = createNetPadServer();
    await server.connect(transport);

    // Store transport for future requests
    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }

    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse
    );
    return;
  }

  // Handle POST requests
  if (req.method === 'POST') {
    // Try to reuse existing transport for this session
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      // Create new transport for this request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });

      const server = createNetPadServer();
      await server.connect(transport);

      if (transport.sessionId) {
        transports.set(transport.sessionId, transport);
      }
    }

    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
      req.body
    );
    return;
  }

  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}
