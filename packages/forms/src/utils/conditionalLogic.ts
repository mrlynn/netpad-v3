import { FieldCondition, ConditionalLogic, ConditionOperator } from '../types';

/**
 * Get a nested value from an object using dot notation path
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Set a nested value in an object using dot notation path
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const result = { ...obj };
  const keys = path.split('.');
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Evaluate a single condition against form data
 */
export function evaluateCondition(
  condition: FieldCondition,
  formData: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(formData, condition.field);
  const compareValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue === compareValue;

    case 'notEquals':
      return fieldValue !== compareValue;

    case 'contains':
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(String(compareValue).toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;

    case 'notContains':
      if (typeof fieldValue === 'string') {
        return !fieldValue.toLowerCase().includes(String(compareValue).toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return true;

    case 'greaterThan':
      return typeof fieldValue === 'number' && fieldValue > Number(compareValue);

    case 'lessThan':
      return typeof fieldValue === 'number' && fieldValue < Number(compareValue);

    case 'isEmpty':
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case 'isNotEmpty':
      return !(
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case 'isTrue':
      return fieldValue === true;

    case 'isFalse':
      return fieldValue === false;

    default:
      return true;
  }
}

/**
 * Evaluate conditional logic against form data
 * Returns true if the field should be visible
 */
export function evaluateConditionalLogic(
  conditionalLogic: ConditionalLogic | undefined,
  formData: Record<string, unknown>
): boolean {
  // If no conditional logic, field is always visible
  if (!conditionalLogic || conditionalLogic.conditions.length === 0) {
    return true;
  }

  const { action, logicType, conditions } = conditionalLogic;

  // Evaluate all conditions
  const results = conditions.map((condition) =>
    evaluateCondition(condition, formData)
  );

  // Combine results based on logic type
  const conditionsMet =
    logicType === 'all'
      ? results.every((r) => r) // AND - all must be true
      : results.some((r) => r); // OR - at least one must be true

  // Apply action
  if (action === 'show') {
    return conditionsMet; // Show if conditions are met
  } else {
    return !conditionsMet; // Hide if conditions are met (so show if NOT met)
  }
}

/**
 * Get human-readable label for an operator
 */
export function getOperatorLabel(operator: ConditionOperator): string {
  const labels: Record<ConditionOperator, string> = {
    equals: 'equals',
    notEquals: 'does not equal',
    contains: 'contains',
    notContains: 'does not contain',
    greaterThan: 'is greater than',
    lessThan: 'is less than',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
    isTrue: 'is true',
    isFalse: 'is false',
  };
  return labels[operator];
}

/**
 * Check if an operator requires a comparison value
 */
export function operatorRequiresValue(operator: ConditionOperator): boolean {
  return !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);
}
