/**
 * Node Handler Types
 *
 * Defines the interfaces for workflow node handlers.
 */

import { NodeExecutionContext, NodeExecutionResult } from '@/types/workflow';

/**
 * Extended context passed to node handlers
 */
export interface ExtendedNodeContext extends NodeExecutionContext {
  /** Node configuration with all template variables resolved */
  resolvedConfig: Record<string, unknown>;

  /** Trigger data that started this workflow execution */
  trigger: {
    type: string;
    payload?: Record<string, unknown>;
  };

  /**
   * Get a decrypted connection from the vault
   * @param vaultId The vault ID to retrieve
   * @returns Connection string and database, or null if not found
   */
  getConnection: (vaultId: string) => Promise<{
    connectionString: string;
    database: string;
  } | null>;
}

/**
 * Node handler function signature
 */
export type NodeHandler = (context: ExtendedNodeContext) => Promise<NodeExecutionResult>;

/**
 * Handler metadata for documentation and registration
 */
export interface HandlerMetadata {
  /** Handler identifier, matches node type */
  type: string;

  /** Human-readable name */
  name: string;

  /** Description of what the handler does */
  description: string;

  /** Handler version */
  version: string;
}

/**
 * Handler registration entry
 */
export interface HandlerRegistration {
  metadata: HandlerMetadata;
  handler: NodeHandler;
}

/**
 * Common error codes for node handlers
 */
export const NodeErrorCodes = {
  // Configuration errors (not retryable)
  MISSING_CONFIG: 'MISSING_CONFIG',
  INVALID_CONFIG: 'INVALID_CONFIG',
  MISSING_CONNECTION: 'MISSING_CONNECTION',
  INVALID_OPERATION: 'INVALID_OPERATION',

  // Runtime errors (potentially retryable)
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',

  // Internal errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
} as const;

export type NodeErrorCode = typeof NodeErrorCodes[keyof typeof NodeErrorCodes];

/**
 * Helper to create a success result
 */
export function successResult(
  data: Record<string, unknown>,
  metadata?: { durationMs?: number; bytesProcessed?: number }
): NodeExecutionResult {
  return {
    success: true,
    data,
    metadata: metadata ? {
      durationMs: metadata.durationMs ?? 0,
      bytesProcessed: metadata.bytesProcessed,
    } : undefined,
  };
}

/**
 * Helper to create a failure result
 */
export function failureResult(
  code: NodeErrorCode,
  message: string,
  retryable: boolean = false
): NodeExecutionResult {
  return {
    success: false,
    data: {},
    error: {
      code,
      message,
      retryable,
    },
  };
}
