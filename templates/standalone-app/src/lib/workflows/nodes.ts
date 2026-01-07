/**
 * Workflow Node Executors
 *
 * Handles execution of individual workflow node types.
 * Each node type has its own executor function.
 */

interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workflowSlug: string;
  input: Record<string, any>;
  variables: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    nodeId?: string;
    data?: any;
  }>;
}

interface WorkflowNode {
  id: string;
  type: string;
  data?: {
    label?: string;
    type?: string;
    config?: Record<string, any>;
    [key: string]: any;
  };
  position?: { x: number; y: number };
}

/**
 * Execute a workflow node based on its type
 */
export async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const nodeType = node.type || node.data?.type;

  switch (nodeType) {
    case 'email':
    case 'send_email':
      return executeEmailNode(node, context);

    case 'http':
    case 'http_request':
    case 'api_call':
      return executeHttpNode(node, context);

    case 'condition':
    case 'if':
    case 'branch':
      return executeConditionNode(node, context);

    case 'transform':
    case 'data_transform':
    case 'map':
      return executeTransformNode(node, context);

    case 'delay':
    case 'wait':
      return executeDelayNode(node, context);

    case 'log':
    case 'debug':
      return executeLogNode(node, context);

    case 'set_variable':
    case 'assign':
      return executeSetVariableNode(node, context);

    case 'mongodb':
    case 'database':
    case 'db_query':
      return executeMongoDBNode(node, context);

    case 'webhook':
    case 'webhook_call':
      return executeWebhookNode(node, context);

    case 'script':
    case 'code':
    case 'javascript':
      return executeScriptNode(node, context);

    default:
      console.warn(`[Workflow] Unknown node type: ${nodeType}, skipping`);
      return { skipped: true, reason: `Unknown node type: ${nodeType}` };
  }
}

/**
 * Resolve template variables in a string
 * Supports {{variable}} and {{node_id.property}} syntax
 */
function resolveTemplate(template: string, context: ExecutionContext): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(context.variables, trimmedPath);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Resolve all template variables in an object
 */
function resolveTemplateObject(obj: any, context: ExecutionContext): any {
  if (typeof obj === 'string') {
    return resolveTemplate(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTemplateObject(item, context));
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveTemplateObject(value, context);
    }
    return result;
  }

  return obj;
}

/**
 * Email Node - Send emails (stub for standalone mode)
 */
async function executeEmailNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const to = resolveTemplate(config.to || config.recipient, context);
  const subject = resolveTemplate(config.subject || '', context);
  const body = resolveTemplate(config.body || config.message || '', context);

  // In standalone mode, we log the email intent
  // Real email sending would require SMTP configuration
  console.log(`[Workflow Email] Would send email:`);
  console.log(`  To: ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body: ${body.substring(0, 100)}...`);

  // Check for email service configuration
  const emailServiceUrl = process.env.EMAIL_SERVICE_URL;

  if (emailServiceUrl) {
    try {
      const response = await fetch(emailServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EMAIL_SERVICE_API_KEY && {
            Authorization: `Bearer ${process.env.EMAIL_SERVICE_API_KEY}`,
          }),
        },
        body: JSON.stringify({ to, subject, body, html: config.html }),
      });

      if (!response.ok) {
        throw new Error(`Email service returned ${response.status}`);
      }

      return { sent: true, to, subject };
    } catch (error) {
      console.error('[Workflow Email] Failed to send:', error);
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        to,
        subject,
      };
    }
  }

  // Return logged intent if no email service configured
  return { logged: true, to, subject, body };
}

/**
 * HTTP Node - Make HTTP requests
 */
async function executeHttpNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const url = resolveTemplate(config.url || '', context);
  const method = (config.method || 'GET').toUpperCase();
  const headers = resolveTemplateObject(config.headers || {}, context);
  let body = config.body;

  if (body && typeof body === 'object') {
    body = resolveTemplateObject(body, context);
  } else if (body && typeof body === 'string') {
    body = resolveTemplate(body, context);
  }

  if (!url) {
    throw new Error('HTTP node requires a URL');
  }

  console.log(`[Workflow HTTP] ${method} ${url}`);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get('content-type') || '';

  let responseData: any;
  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    data: responseData,
  };
}

/**
 * Condition Node - Evaluate conditions
 */
async function executeConditionNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const field = resolveTemplate(config.field || '', context);
  const operator = config.operator || 'equals';
  const value = resolveTemplate(String(config.value || ''), context);

  // Get the field value from context
  const fieldValue = getNestedValue(context.variables, field);

  let result = false;

  switch (operator) {
    case 'equals':
    case '==':
    case '===':
      result = String(fieldValue) === String(value);
      break;
    case 'not_equals':
    case '!=':
    case '!==':
      result = String(fieldValue) !== String(value);
      break;
    case 'contains':
      result = String(fieldValue).includes(value);
      break;
    case 'not_contains':
      result = !String(fieldValue).includes(value);
      break;
    case 'greater_than':
    case '>':
      result = Number(fieldValue) > Number(value);
      break;
    case 'less_than':
    case '<':
      result = Number(fieldValue) < Number(value);
      break;
    case 'greater_than_or_equal':
    case '>=':
      result = Number(fieldValue) >= Number(value);
      break;
    case 'less_than_or_equal':
    case '<=':
      result = Number(fieldValue) <= Number(value);
      break;
    case 'is_empty':
      result = !fieldValue || fieldValue === '' || fieldValue === null;
      break;
    case 'is_not_empty':
      result = !!fieldValue && fieldValue !== '';
      break;
    case 'starts_with':
      result = String(fieldValue).startsWith(value);
      break;
    case 'ends_with':
      result = String(fieldValue).endsWith(value);
      break;
    case 'regex':
      try {
        const regex = new RegExp(value);
        result = regex.test(String(fieldValue));
      } catch {
        result = false;
      }
      break;
    default:
      console.warn(`[Workflow Condition] Unknown operator: ${operator}`);
      result = false;
  }

  return {
    condition: { field, operator, value },
    fieldValue,
    result,
    branch: result ? 'true' : 'false',
  };
}

/**
 * Transform Node - Transform data
 */
async function executeTransformNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const transformType = config.transformType || config.type || 'map';
  const input = config.input
    ? getNestedValue(context.variables, resolveTemplate(config.input, context))
    : context.variables;

  switch (transformType) {
    case 'map':
      // Map input fields to output fields
      const mapping = config.mapping || {};
      const mapped: Record<string, any> = {};
      for (const [outputKey, inputPath] of Object.entries(mapping)) {
        mapped[outputKey] = getNestedValue(
          input,
          resolveTemplate(String(inputPath), context)
        );
      }
      return mapped;

    case 'filter':
      // Filter array based on condition
      if (!Array.isArray(input)) {
        return input;
      }
      const filterField = config.filterField || '';
      const filterValue = config.filterValue || '';
      return input.filter((item) => {
        const itemValue = getNestedValue(item, filterField);
        return String(itemValue) === String(filterValue);
      });

    case 'pick':
      // Pick specific fields
      const fields = config.fields || [];
      const picked: Record<string, any> = {};
      for (const field of fields) {
        picked[field] = getNestedValue(input, field);
      }
      return picked;

    case 'merge':
      // Merge multiple objects
      const sources = config.sources || [];
      let merged = {};
      for (const source of sources) {
        const sourceData = getNestedValue(
          context.variables,
          resolveTemplate(source, context)
        );
        if (sourceData && typeof sourceData === 'object') {
          merged = { ...merged, ...sourceData };
        }
      }
      return merged;

    case 'template':
      // Apply a template string
      const template = config.template || '';
      return resolveTemplate(template, context);

    default:
      return input;
  }
}

/**
 * Delay Node - Wait for a specified duration
 */
async function executeDelayNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const duration = parseInt(config.duration || config.delay || '1000', 10);
  const unit = config.unit || 'milliseconds';

  let delayMs = duration;
  switch (unit) {
    case 'seconds':
      delayMs = duration * 1000;
      break;
    case 'minutes':
      delayMs = duration * 60 * 1000;
      break;
    case 'hours':
      delayMs = duration * 60 * 60 * 1000;
      break;
  }

  // Cap delay at 5 minutes for safety
  const maxDelay = 5 * 60 * 1000;
  delayMs = Math.min(delayMs, maxDelay);

  console.log(`[Workflow Delay] Waiting ${delayMs}ms`);

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return { delayed: true, duration: delayMs };
}

/**
 * Log Node - Log data for debugging
 */
async function executeLogNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const message = resolveTemplate(config.message || '', context);
  const level = config.level || 'info';
  const data = config.data
    ? resolveTemplateObject(config.data, context)
    : undefined;

  const logEntry = {
    timestamp: new Date(),
    level,
    message,
    data,
    nodeId: node.id,
  };

  // Add to execution logs
  context.logs.push(logEntry as any);

  // Also console log
  switch (level) {
    case 'error':
      console.error(`[Workflow Log] ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`[Workflow Log] ${message}`, data || '');
      break;
    default:
      console.log(`[Workflow Log] ${message}`, data || '');
  }

  return { logged: true, message, level };
}

/**
 * Set Variable Node - Set a variable in the context
 */
async function executeSetVariableNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const variableName = config.name || config.variable || '';
  let value = config.value;

  if (typeof value === 'string') {
    value = resolveTemplate(value, context);
  } else if (value && typeof value === 'object') {
    value = resolveTemplateObject(value, context);
  }

  if (variableName) {
    context.variables[variableName] = value;
  }

  return { variable: variableName, value };
}

/**
 * MongoDB Node - Execute database operations
 */
async function executeMongoDBNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const operation = config.operation || 'find';
  const collection = resolveTemplate(config.collection || '', context);

  if (!collection) {
    throw new Error('MongoDB node requires a collection name');
  }

  // Import database utilities
  const { getDatabase } = await import('../db');
  const db = await getDatabase();
  const coll = db.collection(collection);

  let query = config.query || {};
  let data = config.data || {};

  // Resolve templates in query and data
  query = resolveTemplateObject(query, context);
  data = resolveTemplateObject(data, context);

  switch (operation) {
    case 'find':
      const findOptions = config.options || {};
      const limit = findOptions.limit || 100;
      const results = await coll.find(query).limit(limit).toArray();
      return { operation: 'find', count: results.length, results };

    case 'findOne':
      const doc = await coll.findOne(query);
      return { operation: 'findOne', found: !!doc, document: doc };

    case 'insertOne':
      const insertResult = await coll.insertOne({
        ...data,
        createdAt: new Date(),
      });
      return {
        operation: 'insertOne',
        insertedId: insertResult.insertedId,
        acknowledged: insertResult.acknowledged,
      };

    case 'insertMany':
      const docs = Array.isArray(data) ? data : [data];
      const insertManyResult = await coll.insertMany(
        docs.map((d: any) => ({ ...d, createdAt: new Date() }))
      );
      return {
        operation: 'insertMany',
        insertedCount: insertManyResult.insertedCount,
        insertedIds: insertManyResult.insertedIds,
      };

    case 'updateOne':
      const updateResult = await coll.updateOne(query, {
        $set: { ...data, updatedAt: new Date() },
      });
      return {
        operation: 'updateOne',
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
      };

    case 'updateMany':
      const updateManyResult = await coll.updateMany(query, {
        $set: { ...data, updatedAt: new Date() },
      });
      return {
        operation: 'updateMany',
        matchedCount: updateManyResult.matchedCount,
        modifiedCount: updateManyResult.modifiedCount,
      };

    case 'deleteOne':
      const deleteResult = await coll.deleteOne(query);
      return {
        operation: 'deleteOne',
        deletedCount: deleteResult.deletedCount,
      };

    case 'deleteMany':
      const deleteManyResult = await coll.deleteMany(query);
      return {
        operation: 'deleteMany',
        deletedCount: deleteManyResult.deletedCount,
      };

    case 'count':
      const count = await coll.countDocuments(query);
      return { operation: 'count', count };

    case 'aggregate':
      const pipeline = config.pipeline || [];
      const aggResults = await coll.aggregate(pipeline).toArray();
      return { operation: 'aggregate', count: aggResults.length, results: aggResults };

    default:
      throw new Error(`Unknown MongoDB operation: ${operation}`);
  }
}

/**
 * Webhook Node - Call external webhooks
 */
async function executeWebhookNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};

  const url = resolveTemplate(config.url || '', context);
  const method = (config.method || 'POST').toUpperCase();
  const headers = resolveTemplateObject(config.headers || {}, context);

  let payload = config.payload || config.body || context.variables;
  payload = resolveTemplateObject(payload, context);

  if (!url) {
    throw new Error('Webhook node requires a URL');
  }

  console.log(`[Workflow Webhook] ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: method !== 'GET' ? JSON.stringify(payload) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  let responseData: any;

  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    data: responseData,
  };
}

/**
 * Script Node - Execute custom JavaScript (sandboxed)
 */
async function executeScriptNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || node.data || {};
  const code = config.code || config.script || '';

  if (!code) {
    return { executed: false, reason: 'No code provided' };
  }

  // Create a sandboxed execution environment
  // Note: This is a simplified sandbox - production should use vm2 or similar
  const sandbox = {
    input: context.input,
    variables: { ...context.variables },
    console: {
      log: (...args: any[]) => console.log('[Workflow Script]', ...args),
      warn: (...args: any[]) => console.warn('[Workflow Script]', ...args),
      error: (...args: any[]) => console.error('[Workflow Script]', ...args),
    },
    result: undefined as any,
  };

  try {
    // Wrap code in async function to support await
    const wrappedCode = `
      (async () => {
        ${code}
      })()
    `;

    // Execute with limited scope
    const fn = new Function(
      'input',
      'variables',
      'console',
      `
      return (async () => {
        const input = arguments[0];
        const variables = arguments[1];
        const console = arguments[2];
        ${code}
      })();
    `
    );

    const result = await fn(sandbox.input, sandbox.variables, sandbox.console);

    return { executed: true, result };
  } catch (error) {
    console.error('[Workflow Script] Execution error:', error);
    return {
      executed: false,
      error: error instanceof Error ? error.message : 'Script execution failed',
    };
  }
}
