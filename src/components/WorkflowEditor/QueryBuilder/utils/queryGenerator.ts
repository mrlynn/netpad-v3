/**
 * Converts visual filter configuration to MongoDB query JSON
 */

import {
  MongoFilterConfig,
  MongoFilterGroup,
  MongoFilterCondition,
  MongoFilterValue,
  isFilterCondition,
} from '../shared/types';

/**
 * Convert a MongoFilterConfig to MongoDB query object
 */
export function filterConfigToMongo(config: MongoFilterConfig): Record<string, unknown> {
  // If in raw mode and we have raw JSON, parse and return it
  if (config.mode === 'raw' && config.rawJson) {
    try {
      return JSON.parse(config.rawJson);
    } catch {
      return {};
    }
  }

  return filterGroupToMongo(config.rootGroup);
}

/**
 * Convert a filter group to MongoDB query object
 */
export function filterGroupToMongo(group: MongoFilterGroup): Record<string, unknown> {
  // Filter out disabled conditions and empty groups
  const activeConditions = group.conditions.filter((c) => {
    if (isFilterCondition(c)) {
      return c.enabled && c.field.trim() !== '';
    }
    // For groups, recursively check if they have any active conditions
    return c.conditions.length > 0;
  });

  if (activeConditions.length === 0) {
    return {};
  }

  // Convert each condition/group to MongoDB format
  const mongoConditions = activeConditions.map((item) => {
    if (isFilterCondition(item)) {
      return filterConditionToMongo(item);
    }
    return filterGroupToMongo(item);
  });

  // If only one condition and using $and, return it directly (no wrapper needed)
  if (mongoConditions.length === 1 && group.logic === '$and') {
    return mongoConditions[0];
  }

  // Wrap in logical operator
  return { [group.logic]: mongoConditions };
}

/**
 * Convert a single filter condition to MongoDB query object
 */
export function filterConditionToMongo(
  condition: MongoFilterCondition
): Record<string, unknown> {
  const value = resolveFilterValue(condition.value, condition.operator);

  // Handle equality - use shorthand notation
  if (condition.operator === '$eq') {
    return { [condition.field]: value };
  }

  // Handle $exists specially - value should be boolean
  if (condition.operator === '$exists') {
    return { [condition.field]: { $exists: value === true || value === 'true' } };
  }

  // Handle $regex - might have options
  if (condition.operator === '$regex') {
    return { [condition.field]: { $regex: value } };
  }

  // Standard operator format
  return { [condition.field]: { [condition.operator]: value } };
}

/**
 * Resolve a filter value to its final form
 */
export function resolveFilterValue(
  filterValue: MongoFilterValue,
  operator: string
): unknown {
  // Handle variable references - keep handlebars syntax for runtime resolution
  if (filterValue.type === 'variable' && filterValue.variablePath) {
    return `{{${filterValue.variablePath}}}`;
  }

  // Handle array values for $in/$nin
  if (filterValue.type === 'array' && filterValue.arrayValues) {
    return filterValue.arrayValues.map((v) => parseValue(v));
  }

  // Parse the literal value
  return parseValue(filterValue.value);
}

/**
 * Parse a string value to its appropriate type
 */
export function parseValue(value: string | number | boolean | null): unknown {
  if (value === null || value === 'null') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  // String value - try to parse as number or boolean
  const stringValue = String(value).trim();

  if (stringValue === 'true') return true;
  if (stringValue === 'false') return false;
  if (stringValue === '') return '';

  // Check if it's a variable reference
  if (stringValue.startsWith('{{') && stringValue.endsWith('}}')) {
    return stringValue;
  }

  // Try to parse as number
  const num = Number(stringValue);
  if (!isNaN(num) && stringValue !== '') {
    return num;
  }

  return stringValue;
}

/**
 * Convert MongoDB query object to JSON string for display
 */
export function filterConfigToJsonString(
  config: MongoFilterConfig,
  pretty = true
): string {
  const mongoQuery = filterConfigToMongo(config);
  return JSON.stringify(mongoQuery, null, pretty ? 2 : 0);
}

/**
 * Try to parse a MongoDB query JSON string into a filter config
 * Returns null if parsing fails or query is too complex
 */
export function parseMongoQueryToConfig(json: string): MongoFilterConfig | null {
  try {
    const query = JSON.parse(json);

    // Handle empty query
    if (!query || Object.keys(query).length === 0) {
      return {
        rootGroup: {
          id: 'root',
          logic: '$and',
          conditions: [],
        },
        mode: 'visual',
      };
    }

    // Try to parse the query structure
    const rootGroup = parseQueryObject(query);
    if (rootGroup) {
      return {
        rootGroup,
        rawJson: json,
        mode: 'visual',
      };
    }

    // If we can't parse it, return raw mode
    return {
      rootGroup: {
        id: 'root',
        logic: '$and',
        conditions: [],
      },
      rawJson: json,
      mode: 'raw',
    };
  } catch {
    return null;
  }
}

/**
 * Parse a MongoDB query object into a filter group
 */
function parseQueryObject(query: Record<string, unknown>): MongoFilterGroup | null {
  const conditions: (MongoFilterCondition | MongoFilterGroup)[] = [];
  let logic: '$and' | '$or' = '$and';

  for (const [key, value] of Object.entries(query)) {
    // Handle logical operators
    if (key === '$and' || key === '$or') {
      logic = key;
      if (Array.isArray(value)) {
        for (const item of value) {
          const parsed = parseQueryObject(item as Record<string, unknown>);
          if (parsed) {
            // If it's a single condition group, flatten it
            if (parsed.conditions.length === 1 && isFilterCondition(parsed.conditions[0])) {
              conditions.push(parsed.conditions[0]);
            } else {
              conditions.push(parsed);
            }
          }
        }
      }
      continue;
    }

    // Handle field conditions
    const condition = parseFieldCondition(key, value);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    id: generateParseId(),
    logic,
    conditions,
  };
}

/**
 * Parse a field condition from a query object
 */
function parseFieldCondition(
  field: string,
  value: unknown
): MongoFilterCondition | null {
  // Simple equality: { field: value }
  if (typeof value !== 'object' || value === null) {
    return {
      id: generateParseId(),
      field,
      operator: '$eq',
      value: valueToFilterValue(value),
      enabled: true,
    };
  }

  // Operator format: { field: { $op: value } }
  const opObj = value as Record<string, unknown>;
  const operators = Object.keys(opObj);

  if (operators.length === 1) {
    const op = operators[0];
    if (isValidOperator(op)) {
      return {
        id: generateParseId(),
        field,
        operator: op,
        value: valueToFilterValue(opObj[op], op),
        enabled: true,
      };
    }
  }

  return null;
}

/**
 * Convert a raw value to a MongoFilterValue
 */
function valueToFilterValue(
  value: unknown,
  operator?: string
): MongoFilterValue {
  // Handle arrays (for $in/$nin)
  if (Array.isArray(value)) {
    return {
      type: 'array',
      value: '',
      arrayValues: value.map((v) => String(v)),
    };
  }

  // Handle variable references
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    return {
      type: 'variable',
      value: value,
      variablePath: value.slice(2, -2),
    };
  }

  // Handle literals
  return {
    type: 'literal',
    value: value as string | number | boolean | null,
  };
}

/**
 * Check if a string is a valid MongoDB comparison operator
 */
function isValidOperator(op: string): op is MongoFilterCondition['operator'] {
  const validOps = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$regex'];
  return validOps.includes(op);
}

let parseIdCounter = 0;
function generateParseId(): string {
  return `parsed_${++parseIdCounter}_${Math.random().toString(36).substring(2, 6)}`;
}
