/**
 * AI Prompt Templates
 *
 * System prompts and templates for AI-powered form generation features.
 */

import { QuestionTypeId } from '@/types/questionTypes';

// ============================================
// System Prompts
// ============================================

export const SYSTEM_PROMPTS = {
  workflowGenerator: `You are an expert workflow automation assistant. Your role is to generate workflow configurations based on natural language descriptions.

You understand workflow automation best practices including:
- Choosing appropriate triggers (manual, form submission, webhook, schedule)
- Logical node ordering and data flow
- When to use conditional branching
- Appropriate integrations (HTTP requests, database operations, email)
- Error handling and retry strategies

Available node types:
TRIGGERS (every workflow needs exactly one trigger):
- manual-trigger: Start workflow manually with a button click
- form-trigger: Trigger when a form is submitted
- webhook-trigger: Trigger from external HTTP webhook call
- schedule-trigger: Trigger on a cron schedule (e.g., daily, hourly)

LOGIC:
- conditional: If/Else branching based on conditions
- loop: Iterate over array items
- delay: Wait for a specified duration before continuing

INTEGRATIONS:
- http-request: Make HTTP API calls (GET, POST, PUT, DELETE)
- mongodb-query: Query documents from MongoDB collection
- mongodb-write: Insert or update documents in MongoDB

ACTIONS:
- email-send: Send an email message
- notification: Send a push notification

DATA PROCESSING:
- transform: Transform/map data structure using expressions
- filter: Filter items in an array based on conditions
- merge: Merge multiple data sources into one

AI:
- ai-prompt: Send a prompt to an AI model and get a response
- ai-classify: Classify text into categories using AI
- ai-extract: Extract structured data from unstructured text using AI

When generating workflows, output valid JSON matching this schema:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "tempId": "node_1",
      "type": "node-type",
      "label": "Display Label",
      "position": { "x": 250, "y": 100 },
      "config": { ... node-specific configuration ... },
      "enabled": true
    }
  ],
  "edges": [
    {
      "sourceTempId": "node_1",
      "sourceHandle": "output",
      "targetTempId": "node_2",
      "targetHandle": "input"
    }
  ],
  "settings": {
    "executionMode": "sequential",
    "errorHandling": "stop"
  }
}

IMPORTANT RULES:
1. Every workflow MUST start with exactly ONE trigger node
2. Position nodes vertically, with ~150px spacing between them
3. Use descriptive labels for each node
4. For conditional nodes, use "output-true" and "output-false" as sourceHandles
5. Keep workflows simple and focused - typically 3-7 nodes
6. Always respond with valid JSON only, no markdown or explanation text.`,

  formGenerator: `You are an expert form builder assistant. Your role is to generate form configurations based on natural language descriptions.

You understand form design best practices including:
- Logical field ordering (contact info first, then specific questions)
- Appropriate field types for different data (email for emails, phone for phones, etc.)
- When to make fields required vs optional
- When to use conditional logic to show/hide fields
- Appropriate validation rules

When generating forms, output valid JSON matching the FormConfiguration schema.

For sensitive data fields (PII, financial data, health records), you can enable MongoDB Queryable Encryption:
- encryption.enabled: true to enable encryption
- encryption.algorithm: "Indexed" for searchable fields, "Unindexed" for non-searchable
- encryption.queryType: "equality" for exact match queries, "range" for numeric range queries

Common fields that should be encrypted:
- Social Security Numbers (SSN)
- Bank account numbers, routing numbers
- Credit card numbers
- Medical record numbers, insurance IDs
- Government-issued ID numbers
- Salary/income data
- Medical history, diagnoses

Available field types:
- short_text: Single-line text input
- long_text: Multi-line text area
- number: Numeric input
- email: Email address with validation
- phone: Phone number input
- url: URL/website input
- multiple_choice: Single-select radio buttons
- checkboxes: Multi-select checkboxes
- dropdown: Select dropdown
- yes_no: Boolean toggle/switch
- rating: Star/emoji rating
- scale: Linear scale (1-10, etc.)
- slider: Numeric slider
- nps: Net Promoter Score
- date: Date picker
- time: Time picker
- datetime: Date and time combined
- file_upload: File attachment
- signature: Signature capture
- address: Address fields

Always respond with valid JSON only, no markdown or explanation text.`,

  formulaAssistant: `You are a formula assistant for a form builder application. Your role is to convert natural language descriptions into formula expressions.

Available functions:
- Arithmetic: +, -, *, /, %, ^ (power)
- Math: sum(), average(), min(), max(), round(), floor(), ceil(), abs(), sqrt(), pow(), mod()
- String: len(), mid(), left(), right(), concat(), upper(), lower(), trim(), replace(), split()
- Conditional: if(condition, true_value, false_value), coalesce()
- Comparison: ==, !=, <, >, <=, >=
- Logical: &&, ||, !
- Array: count(), first(), last(), join(), contains()

Field references use the field path directly (e.g., "quantity", "unitPrice", "customer.name").

Respond with JSON containing:
{
  "formula": "the formula expression",
  "explanation": "human-readable explanation",
  "dependencies": ["field1", "field2"]
}`,

  validationGenerator: `You are a validation rule generator for form fields. Your role is to create regex patterns and validation constraints based on natural language descriptions.

Common patterns you should know:
- Employee ID formats (e.g., AA1234)
- Product codes (e.g., PRD-001-A)
- Custom identifiers
- Phone formats
- Postal codes for various countries

Respond with JSON containing:
{
  "pattern": "regex pattern (without delimiters)",
  "errorMessage": "user-friendly error message",
  "constraints": { "min": null, "max": null, "minLength": null, "maxLength": null },
  "testCases": [
    { "input": "example", "shouldPass": true, "description": "valid example" }
  ]
}`,

  conditionalLogicGenerator: `You are a conditional logic assistant for form fields. Your role is to convert natural language conditions into structured conditional logic rules.

Available operators:
- equals: Exact match
- notEquals: Not equal to
- contains: String contains
- notContains: String doesn't contain
- greaterThan: Greater than (for numbers)
- lessThan: Less than (for numbers)
- isEmpty: Field is empty
- isNotEmpty: Field has a value
- isTrue: Boolean is true
- isFalse: Boolean is false

Logic types:
- all: All conditions must be true (AND)
- any: Any condition can be true (OR)

Respond with JSON containing:
{
  "conditionalLogic": {
    "action": "show" or "hide",
    "logicType": "all" or "any",
    "conditions": [
      { "field": "fieldPath", "operator": "equals", "value": "someValue" }
    ]
  },
  "explanation": "human-readable explanation"
}`,

  fieldSuggester: `You are a form field suggestion assistant. Based on the current form structure and context, suggest additional fields that would be valuable.

Consider:
- Common fields for the form type/industry
- Data that would be useful for analytics
- Fields that improve user experience
- Logical groupings and ordering

Respond with JSON containing:
{
  "suggestions": [
    {
      "field": { "path": "fieldName", "label": "Field Label", "type": "field_type", "required": false },
      "reason": "Why this field would be useful",
      "confidence": 0.85,
      "popularity": 73
    }
  ]
}`,

  contentGenerator: `You are a content writing assistant for form fields. Generate clear, concise, and user-friendly content.

Content types:
- label: Field label/question text (clear, specific)
- description: Help text explaining the field (brief, helpful)
- placeholder: Example input text (realistic example)
- errorMessage: Validation error message (clear, actionable)
- helpText: Additional context (when needed)

Style guidelines:
- Professional: Formal, business-appropriate
- Friendly: Warm, approachable
- Technical: Precise, detailed
- Casual: Relaxed, conversational

Respond with JSON containing:
{
  "content": "the generated content",
  "alternatives": ["alternative 1", "alternative 2"]
}`,
};

// ============================================
// Prompt Builders
// ============================================

/**
 * Build a prompt for form generation
 */
export function buildFormGenerationPrompt(
  userPrompt: string,
  context?: {
    industry?: string;
    audience?: string;
    schema?: Record<string, any>;
    maxFields?: number;
  }
): string {
  let prompt = `Generate a form configuration for the following request:\n\n"${userPrompt}"`;

  if (context?.industry) {
    prompt += `\n\nIndustry/Domain: ${context.industry}`;
  }

  if (context?.audience) {
    prompt += `\nTarget Audience: ${context.audience}`;
  }

  if (context?.maxFields) {
    prompt += `\nMaximum fields: ${context.maxFields}`;
  }

  if (context?.schema) {
    prompt += `\n\nExisting MongoDB collection schema:\n${JSON.stringify(context.schema, null, 2)}`;
  }

  prompt += `\n\nRespond with a JSON object containing:
{
  "name": "Form Name",
  "description": "Form description",
  "fieldConfigs": [
    {
      "path": "fieldPath",
      "label": "Field Label",
      "type": "field_type",
      "required": true/false,
      "included": true,
      "placeholder": "optional placeholder",
      "validation": { optional validation rules },
      "encryption": {
        "enabled": true,
        "algorithm": "Indexed or Unindexed",
        "queryType": "equality or range (for Indexed only)"
      }
    }
  ]
}

Example encrypted field for SSN:
{
  "path": "ssn",
  "label": "Social Security Number",
  "type": "short_text",
  "required": true,
  "included": true,
  "placeholder": "123-45-6789",
  "validation": { "pattern": "^\\\\d{3}-\\\\d{2}-\\\\d{4}$" },
  "encryption": { "enabled": true, "algorithm": "Indexed", "queryType": "equality" }
}`;

  return prompt;
}

/**
 * Build a prompt for formula generation
 */
export function buildFormulaPrompt(
  description: string,
  availableFields: Array<{ path: string; label: string; type: string }>,
  outputType?: string
): string {
  let prompt = `Convert this description into a formula:\n\n"${description}"`;

  prompt += `\n\nAvailable fields:\n${availableFields
    .map((f) => `- ${f.path} (${f.label}): ${f.type}`)
    .join('\n')}`;

  if (outputType) {
    prompt += `\n\nExpected output type: ${outputType}`;
  }

  return prompt;
}

/**
 * Build a prompt for validation rule generation
 */
export function buildValidationPrompt(
  fieldInfo: { path: string; label: string; type: string },
  description: string
): string {
  return `Generate validation rules for a field with these details:

Field: ${fieldInfo.label} (${fieldInfo.path})
Type: ${fieldInfo.type}
Requirements: "${description}"

Provide a regex pattern (if applicable), error message, and test cases.`;
}

/**
 * Build a prompt for conditional logic generation
 */
export function buildConditionalLogicPrompt(
  description: string,
  availableFields: Array<{ path: string; label: string; type: string; options?: string[] }>,
  action: 'show' | 'hide'
): string {
  let prompt = `Create conditional logic to ${action} a field based on:\n\n"${description}"`;

  prompt += `\n\nAvailable fields to reference:\n${availableFields
    .map((f) => {
      let fieldDesc = `- ${f.path} (${f.label}): ${f.type}`;
      if (f.options?.length) {
        fieldDesc += ` [options: ${f.options.join(', ')}]`;
      }
      return fieldDesc;
    })
    .join('\n')}`;

  return prompt;
}

/**
 * Build a prompt for field suggestions
 */
export function buildFieldSuggestionPrompt(
  currentFields: Array<{ path: string; label: string; type: string }>,
  formContext: { name?: string; description?: string },
  limit: number = 5
): string {
  let prompt = `Suggest ${limit} additional fields for this form:\n`;

  if (formContext.name) {
    prompt += `\nForm Name: ${formContext.name}`;
  }

  if (formContext.description) {
    prompt += `\nDescription: ${formContext.description}`;
  }

  prompt += `\n\nCurrent fields:\n${currentFields
    .map((f) => `- ${f.label} (${f.type})`)
    .join('\n')}`;

  prompt += `\n\nSuggest fields that would complement the existing structure and improve the form's usefulness.`;

  return prompt;
}

/**
 * Build a prompt for content generation
 */
export function buildContentPrompt(
  contentType: 'label' | 'description' | 'placeholder' | 'errorMessage' | 'helpText',
  context: {
    fieldPath?: string;
    fieldType?: string;
    formName?: string;
    existingContent?: string;
  },
  style: 'professional' | 'friendly' | 'technical' | 'casual' = 'professional'
): string {
  let prompt = `Generate a ${contentType} for a form field.\n`;

  prompt += `\nStyle: ${style}`;

  if (context.fieldPath) {
    prompt += `\nField path: ${context.fieldPath}`;
  }

  if (context.fieldType) {
    prompt += `\nField type: ${context.fieldType}`;
  }

  if (context.formName) {
    prompt += `\nForm: ${context.formName}`;
  }

  if (context.existingContent) {
    prompt += `\nCurrent content to improve: "${context.existingContent}"`;
  }

  return prompt;
}

// ============================================
// Field Type Mapping
// ============================================

/**
 * Map common field descriptions to question types
 */
export const FIELD_TYPE_HINTS: Record<string, QuestionTypeId[]> = {
  email: ['email'],
  phone: ['phone'],
  name: ['short_text'],
  address: ['address'],
  date: ['date'],
  time: ['time'],
  birthday: ['date'],
  age: ['number'],
  rating: ['rating', 'scale'],
  feedback: ['long_text'],
  comment: ['long_text'],
  description: ['long_text'],
  price: ['number'],
  quantity: ['number'],
  amount: ['number'],
  choice: ['multiple_choice', 'dropdown'],
  select: ['dropdown', 'multiple_choice'],
  agree: ['yes_no', 'checkboxes'],
  consent: ['yes_no', 'checkboxes'],
  file: ['file_upload'],
  image: ['image_upload'],
  signature: ['signature'],
  url: ['url'],
  website: ['url'],
  satisfaction: ['nps', 'rating', 'scale'],
};

/**
 * Fields that should typically be encrypted with Queryable Encryption
 */
export const ENCRYPTED_FIELD_HINTS: Record<string, { algorithm: 'Indexed' | 'Unindexed'; queryType?: 'equality' | 'range' }> = {
  ssn: { algorithm: 'Indexed', queryType: 'equality' },
  social_security: { algorithm: 'Indexed', queryType: 'equality' },
  bank_account: { algorithm: 'Indexed', queryType: 'equality' },
  account_number: { algorithm: 'Indexed', queryType: 'equality' },
  routing_number: { algorithm: 'Unindexed' },
  credit_card: { algorithm: 'Indexed', queryType: 'equality' },
  card_number: { algorithm: 'Indexed', queryType: 'equality' },
  cvv: { algorithm: 'Unindexed' },
  insurance_id: { algorithm: 'Indexed', queryType: 'equality' },
  medical_record: { algorithm: 'Indexed', queryType: 'equality' },
  medical_history: { algorithm: 'Unindexed' },
  diagnosis: { algorithm: 'Unindexed' },
  salary: { algorithm: 'Indexed', queryType: 'range' },
  income: { algorithm: 'Indexed', queryType: 'range' },
  tax_id: { algorithm: 'Indexed', queryType: 'equality' },
  passport: { algorithm: 'Indexed', queryType: 'equality' },
  driver_license: { algorithm: 'Indexed', queryType: 'equality' },
  national_id: { algorithm: 'Indexed', queryType: 'equality' },
};

/**
 * Check if a field should be encrypted based on its name
 */
export function suggestFieldEncryption(fieldName: string): { enabled: boolean; algorithm?: 'Indexed' | 'Unindexed'; queryType?: 'equality' | 'range' } | null {
  const normalized = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  for (const [hint, config] of Object.entries(ENCRYPTED_FIELD_HINTS)) {
    if (normalized.includes(hint)) {
      return { enabled: true, ...config };
    }
  }

  return null;
}

/**
 * Get suggested field type based on field name/label
 */
export function suggestFieldType(fieldName: string): QuestionTypeId {
  const normalized = fieldName.toLowerCase();

  for (const [hint, types] of Object.entries(FIELD_TYPE_HINTS)) {
    if (normalized.includes(hint)) {
      return types[0];
    }
  }

  // Default to short_text
  return 'short_text';
}

// ============================================
// Workflow Generation Prompts
// ============================================

/**
 * Build a prompt for workflow generation
 */
export function buildWorkflowGenerationPrompt(
  userPrompt: string,
  context?: {
    industry?: string;
    availableForms?: Array<{ id: string; name: string }>;
    availableConnections?: Array<{ id: string; name: string; type: string }>;
    preferredTrigger?: string;
    maxNodes?: number;
  }
): string {
  let prompt = `Generate a workflow configuration for the following request:\n\n"${userPrompt}"`;

  if (context?.industry) {
    prompt += `\n\nIndustry/Domain: ${context.industry}`;
  }

  if (context?.preferredTrigger) {
    prompt += `\nPreferred trigger type: ${context.preferredTrigger}`;
  }

  if (context?.maxNodes) {
    prompt += `\nMaximum nodes: ${context.maxNodes}`;
  }

  if (context?.availableForms && context.availableForms.length > 0) {
    prompt += `\n\nAvailable forms that can be used as triggers:\n${context.availableForms
      .map((f) => `- ${f.name} (ID: ${f.id})`)
      .join('\n')}`;
  }

  if (context?.availableConnections && context.availableConnections.length > 0) {
    prompt += `\n\nAvailable database connections:\n${context.availableConnections
      .map((c) => `- ${c.name} (${c.type})`)
      .join('\n')}`;
  }

  prompt += `\n\nRespond with a JSON object containing:
{
  "name": "Workflow Name",
  "description": "Brief description of what this workflow does",
  "nodes": [
    {
      "tempId": "unique_id",
      "type": "node-type",
      "label": "Human-readable label",
      "position": { "x": 250, "y": <increment by 150 for each node> },
      "config": { <node-specific config> },
      "enabled": true
    }
  ],
  "edges": [
    {
      "sourceTempId": "source_node_id",
      "sourceHandle": "output",
      "targetTempId": "target_node_id",
      "targetHandle": "input"
    }
  ],
  "settings": {
    "executionMode": "sequential",
    "errorHandling": "stop"
  }
}`;

  return prompt;
}
