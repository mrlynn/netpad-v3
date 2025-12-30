/**
 * Node Handler Registry
 *
 * Separate file to avoid circular dependencies.
 * Handlers import from here, index.ts re-exports.
 */

import { NodeHandler, HandlerRegistration, HandlerMetadata } from './types';

// Handler registry - initialized immediately
const handlers = new Map<string, HandlerRegistration>();

/**
 * Register a node handler
 */
export function registerHandler(
  metadata: HandlerMetadata,
  handler: NodeHandler
): void {
  if (handlers.has(metadata.type)) {
    console.warn(`[NodeHandlers] Handler for '${metadata.type}' is being overwritten`);
  }

  handlers.set(metadata.type, { metadata, handler });
  console.log(`[NodeHandlers] Registered handler: ${metadata.type} v${metadata.version}`);
}

/**
 * Get a handler by node type
 */
export function getHandler(nodeType: string): NodeHandler | null {
  const registration = handlers.get(nodeType);
  return registration?.handler ?? null;
}

/**
 * Get handler metadata by node type
 */
export function getHandlerMetadata(nodeType: string): HandlerMetadata | null {
  const registration = handlers.get(nodeType);
  return registration?.metadata ?? null;
}

/**
 * List all registered handlers
 */
export function listHandlers(): HandlerMetadata[] {
  return Array.from(handlers.values()).map((r) => r.metadata);
}

/**
 * Check if a handler exists for a node type
 */
export function hasHandler(nodeType: string): boolean {
  return handlers.has(nodeType);
}
