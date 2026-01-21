/**
 * Workflow Factory
 *
 * Generates test fixtures for workflow configurations with realistic defaults.
 * Includes factories for all 25+ workflow node types.
 */

// Simple ID generator for tests
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Base workflow configuration interface
 */
interface BaseWorkflowConfig {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  orgId?: string;
  projectId?: string;
  canvas: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  settings?: Record<string, unknown>;
  variables?: WorkflowVariable[];
  status?: 'draft' | 'active' | 'paused' | 'archived';
  version?: number;
  tags?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowVariable {
  key: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
}

/**
 * Factory for creating workflow node configurations
 */
export const NodeFactory = {
  // ============================================
  // Trigger Nodes
  // ============================================

  formTrigger: (formId: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `form_trigger_${generateId()}`,
    type: 'form-trigger',
    position: { x: 100, y: 100 },
    data: {
      formId,
      triggerOn: 'submit',
      ...overrides.data,
    },
    ...overrides,
  }),

  webhookTrigger: (overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `webhook_trigger_${generateId()}`,
    type: 'webhook-trigger',
    position: { x: 100, y: 100 },
    data: {
      method: 'POST',
      path: `/webhooks/${generateId()}`,
      authentication: 'none',
      ...overrides.data,
    },
    ...overrides,
  }),

  scheduleTrigger: (cron: string = '0 9 * * *', overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `schedule_trigger_${generateId()}`,
    type: 'schedule-trigger',
    position: { x: 100, y: 100 },
    data: {
      cron,
      timezone: 'UTC',
      ...overrides.data,
    },
    ...overrides,
  }),

  manualTrigger: (overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `manual_trigger_${generateId()}`,
    type: 'manual-trigger',
    position: { x: 100, y: 100 },
    data: {
      ...overrides.data,
    },
    ...overrides,
  }),

  // ============================================
  // Logic Nodes
  // ============================================

  condition: (conditions: Array<{ field: string; operator: string; value: unknown }>, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `condition_${generateId()}`,
    type: 'condition',
    position: { x: 300, y: 100 },
    data: {
      conditions,
      logicType: 'all', // all = AND, any = OR
      ...overrides.data,
    },
    ...overrides,
  }),

  switch: (fieldPath: string, cases: Array<{ value: string; label: string }>, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `switch_${generateId()}`,
    type: 'switch',
    position: { x: 300, y: 100 },
    data: {
      fieldPath,
      cases,
      defaultCase: true,
      ...overrides.data,
    },
    ...overrides,
  }),

  delay: (duration: number, unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'minutes', overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `delay_${generateId()}`,
    type: 'delay',
    position: { x: 300, y: 100 },
    data: {
      duration,
      unit,
      ...overrides.data,
    },
    ...overrides,
  }),

  loop: (items: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `loop_${generateId()}`,
    type: 'loop',
    position: { x: 300, y: 100 },
    data: {
      items, // Path to array in context
      itemVariable: 'item',
      indexVariable: 'index',
      ...overrides.data,
    },
    ...overrides,
  }),

  // ============================================
  // Data Nodes
  // ============================================

  setVariable: (variableName: string, value: unknown, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `set_variable_${generateId()}`,
    type: 'set-variable',
    position: { x: 300, y: 200 },
    data: {
      variableName,
      value,
      valueType: typeof value,
      ...overrides.data,
    },
    ...overrides,
  }),

  transform: (transformations: Array<{ source: string; target: string; operation?: string }>, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `transform_${generateId()}`,
    type: 'transform',
    position: { x: 300, y: 200 },
    data: {
      transformations,
      ...overrides.data,
    },
    ...overrides,
  }),

  aggregate: (operation: 'sum' | 'count' | 'average' | 'min' | 'max', fieldPath: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `aggregate_${generateId()}`,
    type: 'aggregate',
    position: { x: 300, y: 200 },
    data: {
      operation,
      fieldPath,
      ...overrides.data,
    },
    ...overrides,
  }),

  // ============================================
  // Action Nodes
  // ============================================

  emailSend: (to: string, subject: string, body: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `email_send_${generateId()}`,
    type: 'email-send',
    position: { x: 500, y: 100 },
    data: {
      to,
      subject,
      body,
      contentType: 'text',
      ...overrides.data,
    },
    ...overrides,
  }),

  httpRequest: (url: string, method: string = 'POST', overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `http_request_${generateId()}`,
    type: 'http-request',
    position: { x: 500, y: 100 },
    data: {
      url,
      method,
      headers: {},
      body: {},
      ...overrides.data,
    },
    ...overrides,
  }),

  mongodbQuery: (collection: string, operation: 'find' | 'insert' | 'update' | 'delete', overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `mongodb_query_${generateId()}`,
    type: 'mongodb-query',
    position: { x: 500, y: 100 },
    data: {
      collection,
      operation,
      query: {},
      ...overrides.data,
    },
    ...overrides,
  }),

  slackMessage: (channel: string, message: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `slack_message_${generateId()}`,
    type: 'slack-message',
    position: { x: 500, y: 100 },
    data: {
      channel,
      message,
      ...overrides.data,
    },
    ...overrides,
  }),

  // ============================================
  // AI Nodes
  // ============================================

  aiPrompt: (prompt: string, model: string = 'gpt-4', overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `ai_prompt_${generateId()}`,
    type: 'ai-prompt',
    position: { x: 500, y: 200 },
    data: {
      prompt,
      model,
      temperature: 0.7,
      maxTokens: 1000,
      ...overrides.data,
    },
    ...overrides,
  }),

  aiClassify: (categories: string[], overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `ai_classify_${generateId()}`,
    type: 'ai-classify',
    position: { x: 500, y: 200 },
    data: {
      categories,
      inputField: 'trigger.data.message',
      ...overrides.data,
    },
    ...overrides,
  }),

  aiExtract: (schema: Record<string, string>, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `ai_extract_${generateId()}`,
    type: 'ai-extract',
    position: { x: 500, y: 200 },
    data: {
      schema,
      inputField: 'trigger.data',
      ...overrides.data,
    },
    ...overrides,
  }),

  aiSummarize: (overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id: `ai_summarize_${generateId()}`,
    type: 'ai-summarize',
    position: { x: 500, y: 200 },
    data: {
      inputField: 'trigger.data.content',
      maxLength: 200,
      ...overrides.data,
    },
    ...overrides,
  }),
};

/**
 * Factory for creating edges between nodes
 */
export const EdgeFactory = {
  create: (source: string, target: string, overrides: Partial<WorkflowEdge> = {}): WorkflowEdge => ({
    id: `edge_${generateId()}`,
    source,
    target,
    ...overrides,
  }),

  conditional: (source: string, target: string, branch: 'true' | 'false'): WorkflowEdge => ({
    id: `edge_${generateId()}`,
    source,
    target,
    sourceHandle: branch,
  }),
};

/**
 * Factory for creating complete workflow configurations
 */
export const WorkflowFactory = {
  /**
   * Create a basic empty workflow
   */
  create: (overrides: Partial<BaseWorkflowConfig> = {}): BaseWorkflowConfig => {
    const name = overrides.name || 'Test Workflow';
    return {
      id: `workflow_${generateId()}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: 'A test workflow',
      orgId: `org_${generateId()}`,
      projectId: `proj_${generateId()}`,
      canvas: {
        nodes: [],
        edges: [],
      },
      settings: {
        enabled: true,
        retryOnFailure: true,
        maxRetries: 3,
      },
      variables: [],
      status: 'draft',
      version: 1,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a simple form-to-email workflow
   */
  formToEmail: (formId: string, recipientEmail: string = 'team@example.com'): BaseWorkflowConfig => {
    const trigger = NodeFactory.formTrigger(formId);
    const email = NodeFactory.emailSend(
      recipientEmail,
      'New Form Submission: {{trigger.data.name}}',
      'A new submission was received.\n\nData: {{JSON.stringify(trigger.data)}}'
    );

    return WorkflowFactory.create({
      name: 'Form to Email Notification',
      canvas: {
        nodes: [trigger, email],
        edges: [EdgeFactory.create(trigger.id, email.id)],
      },
    });
  },

  /**
   * Create a workflow with conditional branching
   */
  conditionalWorkflow: (formId: string): BaseWorkflowConfig => {
    const trigger = NodeFactory.formTrigger(formId);
    const condition = NodeFactory.condition([
      { field: 'trigger.data.priority', operator: 'equals', value: 'high' },
    ]);
    const urgentEmail = NodeFactory.emailSend(
      'urgent@example.com',
      'URGENT: {{trigger.data.subject}}',
      'This is a high priority submission.'
    );
    const normalEmail = NodeFactory.emailSend(
      'support@example.com',
      '{{trigger.data.subject}}',
      'New submission received.'
    );

    return WorkflowFactory.create({
      name: 'Conditional Email Routing',
      canvas: {
        nodes: [trigger, condition, urgentEmail, normalEmail],
        edges: [
          EdgeFactory.create(trigger.id, condition.id),
          EdgeFactory.conditional(condition.id, urgentEmail.id, 'true'),
          EdgeFactory.conditional(condition.id, normalEmail.id, 'false'),
        ],
      },
    });
  },

  /**
   * Create a workflow with AI classification
   */
  aiClassificationWorkflow: (formId: string): BaseWorkflowConfig => {
    const trigger = NodeFactory.formTrigger(formId);
    const classify = NodeFactory.aiClassify(['support', 'sales', 'feedback', 'other']);
    const switchNode = NodeFactory.switch('classify.result', [
      { value: 'support', label: 'Support' },
      { value: 'sales', label: 'Sales' },
      { value: 'feedback', label: 'Feedback' },
    ]);

    return WorkflowFactory.create({
      name: 'AI-Powered Ticket Routing',
      canvas: {
        nodes: [trigger, classify, switchNode],
        edges: [
          EdgeFactory.create(trigger.id, classify.id),
          EdgeFactory.create(classify.id, switchNode.id),
        ],
      },
    });
  },

  /**
   * Create a workflow with HTTP webhook
   */
  webhookWorkflow: (formId: string, webhookUrl: string): BaseWorkflowConfig => {
    const trigger = NodeFactory.formTrigger(formId);
    const httpRequest = NodeFactory.httpRequest(webhookUrl, 'POST', {
      data: {
        headers: { 'Content-Type': 'application/json' },
        body: '{{trigger.data}}',
      },
    });

    return WorkflowFactory.create({
      name: 'Webhook Integration',
      canvas: {
        nodes: [trigger, httpRequest],
        edges: [EdgeFactory.create(trigger.id, httpRequest.id)],
      },
    });
  },

  /**
   * Create a scheduled workflow
   */
  scheduledWorkflow: (cron: string = '0 9 * * MON'): BaseWorkflowConfig => {
    const trigger = NodeFactory.scheduleTrigger(cron);
    const mongoQuery = NodeFactory.mongodbQuery('reports', 'find', {
      data: { query: { status: 'pending' } },
    });
    const email = NodeFactory.emailSend(
      'reports@example.com',
      'Weekly Report',
      'Report data: {{mongodb.results}}'
    );

    return WorkflowFactory.create({
      name: 'Weekly Report Generator',
      canvas: {
        nodes: [trigger, mongoQuery, email],
        edges: [
          EdgeFactory.create(trigger.id, mongoQuery.id),
          EdgeFactory.create(mongoQuery.id, email.id),
        ],
      },
    });
  },

  /**
   * Create a workflow with delay
   */
  delayedWorkflow: (formId: string, delayMinutes: number = 30): BaseWorkflowConfig => {
    const trigger = NodeFactory.formTrigger(formId);
    const delay = NodeFactory.delay(delayMinutes, 'minutes');
    const email = NodeFactory.emailSend(
      '{{trigger.data.email}}',
      'Thank you for your submission!',
      'We received your submission and will respond soon.'
    );

    return WorkflowFactory.create({
      name: 'Delayed Follow-up',
      canvas: {
        nodes: [trigger, delay, email],
        edges: [
          EdgeFactory.create(trigger.id, delay.id),
          EdgeFactory.create(delay.id, email.id),
        ],
      },
    });
  },

  /**
   * Create a complex multi-step workflow
   */
  complexWorkflow: (formId: string): BaseWorkflowConfig => {
    const trigger = NodeFactory.formTrigger(formId);
    const setVar = NodeFactory.setVariable('processed', true);
    const aiSummarize = NodeFactory.aiSummarize();
    const condition = NodeFactory.condition([
      { field: 'trigger.data.type', operator: 'equals', value: 'urgent' },
    ]);
    const slackUrgent = NodeFactory.slackMessage('#urgent', 'Urgent submission received!');
    const slackNormal = NodeFactory.slackMessage('#general', 'New submission received.');
    const httpWebhook = NodeFactory.httpRequest('https://api.example.com/webhook', 'POST');
    const email = NodeFactory.emailSend(
      '{{trigger.data.email}}',
      'Your submission was received',
      'Thank you!'
    );

    return WorkflowFactory.create({
      name: 'Complex Multi-Step Workflow',
      canvas: {
        nodes: [trigger, setVar, aiSummarize, condition, slackUrgent, slackNormal, httpWebhook, email],
        edges: [
          EdgeFactory.create(trigger.id, setVar.id),
          EdgeFactory.create(setVar.id, aiSummarize.id),
          EdgeFactory.create(aiSummarize.id, condition.id),
          EdgeFactory.conditional(condition.id, slackUrgent.id, 'true'),
          EdgeFactory.conditional(condition.id, slackNormal.id, 'false'),
          EdgeFactory.create(slackUrgent.id, httpWebhook.id),
          EdgeFactory.create(slackNormal.id, httpWebhook.id),
          EdgeFactory.create(httpWebhook.id, email.id),
        ],
      },
    });
  },
};

/**
 * Execution context factory for testing workflow execution
 */
export const ExecutionContextFactory = {
  /**
   * Create a form submission trigger context
   */
  formSubmission: (formId: string, data: Record<string, unknown> = {}) => ({
    trigger: {
      type: 'form_submission',
      formId,
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test submission',
        ...data,
      },
      metadata: {
        submittedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
    },
    variables: {},
  }),

  /**
   * Create a webhook trigger context
   */
  webhookRequest: (payload: Record<string, unknown> = {}) => ({
    trigger: {
      type: 'webhook',
      data: payload,
      metadata: {
        method: 'POST',
        path: '/webhook/test',
        headers: {},
      },
    },
    variables: {},
  }),

  /**
   * Create a scheduled trigger context
   */
  scheduled: () => ({
    trigger: {
      type: 'schedule',
      data: {},
      metadata: {
        scheduledTime: new Date().toISOString(),
        cron: '0 9 * * *',
      },
    },
    variables: {},
  }),
};

export default WorkflowFactory;
