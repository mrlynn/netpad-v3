/**
 * @netpad/mcp-apps
 *
 * Interactive MCP App UIs for NetPad.
 *
 * This package provides:
 * 1. UI resource helpers for MCP tool responses
 * 2. Pre-built HTML bundles for workflow visualization, template gallery, and form preview
 *
 * @example
 * ```typescript
 * import { withWorkflowViewer, withTemplateGallery, withFormPreview } from '@netpad/mcp-apps';
 *
 * // In your MCP tool handler:
 * return withWorkflowViewer(
 *   JSON.stringify(workflow, null, 2),
 *   {
 *     workflow: { nodes, edges },
 *     theme: 'dark',
 *     fitView: true,
 *   }
 * );
 * ```
 */

// Types
export * from './types';

// UI Resources
export {
  UI_RESOURCES,
  getUIResource,
  withUIResource,
  withWorkflowViewer,
  withTemplateGallery,
  withFormPreview,
  clientSupportsUI,
} from './ui-resources';
