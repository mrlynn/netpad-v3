/**
 * @netpad/workflow-renderer
 *
 * React component library for rendering NetPad workflow definitions
 * as interactive, read-only visualizations.
 *
 * @example
 * ```tsx
 * import { WorkflowRenderer } from '@netpad/workflow-renderer';
 * import '@netpad/workflow-renderer/styles.css';
 *
 * const workflow = {
 *   nodes: [
 *     { id: '1', type: 'form_trigger', data: { label: 'Form Submit' } },
 *     { id: '2', type: 'email_send', data: { label: 'Send Email' } },
 *   ],
 *   edges: [
 *     { id: 'e1', source: '1', target: '2' },
 *   ],
 * };
 *
 * function App() {
 *   return (
 *     <WorkflowRenderer
 *       workflow={workflow}
 *       height={400}
 *       theme="dark"
 *       showMinimap
 *       fitView
 *     />
 *   );
 * }
 * ```
 */

// Main component
export { WorkflowRenderer } from './WorkflowRenderer';
export { default } from './WorkflowRenderer';

// Types
export * from './types';

// Themes
export { darkTheme, lightTheme, createTheme, getThemeCSSVariables } from './themes';

// Layout utilities
export { autoLayout, workflowNeedsLayout, ensureNodePositions } from './layout';

// Hooks
export { useRendererTheme, ThemeContext } from './hooks';

// Re-export node registry for advanced usage
export { nodeRegistry, getNodeComponent } from './nodes';

// Re-export edge registry for advanced usage
export { edgeRegistry, getEdgeComponent } from './edges';
