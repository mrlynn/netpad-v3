/**
 * Transform Node Handler
 *
 * Transforms data using JavaScript expressions or field mappings.
 * Useful for reshaping data between nodes.
 *
 * Config:
 * - mode: 'expression' | 'mapping' | 'template'
 * - expression: JavaScript expression to evaluate (mode: expression)
 * - mappings: Array of { source, target, transform? } (mode: mapping)
 * - template: Object template with values (mode: template)
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'transform',
  name: 'Transform',
  description: 'Transform and reshape data',
  version: '1.0.0',
};

interface FieldMapping {
  source: string;    // JSONPath-like path to source field
  target: string;    // Path where to put the result
  transform?: string; // Optional JS expression to apply
}

interface TransformConfig {
  mode: 'expression' | 'mapping' | 'template';
  expression?: string;
  mappings?: FieldMapping[];
  template?: Record<string, unknown>;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Starting transform operation', {
    nodeId: context.nodeId,
  });

  const config = context.resolvedConfig as unknown as TransformConfig;

  if (!config.mode) {
    // Default to template if not specified
    config.mode = 'template';
  }

  try {
    let result: Record<string, unknown>;

    switch (config.mode) {
      case 'expression':
        result = await executeExpression(context, config.expression);
        break;

      case 'mapping':
        result = await executeMapping(context, config.mappings || []);
        break;

      case 'template':
        // Template mode - resolvedConfig already has substituted values
        // Just pass through the template as output
        result = config.template || { ...context.resolvedConfig };
        // Remove internal config keys
        delete (result as Record<string, unknown>).mode;
        delete (result as Record<string, unknown>).expression;
        delete (result as Record<string, unknown>).mappings;
        delete (result as Record<string, unknown>).template;
        break;

      default:
        return failureResult(
          NodeErrorCodes.INVALID_CONFIG,
          `Invalid transform mode: ${config.mode}`,
          false
        );
    }

    await context.log('info', 'Transform completed successfully', {
      mode: config.mode,
      outputKeys: Object.keys(result),
    });

    return successResult(result, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'Transform failed', {
      error: errorMessage,
      mode: config.mode,
    });

    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Transform failed: ${errorMessage}`,
      false
    );
  }
};

/**
 * Execute a JavaScript expression
 * Creates a sandboxed context with access to inputs and node outputs
 */
async function executeExpression(
  context: ExtendedNodeContext,
  expression?: string
): Promise<Record<string, unknown>> {
  if (!expression) {
    throw new Error('expression is required for expression mode');
  }

  // Build evaluation context
  const evalContext = {
    inputs: context.inputs,
    nodes: context.nodeOutputs,
    variables: context.variables,
    trigger: context.trigger,
    // Utility functions
    JSON,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  };

  // Create function with limited scope
  const fn = new Function(
    ...Object.keys(evalContext),
    `"use strict"; return (${expression});`
  );

  const result = fn(...Object.values(evalContext));

  // Ensure result is an object
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }

  // Wrap non-object results
  return { value: result };
}

/**
 * Execute field mappings
 */
async function executeMapping(
  context: ExtendedNodeContext,
  mappings: FieldMapping[]
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  // Build source data
  const sourceData = {
    inputs: context.inputs,
    nodes: context.nodeOutputs,
    variables: context.variables,
    trigger: context.trigger,
  };

  for (const mapping of mappings) {
    // Get source value
    let value = getNestedValue(sourceData, mapping.source);

    // Apply transform if specified
    if (mapping.transform && value !== undefined) {
      try {
        const fn = new Function(
          'value',
          'inputs',
          'nodes',
          'variables',
          `"use strict"; return (${mapping.transform});`
        );
        value = fn(value, context.inputs, context.nodeOutputs, context.variables);
      } catch (e) {
        // Log but continue with untransformed value
        console.warn(`[transform] Transform expression failed for ${mapping.source}:`, e);
      }
    }

    // Set target value
    setNestedValue(result, mapping.target, value);
  }

  return result;
}

/**
 * Get a nested value from an object using dot notation
 * e.g., "nodes.formTrigger.data.name"
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 * Creates intermediate objects as needed
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
