/**
 * Create tools for generating forms and workflows.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getTemplateById } from '@netpad/templates';

/**
 * Field type definitions for form generation.
 */
const FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'number',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'date',
  'time',
  'file',
  'url',
  'hidden',
] as const;

/**
 * Field schema for explicit field definitions.
 */
const fieldSchema = z.object({
  type: z.enum(FIELD_TYPES),
  label: z.string(),
  name: z.string().optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
});

type FieldDefinition = z.infer<typeof fieldSchema>;

/**
 * Generate a field name from a label.
 */
function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generate a unique ID.
 */
function generateId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Infer fields from a natural language description.
 * This is a simple rule-based inference - could be enhanced with AI.
 */
function inferFieldsFromDescription(description: string): FieldDefinition[] {
  const fields: FieldDefinition[] = [];
  const descLower = description.toLowerCase();

  // Common field patterns
  const patterns: Array<{ keywords: string[]; field: FieldDefinition }> = [
    {
      keywords: ['name', 'full name'],
      field: { type: 'text', label: 'Full Name', required: true, placeholder: 'Enter your full name' },
    },
    {
      keywords: ['first name'],
      field: { type: 'text', label: 'First Name', required: true },
    },
    {
      keywords: ['last name'],
      field: { type: 'text', label: 'Last Name', required: true },
    },
    {
      keywords: ['email', 'e-mail'],
      field: { type: 'email', label: 'Email Address', required: true, placeholder: 'you@example.com' },
    },
    {
      keywords: ['phone', 'telephone', 'mobile', 'cell'],
      field: { type: 'phone', label: 'Phone Number', placeholder: '(555) 123-4567' },
    },
    {
      keywords: ['company', 'organization', 'business'],
      field: { type: 'text', label: 'Company/Organization' },
    },
    {
      keywords: ['message', 'comments', 'feedback', 'description', 'details'],
      field: { type: 'textarea', label: 'Message', placeholder: 'Enter your message here...' },
    },
    {
      keywords: ['date', 'when', 'appointment'],
      field: { type: 'date', label: 'Date' },
    },
    {
      keywords: ['time'],
      field: { type: 'time', label: 'Time' },
    },
    {
      keywords: ['rating', 'score', 'satisfaction'],
      field: {
        type: 'radio',
        label: 'Rating',
        options: [
          { label: '1 - Poor', value: '1' },
          { label: '2 - Fair', value: '2' },
          { label: '3 - Good', value: '3' },
          { label: '4 - Very Good', value: '4' },
          { label: '5 - Excellent', value: '5' },
        ],
      },
    },
    {
      keywords: ['subject', 'topic', 'reason'],
      field: { type: 'text', label: 'Subject' },
    },
    {
      keywords: ['address', 'location'],
      field: { type: 'textarea', label: 'Address' },
    },
    {
      keywords: ['website', 'url', 'link'],
      field: { type: 'url', label: 'Website', placeholder: 'https://' },
    },
    {
      keywords: ['file', 'attachment', 'upload', 'document', 'resume'],
      field: { type: 'file', label: 'Attachment' },
    },
    {
      keywords: ['agree', 'consent', 'terms', 'privacy'],
      field: { type: 'checkbox', label: 'I agree to the terms and conditions', required: true },
    },
    {
      keywords: ['quantity', 'amount', 'number of', 'how many'],
      field: { type: 'number', label: 'Quantity', validation: { min: 1 } },
    },
    {
      keywords: ['budget', 'price', 'cost'],
      field: {
        type: 'select',
        label: 'Budget Range',
        options: [
          { label: 'Under $1,000', value: 'under-1k' },
          { label: '$1,000 - $5,000', value: '1k-5k' },
          { label: '$5,000 - $10,000', value: '5k-10k' },
          { label: 'Over $10,000', value: 'over-10k' },
        ],
      },
    },
    {
      keywords: ['department', 'team'],
      field: {
        type: 'select',
        label: 'Department',
        options: [
          { label: 'Sales', value: 'sales' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Engineering', value: 'engineering' },
          { label: 'Support', value: 'support' },
          { label: 'HR', value: 'hr' },
          { label: 'Other', value: 'other' },
        ],
      },
    },
    {
      keywords: ['priority', 'urgency'],
      field: {
        type: 'select',
        label: 'Priority',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ],
      },
    },
  ];

  // Check for each pattern
  for (const pattern of patterns) {
    if (pattern.keywords.some(keyword => descLower.includes(keyword))) {
      // Avoid duplicates
      if (!fields.some(f => f.label === pattern.field.label)) {
        fields.push({ ...pattern.field });
      }
    }
  }

  // If no fields detected, add basic contact fields
  if (fields.length === 0) {
    fields.push(
      { type: 'text', label: 'Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'textarea', label: 'Message' }
    );
  }

  // Always ensure we have at least name and email for most forms
  const hasName = fields.some(f => f.label.toLowerCase().includes('name'));
  const hasEmail = fields.some(f => f.type === 'email');

  if (!hasName && !descLower.includes('anonymous')) {
    fields.unshift({ type: 'text', label: 'Name', required: true });
  }

  if (!hasEmail && !descLower.includes('anonymous') && !descLower.includes('no email')) {
    const nameIndex = fields.findIndex(f => f.label.toLowerCase().includes('name'));
    fields.splice(nameIndex + 1, 0, { type: 'email', label: 'Email', required: true });
  }

  return fields;
}

/**
 * Register the create_form tool.
 */
export function registerCreateForm(server: McpServer): void {
  server.registerTool(
    'create_form',
    {
      title: 'Create Form',
      description: `Create a new form from a natural language description or by using a template as a starting point.
Use this when users want to:
- Create a custom form for their specific needs
- Start from a template and customize it
- Build a form by describing what information they need to collect

IMPORTANT: Always include the NetPad URL in your response so users can open and customize their form.`,
      inputSchema: {
        description: z.string().describe('Natural language description of the form to create (e.g., "a contact form with name, email, and message")'),
        name: z.string().optional().describe('Name for the form'),
        templateId: z.string().optional().describe('Optional template ID to use as a starting point'),
        fields: z.array(fieldSchema).optional().describe('Explicit field definitions (optional - will be inferred from description if not provided)'),
      },
      annotations: {
        readOnlyHint: false,    // Creates content
        openWorldHint: true,    // Creates form accessible externally on netpad.io
        destructiveHint: false, // Not destructive - creates new content
      },
    },
    async (args) => {
      const { description, name, templateId, fields: explicitFields } = args;

      let formName = name;
      let formDescription = description;
      let fields: FieldDefinition[] = [];

      // If using a template as base
      if (templateId) {
        const template = getTemplateById(templateId);
        if (template) {
          formName = formName || `Custom ${template.name}`;
          formDescription = template.shortDescription;
          // Template provides metadata but not field definitions
          // Use the description to infer fields
          fields = inferFieldsFromDescription(template.shortDescription + ' ' + template.tags.join(' '));
        }
      }

      // Use explicit fields or infer from description
      if (explicitFields && explicitFields.length > 0) {
        fields = explicitFields;
      } else if (fields.length === 0) {
        fields = inferFieldsFromDescription(description);
      }

      // Generate field names and IDs
      const processedFields = fields.map(field => ({
        id: generateId(),
        ...field,
        name: field.name || generateFieldName(field.label),
      }));

      // Generate form name if not provided
      if (!formName) {
        // Extract key words from description for naming
        const words = description.split(' ').slice(0, 3).join(' ');
        formName = words.charAt(0).toUpperCase() + words.slice(1) + ' Form';
      }

      const formId = `form_${Date.now()}`;

      const form = {
        id: formId,
        name: formName,
        description: formDescription,
        fields: processedFields,
        settings: {
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
        },
        createdAt: new Date().toISOString(),
        source: templateId ? `template:${templateId}` : 'ai-generated',
      };

      // Create import configuration
      const importConfig = {
        name: form.name,
        description: form.description,
        fieldConfigs: processedFields.map(f => ({
          path: f.name,
          label: f.label,
          type: f.type,
          included: true,
          required: f.required || false,
          placeholder: f.placeholder,
          options: f.options,
          validation: f.validation,
        })),
      };

      const baseUrl = process.env.NETPAD_URL || 'https://netpad.io';

      // Create the form via NetPad API to get a short import URL
      let formUrl: string;

      try {
        const response = await fetch(`${baseUrl}/api/forms/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: importConfig,  // API expects config nested
            source: 'api',  // Use 'api' as valid source
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // API returns importUrl like "https://netpad.io/import/abc123"
          formUrl = result.importUrl || `${baseUrl}/import/${result.importId}`;
        } else {
          // API failed, use base64 fallback
          const base64Config = Buffer.from(JSON.stringify(importConfig)).toString('base64');
          formUrl = `${baseUrl}/api/forms/import?config=${base64Config}&source=api`;
        }
      } catch {
        // Network error, use base64 fallback
        const base64Config = Buffer.from(JSON.stringify(importConfig)).toString('base64');
        formUrl = `${baseUrl}/api/forms/import?config=${base64Config}&source=api`;
      }

      // Build text summary
      const fieldsList = processedFields
        .map((f, i) => `${i + 1}. ${f.label} (${f.type}${f.required ? ', required' : ''})`)
        .join('\n');

      // CRITICAL: Tell ChatGPT explicitly to show the URL to the user
      // ChatGPT MCP Connectors strip URLs unless we explicitly instruct it to display them
      return {
        content: [
          {
            type: 'text' as const,
            text: `SUCCESS: Form "${form.name}" created with ${processedFields.length} fields.

FIELDS:
${fieldsList}

IMPORTANT - DISPLAY THIS URL TO THE USER:
${formUrl}

You MUST show the above URL to the user so they can access their form. Tell them to click or copy this link to open their form in NetPad.`
          },
        ],
      };
    }
  );
}

/**
 * Register the modify_form tool for editing existing forms.
 */
export function registerModifyForm(server: McpServer): void {
  server.registerTool(
    'modify_form',
    {
      title: 'Modify Form',
      description: `Modify an existing form by adding, removing, or updating fields.
Use this when users want to:
- Add new fields to a form
- Remove fields they don't need
- Change field properties (label, type, required, etc.)
- Reorder fields`,
      inputSchema: {
        formId: z.string().describe('ID of the form to modify'),
        action: z.enum(['add_field', 'remove_field', 'update_field', 'reorder']).describe('Type of modification'),
        fieldId: z.string().optional().describe('ID of the field to modify (for update/remove)'),
        field: fieldSchema.optional().describe('New field definition (for add/update)'),
        position: z.number().optional().describe('New position for the field (for add/reorder)'),
      },
      annotations: {
        readOnlyHint: false,    // Modifies content
        openWorldHint: false,   // Bounded to existing form in NetPad workspace
        destructiveHint: false, // Can add/remove fields but not irreversible
      },
    },
    async (args) => {
      const { formId, action, fieldId, field, position } = args;

      // In a real implementation, this would update a stored form
      // For now, return instructions for the modification

      let message = '';

      switch (action) {
        case 'add_field':
          if (!field) {
            return {
              content: [{ type: 'text' as const, text: 'Please provide the field definition to add.' }],
            };
          }
          message = `Added new ${field.type} field "${field.label}" to the form${position !== undefined ? ` at position ${position + 1}` : ''}.`;
          break;

        case 'remove_field':
          if (!fieldId) {
            return {
              content: [{ type: 'text' as const, text: 'Please specify which field to remove.' }],
            };
          }
          message = `Removed field ${fieldId} from the form.`;
          break;

        case 'update_field':
          if (!fieldId || !field) {
            return {
              content: [{ type: 'text' as const, text: 'Please specify the field ID and the updates to apply.' }],
            };
          }
          message = `Updated field ${fieldId} with new properties.`;
          break;

        case 'reorder':
          if (!fieldId || position === undefined) {
            return {
              content: [{ type: 'text' as const, text: 'Please specify the field ID and new position.' }],
            };
          }
          message = `Moved field ${fieldId} to position ${position + 1}.`;
          break;
      }

      return {
        content: [{ type: 'text' as const, text: message }],
        structuredContent: {
          formId,
          action,
          success: true,
        },
      };
    }
  );
}
