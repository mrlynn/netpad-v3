/**
 * Switch (Multi-Path Router) Node Handler
 *
 * Routes data to multiple output paths based on matching rules.
 * Unlike conditional (binary true/false), switch supports many named outputs.
 *
 * Config:
 *   - field: Field path to evaluate (supports dot notation)
 *   - cases: Array of case definitions
 *     - value: Value to match against
 *     - output: Name of the output branch
 *   - defaultOutput: Output name when no case matches (default: 'default')
 *   - matchMode: 'exact' | 'contains' | 'regex' | 'range'
 *
 * Output:
 *   - matchedCase: The case that matched (or 'default')
 *   - output: The output branch name
 *   - data: Pass-through input data
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
} from './types';

const metadata: HandlerMetadata = {
  type: 'switch',
  name: 'Switch',
  description: 'Routes data to multiple paths based on value',
  version: '1.0.0',
};

type MatchMode = 'exact' | 'contains' | 'regex' | 'range';

interface SwitchCase {
  value: unknown;
  output: string;
  // For range mode
  min?: number;
  max?: number;
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
 * Check if a value matches a case based on match mode
 */
function matchCase(
  fieldValue: unknown,
  switchCase: SwitchCase,
  matchMode: MatchMode
): boolean {
  const { value, min, max } = switchCase;

  switch (matchMode) {
    case 'exact':
      return fieldValue === value || String(fieldValue) === String(value);

    case 'contains':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
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

    case 'range':
      const numValue = Number(fieldValue);
      if (isNaN(numValue)) return false;
      const minMatch = min === undefined || numValue >= min;
      const maxMatch = max === undefined || numValue <= max;
      return minMatch && maxMatch;

    default:
      return fieldValue === value;
  }
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Evaluating switch conditions', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, inputs } = context;

  // Get switch configuration
  const field = resolvedConfig.field as string | undefined;
  const cases = (resolvedConfig.cases as SwitchCase[]) || [];
  const defaultOutput = (resolvedConfig.defaultOutput as string) || 'default';
  const matchMode = (resolvedConfig.matchMode as MatchMode) || 'exact';

  // Build data context for evaluation
  const dataContext = {
    ...context.nodeOutputs,
    ...inputs,
    trigger: context.trigger,
    variables: context.variables,
  };

  // Get field value
  let fieldValue: unknown;
  if (field) {
    fieldValue = getNestedValue(dataContext, field);
  } else {
    // If no field specified, use the entire input
    fieldValue = inputs;
  }

  await context.log('debug', `Switch field value`, {
    field: field || '(entire input)',
    value: typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue,
    matchMode,
    caseCount: cases.length,
  });

  // Find matching case
  let matchedCase: SwitchCase | undefined;
  let matchedIndex = -1;

  for (let i = 0; i < cases.length; i++) {
    const switchCase = cases[i];
    if (matchCase(fieldValue, switchCase, matchMode)) {
      matchedCase = switchCase;
      matchedIndex = i;
      break;
    }
  }

  const output = matchedCase?.output || defaultOutput;
  const isDefault = !matchedCase;

  await context.log('info', `Switch routed to: ${output}`, {
    matchedIndex: isDefault ? -1 : matchedIndex,
    isDefault,
    fieldValue: typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue,
  });

  return successResult(
    {
      output,
      matchedCase: isDefault ? 'default' : matchedCase?.value,
      matchedIndex: isDefault ? -1 : matchedIndex,
      isDefault,
      fieldValue,
      data: inputs,
      // Include evaluated cases for debugging
      _evaluatedCases: cases.map((c, i) => ({
        value: c.value,
        output: c.output,
        matched: i === matchedIndex,
      })),
    },
    { durationMs: Date.now() - startTime }
  );
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
