/**
 * UI Resource registry and helper functions for MCP Apps.
 */

import type {
  UIResource,
  UIResourceId,
  McpToolResponseWithUI,
  WorkflowViewerData,
  TemplateGalleryData,
  FormPreviewData,
} from './types';

/**
 * Base URL for UI resources hosted on netpad.io.
 */
const BASE_URL = 'https://www.netpad.io/_mcp/ui';

/**
 * Registry of all MCP App UI resources.
 */
export const UI_RESOURCES: Record<UIResourceId, UIResource> = {
  'workflow-viewer': {
    version: '1.0.0',
    uri: 'ui://netpad/workflow-viewer/1.0.0/bundle.html',
    httpUrl: `${BASE_URL}/workflow-viewer/bundle.html`,
  },
  'template-gallery': {
    version: '1.0.0',
    uri: 'ui://netpad/template-gallery/1.0.0/bundle.html',
    httpUrl: `${BASE_URL}/template-gallery/bundle.html`,
  },
  'form-preview': {
    version: '1.0.0',
    uri: 'ui://netpad/form-preview/1.0.0/bundle.html',
    httpUrl: `${BASE_URL}/form-preview/bundle.html`,
  },
} as const;

/**
 * Get a UI resource by ID.
 */
export function getUIResource(resourceId: UIResourceId): UIResource {
  return UI_RESOURCES[resourceId];
}

/**
 * Create an MCP tool response with UI metadata.
 *
 * @param textContent - The text content for non-UI clients
 * @param resourceId - The UI resource ID to use
 * @param data - The data payload to send to the UI
 * @returns MCP tool response with _meta.ui attached
 *
 * @example
 * ```typescript
 * return withUIResource(
 *   JSON.stringify(workflow, null, 2),
 *   'workflow-viewer',
 *   { workflow, theme: 'dark', fitView: true }
 * );
 * ```
 */
export function withUIResource<T>(
  textContent: string,
  resourceId: UIResourceId,
  data: T
): McpToolResponseWithUI<T> {
  const resource = UI_RESOURCES[resourceId];

  return {
    content: [
      {
        type: 'text' as const,
        text: textContent,
      },
    ],
    _meta: {
      ui: {
        resourceUri: resource.uri,
        data,
      },
    },
  };
}

/**
 * Create a response for the Workflow Viewer app.
 */
export function withWorkflowViewer(
  textContent: string,
  data: WorkflowViewerData
): McpToolResponseWithUI<WorkflowViewerData> {
  return withUIResource(textContent, 'workflow-viewer', data);
}

/**
 * Create a response for the Template Gallery app.
 */
export function withTemplateGallery(
  textContent: string,
  data: TemplateGalleryData
): McpToolResponseWithUI<TemplateGalleryData> {
  return withUIResource(textContent, 'template-gallery', data);
}

/**
 * Create a response for the Form Preview app.
 */
export function withFormPreview(
  textContent: string,
  data: FormPreviewData
): McpToolResponseWithUI<FormPreviewData> {
  return withUIResource(textContent, 'form-preview', data);
}

/**
 * Check if a client supports UI resources.
 * This can be used to conditionally include UI metadata.
 */
export function clientSupportsUI(capabilities?: { ui?: boolean }): boolean {
  return capabilities?.ui === true;
}
