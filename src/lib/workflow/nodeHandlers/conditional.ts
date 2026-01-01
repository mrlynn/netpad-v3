/**
 * Conditional (If/Then) Node Handler
 *
 * Evaluates conditions and routes data to different outputs.
 * Supports multiple condition types: equals, contains, regex, comparison operators.
 *
 * Config:
 *   - conditions: Array of condition objects to evaluate
 *   - combineWith: 'and' | 'or' - how to combine multiple conditions
 *
 * Each condition:
 *   - field: Field path to evaluate (supports dot notation)
 *   - operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' |
 *               'starts_with' | 'ends_with' | 'regex' | 'gt' | 'gte' | 'lt' | 'lte' |
 *               'is_empty' | 'is_not_empty' | 'is_true' | 'is_false'
 *   - value: Value to compare against (not needed for is_empty, is_true, etc.)
 *
 * Outputs:
 *   - true: Data passes through when condition is met
 *   - false: Data passes through when condition is not met
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
  type: 'conditional',
  name: 'If/Then',
  description: 'Routes data based on conditions',
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
 * Evaluate a single condition
 */
function evaluateCondition(data: unknown, condition: Condition): boolean {
  const fieldValue = getNestedValue(data, condition.field);
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

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Evaluating conditions', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, inputs } = context;

  // Get conditions configuration
  const conditions = (resolvedConfig.conditions as Condition[]) || [];
  const combineWith = (resolvedConfig.combineWith as 'and' | 'or') || 'and';

  if (conditions.length === 0) {
    await context.log('warn', 'No conditions configured, defaulting to true');
    return successResult(
      {
        result: true,
        branch: 'true',
        data: inputs,
        evaluatedConditions: [],
      },
      { durationMs: Date.now() - startTime }
    );
  }

  // Build data context for evaluation (combine inputs and trigger data)
  const dataContext = {
    ...context.nodeOutputs,
    ...inputs,
    trigger: context.trigger,
    variables: context.variables,
  };

  // Evaluate each condition
  const evaluatedConditions: Array<{
    field: string;
    operator: string;
    value: unknown;
    fieldValue: unknown;
    result: boolean;
  }> = [];

  for (const condition of conditions) {
    const fieldValue = getNestedValue(dataContext, condition.field);
    const result = evaluateCondition(dataContext, condition);

    evaluatedConditions.push({
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      fieldValue,
      result,
    });

    await context.log('debug', `Condition: ${condition.field} ${condition.operator} ${condition.value}`, {
      fieldValue,
      result,
    });
  }

  // Combine results based on combineWith
  let finalResult: boolean;
  if (combineWith === 'and') {
    finalResult = evaluatedConditions.every(c => c.result);
  } else {
    finalResult = evaluatedConditions.some(c => c.result);
  }

  await context.log('info', `Condition evaluation complete: ${finalResult}`, {
    combineWith,
    conditionCount: conditions.length,
    passedCount: evaluatedConditions.filter(c => c.result).length,
  });

  return successResult(
    {
      result: finalResult,
      branch: finalResult ? 'true' : 'false',
      data: inputs,
      evaluatedConditions,
    },
    { durationMs: Date.now() - startTime }
  );
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
