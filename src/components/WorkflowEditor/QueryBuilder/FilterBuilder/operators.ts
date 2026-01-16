/**
 * MongoDB operator definitions for the visual query builder
 */

import { MongoComparisonOperator } from '../shared/types';

export interface OperatorDefinition {
  label: string;
  description: string;
  symbol: string;
  requiresValue: boolean;
  valueType: 'single' | 'array' | 'boolean' | 'regex';
}

/**
 * All supported MongoDB comparison operators with their display info
 */
export const MONGO_OPERATORS: Record<MongoComparisonOperator, OperatorDefinition> = {
  $eq: {
    label: 'equals',
    description: 'Field equals the value',
    symbol: '=',
    requiresValue: true,
    valueType: 'single',
  },
  $ne: {
    label: 'not equals',
    description: 'Field does not equal the value',
    symbol: '≠',
    requiresValue: true,
    valueType: 'single',
  },
  $gt: {
    label: 'greater than',
    description: 'Field is greater than the value',
    symbol: '>',
    requiresValue: true,
    valueType: 'single',
  },
  $gte: {
    label: 'greater or equal',
    description: 'Field is greater than or equal to the value',
    symbol: '≥',
    requiresValue: true,
    valueType: 'single',
  },
  $lt: {
    label: 'less than',
    description: 'Field is less than the value',
    symbol: '<',
    requiresValue: true,
    valueType: 'single',
  },
  $lte: {
    label: 'less or equal',
    description: 'Field is less than or equal to the value',
    symbol: '≤',
    requiresValue: true,
    valueType: 'single',
  },
  $in: {
    label: 'in',
    description: 'Field value is in the list',
    symbol: '∈',
    requiresValue: true,
    valueType: 'array',
  },
  $nin: {
    label: 'not in',
    description: 'Field value is not in the list',
    symbol: '∉',
    requiresValue: true,
    valueType: 'array',
  },
  $exists: {
    label: 'exists',
    description: 'Field exists or does not exist',
    symbol: '∃',
    requiresValue: true,
    valueType: 'boolean',
  },
  $regex: {
    label: 'matches regex',
    description: 'Field matches the regular expression',
    symbol: '~',
    requiresValue: true,
    valueType: 'regex',
  },
};

/**
 * Get operator options for dropdown
 */
export function getOperatorOptions(): Array<{
  value: MongoComparisonOperator;
  label: string;
  symbol: string;
}> {
  return Object.entries(MONGO_OPERATORS).map(([key, def]) => ({
    value: key as MongoComparisonOperator,
    label: def.label,
    symbol: def.symbol,
  }));
}

/**
 * Get operator definition by key
 */
export function getOperatorDef(operator: MongoComparisonOperator): OperatorDefinition {
  return MONGO_OPERATORS[operator];
}
