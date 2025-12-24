/**
 * Schema Inference Library
 * Analyzes data to infer field types, patterns, and validation rules
 */

import {
  InferredDataType,
  InferredField,
  InferredFieldStats,
  InferredSchema,
  SchemaWarning,
  ColumnMapping,
} from '@/types/dataImport';
import { ParsedRecord } from './parser';

// Common patterns for type detection
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  url: /^https?:\/\/[^\s]+$/i,
  phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  objectId: /^[a-f\d]{24}$/i,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  isoDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  usDate: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  euDate: /^\d{1,2}[-\.]\d{1,2}[-\.]\d{2,4}$/,
  time: /^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i,
  integer: /^-?\d+$/,
  decimal: /^-?\d+\.\d+$/,
  boolean: /^(true|false|yes|no|y|n|1|0)$/i,
  currency: /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/,
  percentage: /^\d+(\.\d+)?%$/,
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
};

/**
 * Infer the data type of a single value
 */
function inferValueType(value: any): InferredDataType {
  // Null/undefined
  if (value === null || value === undefined || value === '') {
    return 'null';
  }

  // Already typed values
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'decimal';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';

  // String analysis
  const str = String(value).trim();

  // Empty string
  if (str === '') return 'null';

  // Check patterns in order of specificity
  if (PATTERNS.objectId.test(str)) return 'objectId';
  if (PATTERNS.email.test(str)) return 'email';
  if (PATTERNS.url.test(str)) return 'url';
  if (PATTERNS.phone.test(str)) return 'phone';
  if (PATTERNS.isoDateTime.test(str)) return 'datetime';
  if (PATTERNS.isoDate.test(str)) return 'date';
  if (PATTERNS.usDate.test(str) || PATTERNS.euDate.test(str)) return 'date';
  if (PATTERNS.time.test(str)) return 'time';
  if (PATTERNS.boolean.test(str)) return 'boolean';

  // Number detection
  if (PATTERNS.integer.test(str)) return 'integer';
  if (PATTERNS.decimal.test(str)) return 'decimal';
  if (PATTERNS.currency.test(str)) return 'decimal';
  if (PATTERNS.percentage.test(str)) return 'decimal';

  // Check if it's a parseable number
  const num = parseFloat(str.replace(/[$,]/g, ''));
  if (!isNaN(num) && str.replace(/[$,.\-\s]/g, '').length > 0) {
    return Number.isInteger(num) ? 'integer' : 'decimal';
  }

  return 'string';
}

/**
 * Detect patterns in string values
 */
function detectPatterns(values: string[]): { pattern: string; matchPercentage: number }[] {
  const patterns: { name: string; pattern: RegExp }[] = [
    { name: 'email', pattern: PATTERNS.email },
    { name: 'url', pattern: PATTERNS.url },
    { name: 'phone', pattern: PATTERNS.phone },
    { name: 'objectId', pattern: PATTERNS.objectId },
    { name: 'uuid', pattern: PATTERNS.uuid },
    { name: 'isoDate', pattern: PATTERNS.isoDate },
    { name: 'isoDateTime', pattern: PATTERNS.isoDateTime },
    { name: 'ipv4', pattern: PATTERNS.ipv4 },
    { name: 'zipCode', pattern: PATTERNS.zipCode },
  ];

  const results: { pattern: string; matchPercentage: number }[] = [];

  for (const { name, pattern } of patterns) {
    const matchCount = values.filter(v => v && pattern.test(String(v).trim())).length;
    const percentage = (matchCount / values.length) * 100;
    if (percentage >= 50) {
      results.push({ pattern: name, matchPercentage: percentage });
    }
  }

  return results.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Calculate statistics for a set of values
 */
function calculateStats(
  values: any[],
  inferredType: InferredDataType
): InferredFieldStats {
  const nonNullValues = values.filter(
    v => v !== null && v !== undefined && v !== ''
  );
  const uniqueValues = new Set(nonNullValues.map(v => JSON.stringify(v)));

  const stats: InferredFieldStats = {
    totalValues: values.length,
    nullCount: values.length - nonNullValues.length,
    uniqueCount: uniqueValues.size,
    sampleValues: Array.from(uniqueValues).slice(0, 10).map(v => {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }),
  };

  // Numeric stats
  if (['number', 'integer', 'decimal'].includes(inferredType)) {
    const numbers = nonNullValues
      .map(v => parseFloat(String(v).replace(/[$,]/g, '')))
      .filter(n => !isNaN(n));

    if (numbers.length > 0) {
      stats.minValue = Math.min(...numbers);
      stats.maxValue = Math.max(...numbers);
      stats.avgValue = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
  }

  // String stats
  if (['string', 'email', 'url', 'phone'].includes(inferredType)) {
    const lengths = nonNullValues.map(v => String(v).length);
    if (lengths.length > 0) {
      stats.minLength = Math.min(...lengths);
      stats.maxLength = Math.max(...lengths);
      stats.avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    }
  }

  // Array stats
  if (inferredType === 'array') {
    const arrayLengths = nonNullValues
      .filter(Array.isArray)
      .map(arr => arr.length);
    if (arrayLengths.length > 0) {
      stats.avgArrayLength =
        arrayLengths.reduce((a, b) => a + b, 0) / arrayLengths.length;
    }
  }

  return stats;
}

/**
 * Convert column name to a clean field path
 */
function toFieldPath(columnName: string): string {
  return columnName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * Convert column name to a human-friendly label
 */
function toLabel(columnName: string): string {
  return columnName
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/[_-]+/g, ' ') // Replace underscores/dashes with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Map inferred type to form field type
 */
function mapToFormFieldType(inferredType: InferredDataType): string {
  const typeMap: Record<InferredDataType, string> = {
    string: 'short-answer',
    number: 'number',
    integer: 'number',
    decimal: 'number',
    boolean: 'yes-no',
    date: 'date',
    datetime: 'datetime',
    time: 'time',
    email: 'email',
    url: 'url',
    phone: 'phone',
    objectId: 'short-answer',
    array: 'checkboxes',
    object: 'long-answer',
    null: 'short-answer',
    mixed: 'short-answer',
  };

  return typeMap[inferredType] || 'short-answer';
}

/**
 * Infer schema from parsed records
 */
export function inferSchema(
  headers: string[],
  records: ParsedRecord[],
  options?: {
    sampleSize?: number;
    suggestedCollection?: string;
  }
): InferredSchema {
  const sampleSize = options?.sampleSize || records.length;
  const sampleRecords = records.slice(0, sampleSize);

  const warnings: SchemaWarning[] = [];
  const fields: InferredField[] = [];

  for (const header of headers) {
    // Extract values for this column
    const values = sampleRecords.map(record => record.data[header]);

    // Count types
    const typeBreakdown: Record<InferredDataType, number> = {
      string: 0,
      number: 0,
      integer: 0,
      decimal: 0,
      boolean: 0,
      date: 0,
      datetime: 0,
      time: 0,
      email: 0,
      url: 0,
      phone: 0,
      objectId: 0,
      array: 0,
      object: 0,
      null: 0,
      mixed: 0,
    };

    for (const value of values) {
      const type = inferValueType(value);
      typeBreakdown[type]++;
    }

    // Determine dominant type
    let dominantType: InferredDataType = 'string';
    let maxCount = 0;
    const nonNullCount = values.length - typeBreakdown.null;

    for (const [type, count] of Object.entries(typeBreakdown)) {
      if (type !== 'null' && count > maxCount) {
        maxCount = count;
        dominantType = type as InferredDataType;
      }
    }

    // Consolidate number types
    const numericCount =
      typeBreakdown.integer + typeBreakdown.decimal + typeBreakdown.number;
    if (numericCount > maxCount) {
      dominantType = typeBreakdown.decimal > 0 ? 'decimal' : 'integer';
      maxCount = numericCount;
    }

    // Check for mixed types
    const significantTypes = Object.entries(typeBreakdown)
      .filter(([type, count]) => type !== 'null' && count > nonNullCount * 0.1)
      .length;

    if (significantTypes > 1) {
      warnings.push({
        type: 'mixed_types',
        field: header,
        message: `Column "${header}" contains mixed data types`,
        severity: 'warning',
      });
    }

    // Check for empty column
    if (typeBreakdown.null === values.length) {
      warnings.push({
        type: 'empty_column',
        field: header,
        message: `Column "${header}" contains all empty values`,
        severity: 'info',
      });
    }

    // Calculate confidence
    const confidence = nonNullCount > 0 ? maxCount / nonNullCount : 0;

    // Calculate stats
    const stats = calculateStats(values, dominantType);

    // Detect patterns
    const stringValues = values.filter(v => typeof v === 'string');
    const detectedPatterns = detectPatterns(stringValues);

    // Check if field is unique (potential key)
    const isUnique =
      stats.uniqueCount === nonNullCount && nonNullCount > 0;

    // Determine if required
    const isRequired = typeBreakdown.null === 0;

    // Generate suggested validation
    const suggestedValidation: InferredField['suggestedValidation'] = {};

    if (['number', 'integer', 'decimal'].includes(dominantType)) {
      suggestedValidation.min = stats.minValue;
      suggestedValidation.max = stats.maxValue;
    }

    if (['string', 'email', 'url', 'phone'].includes(dominantType)) {
      if (stats.maxLength && stats.maxLength < 500) {
        suggestedValidation.max = stats.maxLength;
      }
    }

    // If few unique values, suggest as select/enum
    if (
      stats.uniqueCount > 0 &&
      stats.uniqueCount <= 20 &&
      stats.uniqueCount < values.length * 0.3
    ) {
      suggestedValidation.options = stats.sampleValues.map(String);
    }

    fields.push({
      originalName: header,
      suggestedPath: toFieldPath(header),
      suggestedLabel: toLabel(header),
      inferredType: dominantType,
      confidence,
      stats,
      typeBreakdown,
      isRequired,
      isUnique,
      detectedPatterns,
      suggestedValidation:
        Object.keys(suggestedValidation).length > 0
          ? suggestedValidation
          : undefined,
    });
  }

  // Generate suggested collection name
  const suggestedCollection =
    options?.suggestedCollection ||
    toFieldPath(headers[0] || 'imported_data').replace(/_/g, '') + 's';

  return {
    fields,
    sampleSize,
    totalRecords: records.length,
    suggestedCollection,
    warnings,
  };
}

/**
 * Generate default column mappings from inferred schema
 */
export function generateDefaultMappings(schema: InferredSchema): ColumnMapping[] {
  return schema.fields.map(field => {
    const mapping: ColumnMapping = {
      sourceColumn: field.originalName,
      action: 'import',
      targetPath: field.suggestedPath,
      targetType: mapToFormFieldType(field.inferredType),
      required: field.isRequired,
      skipIfEmpty: !field.isRequired,
    };

    // Add transforms based on type
    mapping.transforms = [];

    // Always trim strings
    if (['string', 'email', 'url', 'phone'].includes(field.inferredType)) {
      mapping.transforms.push({ type: 'trim' });
    }

    // Parse dates
    if (['date', 'datetime'].includes(field.inferredType)) {
      mapping.transforms.push({ type: 'parseDate' });
    }

    // Parse numbers
    if (['number', 'integer', 'decimal'].includes(field.inferredType)) {
      mapping.transforms.push({ type: 'parseNumber' });
    }

    // Parse booleans
    if (field.inferredType === 'boolean') {
      mapping.transforms.push({
        type: 'parseBoolean',
        trueValues: ['true', 'yes', 'y', '1', 'on'],
        falseValues: ['false', 'no', 'n', '0', 'off'],
      });
    }

    // Null empty strings
    mapping.transforms.push({ type: 'nullIfEmpty' });

    return mapping;
  });
}

/**
 * Validate mappings against schema
 */
export function validateMappings(
  mappings: ColumnMapping[],
  schema: InferredSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all source columns exist
  const schemaColumns = new Set(schema.fields.map(f => f.originalName));
  for (const mapping of mappings) {
    if (!schemaColumns.has(mapping.sourceColumn)) {
      errors.push(`Source column "${mapping.sourceColumn}" not found in data`);
    }
  }

  // Check for duplicate target paths
  const targetPaths = mappings
    .filter(m => m.action === 'import' && m.targetPath)
    .map(m => m.targetPath);
  const duplicates = targetPaths.filter(
    (path, index) => targetPaths.indexOf(path) !== index
  );
  if (duplicates.length > 0) {
    errors.push(`Duplicate target paths: ${duplicates.join(', ')}`);
  }

  // Check required fields have mappings
  const requiredFields = schema.fields.filter(f => f.isRequired);
  for (const field of requiredFields) {
    const mapping = mappings.find(m => m.sourceColumn === field.originalName);
    if (!mapping || mapping.action === 'skip') {
      // Not an error, just a warning situation
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
