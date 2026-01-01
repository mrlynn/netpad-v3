/**
 * Filter Node Handler
 *
 * Filters arrays of items based on conditions. Similar to conditional
 * but operates on arrays, keeping only items that match.
 *
 * Config:
 *   - inputField: Field path containing the array to filter (default: 'items')
 *   - conditions: Array of condition objects (same as conditional node)
 *   - combineWith: 'and' | 'or' - how to combine multiple conditions
 *   - outputField: Field name for filtered results (default: 'filtered')
 *
 * Output:
 *   - filtered: Array of items that passed the filter
 *   - removed: Array of items that were filtered out
 *   - counts: { total, passed, removed }
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
  type: 'filter',
  name: 'Filter',
  description: 'Filters arrays based on conditions',
  version: '1.0.0',
};

type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'exists'
  | 'not_exists';

interface Condition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;

    // Handle array index notation like "items[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Evaluate a single condition against an item
 */
function evaluateCondition(item: unknown, condition: Condition): boolean {
  const fieldValue = getNestedValue(item, condition.field);
  const { operator, value } = condition;

  switch (operator) {
    case 'equals':
      return fieldValue === value || String(fieldValue) === String(value);

    case 'not_equals':
      return fieldValue !== value && String(fieldValue) !== String(value);

    case 'contains':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return false;

    case 'not_contains':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return !fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(value);
      }
      return true;

    case 'starts_with':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return fieldValue.toLowerCase().startsWith(value.toLowerCase());
      }
      return false;

    case 'ends_with':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return fieldValue.toLowerCase().endsWith(value.toLowerCase());
      }
      return false;

    case 'regex':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        try {
          const regex = new RegExp(value, 'i');
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    case 'gt':
      return Number(fieldValue) > Number(value);

    case 'gte':
      return Number(fieldValue) >= Number(value);

    case 'lt':
      return Number(fieldValue) < Number(value);

    case 'lte':
      return Number(fieldValue) <= Number(value);

    case 'is_empty':
      return fieldValue === null ||
             fieldValue === undefined ||
             fieldValue === '' ||
             (Array.isArray(fieldValue) && fieldValue.length === 0) ||
             (typeof fieldValue === 'object' && Object.keys(fieldValue as object).length === 0);

    case 'is_not_empty':
      return fieldValue !== null &&
             fieldValue !== undefined &&
             fieldValue !== '' &&
             !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
             !(typeof fieldValue === 'object' && Object.keys(fieldValue as object).length === 0);

    case 'is_true':
      return fieldValue === true || fieldValue === 'true' || fieldValue === 1 || fieldValue === '1';

    case 'is_false':
      return fieldValue === false || fieldValue === 'false' || fieldValue === 0 || fieldValue === '0';

    case 'exists':
      return fieldValue !== undefined;

    case 'not_exists':
      return fieldValue === undefined;

    default:
      return false;
  }
}

/**
 * Evaluate all conditions against an item
 */
function evaluateItem(
  item: unknown,
  conditions: Condition[],
  combineWith: 'and' | 'or'
): boolean {
  if (conditions.length === 0) return true;

  const results = conditions.map(c => evaluateCondition(item, c));

  if (combineWith === 'and') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Filtering array', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, inputs } = context;

  // Get filter configuration
  const inputField = (resolvedConfig.inputField as string) || 'items';
  const conditions = (resolvedConfig.conditions as Condition[]) || [];
  const combineWith = (resolvedConfig.combineWith as 'and' | 'or') || 'and';
  const outputField = (resolvedConfig.outputField as string) || 'filtered';

  // Build data context
  const dataContext = {
    ...context.nodeOutputs,
    ...inputs,
    trigger: context.trigger,
    variables: context.variables,
  };

  // Get input array
  let inputArray = getNestedValue(dataContext, inputField);

  // If inputField is 'items' and not found, try the entire input
  if (inputArray === undefined && inputField === 'items') {
    if (Array.isArray(inputs)) {
      inputArray = inputs;
    } else if (inputs && typeof inputs === 'object' && 'items' in inputs) {
      inputArray = (inputs as Record<string, unknown>).items;
    }
  }

  // Validate input is an array
  if (!Array.isArray(inputArray)) {
    await context.log('error', 'Input is not an array', {
      inputField,
      actualType: typeof inputArray,
    });
    return failureResult(
      NodeErrorCodes.INVALID_CONFIG,
      `Expected array at '${inputField}', got ${typeof inputArray}`,
      false
    );
  }

  await context.log('debug', 'Filter configuration', {
    inputField,
    conditionCount: conditions.length,
    combineWith,
    inputLength: inputArray.length,
  });

  // Filter the array
  const passed: unknown[] = [];
  const removed: unknown[] = [];

  for (const item of inputArray) {
    if (evaluateItem(item, conditions, combineWith)) {
      passed.push(item);
    } else {
      removed.push(item);
    }
  }

  await context.log('info', 'Filter complete', {
    total: inputArray.length,
    passed: passed.length,
    removed: removed.length,
  });

  return successResult(
    {
      [outputField]: passed,
      filtered: passed,
      removed,
      counts: {
        total: inputArray.length,
        passed: passed.length,
        removed: removed.length,
        passRate: inputArray.length > 0
          ? Math.round((passed.length / inputArray.length) * 100)
          : 0,
      },
      // For convenience, expose first/last items
      first: passed[0] || null,
      last: passed[passed.length - 1] || null,
      isEmpty: passed.length === 0,
    },
    { durationMs: Date.now() - startTime }
  );
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
