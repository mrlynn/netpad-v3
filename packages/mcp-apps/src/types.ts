/**
 * Type definitions for NetPad MCP Apps.
 */

/**
 * UI Resource definition for an MCP App.
 */
export interface UIResource {
  /** Semantic version of the UI resource */
  version: string;
  /** MCP UI resource URI (ui://netpad/...) */
  uri: string;
  /** HTTP URL where the resource is hosted */
  httpUrl: string;
}

/**
 * Registry of all available MCP App UI resources.
 */
export type UIResourceId = 'workflow-viewer' | 'template-gallery' | 'form-preview';

/**
 * MCP tool response with UI metadata.
 */
export interface McpToolResponseWithUI<T = unknown> {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  _meta?: {
    ui?: {
      resourceUri: string;
      data: T;
    };
  };
}

/**
 * Data payload for the Workflow Viewer app.
 */
export interface WorkflowViewerData {
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    viewport?: { x: number; y: number; zoom: number };
  };
  theme?: 'light' | 'dark';
  fitView?: boolean;
  showMinimap?: boolean;
  showControls?: boolean;
  autoLayout?: boolean;
}

/**
 * Workflow node definition.
 */
export interface WorkflowNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data: {
    label: string;
    [key: string]: unknown;
  };
}

/**
 * Workflow edge definition.
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

/**
 * Data payload for the Template Gallery app.
 */
export interface TemplateGalleryData {
  templates: TemplateItem[];
  templateType: 'form' | 'workflow' | 'application' | 'conversational' | 'query';
  theme?: 'light' | 'dark';
  showCategories?: boolean;
  selectedCategory?: string;
}

/**
 * Template item for display in the gallery.
 */
export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  icon?: string;
  previewImageUrl?: string;
}

/**
 * Data payload for the Form Preview app.
 */
export interface FormPreviewData {
  form: FormConfiguration;
  theme?: 'light' | 'dark';
  mode?: 'traditional' | 'conversational' | 'both';
  readonly?: boolean;
}

/**
 * Form configuration for preview.
 */
export interface FormConfiguration {
  name: string;
  description?: string;
  fields: FormField[];
  theme?: FormTheme;
  multiPage?: {
    enabled: boolean;
    pages: Array<{
      id: string;
      title: string;
      fields: string[];
    }>;
  };
}

/**
 * Form field definition.
 */
export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  validation?: Record<string, unknown>;
}

/**
 * Form theme configuration.
 */
export interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  mode?: 'light' | 'dark';
}

/**
 * Message types for postMessage communication with the host.
 */
export type McpAppMessage =
  | { type: 'READY' }
  | { type: 'NODE_CLICKED'; payload: { nodeId: string; nodeType: string } }
  | { type: 'TEMPLATE_SELECTED'; payload: { templateId: string } }
  | { type: 'FORM_DATA_CHANGED'; payload: { data: Record<string, unknown> } }
  | { type: 'REQUEST_IMPORT'; payload: { templateId: string } };
