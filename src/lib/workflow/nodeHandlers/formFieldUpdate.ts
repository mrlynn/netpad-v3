/**
 * Form Field Update Node Handler
 *
 * Updates form fields with data from workflow execution.
 * This is the terminal node for Form Reactions that outputs field updates
 * back to the form.
 *
 * Input: Any workflow data from upstream nodes
 * Output: { success, updates, updatedCount, updatedFields, skippedFields }
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
  type: 'form-field-update',
  name: 'Form Field Update',
  description: 'Updates form fields with data from the workflow',
  version: '1.0.0',
};

/**
 * Resolve a dot-notation path in an object.
 * Supports array indexing: "items.0.name"
 */
function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    // Handle array indexing
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (isNaN(index)) {
        return undefined;
      }
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Configuration for a single field update mapping.
 */
interface FieldUpdateConfig {
  /** Target field path in form (dot notation) */
  fieldPath: string;

  /** Source path in workflow data context (dot notation) */
  sourcePath: string;

  /** Optional transformation expression (not executed in v1) */
  transform?: string;

  /** Optional condition (not executed in v1) */
  condition?: string;

  /**
   * Behavior when source value is null/undefined:
   * - 'skip': Don't update field (default)
   * - 'clear': Clear the field value
   * - 'default': Use defaultValue
   */
  nullBehavior?: 'skip' | 'clear' | 'default';

  /** Default value when nullBehavior is 'default' */
  defaultValue?: unknown;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing form field updates', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, inputs, nodeOutputs } = context;

  // Get update mappings from config
  const updates = (resolvedConfig.updates || []) as FieldUpdateConfig[];

  if (!Array.isArray(updates) || updates.length === 0) {
    await context.log('warn', 'No field updates configured', {
      config: resolvedConfig,
    });

    // Return empty updates rather than failing - this allows the node to be optional
    return successResult(
      {
        success: true,
        updates: {},
        updatedCount: 0,
        updatedFields: [],
        skippedFields: [],
      },
      { durationMs: Date.now() - startTime }
    );
  }

  // Build a flat data context from all upstream node outputs + inputs
  // This allows source paths like "httpRequest.response.data.company.name"
  // or "fieldEventTrigger.formData.existingField"
  const dataContext: Record<string, unknown> = {
    ...inputs,
  };

  // Merge all node outputs, keyed by node ID
  for (const [nodeId, output] of Object.entries(nodeOutputs)) {
    dataContext[nodeId] = output;
  }

  // Also add a 'nodes' alias for clarity in path expressions
  dataContext.nodes = nodeOutputs;

  const fieldUpdates: Record<string, unknown> = {};
  const updatedFields: string[] = [];
  const skippedFields: string[] = [];

  for (const update of updates) {
    if (!update.fieldPath || !update.sourcePath) {
      await context.log('warn', 'Invalid update config - missing fieldPath or sourcePath', {
        update,
      });
      continue;
    }

    // Resolve source value from data context using dot notation
    const value = resolveDotPath(dataContext, update.sourcePath);

    // Handle null/undefined values based on configured behavior
    if (value === null || value === undefined) {
      const behavior = update.nullBehavior || 'skip';

      switch (behavior) {
        case 'skip':
          skippedFields.push(update.fieldPath);
          await context.log('debug', `Skipping field ${update.fieldPath} - source value is null/undefined`, {
            fieldPath: update.fieldPath,
            sourcePath: update.sourcePath,
          });
          continue;

        case 'clear':
          fieldUpdates[update.fieldPath] = null;
          updatedFields.push(update.fieldPath);
          await context.log('debug', `Clearing field ${update.fieldPath}`, {
            fieldPath: update.fieldPath,
          });
          continue;

        case 'default':
          fieldUpdates[update.fieldPath] = update.defaultValue;
          updatedFields.push(update.fieldPath);
          await context.log('debug', `Using default value for field ${update.fieldPath}`, {
            fieldPath: update.fieldPath,
            defaultValue: update.defaultValue,
          });
          continue;
      }
    }

    // Note: transform expressions are accepted but not executed in v1
    // This would require sandboxed JavaScript execution
    if (update.transform) {
      await context.log('debug', 'Transform expression present but not executed in v1', {
        fieldPath: update.fieldPath,
        transform: update.transform,
      });
    }

    // Note: condition expressions are accepted but not executed in v1
    if (update.condition) {
      await context.log('debug', 'Condition expression present but not executed in v1', {
        fieldPath: update.fieldPath,
        condition: update.condition,
      });
    }

    // Set the field update
    fieldUpdates[update.fieldPath] = value;
    updatedFields.push(update.fieldPath);
  }

  const outputData = {
    success: true,
    updates: fieldUpdates,
    updatedCount: updatedFields.length,
    updatedFields,
    skippedFields,
  };

  await context.log('info', 'Form field updates computed', {
    updatedCount: updatedFields.length,
    updatedFields,
    skippedFields,
  });

  return successResult(outputData, {
    durationMs: Date.now() - startTime,
  });
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
