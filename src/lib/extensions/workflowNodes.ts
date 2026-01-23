/**
 * Workflow Node Extension System
 *
 * Allows extensions to register custom workflow nodes that appear
 * in the node palette and can be executed by the workflow engine.
 */

import { NodeCategory } from '@/types/workflow';
import { NodeHandler, HandlerMetadata } from '@/lib/workflow/nodeHandlers/types';
import { registerHandler, getHandler, hasHandler } from '@/lib/workflow/nodeHandlers/registry';

// ============================================
// Node Definition Types
// ============================================

/**
 * Configuration field definition for node settings panel
 */
export interface NodeConfigField {
  /** Field name (key in config object) */
  name: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json' | 'connection' | 'expression';
  /** Default value */
  defaultValue?: unknown;
  /** Placeholder text */
  placeholder?: string;
  /** Help text shown below field */
  helpText?: string;
  /** Whether field is required */
  required?: boolean;
  /** Options for select fields */
  options?: Array<{ label: string; value: string }>;
  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/**
 * Output definition for a node
 */
export interface NodeOutput {
  /** Output handle ID */
  id: string;
  /** Display label */
  label: string;
  /** Description of what this output contains */
  description?: string;
  /** Whether this is the default/primary output */
  primary?: boolean;
}

/**
 * Complete definition of a workflow node for UI and execution
 */
export interface WorkflowNodeDefinition {
  /** Unique node type identifier (e.g., 'custom:slack-message') */
  type: string;
  /** Display label in palette */
  label: string;
  /** Description shown in tooltip */
  description: string;
  /** Category for grouping in palette */
  category: NodeCategory;
  /** Node color in hex format */
  color: string;
  /** MUI icon name or custom SVG */
  icon: string;
  /** Configuration fields for the node settings panel */
  configFields?: NodeConfigField[];
  /** Output handles (defaults to single 'output' handle) */
  outputs?: NodeOutput[];
  /** Whether this node supports multiple inputs */
  multipleInputs?: boolean;
  /** Extension that provides this node */
  providedBy: string;
  /** Version of the node definition */
  version: string;
  /** Documentation URL */
  docsUrl?: string;
}

/**
 * Registration entry for an extension-provided node
 */
export interface ExtensionNodeRegistration {
  definition: WorkflowNodeDefinition;
  handler: NodeHandler;
  extensionId: string;
}

// ============================================
// Extension Node Registry
// ============================================

// Registry of extension-provided nodes
const extensionNodes = new Map<string, ExtensionNodeRegistration>();

// Event listeners for node registration
type NodeRegistrationListener = (registration: ExtensionNodeRegistration) => void;
const registrationListeners: NodeRegistrationListener[] = [];

/**
 * Register a custom workflow node from an extension
 *
 * @param definition - Node definition for UI
 * @param handler - Node execution handler
 * @param extensionId - ID of the extension providing this node
 */
export function registerExtensionNode(
  definition: WorkflowNodeDefinition,
  handler: NodeHandler,
  extensionId: string
): void {
  const nodeType = definition.type;

  // Validate node type format for extension nodes
  if (!nodeType.startsWith('custom:') && !nodeType.startsWith(`${extensionId}:`)) {
    console.warn(
      `[ExtensionNodes] Node type '${nodeType}' should start with 'custom:' or '${extensionId}:' prefix`
    );
  }

  // Check if already registered
  if (extensionNodes.has(nodeType)) {
    console.warn(`[ExtensionNodes] Node '${nodeType}' is being overwritten by ${extensionId}`);
  }

  // Register the handler with the workflow engine
  const metadata: HandlerMetadata = {
    type: nodeType,
    name: definition.label,
    description: definition.description,
    version: definition.version,
  };
  registerHandler(metadata, handler);

  // Store the full registration
  const registration: ExtensionNodeRegistration = {
    definition: { ...definition, providedBy: extensionId },
    handler,
    extensionId,
  };
  extensionNodes.set(nodeType, registration);

  console.log(`[ExtensionNodes] Registered node: ${nodeType} from ${extensionId}`);

  // Notify listeners
  registrationListeners.forEach((listener) => listener(registration));
}

/**
 * Unregister a custom workflow node
 *
 * @param nodeType - Node type to unregister
 */
export function unregisterExtensionNode(nodeType: string): boolean {
  const existed = extensionNodes.delete(nodeType);
  if (existed) {
    console.log(`[ExtensionNodes] Unregistered node: ${nodeType}`);
  }
  return existed;
}

/**
 * Get all extension-provided node definitions
 */
export function getExtensionNodeDefinitions(): WorkflowNodeDefinition[] {
  return Array.from(extensionNodes.values()).map((reg) => reg.definition);
}

/**
 * Get all registered extension nodes (alias for getExtensionNodeDefinitions)
 */
export function getAllExtensionNodes(): WorkflowNodeDefinition[] {
  return getExtensionNodeDefinitions();
}

/**
 * Get extension node definitions by category
 */
export function getExtensionNodesByCategory(
  category: NodeCategory
): WorkflowNodeDefinition[] {
  return getExtensionNodeDefinitions().filter((def) => def.category === category);
}

/**
 * Get a specific extension node registration
 */
export function getExtensionNode(nodeType: string): ExtensionNodeRegistration | undefined {
  return extensionNodes.get(nodeType);
}

/**
 * Check if a node type is provided by an extension
 */
export function isExtensionNode(nodeType: string): boolean {
  return extensionNodes.has(nodeType);
}

/**
 * Get all extension nodes from a specific extension
 */
export function getNodesFromExtension(extensionId: string): WorkflowNodeDefinition[] {
  return Array.from(extensionNodes.values())
    .filter((reg) => reg.extensionId === extensionId)
    .map((reg) => reg.definition);
}

/**
 * Subscribe to node registration events
 * Returns unsubscribe function
 */
export function onNodeRegistered(listener: NodeRegistrationListener): () => void {
  registrationListeners.push(listener);
  return () => {
    const index = registrationListeners.indexOf(listener);
    if (index > -1) {
      registrationListeners.splice(index, 1);
    }
  };
}

/**
 * Get registry status for debugging
 */
export function getExtensionNodeRegistryStatus(): {
  nodeCount: number;
  nodes: Array<{
    type: string;
    label: string;
    category: NodeCategory;
    extensionId: string;
  }>;
  byExtension: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const nodes = Array.from(extensionNodes.values());

  const byExtension: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  nodes.forEach((reg) => {
    byExtension[reg.extensionId] = (byExtension[reg.extensionId] || 0) + 1;
    byCategory[reg.definition.category] = (byCategory[reg.definition.category] || 0) + 1;
  });

  return {
    nodeCount: extensionNodes.size,
    nodes: nodes.map((reg) => ({
      type: reg.definition.type,
      label: reg.definition.label,
      category: reg.definition.category,
      extensionId: reg.extensionId,
    })),
    byExtension,
    byCategory,
  };
}

/**
 * Clear all extension nodes (for testing)
 */
export function resetExtensionNodeRegistry(): void {
  extensionNodes.clear();
  registrationListeners.length = 0;
  console.log('[ExtensionNodes] Registry reset');
}

// ============================================
// Utility Functions for Extensions
// ============================================

/**
 * Create a node definition with common defaults
 */
export function createNodeDefinition(
  partial: Omit<WorkflowNodeDefinition, 'providedBy'> & { providedBy?: string }
): WorkflowNodeDefinition {
  return {
    outputs: [{ id: 'output', label: 'Output', primary: true }],
    multipleInputs: false,
    ...partial,
    providedBy: partial.providedBy || 'unknown',
  };
}

/**
 * Re-export handler utilities for convenience
 */
export { getHandler, hasHandler };
export type { NodeHandler, HandlerMetadata };
