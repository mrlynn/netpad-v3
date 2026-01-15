/**
 * Workflow Automation Tools for NetPad MCP Server
 *
 * Phase 3 of MCP Server 2.0 update - Workflow Automation
 * Provides tools for creating, configuring, and testing workflows.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowNodeConfig {
  id: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  enabled?: boolean;
}

export interface WorkflowEdgeConfig {
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

export interface WorkflowTemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: WorkflowNodeConfig[];
  edges: WorkflowEdgeConfig[];
  variables?: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue?: unknown;
    description?: string;
  }>;
}

// ============================================================================
// NODE TYPES REGISTRY
// ============================================================================

export const WORKFLOW_NODE_TYPES = {
  // Triggers
  triggers: [
    {
      type: 'form-trigger',
      name: 'Form Submission',
      description: 'Trigger workflow when a form is submitted',
      icon: 'article',
      color: '#4CAF50',
      category: 'triggers',
      stage: 'trigger',
      inputs: [],
      outputs: [{ id: 'form_data', label: 'Form Data', type: 'object' }],
      configFields: [
        { key: 'formId', label: 'Form ID', type: 'string', required: true },
        { key: 'formSlug', label: 'Form Slug', type: 'string', required: false },
      ],
    },
    {
      type: 'webhook-trigger',
      name: 'Webhook',
      description: 'Trigger workflow via HTTP webhook',
      icon: 'webhook',
      color: '#2196F3',
      category: 'triggers',
      stage: 'trigger',
      inputs: [],
      outputs: [
        { id: 'body', label: 'Request Body', type: 'object' },
        { id: 'headers', label: 'Headers', type: 'object' },
        { id: 'query', label: 'Query Params', type: 'object' },
      ],
      configFields: [
        { key: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
        { key: 'authentication', label: 'Authentication', type: 'select', options: ['none', 'api_key', 'bearer'] },
      ],
    },
    {
      type: 'schedule-trigger',
      name: 'Schedule',
      description: 'Trigger workflow on a schedule (cron)',
      icon: 'schedule',
      color: '#9C27B0',
      category: 'triggers',
      stage: 'trigger',
      inputs: [],
      outputs: [{ id: 'timestamp', label: 'Trigger Time', type: 'string' }],
      configFields: [
        { key: 'schedule', label: 'Cron Expression', type: 'string', required: true },
        { key: 'timezone', label: 'Timezone', type: 'string', default: 'UTC' },
      ],
    },
    {
      type: 'manual-trigger',
      name: 'Manual Trigger',
      description: 'Start workflow manually',
      icon: 'play_arrow',
      color: '#607D8B',
      category: 'triggers',
      stage: 'trigger',
      inputs: [],
      outputs: [{ id: 'input', label: 'Input Data', type: 'object' }],
      configFields: [],
    },
  ],

  // Logic
  logic: [
    {
      type: 'conditional',
      name: 'Condition (If/Else)',
      description: 'Branch workflow based on condition',
      icon: 'call_split',
      color: '#FF9800',
      category: 'logic',
      stage: 'processor',
      inputs: [{ id: 'input', label: 'Input', type: 'any' }],
      outputs: [
        { id: 'true', label: 'Yes', type: 'any' },
        { id: 'false', label: 'No', type: 'any' },
      ],
      configFields: [
        { key: 'condition', label: 'Condition Expression', type: 'expression', required: true },
      ],
    },
    {
      type: 'switch',
      name: 'Switch',
      description: 'Route to different paths based on value',
      icon: 'alt_route',
      color: '#FF5722',
      category: 'logic',
      stage: 'processor',
      inputs: [{ id: 'input', label: 'Input', type: 'any' }],
      outputs: [{ id: 'default', label: 'Default', type: 'any' }],
      configFields: [
        { key: 'switchValue', label: 'Switch Value', type: 'expression', required: true },
        { key: 'cases', label: 'Cases', type: 'array', itemType: 'object' },
      ],
    },
    {
      type: 'loop',
      name: 'Loop (For Each)',
      description: 'Iterate over an array of items',
      icon: 'loop',
      color: '#00BCD4',
      category: 'logic',
      stage: 'processor',
      inputs: [{ id: 'items', label: 'Items', type: 'array' }],
      outputs: [
        { id: 'loop_body', label: 'Each Item', type: 'any' },
        { id: 'completed', label: 'Done', type: 'array' },
      ],
      configFields: [
        { key: 'maxIterations', label: 'Max Iterations', type: 'number', default: 100 },
      ],
    },
  ],

  // Data
  data: [
    {
      type: 'mongodb-query',
      name: 'MongoDB Query',
      description: 'Query documents from MongoDB',
      icon: 'storage',
      color: '#00ED64',
      category: 'data',
      stage: 'processor',
      inputs: [{ id: 'filter', label: 'Filter', type: 'object' }],
      outputs: [{ id: 'documents', label: 'Documents', type: 'array' }],
      configFields: [
        { key: 'connectionId', label: 'Connection', type: 'connection', required: true },
        { key: 'database', label: 'Database', type: 'string', required: true },
        { key: 'collection', label: 'Collection', type: 'string', required: true },
        { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'findOne', 'aggregate'] },
        { key: 'filter', label: 'Filter', type: 'json' },
        { key: 'projection', label: 'Projection', type: 'json' },
        { key: 'sort', label: 'Sort', type: 'json' },
        { key: 'limit', label: 'Limit', type: 'number' },
      ],
    },
    {
      type: 'mongodb-write',
      name: 'MongoDB Write',
      description: 'Insert, update, or delete documents',
      icon: 'edit_document',
      color: '#00ED64',
      category: 'data',
      stage: 'action',
      inputs: [{ id: 'data', label: 'Data', type: 'object' }],
      outputs: [{ id: 'result', label: 'Result', type: 'object' }],
      configFields: [
        { key: 'connectionId', label: 'Connection', type: 'connection', required: true },
        { key: 'database', label: 'Database', type: 'string', required: true },
        { key: 'collection', label: 'Collection', type: 'string', required: true },
        { key: 'operation', label: 'Operation', type: 'select', options: ['insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'] },
      ],
    },
    {
      type: 'transform',
      name: 'Transform Data',
      description: 'Transform and reshape data',
      icon: 'transform',
      color: '#3F51B5',
      category: 'data',
      stage: 'processor',
      inputs: [{ id: 'input', label: 'Input', type: 'any' }],
      outputs: [{ id: 'output', label: 'Output', type: 'any' }],
      configFields: [
        { key: 'expression', label: 'Transform Expression', type: 'expression', required: true },
      ],
    },
    {
      type: 'set-variable',
      name: 'Set Variable',
      description: 'Set a workflow variable',
      icon: 'edit',
      color: '#795548',
      category: 'data',
      stage: 'processor',
      inputs: [{ id: 'value', label: 'Value', type: 'any' }],
      outputs: [{ id: 'output', label: 'Output', type: 'any' }],
      configFields: [
        { key: 'variableName', label: 'Variable Name', type: 'string', required: true },
        { key: 'value', label: 'Value', type: 'expression' },
      ],
    },
  ],

  // Actions
  actions: [
    {
      type: 'email-send',
      name: 'Send Email',
      description: 'Send an email notification',
      icon: 'email',
      color: '#E91E63',
      category: 'actions',
      stage: 'action',
      inputs: [{ id: 'data', label: 'Template Data', type: 'object' }],
      outputs: [{ id: 'result', label: 'Result', type: 'object' }],
      configFields: [
        { key: 'to', label: 'To', type: 'expression', required: true },
        { key: 'subject', label: 'Subject', type: 'expression', required: true },
        { key: 'body', label: 'Body', type: 'richtext', required: true },
        { key: 'from', label: 'From', type: 'string' },
        { key: 'replyTo', label: 'Reply To', type: 'string' },
      ],
    },
    {
      type: 'http-request',
      name: 'HTTP Request',
      description: 'Make an HTTP API call',
      icon: 'http',
      color: '#009688',
      category: 'actions',
      stage: 'action',
      inputs: [{ id: 'body', label: 'Request Body', type: 'object' }],
      outputs: [
        { id: 'response', label: 'Response', type: 'object' },
        { id: 'status', label: 'Status Code', type: 'number' },
      ],
      configFields: [
        { key: 'url', label: 'URL', type: 'expression', required: true },
        { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { key: 'headers', label: 'Headers', type: 'json' },
        { key: 'body', label: 'Body', type: 'json' },
        { key: 'authentication', label: 'Authentication', type: 'select', options: ['none', 'basic', 'bearer', 'api_key'] },
      ],
    },
    {
      type: 'delay',
      name: 'Delay',
      description: 'Wait for a specified duration',
      icon: 'hourglass_empty',
      color: '#9E9E9E',
      category: 'actions',
      stage: 'processor',
      inputs: [{ id: 'input', label: 'Input', type: 'any' }],
      outputs: [{ id: 'output', label: 'Output', type: 'any' }],
      configFields: [
        { key: 'duration', label: 'Duration (ms)', type: 'number', required: true },
      ],
    },
  ],

  // AI
  ai: [
    {
      type: 'ai-generate',
      name: 'AI Generate',
      description: 'Generate text using AI',
      icon: 'psychology',
      color: '#673AB7',
      category: 'ai',
      stage: 'processor',
      inputs: [{ id: 'context', label: 'Context', type: 'object' }],
      outputs: [{ id: 'response', label: 'AI Response', type: 'string' }],
      configFields: [
        { key: 'prompt', label: 'Prompt', type: 'richtext', required: true },
        { key: 'model', label: 'Model', type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'] },
        { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
        { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000 },
      ],
    },
    {
      type: 'ai-classify',
      name: 'AI Classify',
      description: 'Classify text into categories',
      icon: 'category',
      color: '#673AB7',
      category: 'ai',
      stage: 'processor',
      inputs: [{ id: 'text', label: 'Text', type: 'string' }],
      outputs: [
        { id: 'category', label: 'Category', type: 'string' },
        { id: 'confidence', label: 'Confidence', type: 'number' },
      ],
      configFields: [
        { key: 'categories', label: 'Categories', type: 'array', itemType: 'string', required: true },
        { key: 'instructions', label: 'Classification Instructions', type: 'richtext' },
      ],
    },
  ],
};

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplateDefinition> = {
  'form-to-email': {
    id: 'form-to-email',
    name: 'Form Submission to Email',
    description: 'Send an email notification when a form is submitted',
    category: 'notifications',
    tags: ['email', 'notifications', 'forms'],
    nodes: [
      {
        id: 'trigger_1',
        type: 'form-trigger',
        label: 'Form Submission',
        position: { x: 100, y: 200 },
        config: { formId: '', formSlug: '' },
        enabled: true,
      },
      {
        id: 'email_1',
        type: 'email-send',
        label: 'Send Notification',
        position: { x: 400, y: 200 },
        config: {
          to: '{{trigger.form_data.email}}',
          subject: 'Thank you for your submission',
          body: '<p>Hello {{trigger.form_data.name}},</p><p>Thank you for contacting us!</p>',
        },
        enabled: true,
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'trigger_1',
        sourceHandle: 'form_data',
        target: 'email_1',
        targetHandle: 'data',
      },
    ],
  },
  'form-to-database': {
    id: 'form-to-database',
    name: 'Form Submission to Database',
    description: 'Save form submissions to a MongoDB collection',
    category: 'data',
    tags: ['database', 'mongodb', 'forms'],
    nodes: [
      {
        id: 'trigger_1',
        type: 'form-trigger',
        label: 'Form Submission',
        position: { x: 100, y: 200 },
        config: { formId: '', formSlug: '' },
        enabled: true,
      },
      {
        id: 'transform_1',
        type: 'transform',
        label: 'Prepare Data',
        position: { x: 350, y: 200 },
        config: {
          expression: '{ ...input, submittedAt: new Date(), status: "new" }',
        },
        enabled: true,
      },
      {
        id: 'mongodb_1',
        type: 'mongodb-write',
        label: 'Save to Database',
        position: { x: 600, y: 200 },
        config: {
          operation: 'insertOne',
          collection: 'submissions',
        },
        enabled: true,
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'trigger_1',
        sourceHandle: 'form_data',
        target: 'transform_1',
        targetHandle: 'input',
      },
      {
        id: 'edge_2',
        source: 'transform_1',
        sourceHandle: 'output',
        target: 'mongodb_1',
        targetHandle: 'data',
      },
    ],
  },
  'lead-qualification': {
    id: 'lead-qualification',
    name: 'Lead Qualification Pipeline',
    description: 'Qualify leads based on criteria and route to appropriate actions',
    category: 'sales',
    tags: ['leads', 'crm', 'qualification'],
    nodes: [
      {
        id: 'trigger_1',
        type: 'form-trigger',
        label: 'Lead Form',
        position: { x: 100, y: 200 },
        config: { formId: '', formSlug: '' },
        enabled: true,
      },
      {
        id: 'condition_1',
        type: 'conditional',
        label: 'Is High Value?',
        position: { x: 350, y: 200 },
        config: {
          condition: 'input.companySize >= 100 || input.budget >= 10000',
        },
        enabled: true,
      },
      {
        id: 'email_high',
        type: 'email-send',
        label: 'Notify Sales Team',
        position: { x: 600, y: 100 },
        config: {
          to: 'sales@company.com',
          subject: 'High-value lead: {{input.company}}',
          body: '<p>New high-value lead submitted!</p>',
        },
        enabled: true,
      },
      {
        id: 'email_low',
        type: 'email-send',
        label: 'Send Marketing Email',
        position: { x: 600, y: 300 },
        config: {
          to: '{{input.email}}',
          subject: 'Thanks for your interest!',
          body: '<p>Thank you for reaching out...</p>',
        },
        enabled: true,
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'trigger_1',
        sourceHandle: 'form_data',
        target: 'condition_1',
        targetHandle: 'input',
      },
      {
        id: 'edge_2',
        source: 'condition_1',
        sourceHandle: 'true',
        target: 'email_high',
        targetHandle: 'data',
      },
      {
        id: 'edge_3',
        source: 'condition_1',
        sourceHandle: 'false',
        target: 'email_low',
        targetHandle: 'data',
      },
    ],
  },
  'webhook-to-database': {
    id: 'webhook-to-database',
    name: 'Webhook to Database',
    description: 'Receive webhook data and store in MongoDB',
    category: 'integrations',
    tags: ['webhook', 'api', 'database'],
    nodes: [
      {
        id: 'trigger_1',
        type: 'webhook-trigger',
        label: 'Webhook',
        position: { x: 100, y: 200 },
        config: { method: 'POST', authentication: 'none' },
        enabled: true,
      },
      {
        id: 'mongodb_1',
        type: 'mongodb-write',
        label: 'Save to Database',
        position: { x: 400, y: 200 },
        config: {
          operation: 'insertOne',
          collection: 'webhook_events',
        },
        enabled: true,
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'trigger_1',
        sourceHandle: 'body',
        target: 'mongodb_1',
        targetHandle: 'data',
      },
    ],
  },
  'scheduled-report': {
    id: 'scheduled-report',
    name: 'Scheduled Report',
    description: 'Generate and email a report on a schedule',
    category: 'reporting',
    tags: ['schedule', 'report', 'email'],
    nodes: [
      {
        id: 'trigger_1',
        type: 'schedule-trigger',
        label: 'Daily Schedule',
        position: { x: 100, y: 200 },
        config: { schedule: '0 9 * * *', timezone: 'America/New_York' },
        enabled: true,
      },
      {
        id: 'query_1',
        type: 'mongodb-query',
        label: 'Get Data',
        position: { x: 350, y: 200 },
        config: {
          operation: 'aggregate',
          pipeline: [],
        },
        enabled: true,
      },
      {
        id: 'email_1',
        type: 'email-send',
        label: 'Send Report',
        position: { x: 600, y: 200 },
        config: {
          to: 'team@company.com',
          subject: 'Daily Report - {{trigger.timestamp}}',
          body: '<p>Here is your daily report...</p>',
        },
        enabled: true,
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'trigger_1',
        sourceHandle: 'timestamp',
        target: 'query_1',
        targetHandle: 'filter',
      },
      {
        id: 'edge_2',
        source: 'query_1',
        sourceHandle: 'documents',
        target: 'email_1',
        targetHandle: 'data',
      },
    ],
  },
};

// ============================================================================
// WORKFLOW CREATION
// ============================================================================

export interface CreateWorkflowOptions {
  name: string;
  description?: string;
  templateId?: string;
  applicationId?: string;
  projectId: string;
  organizationId: string;
  tags?: string[];
}

/**
 * Generate code for creating a workflow
 */
export function generateCreateWorkflowCode(options: CreateWorkflowOptions): string {
  const { name, description, templateId, applicationId, projectId, organizationId, tags } = options;
  const template = templateId ? WORKFLOW_TEMPLATES[templateId] : null;

  let code = `// Create a new NetPad workflow
// Using: NetPad Platform API

const workflowData = {
  name: '${name}',
  ${description ? `description: '${description}',` : ''}
  projectId: '${projectId}',
  organizationId: '${organizationId}',
  ${applicationId ? `applicationId: '${applicationId}',` : ''}
  ${tags && tags.length > 0 ? `tags: ${JSON.stringify(tags)},` : ''}
`;

  if (template) {
    code += `
  // Using template: ${template.name}
  canvas: {
    nodes: ${JSON.stringify(template.nodes, null, 4)},
    edges: ${JSON.stringify(template.edges, null, 4)},
    viewport: { x: 0, y: 0, zoom: 1 },
  },
`;
  } else {
    code += `
  // Empty canvas - add nodes in the visual editor
  canvas: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
`;
  }

  code += `
  settings: {
    executionMode: 'auto',
    maxExecutionTime: 300000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
    },
    errorHandling: 'stop',
    timezone: 'UTC',
  },
  variables: [],
};

const response = await fetch('/api/workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(workflowData),
});

const { workflow } = await response.json();
console.log('Created workflow:', workflow.id);
`;

  return code;
}

/**
 * Generate workflow configuration object
 */
export function generateWorkflowConfig(options: CreateWorkflowOptions): object {
  const { name, description, templateId, tags } = options;
  const template = templateId ? WORKFLOW_TEMPLATES[templateId] : null;

  return {
    workflow: {
      name,
      description: description || (template ? template.description : ''),
      tags: tags || (template ? template.tags : []),
      status: 'draft',
    },
    template: template ? {
      id: template.id,
      name: template.name,
      category: template.category,
    } : null,
    canvas: template ? {
      nodes: template.nodes,
      edges: template.edges,
    } : {
      nodes: [],
      edges: [],
    },
  };
}

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * Generate code for adding a node to a workflow
 */
export function generateAddNodeCode(
  workflowId: string,
  node: WorkflowNodeConfig
): string {
  return `// Add node to workflow
const nodeData = ${JSON.stringify(node, null, 2)};

const response = await fetch(\`/api/workflows/${workflowId}/nodes\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(nodeData),
});

const { node } = await response.json();
console.log('Added node:', node.id);
`;
}

/**
 * Generate code for connecting nodes
 */
export function generateConnectNodesCode(
  workflowId: string,
  edge: WorkflowEdgeConfig
): string {
  return `// Connect workflow nodes
const edgeData = ${JSON.stringify(edge, null, 2)};

const response = await fetch(\`/api/workflows/${workflowId}/edges\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(edgeData),
});

const { edge } = await response.json();
console.log('Connected nodes:', edge.source, '->', edge.target);
`;
}

// ============================================================================
// TRIGGER CONFIGURATION
// ============================================================================

export interface TriggerConfig {
  type: 'form_submission' | 'webhook' | 'schedule' | 'manual';
  formId?: string;
  formSlug?: string;
  schedule?: string;
  timezone?: string;
  webhookMethod?: string;
  webhookAuthentication?: string;
}

/**
 * Generate code for configuring a workflow trigger
 */
export function generateConfigureTriggerCode(
  workflowId: string,
  triggerNodeId: string,
  config: TriggerConfig
): string {
  return `// Configure workflow trigger
const triggerConfig = ${JSON.stringify(config, null, 2)};

// Update the trigger node configuration
const response = await fetch(\`/api/workflows/${workflowId}/nodes/${triggerNodeId}\`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({ config: triggerConfig }),
});

const { node } = await response.json();
console.log('Configured trigger:', node.type);
`;
}

// ============================================================================
// WORKFLOW TESTING
// ============================================================================

export interface TestWorkflowOptions {
  workflowId: string;
  organizationId: string;
  testData?: Record<string, unknown>;
  dryRun?: boolean;
}

/**
 * Generate code for testing a workflow
 */
export function generateTestWorkflowCode(options: TestWorkflowOptions): string {
  const { workflowId, organizationId, testData, dryRun = true } = options;

  return `// Test workflow execution
const testPayload = {
  trigger: {
    type: 'manual',
    payload: ${JSON.stringify(testData || {}, null, 4)},
  },
  ${dryRun ? `dryRun: true, // Validate without side effects` : ''}
};

const response = await fetch(\`/api/workflows/${workflowId}/execute?orgId=${organizationId}\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(testPayload),
});

const { executionId, status } = await response.json();
console.log('Execution started:', executionId);
console.log('Status:', status);

// Poll for results
const checkStatus = async () => {
  const statusResponse = await fetch(\`/api/workflows/${workflowId}/executions/\${executionId}\`, {
    headers: {
      'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
    },
  });
  const { execution, logs } = await statusResponse.json();

  console.log('Execution status:', execution.status);
  if (execution.status === 'completed') {
    console.log('Output:', execution.result?.output);
  } else if (execution.status === 'failed') {
    console.error('Error:', execution.result?.error);
  }

  return execution;
};

// Wait for completion
await checkStatus();
`;
}

// ============================================================================
// EXECUTION HISTORY
// ============================================================================

/**
 * Generate code for getting workflow execution history
 */
export function generateGetExecutionHistoryCode(
  workflowId: string,
  organizationId: string,
  options: { page?: number; pageSize?: number; status?: string } = {}
): string {
  const { page = 1, pageSize = 20, status } = options;

  return `// Get workflow execution history
const params = new URLSearchParams({
  orgId: '${organizationId}',
  page: '${page}',
  pageSize: '${pageSize}',
  ${status ? `status: '${status}',` : ''}
});

const response = await fetch(\`/api/workflows/${workflowId}/executions?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
});

const { executions, total, page, totalPages } = await response.json();
console.log(\`Found \${total} executions (page \${page} of \${totalPages})\`);

executions.forEach(exec => {
  console.log(\`- \${exec.executionId}: \${exec.status} (\${exec.trigger.type})\`);
});
`;
}

/**
 * Get all node categories
 */
export function getNodeCategories(): string[] {
  return Object.keys(WORKFLOW_NODE_TYPES);
}

/**
 * Get nodes by category
 */
export function getNodesByCategory(category: string): any[] {
  return (WORKFLOW_NODE_TYPES as any)[category] || [];
}

/**
 * Get all workflow template IDs
 */
export function getWorkflowTemplateIds(): string[] {
  return Object.keys(WORKFLOW_TEMPLATES);
}
