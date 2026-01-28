/**
 * Type definitions for the NetPad ChatGPT App.
 */

import { z } from 'zod';

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const BrowseTemplatesInputSchema = z.object({
  type: z.enum(['form', 'workflow', 'application']).optional().describe(
    'Type of templates to browse: form, workflow, or application'
  ),
  category: z.string().optional().describe(
    'Filter by category (e.g., "Business", "Healthcare", "Events")'
  ),
  search: z.string().optional().describe(
    'Search term to filter templates by name or description'
  ),
});

export type BrowseTemplatesInput = z.infer<typeof BrowseTemplatesInputSchema>;

export const CreateFormInputSchema = z.object({
  description: z.string().describe(
    'Natural language description of the form to create'
  ),
  templateId: z.string().optional().describe(
    'Optional template ID to use as a starting point'
  ),
  name: z.string().optional().describe(
    'Name for the form'
  ),
});

export type CreateFormInput = z.infer<typeof CreateFormInputSchema>;

export const GetWorkflowInputSchema = z.object({
  workflowId: z.string().optional().describe(
    'ID of an existing workflow to view'
  ),
  templateId: z.string().optional().describe(
    'ID of a workflow template to view'
  ),
});

export type GetWorkflowInput = z.infer<typeof GetWorkflowInputSchema>;

export const SearchTemplatesInputSchema = z.object({
  query: z.string().describe('Search query'),
  type: z.enum(['form', 'workflow', 'application']).optional().describe(
    'Type of templates to search'
  ),
  limit: z.number().default(10).describe('Maximum number of results'),
});

export type SearchTemplatesInput = z.infer<typeof SearchTemplatesInputSchema>;

export const ExportToNetPadInputSchema = z.object({
  itemType: z.enum(['form', 'workflow', 'application']).describe(
    'Type of item to export'
  ),
  itemId: z.string().describe('ID of the item created in this session'),
  workspaceId: z.string().optional().describe(
    'Target workspace ID (uses default if not specified)'
  ),
});

export type ExportToNetPadInput = z.infer<typeof ExportToNetPadInputSchema>;

// =============================================================================
// Template Types (matching @netpad/templates)
// =============================================================================

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags?: string[];
  fieldCount?: number;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
  validation?: Record<string, unknown>;
}

export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings?: {
    submitButtonText?: string;
    successMessage?: string;
    multiPage?: boolean;
    pages?: Array<{ title: string; fieldIds: string[] }>;
  };
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// =============================================================================
// Widget Data Contracts
// =============================================================================

export interface TemplateGalleryData {
  templates: TemplateItem[];
  templateType: 'form' | 'workflow' | 'application';
  categories: string[];
  selectedCategory?: string;
  theme: 'light' | 'dark';
  showSearch?: boolean;
}

export interface WorkflowViewerData {
  workflow: WorkflowDefinition;
  theme: 'light' | 'dark';
  fitView: boolean;
  interactive: boolean;
}

export interface FormPreviewData {
  form: FormDefinition;
  mode: 'preview' | 'edit';
  theme: 'light' | 'dark';
}

// =============================================================================
// MCP Response Types
// =============================================================================

export interface McpToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

// =============================================================================
// Session Types
// =============================================================================

export interface SessionState {
  forms: Map<string, FormDefinition>;
  workflows: Map<string, WorkflowDefinition>;
}
