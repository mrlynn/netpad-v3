/**
 * Shared types for MongoDB Query Builder
 */

/**
 * MongoDB comparison operators supported in the visual builder
 */
export type MongoComparisonOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$exists'
  | '$regex';

/**
 * Logical operators for grouping conditions
 */
export type MongoLogicalOperator = '$and' | '$or';

/**
 * Value can be literal, variable reference, or array (for $in/$nin)
 */
export interface MongoFilterValue {
  type: 'literal' | 'variable' | 'array';
  value: string | number | boolean | null;
  arrayValues?: string[]; // For $in/$nin
  variablePath?: string; // e.g., "nodes.formTrigger.data.email"
}

/**
 * Single filter condition
 */
export interface MongoFilterCondition {
  id: string;
  field: string;
  operator: MongoComparisonOperator;
  value: MongoFilterValue;
  enabled: boolean;
}

/**
 * Filter group with logical operator - supports nesting
 */
export interface MongoFilterGroup {
  id: string;
  logic: MongoLogicalOperator;
  conditions: (MongoFilterCondition | MongoFilterGroup)[];
}

/**
 * Root filter configuration
 */
export interface MongoFilterConfig {
  rootGroup: MongoFilterGroup;
  rawJson?: string;
  mode: 'visual' | 'raw';
}

/**
 * Helper to check if item is a condition vs a group
 */
export function isFilterCondition(
  item: MongoFilterCondition | MongoFilterGroup
): item is MongoFilterCondition {
  return 'field' in item && 'operator' in item;
}

/**
 * Helper to check if item is a group
 */
export function isFilterGroup(
  item: MongoFilterCondition | MongoFilterGroup
): item is MongoFilterGroup {
  return 'logic' in item && 'conditions' in item;
}

/**
 * Generate a unique ID for conditions/groups
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Create a new empty condition
 */
export function createEmptyCondition(): MongoFilterCondition {
  return {
    id: generateId(),
    field: '',
    operator: '$eq',
    value: {
      type: 'literal',
      value: '',
    },
    enabled: true,
  };
}

/**
 * Create a new empty filter group
 */
export function createEmptyFilterGroup(logic: MongoLogicalOperator = '$and'): MongoFilterGroup {
  return {
    id: generateId(),
    logic,
    conditions: [],
  };
}

/**
 * Create a default filter config
 */
export function createDefaultFilterConfig(): MongoFilterConfig {
  return {
    rootGroup: createEmptyFilterGroup('$and'),
    mode: 'visual',
  };
}
