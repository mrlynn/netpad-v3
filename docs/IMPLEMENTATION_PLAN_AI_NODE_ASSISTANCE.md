# Implementation Plan: AI-Assisted Node Configuration

## Overview

This plan establishes a standardized pattern for adding AI assistance to all workflow node types. Currently, only the MongoDB query node has AI assistance ("Generate with AI" button). This implementation will extend that capability to all nodes in a consistent, maintainable way.

## Goals

1. **Consistency**: All nodes follow the same AI assistance pattern
2. **Efficiency**: Single API endpoint with node-specific prompts
3. **Context-Aware**: AI understands workflow context (upstream nodes, triggers)
4. **Extensible**: Easy to add AI assistance to new node types
5. **User-Friendly**: Intuitive UI that matches existing patterns

---

## Architecture

### Component Hierarchy

```
NodeConfigPanel
  └── [Node]Editor (Action/Integration/Trigger/AI/etc.)
        └── ConfigFieldRenderer
              └── AIConfigAssistant (NEW - renders when field.aiAssist is defined)
                    └── Calls /api/ai/node-config endpoint
```

### Data Flow

```
User Input (natural language)
    ↓
AIConfigAssistant Component
    ↓
POST /api/ai/node-config
    ↓
nodeConfigGenerator.ts (selects prompt from registry)
    ↓
OpenAI GPT-4o
    ↓
Structured JSON response
    ↓
Preview & Apply to config field
```

---

## Files to Create

### 1. Types Definition
**File**: `src/lib/ai/types/nodeConfig.ts`

```typescript
/**
 * Types for AI-assisted node configuration
 */

export interface AIAssistConfig {
  enabled: boolean;
  endpoint?: string;  // Defaults to '/api/ai/node-config'
  promptHint: string; // Placeholder text for user input
  contextFields?: string[]; // Other config fields to include as context
  outputFormat?: 'json' | 'text' | 'code'; // Expected output format
}

export interface NodeConfigGenerationRequest {
  nodeType: string;
  fieldKey: string;
  userQuery: string;
  currentConfig: Record<string, unknown>;
  currentFieldValue?: unknown;
  workflowContext: WorkflowContextForAI;
}

export interface NodeConfigGenerationResponse {
  result: unknown; // The generated config value
  explanation?: string;
  suggestions?: string[]; // Optional follow-up suggestions
}

export interface WorkflowContextForAI {
  upstreamNodes: Array<{
    id: string;
    type: string;
    label: string;
    outputFields: string[];
  }>;
  triggerInfo?: {
    type: string;
    label: string;
    availableFields: string[];
  };
}

export interface NodePromptConfig {
  systemPrompt: string;
  outputFormat: 'json' | 'text' | 'code';
  temperature?: number; // Defaults to 0.3
  examples?: Array<{
    input: string;
    output: string;
  }>;
}
```

### 2. Node Configuration Prompts Registry
**File**: `src/lib/ai/nodeConfigPrompts.ts`

```typescript
/**
 * System prompts for AI-assisted node configuration
 * Each node type can have prompts for specific fields
 */

import { NodePromptConfig } from './types/nodeConfig';

const WORKFLOW_CONTEXT_INSTRUCTIONS = `
WORKFLOW CONTEXT:
This configuration is part of a workflow automation system. When the user mentions
"form data", "trigger data", "previous step", "upstream", etc., they are referring
to data from workflow nodes. Use the variable syntax {{nodes.<nodeId>.<field>}}
to reference this data.

IMPORTANT: When referencing dynamic data, always use the {{...}} variable syntax.
`;

export const NODE_CONFIG_PROMPTS: Record<string, Record<string, NodePromptConfig>> = {
  // ============================================
  // HTTP REQUEST NODE
  // ============================================
  'http-request': {
    headers: {
      systemPrompt: `You are an expert at configuring HTTP request headers for API integrations.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate valid HTTP headers as a JSON object based on the user's description.

Common header patterns:
- Authorization: "Bearer {{nodes.nodeId.token}}" or "Basic <base64>"
- Content-Type: "application/json", "application/x-www-form-urlencoded", etc.
- Accept: "application/json"
- Custom headers for specific APIs (X-API-Key, X-Request-ID, etc.)

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { "Header-Name": "value", ... },
  "explanation": "Brief explanation of the headers"
}
2. Use proper HTTP header naming conventions (Title-Case)
3. When the user mentions API keys, tokens, or secrets, suggest using workflow variables
4. Include Content-Type when the request will have a body

Examples:
- "JSON API with bearer token" → { "Authorization": "Bearer {{token}}", "Content-Type": "application/json", "Accept": "application/json" }
- "Form submission" → { "Content-Type": "application/x-www-form-urlencoded" }`,
      outputFormat: 'json',
      temperature: 0.3,
    },

    body: {
      systemPrompt: `You are an expert at constructing HTTP request bodies for API integrations.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a valid request body (usually JSON) based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { ... the request body ... },
  "explanation": "Brief explanation of the body structure"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic data
3. Follow RESTful conventions for the operation type (POST/PUT/PATCH)
4. Structure nested objects appropriately for the target API

Examples:
- "Create user with form data" → { "email": "{{nodes.form-trigger_abc.data.email}}", "name": "{{nodes.form-trigger_abc.data.name}}" }
- "Update status to active" → { "status": "active", "updatedAt": "{{nodes.trigger.timestamp}}" }`,
      outputFormat: 'json',
      temperature: 0.3,
    },

    url: {
      systemPrompt: `You are an expert at constructing API URLs with proper path parameters and query strings.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to help construct or modify a URL based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "https://api.example.com/path?param=value",
  "explanation": "Brief explanation of the URL structure"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic path segments or query params
3. Properly encode special characters in query parameters
4. Use standard REST patterns for resource URLs

Examples:
- "Get user by ID from form" → "https://api.example.com/users/{{nodes.form-trigger_abc.data.userId}}"
- "Search with query param" → "https://api.example.com/search?q={{nodes.trigger.data.searchTerm}}"`,
      outputFormat: 'text',
      temperature: 0.3,
    },
  },

  // ============================================
  // EMAIL SEND NODE
  // ============================================
  'email-send': {
    subject: {
      systemPrompt: `You are an expert at writing effective email subject lines.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate an email subject line based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "Your subject line here",
  "explanation": "Why this subject line works"
}
2. Keep subject lines concise (under 60 characters when possible)
3. Use workflow variables {{nodes.<nodeId>.<field>}} for personalization
4. Avoid spam trigger words unless specifically requested
5. Make it clear, actionable, and relevant

Examples:
- "Welcome email with name" → "Welcome to our platform, {{nodes.form-trigger_abc.data.firstName}}!"
- "Order confirmation" → "Your order #{{nodes.trigger.data.orderId}} is confirmed"`,
      outputFormat: 'text',
      temperature: 0.5,
    },

    body: {
      systemPrompt: `You are an expert at writing professional email content.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate email body content (HTML or plain text) based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "<html content or plain text>",
  "explanation": "Brief explanation of the email structure"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic content
3. Structure emails with clear sections (greeting, body, call-to-action, signature)
4. Use appropriate HTML for formatting when requested
5. Keep tone professional unless otherwise specified

Examples:
- "Welcome email" → "<h1>Welcome!</h1><p>Hi {{nodes.trigger.data.name}},</p><p>Thank you for signing up...</p>"
- "Simple notification" → "Your request has been processed. Reference: {{nodes.trigger.data.id}}"`,
      outputFormat: 'text',
      temperature: 0.6,
    },

    to: {
      systemPrompt: `You are helping configure email recipients.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to determine the correct email recipient(s) based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "email@example.com or {{variable}}",
  "explanation": "Where this email address comes from"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic recipients
3. Support comma-separated emails for multiple recipients
4. Validate email format when static emails are provided`,
      outputFormat: 'text',
      temperature: 0.2,
    },
  },

  // ============================================
  // TRANSFORM NODE
  // ============================================
  'transform': {
    expression: {
      systemPrompt: `You are an expert at writing JavaScript data transformation expressions.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a JavaScript expression or code block that transforms workflow data.

The transform node receives input data and should return transformed output.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "JavaScript expression or code",
  "explanation": "What this transformation does"
}
2. Access input data via the 'input' variable
3. Use workflow variables {{nodes.<nodeId>.<field>}} when referencing specific upstream data
4. Return the transformed result
5. Keep transformations pure (no side effects)

Common patterns:
- Map array: input.map(item => ({ ...item, newField: item.existingField }))
- Filter: input.filter(item => item.status === 'active')
- Extract field: input.data.fieldName
- Combine data: { ...input.user, orders: input.orders }
- Format date: new Date(input.timestamp).toISOString()

Examples:
- "Extract just the email addresses" → "input.users.map(u => u.email)"
- "Add a processed flag" → "{ ...input, processed: true, processedAt: new Date().toISOString() }"`,
      outputFormat: 'code',
      temperature: 0.3,
    },
  },

  // ============================================
  // CONDITIONAL NODE
  // ============================================
  'conditional': {
    condition: {
      systemPrompt: `You are an expert at writing conditional logic expressions.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a JavaScript boolean expression for workflow branching.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "boolean expression",
  "explanation": "When this condition is true vs false"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} to reference data
3. Expression must evaluate to true or false
4. Use proper comparison operators (===, !==, >, <, >=, <=)
5. Combine conditions with && (and) or || (or)

Common patterns:
- Equality: {{nodes.trigger.data.status}} === 'approved'
- Existence: {{nodes.trigger.data.email}} != null
- Numeric: {{nodes.trigger.data.amount}} > 100
- Array: {{nodes.trigger.data.tags}}.includes('priority')
- Combined: {{nodes.trigger.data.status}} === 'active' && {{nodes.trigger.data.verified}} === true

Examples:
- "Check if approved" → "{{nodes.trigger.data.status}} === 'approved'"
- "High value order" → "{{nodes.trigger.data.total}} >= 1000"`,
      outputFormat: 'code',
      temperature: 0.2,
    },
  },

  // ============================================
  // SWITCH NODE
  // ============================================
  'switch': {
    expression: {
      systemPrompt: `You are an expert at writing switch/routing expressions.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate an expression that returns a value for switch-case routing.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "expression that returns a value",
  "explanation": "What values this can return and when"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} to reference data
3. Expression should return a string or number that matches case values
4. Keep it simple - extract or compute the routing value

Examples:
- "Route by status" → "{{nodes.trigger.data.status}}"
- "Route by category" → "{{nodes.trigger.data.category}}.toLowerCase()"`,
      outputFormat: 'code',
      temperature: 0.2,
    },
  },

  // ============================================
  // GOOGLE SHEETS NODE
  // ============================================
  'google-sheets': {
    values: {
      systemPrompt: `You are an expert at formatting data for Google Sheets.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a 2D array of values to write to Google Sheets.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": [["col1", "col2"], ["val1", "val2"]],
  "explanation": "How the data is structured"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic data
3. First row can be headers if appending to empty sheet
4. Format dates and numbers as strings for consistency
5. Handle arrays by flattening or joining values

Examples:
- "Add form submission as row" → [["{{nodes.trigger.data.name}}", "{{nodes.trigger.data.email}}", "{{nodes.trigger.data.message}}"]]
- "Add with headers" → [["Name", "Email", "Date"], ["{{nodes.trigger.data.name}}", "{{nodes.trigger.data.email}}", "{{nodes.trigger.submittedAt}}"]]`,
      outputFormat: 'json',
      temperature: 0.3,
    },

    range: {
      systemPrompt: `You are helping configure a Google Sheets range.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a valid Google Sheets range notation.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "Sheet1!A1:D10",
  "explanation": "What this range covers"
}
2. Use A1 notation: SheetName!ColumnRow:ColumnRow
3. Use just sheet name for entire sheet: "Sheet1"
4. Use open-ended ranges for appending: "Sheet1!A:D"

Examples:
- "First sheet, columns A through D" → "Sheet1!A:D"
- "Specific range" → "Data!A1:E100"`,
      outputFormat: 'text',
      temperature: 0.2,
    },
  },

  // ============================================
  // AI PROMPT NODE
  // ============================================
  'ai-prompt': {
    prompt: {
      systemPrompt: `You are an expert at crafting effective AI prompts.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate or improve an AI prompt based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "The AI prompt text",
  "explanation": "Why this prompt structure is effective"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic content
3. Structure prompts with clear instructions, context, and expected output format
4. Be specific about the desired response format
5. Include relevant context from upstream workflow data

Prompt engineering best practices:
- Start with the role or task
- Provide clear, specific instructions
- Include examples when helpful
- Specify output format
- Use delimiters for variable content

Examples:
- "Summarize form feedback" → "Analyze the following customer feedback and provide a brief summary with sentiment:\\n\\nFeedback: {{nodes.trigger.data.feedback}}\\n\\nProvide: 1) One-sentence summary 2) Sentiment (positive/neutral/negative) 3) Key themes"`,
      outputFormat: 'text',
      temperature: 0.6,
    },
  },

  // ============================================
  // AI CLASSIFY NODE
  // ============================================
  'ai-classify': {
    categories: {
      systemPrompt: `You are helping define classification categories.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a list of classification categories based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": ["category1", "category2", "category3"],
  "explanation": "What each category represents"
}
2. Keep category names concise and clear
3. Ensure categories are mutually exclusive when possible
4. Include an "other" or "unknown" category for edge cases

Examples:
- "Support ticket types" → ["billing", "technical", "account", "feature_request", "other"]
- "Sentiment" → ["positive", "neutral", "negative"]`,
      outputFormat: 'json',
      temperature: 0.4,
    },
  },

  // ============================================
  // AI EXTRACT NODE
  // ============================================
  'ai-extract': {
    schema: {
      systemPrompt: `You are helping define an extraction schema.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a JSON schema for data extraction based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { "field1": "description1", "field2": "description2" },
  "explanation": "What each field extracts"
}
2. Use descriptive field names in camelCase
3. Add field descriptions to guide extraction
4. Consider optional vs required fields

Examples:
- "Extract contact info" → { "name": "Full name of the person", "email": "Email address", "phone": "Phone number if provided" }
- "Extract order details" → { "orderId": "Order or reference number", "items": "List of items ordered", "total": "Total amount" }`,
      outputFormat: 'json',
      temperature: 0.4,
    },
  },

  // ============================================
  // NOTIFICATION NODE
  // ============================================
  'notification': {
    message: {
      systemPrompt: `You are an expert at writing notification messages.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a notification message based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "Notification message text",
  "explanation": "What triggers this notification"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic content
3. Keep messages concise and actionable
4. Include relevant context (who, what, when)

Examples:
- "New form submission alert" → "New submission from {{nodes.trigger.data.email}}: {{nodes.trigger.data.subject}}"
- "Task completed" → "Task '{{nodes.trigger.data.taskName}}' completed successfully"`,
      outputFormat: 'text',
      temperature: 0.5,
    },

    title: {
      systemPrompt: `You are helping write notification titles.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a notification title based on the user's description.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "Notification title",
  "explanation": "What this notification is about"
}
2. Keep titles short (under 50 characters)
3. Make them descriptive and scannable
4. Use workflow variables if personalization is needed

Examples:
- "New order" → "New Order Received"
- "Error alert" → "Workflow Error: Action Required"`,
      outputFormat: 'text',
      temperature: 0.4,
    },
  },

  // ============================================
  // LOOP NODE
  // ============================================
  'loop': {
    items: {
      systemPrompt: `You are helping configure a loop iteration source.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to specify which array to iterate over in the loop.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "{{nodes.nodeId.arrayField}}",
  "explanation": "What items will be iterated"
}
2. Must reference an array from upstream workflow data
3. Use the exact workflow variable syntax

Examples:
- "Loop through query results" → "{{nodes.mongodb-query_abc.documents}}"
- "Loop through form items" → "{{nodes.trigger.data.items}}"`,
      outputFormat: 'text',
      temperature: 0.2,
    },
  },

  // ============================================
  // DELAY NODE
  // ============================================
  'delay': {
    duration: {
      systemPrompt: `You are helping configure a delay duration.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to specify the delay duration in milliseconds or as an expression.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": 5000,
  "explanation": "How long the delay is and why"
}
2. Return a number (milliseconds) or expression
3. Common values: 1000 (1 sec), 60000 (1 min), 3600000 (1 hour)
4. Can use workflow variables for dynamic delays

Examples:
- "Wait 5 seconds" → 5000
- "Wait 1 minute" → 60000
- "Wait based on priority" → "{{nodes.trigger.data.priority}} === 'high' ? 1000 : 10000"`,
      outputFormat: 'code',
      temperature: 0.2,
    },
  },

  // ============================================
  // MONGODB WRITE NODE (extends existing)
  // ============================================
  'mongodb-write': {
    document: {
      systemPrompt: `You are an expert at constructing MongoDB documents for write operations.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a MongoDB document or update operation based on the user's description.

For INSERT operations:
- Generate a complete document to insert

For UPDATE operations:
- Use update operators: $set, $inc, $push, $pull, $unset, etc.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { ... document or update ... },
  "explanation": "What this operation does"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic data
3. Use proper MongoDB update operator syntax for updates
4. Include _id only if explicitly needed

Examples (INSERT):
- "Insert form data" → { "email": "{{nodes.trigger.data.email}}", "name": "{{nodes.trigger.data.name}}", "createdAt": "{{nodes.trigger.submittedAt}}" }

Examples (UPDATE):
- "Set status to processed" → { "$set": { "status": "processed", "processedAt": new Date().toISOString() } }
- "Increment view count" → { "$inc": { "views": 1 } }`,
      outputFormat: 'json',
      temperature: 0.3,
    },
  },

  // ============================================
  // WEBHOOK TRIGGER (for response configuration)
  // ============================================
  'webhook-trigger': {
    responseBody: {
      systemPrompt: `You are helping configure a webhook response body.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate the response body that will be sent back to the webhook caller.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { ... response body ... },
  "explanation": "What the webhook will respond with"
}
2. Use workflow variables for dynamic response data
3. Follow REST conventions for response structure
4. Include appropriate status fields

Examples:
- "Success response" → { "success": true, "message": "Received", "id": "{{nodes.mongodb-write_abc.insertedId}}" }
- "Acknowledgment" → { "status": "accepted", "timestamp": "{{nodes.trigger.receivedAt}}" }`,
      outputFormat: 'json',
      temperature: 0.3,
    },
  },

  // ============================================
  // CODE NODE
  // ============================================
  'code': {
    code: {
      systemPrompt: `You are an expert JavaScript developer helping write custom workflow code.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate JavaScript code for a custom workflow action.

The code runs in a sandboxed environment with access to:
- input: The data from the previous node
- context: Workflow context and utilities

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": "// JavaScript code here",
  "explanation": "What this code does"
}
2. Use async/await for asynchronous operations
3. Return a value that will be passed to downstream nodes
4. Keep code focused and efficient
5. Handle errors appropriately

Examples:
- "Calculate total" → "const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);\\nreturn { total, itemCount: input.items.length };"
- "Format for API" → "return { userId: input.id, fullName: \`\${input.firstName} \${input.lastName}\`, email: input.email.toLowerCase() };"`,
      outputFormat: 'code',
      temperature: 0.4,
    },
  },

  // ============================================
  // ATLAS DATA API NODE
  // ============================================
  'atlas-data-api': {
    filter: {
      systemPrompt: `You are an expert MongoDB query builder for Atlas Data API.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a MongoDB filter query for the Atlas Data API.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { ... filter query ... },
  "explanation": "What documents this filter matches"
}
2. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic values
3. Follow standard MongoDB query syntax
4. Keep filters efficient with proper indexing in mind

Examples:
- "Find by email" → { "email": "{{nodes.trigger.data.email}}" }
- "Active users" → { "status": "active", "deletedAt": { "$exists": false } }`,
      outputFormat: 'json',
      temperature: 0.3,
    },

    update: {
      systemPrompt: `You are an expert at MongoDB update operations for Atlas Data API.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a MongoDB update operation.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": { "$set": { ... }, ... },
  "explanation": "What this update does"
}
2. Use MongoDB update operators: $set, $inc, $push, $pull, $unset, etc.
3. Use workflow variables {{nodes.<nodeId>.<field>}} for dynamic values

Examples:
- "Update status" → { "$set": { "status": "{{nodes.trigger.data.newStatus}}", "updatedAt": { "$date": { "$numberLong": "{{Date.now()}}" } } } }`,
      outputFormat: 'json',
      temperature: 0.3,
    },

    pipeline: {
      systemPrompt: `You are an expert MongoDB aggregation pipeline builder.
${WORKFLOW_CONTEXT_INSTRUCTIONS}

Your task is to generate a MongoDB aggregation pipeline for the Atlas Data API.

Rules:
1. Return ONLY valid JSON in this format:
{
  "result": [ { "$match": ... }, { "$group": ... }, ... ],
  "explanation": "What this pipeline does"
}
2. Use proper aggregation stage syntax ($match, $group, $project, $sort, $limit, etc.)
3. Use workflow variables {{nodes.<nodeId>.<field>}} in $match stages
4. Optimize pipeline order for performance

Examples:
- "Group by status with count" → [{ "$group": { "_id": "$status", "count": { "$sum": 1 } } }, { "$sort": { "count": -1 } }]`,
      outputFormat: 'json',
      temperature: 0.3,
    },
  },
};

// Export a helper to get prompts with defaults
export function getNodePromptConfig(
  nodeType: string,
  fieldKey: string
): NodePromptConfig | null {
  const nodePrompts = NODE_CONFIG_PROMPTS[nodeType];
  if (!nodePrompts) return null;
  return nodePrompts[fieldKey] || null;
}

// Export list of all AI-enabled fields for reference
export function getAIEnabledFields(nodeType: string): string[] {
  const nodePrompts = NODE_CONFIG_PROMPTS[nodeType];
  if (!nodePrompts) return [];
  return Object.keys(nodePrompts);
}
```

### 3. Node Configuration Generator Service
**File**: `src/lib/ai/nodeConfigGenerator.ts`

```typescript
/**
 * AI-powered node configuration generator
 * Unified service for generating node config from natural language
 */

// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('nodeConfigGenerator can only be used on the server');
}

import {
  NodeConfigGenerationRequest,
  NodeConfigGenerationResponse,
  WorkflowContextForAI
} from './types/nodeConfig';
import { getNodePromptConfig } from './nodeConfigPrompts';

// Dynamic import for OpenAI to avoid client-side bundling issues
async function getOpenAIClient() {
  const { default: OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({ apiKey });
}

export async function generateNodeConfig(
  request: NodeConfigGenerationRequest
): Promise<NodeConfigGenerationResponse> {
  const promptConfig = getNodePromptConfig(request.nodeType, request.fieldKey);

  if (!promptConfig) {
    throw new Error(
      `No AI prompt configured for ${request.nodeType}.${request.fieldKey}`
    );
  }

  const userPrompt = buildUserPrompt(request);

  try {
    const client = await getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: promptConfig.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: promptConfig.temperature ?? 0.3,
      response_format: { type: 'json_object' }
    } as Parameters<typeof client.chat.completions.create>[0]);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse and validate response
    let parsed: { result?: unknown; explanation?: string; suggestions?: string[] };
    try {
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
    }

    if (parsed.result === undefined) {
      throw new Error('Invalid response format: missing result');
    }

    return {
      result: parsed.result,
      explanation: parsed.explanation,
      suggestions: parsed.suggestions
    };
  } catch (error: unknown) {
    console.error('Error generating node config:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate configuration: ${String(error)}`);
  }
}

function buildUserPrompt(request: NodeConfigGenerationRequest): string {
  let prompt = `Generate configuration for: "${request.userQuery}"\n\n`;

  prompt += `Node type: ${request.nodeType}\n`;
  prompt += `Field: ${request.fieldKey}\n`;

  // Include current config context
  if (request.currentConfig && Object.keys(request.currentConfig).length > 0) {
    prompt += `\nCurrent node configuration:\n`;
    prompt += JSON.stringify(request.currentConfig, null, 2);
    prompt += '\n';
  }

  // Include current field value if exists
  if (request.currentFieldValue !== undefined && request.currentFieldValue !== '') {
    prompt += `\nCurrent value for this field:\n`;
    prompt += typeof request.currentFieldValue === 'string'
      ? request.currentFieldValue
      : JSON.stringify(request.currentFieldValue, null, 2);
    prompt += '\n\nNote: The user may want to modify or extend this existing value.\n';
  }

  // Include workflow context
  if (request.workflowContext) {
    const { upstreamNodes, triggerInfo } = request.workflowContext;

    if (triggerInfo) {
      prompt += `\n=== WORKFLOW TRIGGER ===\n`;
      prompt += `Type: ${triggerInfo.type}\n`;
      prompt += `Label: ${triggerInfo.label}\n`;
      prompt += `Available data:\n`;
      for (const field of triggerInfo.availableFields) {
        prompt += `  - ${field}\n`;
      }
    }

    if (upstreamNodes.length > 0) {
      prompt += `\n=== UPSTREAM NODES (available data from previous steps) ===\n`;
      for (const node of upstreamNodes) {
        prompt += `\nNode: "${node.label}" (${node.type})\n`;
        prompt += `Variables:\n`;
        for (const field of node.outputFields) {
          prompt += `  - ${field}\n`;
        }
      }
    }
  }

  prompt += `\nGenerate the appropriate configuration.`;

  return prompt;
}
```

### 4. API Route Handler
**File**: `src/app/api/ai/node-config/route.ts`

```typescript
/**
 * Unified API endpoint for AI-assisted node configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequestWithGuestAccess, recordAIUsage, recordGuestUsage } from '@/lib/ai/aiRequestGuard';
import { generateNodeConfig } from '@/lib/ai/nodeConfigGenerator';
import { NodeConfigGenerationRequest } from '@/lib/ai/types/nodeConfig';
import { getNodePromptConfig } from '@/lib/ai/nodeConfigPrompts';

export async function POST(request: NextRequest) {
  try {
    // Validate AI access (with guest support)
    const validation = await validateAIRequestWithGuestAccess(
      'node_config_assistant',
      request,
      true // check usage limits
    );

    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.reason || 'AI feature not available' },
        { status: 403 }
      );
    }

    const body = await request.json() as NodeConfigGenerationRequest;

    // Validate required fields
    if (!body.nodeType || !body.fieldKey || !body.userQuery) {
      return NextResponse.json(
        { error: 'Missing required fields: nodeType, fieldKey, userQuery' },
        { status: 400 }
      );
    }

    // Check if we have a prompt for this node/field combination
    const promptConfig = getNodePromptConfig(body.nodeType, body.fieldKey);
    if (!promptConfig) {
      return NextResponse.json(
        { error: `AI assistance not available for ${body.nodeType}.${body.fieldKey}` },
        { status: 400 }
      );
    }

    // Generate the configuration
    const result = await generateNodeConfig(body);

    // Record usage
    if (validation.orgId) {
      await recordAIUsage(validation.orgId);
    } else {
      await recordGuestUsage(request);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in node-config API:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate configuration';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
```

### 5. Generic AI Config Assistant Component
**File**: `src/components/WorkflowEditor/shared/AIConfigAssistant.tsx`

```typescript
/**
 * Generic AI configuration assistant component
 * Can be embedded in any node config field to provide AI assistance
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Collapse,
  Paper,
  Button,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowContext';
import { WorkflowNode } from '@/types/workflow';
import { WorkflowContextForAI } from '@/lib/ai/types/nodeConfig';

/**
 * Get available output fields for a node type
 */
function getNodeOutputFields(node: WorkflowNode): string[] {
  const prefix = `{{nodes.${node.id}`;
  switch (node.type) {
    case 'form-trigger':
      return [
        `${prefix}.data}}`,
        `${prefix}.data.<fieldName>}}`,
        `${prefix}.submittedAt}}`,
        `${prefix}.formId}}`,
        `${prefix}.respondent.email}}`,
      ];
    case 'webhook-trigger':
      return [
        `${prefix}.body}}`,
        `${prefix}.headers}}`,
        `${prefix}.query}}`,
        `${prefix}.method}}`,
      ];
    case 'http-request':
      return [
        `${prefix}.data}}`,
        `${prefix}.status}}`,
        `${prefix}.ok}}`,
        `${prefix}.headers}}`,
      ];
    case 'mongodb-query':
      return [
        `${prefix}.documents}}`,
        `${prefix}.document}}`,
        `${prefix}.count}}`,
      ];
    case 'mongodb-write':
      return [
        `${prefix}.insertedId}}`,
        `${prefix}.modifiedCount}}`,
      ];
    case 'transform':
      return [`${prefix}.result}}`];
    case 'conditional':
      return [`${prefix}.result}}`, `${prefix}.branch}}`];
    case 'ai-prompt':
    case 'ai-classify':
    case 'ai-extract':
      return [`${prefix}.result}}`, `${prefix}.usage}}`];
    default:
      return [`${prefix}.output}}`];
  }
}

/**
 * Find all upstream nodes connected before a given node
 */
function getUpstreamNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: Array<{ source: string; target: string }>
): WorkflowNode[] {
  const upstream: WorkflowNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const incomingEdges = edges.filter((e) => e.target === currentId);
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        upstream.push(sourceNode);
        traverse(sourceNode.id);
      }
    }
  }

  traverse(nodeId);
  return upstream;
}

interface AIConfigAssistantProps {
  nodeId: string;
  nodeType: string;
  fieldKey: string;
  currentConfig: Record<string, unknown>;
  currentFieldValue?: unknown;
  onApply: (value: unknown) => void;
  promptHint?: string;
  buttonLabel?: string;
  disabled?: boolean;
}

export function AIConfigAssistant({
  nodeId,
  nodeType,
  fieldKey,
  currentConfig,
  currentFieldValue,
  onApply,
  promptHint = 'Describe what you need...',
  buttonLabel = 'Generate with AI',
  disabled = false,
}: AIConfigAssistantProps) {
  const theme = useTheme();
  const { nodes, edges } = useWorkflowEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    result: unknown;
    explanation?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build workflow context for AI
  const workflowContext = useMemo((): WorkflowContextForAI => {
    const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges);
    const triggerNode = upstreamNodes.find((n) => n.type.includes('trigger'));

    return {
      upstreamNodes: upstreamNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label || node.type,
        outputFields: getNodeOutputFields(node),
      })),
      triggerInfo: triggerNode
        ? {
            type: triggerNode.type,
            label: triggerNode.label || triggerNode.type,
            availableFields: getNodeOutputFields(triggerNode),
          }
        : undefined,
    };
  }, [nodeId, nodes, edges]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch('/api/ai/node-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeType,
          fieldKey,
          userQuery: query.trim(),
          currentConfig,
          currentFieldValue,
          workflowContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate configuration');
      }

      const data = await response.json();

      if (data.result !== undefined) {
        setPreview({
          result: data.result,
          explanation: data.explanation,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate';
      setError(errorMessage);
      console.error('Error generating config:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onApply(preview.result);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setError(null);
    setPreview(null);
  };

  if (disabled) {
    return null;
  }

  // Use MongoDB green for consistency with existing AI buttons
  const accentColor = theme.palette.mode === 'dark' ? '#00ED64' : '#00684A';

  return (
    <Box sx={{ mb: 1 }}>
      {/* Toggle button */}
      <Collapse in={!isOpen}>
        <Button
          startIcon={<AIIcon />}
          onClick={() => setIsOpen(true)}
          size="small"
          variant="text"
          sx={{
            color: accentColor,
            textTransform: 'none',
            fontSize: '0.8rem',
            py: 0.5,
            '&:hover': {
              bgcolor: alpha(accentColor, 0.1),
            },
          }}
        >
          {buttonLabel}
        </Button>
      </Collapse>

      {/* Expanded input */}
      <Collapse in={isOpen}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderColor: alpha(accentColor, 0.3),
            bgcolor: alpha(accentColor, 0.03),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <AIIcon sx={{ fontSize: 16, color: accentColor }} />
            <Typography variant="caption" sx={{ fontWeight: 500, flex: 1 }}>
              Describe what you need
            </Typography>
            <IconButton size="small" onClick={handleClose} sx={{ p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              rows={2}
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={promptHint}
              disabled={isGenerating}
              sx={{
                mb: 1,
                '& .MuiInputBase-input': {
                  fontSize: '0.8rem',
                },
              }}
            />

            {error && (
              <Chip
                label={error}
                color="error"
                size="small"
                onDelete={() => setError(null)}
                sx={{ mb: 1, width: '100%', justifyContent: 'flex-start', fontSize: '0.7rem' }}
              />
            )}

            {/* Preview */}
            {preview && (
              <Box sx={{ mb: 1 }}>
                {preview.explanation && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}
                  >
                    {preview.explanation}
                  </Typography>
                )}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    bgcolor: 'background.default',
                    maxHeight: 120,
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      m: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {typeof preview.result === 'string'
                      ? preview.result
                      : JSON.stringify(preview.result, null, 2)}
                  </Typography>
                </Paper>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              {preview ? (
                <>
                  <Button
                    size="small"
                    onClick={() => setPreview(null)}
                    sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                  >
                    Try Again
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                    onClick={handleApply}
                    sx={{
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      bgcolor: accentColor,
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? '#00C853' : '#005A3D',
                      },
                    }}
                  >
                    Apply
                  </Button>
                </>
              ) : (
                <IconButton
                  type="submit"
                  disabled={!query.trim() || isGenerating}
                  size="small"
                  sx={{
                    bgcolor: alpha(accentColor, 0.1),
                    color: accentColor,
                    '&:hover': {
                      bgcolor: alpha(accentColor, 0.2),
                    },
                    '&:disabled': {
                      bgcolor: alpha(accentColor, 0.05),
                    },
                  }}
                >
                  {isGenerating ? (
                    <CircularProgress size={16} sx={{ color: 'inherit' }} />
                  ) : (
                    <SendIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              )}
            </Box>
          </form>
        </Paper>
      </Collapse>
    </Box>
  );
}
```

### 6. Extended ConfigField Interface
**File**: Update `src/components/WorkflowEditor/NodeEditors/shared/utils.ts`

```typescript
// Add to existing file

/**
 * AI assistance configuration for a config field
 */
export interface AIAssistConfig {
  enabled: boolean;
  promptHint?: string;      // Placeholder text for user input
  buttonLabel?: string;     // Custom button label
  contextFields?: string[]; // Other config fields to include as context
}

/**
 * Extended Config field definition with AI support
 */
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'code' | 'password' |
        'form-select' | 'connection-select' | 'email-credential-select' |
        'condition-builder' | 'switch-cases' | 'mongodb-query-builder' |
        'mongodb-options-builder' | 'mongodb-pipeline-builder';
  options?: string[];
  description?: string;
  required?: boolean;

  // NEW: AI assistance configuration
  aiAssist?: AIAssistConfig;
}
```

### 7. Updated ConfigFieldRenderer
**File**: Update `src/components/WorkflowEditor/NodeEditors/shared/ConfigFieldRenderer.tsx`

Add the AI assistant to relevant field types:

```typescript
// Import the new component
import { AIConfigAssistant } from '../../shared/AIConfigAssistant';

// In the component, wrap fields that have aiAssist enabled
// Example for 'code' type fields:

case 'code':
  return (
    <Box key={field.key} sx={{ mb: 2 }}>
      {/* AI Assistant (if enabled for this field) */}
      {field.aiAssist?.enabled && (
        <AIConfigAssistant
          nodeId={nodeId}
          nodeType={nodeType}  // Need to pass this from parent
          fieldKey={field.key}
          currentConfig={allConfig}  // Need to pass full config
          currentFieldValue={value}
          onApply={(newValue) => onChange(field.key, newValue)}
          promptHint={field.aiAssist.promptHint}
          buttonLabel={field.aiAssist.buttonLabel}
        />
      )}

      {/* Existing field renderer */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {field.label}
        </Typography>
        <VariablePickerButton ... />
      </Box>
      <TextField ... />
    </Box>
  );
```

---

## Files to Modify

### 1. Update IntegrationNodeEditor
**File**: `src/components/WorkflowEditor/NodeEditors/IntegrationNodeEditor.tsx`

Add `aiAssist` to field definitions:

```typescript
const INTEGRATION_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'http-request': [
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      description: 'The URL to request',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "API endpoint for user lookup with ID from form"',
        buttonLabel: 'Generate URL',
      }
    },
    {
      key: 'headers',
      label: 'Headers',
      type: 'code',
      description: 'Request headers as JSON',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Bearer token auth with JSON content type"',
        buttonLabel: 'Generate Headers',
      }
    },
    {
      key: 'body',
      label: 'Body',
      type: 'code',
      description: 'Request body',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Send form data as JSON with name and email"',
        buttonLabel: 'Generate Body',
      }
    },
    // ... other fields
  ],
  // ... other node types
};
```

### 2. Update ActionNodeEditor
**File**: `src/components/WorkflowEditor/NodeEditors/ActionNodeEditor.tsx`

```typescript
const ACTION_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'email-send': [
    {
      key: 'to',
      label: 'To',
      type: 'text',
      description: 'Recipient email address',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Send to the email from form submission"',
        buttonLabel: 'Generate Recipient',
      }
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'text',
      description: 'Email subject line',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Welcome email with user\'s name"',
        buttonLabel: 'Generate Subject',
      }
    },
    {
      key: 'body',
      label: 'Body',
      type: 'code',
      description: 'Email body content',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Professional welcome email with signup details"',
        buttonLabel: 'Generate Email',
      }
    },
  ],
  'notification': [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Alert title for new order"',
        buttonLabel: 'Generate Title',
      }
    },
    {
      key: 'message',
      label: 'Message',
      type: 'text',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Notification message with order details"',
        buttonLabel: 'Generate Message',
      }
    },
  ],
};
```

### 3. Update AINodeEditor
**File**: `src/components/WorkflowEditor/NodeEditors/AINodeEditor.tsx`

```typescript
const AI_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'ai-prompt': [
    {
      key: 'prompt',
      label: 'Prompt',
      type: 'code',
      description: 'The prompt to send to the AI',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Summarize customer feedback with sentiment analysis"',
        buttonLabel: 'Improve Prompt',
      }
    },
  ],
  'ai-classify': [
    {
      key: 'categories',
      label: 'Categories',
      type: 'code',
      description: 'Classification categories',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Categories for support ticket routing"',
        buttonLabel: 'Generate Categories',
      }
    },
  ],
  'ai-extract': [
    {
      key: 'schema',
      label: 'Extraction Schema',
      type: 'code',
      description: 'Fields to extract',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Extract contact information from email"',
        buttonLabel: 'Generate Schema',
      }
    },
  ],
};
```

### 4. Update aiRequestGuard.ts
**File**: `src/lib/ai/aiRequestGuard.ts`

Add the new AI feature type:

```typescript
// Add to AIFeature type
export type AIFeature =
  | 'form_generation'
  | 'workflow_generation'
  | 'formula_generation'
  | 'validation_generation'
  | 'filter_query_generation'
  | 'pipeline_generation'
  | 'node_config_assistant'  // NEW
  | ... ;

// Add to feature availability if using tiered access
const FEATURE_AVAILABILITY: Record<AIFeature, string[]> = {
  // ...
  'node_config_assistant': ['free', 'starter', 'professional', 'enterprise'],
};
```

---

## Implementation Order

### Phase 1: Core Infrastructure (Week 1)
1. Create `src/lib/ai/types/nodeConfig.ts`
2. Create `src/lib/ai/nodeConfigPrompts.ts` (start with http-request, email-send)
3. Create `src/lib/ai/nodeConfigGenerator.ts`
4. Create `src/app/api/ai/node-config/route.ts`
5. Update `src/lib/ai/aiRequestGuard.ts` with new feature type

### Phase 2: UI Components (Week 1-2)
6. Create `src/components/WorkflowEditor/shared/AIConfigAssistant.tsx`
7. Update `src/components/WorkflowEditor/NodeEditors/shared/utils.ts` (extend ConfigField)
8. Update `src/components/WorkflowEditor/NodeEditors/shared/ConfigFieldRenderer.tsx`

### Phase 3: Node Integration (Week 2-3)
9. Update `IntegrationNodeEditor.tsx` - Add AI to http-request node
10. Update `ActionNodeEditor.tsx` - Add AI to email-send, notification nodes
11. Update `AINodeEditor.tsx` - Add AI to ai-prompt, ai-classify, ai-extract nodes

### Phase 4: Extended Coverage (Week 3-4)
12. Add prompts for remaining nodes (transform, conditional, switch, etc.)
13. Add prompts for Google Sheets, Atlas nodes
14. Testing and refinement

### Phase 5: Polish (Week 4)
15. Add keyboard shortcuts (Cmd+G to trigger AI)
16. Add "Recent prompts" history
17. Add "Suggested prompts" based on context
18. Documentation

---

## Testing Checklist

### Unit Tests
- [ ] `nodeConfigGenerator.ts` - Test prompt building and response parsing
- [ ] `nodeConfigPrompts.ts` - Test prompt retrieval for all node/field combinations
- [ ] API route - Test validation, error handling, response format

### Integration Tests
- [ ] Full flow: User input → API call → Config update
- [ ] Workflow context correctly passed and used
- [ ] Error states handled gracefully

### E2E Tests
- [ ] AI button appears on configured fields
- [ ] Generate, preview, apply flow works
- [ ] Generated config is valid and functional

### Manual Testing
- [ ] Test each node type with various natural language inputs
- [ ] Verify workflow variable syntax is correct
- [ ] Test with complex upstream node configurations
- [ ] Test error handling (API failures, invalid responses)

---

## Success Metrics

1. **Adoption**: Track usage of AI assistance per node type
2. **Accuracy**: Monitor rate of "Apply" vs "Try Again" clicks
3. **User Feedback**: Collect feedback on generated configurations
4. **Time Savings**: Measure time to configure nodes with vs without AI

---

## Future Enhancements

1. **Learning from corrections**: Store user modifications to improve prompts
2. **Template library**: Pre-built configurations for common patterns
3. **Multi-field generation**: Generate related fields together (e.g., headers + body)
4. **Validation integration**: Automatically validate generated config before preview
5. **Prompt suggestions**: Show contextual suggestions based on upstream nodes
6. **Voice input**: Allow voice descriptions for configuration
