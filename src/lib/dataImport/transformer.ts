/**
 * Data Transformer Library
 * Transforms parsed records according to column mappings
 */

import {
  ColumnMapping,
  ColumnTransform,
  ImportMappingConfig,
  ImportRowError,
} from '@/types/dataImport';
import { ParsedRecord } from './parser';
import { ObjectId } from 'mongodb';

export interface TransformResult {
  document: Record<string, any>;
  errors: ImportRowError[];
  skipped: boolean;
  skipReason?: string;
}

export interface BatchTransformResult {
  documents: Record<string, any>[];
  errors: ImportRowError[];
  skipped: number;
  processed: number;
}

/**
 * Apply a single transform to a value
 */
function applyTransform(
  value: any,
  transform: ColumnTransform,
  rowNumber: number,
  column: string
): { value: any; error?: ImportRowError } {
  try {
    switch (transform.type) {
      case 'trim':
        return { value: typeof value === 'string' ? value.trim() : value };

      case 'uppercase':
        return { value: typeof value === 'string' ? value.toUpperCase() : value };

      case 'lowercase':
        return { value: typeof value === 'string' ? value.toLowerCase() : value };

      case 'titlecase':
        if (typeof value === 'string') {
          return {
            value: value
              .toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
          };
        }
        return { value };

      case 'parseNumber': {
        if (value === null || value === undefined || value === '') {
          return { value: null };
        }
        const cleaned = String(value).replace(/[$,\s]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
          return {
            value: null,
            error: {
              rowNumber,
              column,
              value,
              error: `Cannot parse "${value}" as number`,
              errorCode: 'TRANSFORM_FAILED',
            },
          };
        }
        return { value: num };
      }

      case 'parseDate': {
        if (value === null || value === undefined || value === '') {
          return { value: null };
        }
        const str = String(value).trim();
        let date: Date | null = null;

        // Try common formats
        if (transform.inputFormat) {
          // Use specific format parsing
          date = parseDateWithFormat(str, transform.inputFormat);
        } else {
          // Auto-detect format
          date = new Date(str);
          if (isNaN(date.getTime())) {
            // Try other formats
            const formats = [
              /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YYYY
              /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
              /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/, // DD-MM-YYYY
            ];
            for (const format of formats) {
              const match = str.match(format);
              if (match) {
                // Try to construct date
                date = new Date(str);
                break;
              }
            }
          }
        }

        if (!date || isNaN(date.getTime())) {
          return {
            value: null,
            error: {
              rowNumber,
              column,
              value,
              error: `Cannot parse "${value}" as date`,
              errorCode: 'TRANSFORM_FAILED',
            },
          };
        }

        return { value: date };
      }

      case 'parseBoolean': {
        if (value === null || value === undefined || value === '') {
          return { value: null };
        }
        const str = String(value).toLowerCase().trim();
        const trueValues = transform.trueValues || ['true', 'yes', 'y', '1', 'on'];
        const falseValues = transform.falseValues || ['false', 'no', 'n', '0', 'off'];

        if (trueValues.includes(str)) return { value: true };
        if (falseValues.includes(str)) return { value: false };

        return {
          value: null,
          error: {
            rowNumber,
            column,
            value,
            error: `Cannot parse "${value}" as boolean`,
            errorCode: 'TRANSFORM_FAILED',
          },
        };
      }

      case 'parseJSON': {
        if (value === null || value === undefined || value === '') {
          return { value: null };
        }
        try {
          return { value: JSON.parse(String(value)) };
        } catch {
          return {
            value: null,
            error: {
              rowNumber,
              column,
              value,
              error: `Cannot parse "${value}" as JSON`,
              errorCode: 'TRANSFORM_FAILED',
            },
          };
        }
      }

      case 'splitToArray': {
        if (value === null || value === undefined || value === '') {
          return { value: [] };
        }
        const separator = transform.separator || ',';
        return {
          value: String(value)
            .split(separator)
            .map(s => s.trim())
            .filter(Boolean),
        };
      }

      case 'joinFromArray': {
        if (!Array.isArray(value)) {
          return { value: String(value || '') };
        }
        const separator = transform.separator || ', ';
        return { value: value.join(separator) };
      }

      case 'regex': {
        if (value === null || value === undefined) {
          return { value: null };
        }
        const pattern = transform.pattern
          ? new RegExp(transform.pattern)
          : null;
        if (!pattern) {
          return { value };
        }
        const replacement = transform.replacement || '';
        return { value: String(value).replace(pattern, replacement) };
      }

      case 'template': {
        if (!transform.template) {
          return { value };
        }
        // Template is handled at record level, not value level
        return { value };
      }

      case 'default': {
        if (value === null || value === undefined || value === '') {
          return { value: transform.defaultValue };
        }
        return { value };
      }

      case 'nullIfEmpty': {
        if (value === null || value === undefined || value === '') {
          return { value: null };
        }
        if (typeof value === 'string' && value.trim() === '') {
          return { value: null };
        }
        return { value };
      }

      case 'objectId': {
        if (value === null || value === undefined || value === '') {
          return { value: null };
        }
        const str = String(value).trim();
        if (/^[a-f\d]{24}$/i.test(str)) {
          return { value: new ObjectId(str) };
        }
        return {
          value: null,
          error: {
            rowNumber,
            column,
            value,
            error: `Cannot parse "${value}" as ObjectId`,
            errorCode: 'TRANSFORM_FAILED',
          },
        };
      }

      default:
        return { value };
    }
  } catch (error) {
    return {
      value: null,
      error: {
        rowNumber,
        column,
        value,
        error: error instanceof Error ? error.message : 'Transform failed',
        errorCode: 'TRANSFORM_FAILED',
      },
    };
  }
}

/**
 * Parse date with specific format
 */
function parseDateWithFormat(str: string, format: string): Date | null {
  const formatTokens: Record<string, RegExp> = {
    YYYY: /(\d{4})/,
    YY: /(\d{2})/,
    MM: /(\d{2})/,
    M: /(\d{1,2})/,
    DD: /(\d{2})/,
    D: /(\d{1,2})/,
    HH: /(\d{2})/,
    H: /(\d{1,2})/,
    mm: /(\d{2})/,
    m: /(\d{1,2})/,
    ss: /(\d{2})/,
    s: /(\d{1,2})/,
  };

  // Build regex from format
  let pattern = format;
  const tokenOrder: string[] = [];

  for (const [token] of Object.entries(formatTokens)) {
    if (pattern.includes(token)) {
      pattern = pattern.replace(token, `(\\d+)`);
      tokenOrder.push(token);
    }
  }

  const match = str.match(new RegExp(`^${pattern}$`));
  if (!match) return null;

  const parts: Record<string, number> = {
    year: new Date().getFullYear(),
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  };

  tokenOrder.forEach((token, index) => {
    const value = parseInt(match[index + 1], 10);
    switch (token) {
      case 'YYYY':
        parts.year = value;
        break;
      case 'YY':
        parts.year = value < 50 ? 2000 + value : 1900 + value;
        break;
      case 'MM':
      case 'M':
        parts.month = value;
        break;
      case 'DD':
      case 'D':
        parts.day = value;
        break;
      case 'HH':
      case 'H':
        parts.hour = value;
        break;
      case 'mm':
      case 'm':
        parts.minute = value;
        break;
      case 'ss':
      case 's':
        parts.second = value;
        break;
    }
  });

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Transform a single record according to mappings
 */
export function transformRecord(
  record: ParsedRecord,
  config: ImportMappingConfig
): TransformResult {
  const result: TransformResult = {
    document: {},
    errors: [],
    skipped: false,
  };

  // Process each mapping
  for (const mapping of config.mappings) {
    if (mapping.action === 'skip') {
      continue;
    }

    let value = record.data[mapping.sourceColumn];

    // Apply transforms
    if (mapping.transforms && mapping.transforms.length > 0) {
      for (const transform of mapping.transforms) {
        const transformResult = applyTransform(
          value,
          transform,
          record.rowNumber,
          mapping.sourceColumn
        );
        value = transformResult.value;
        if (transformResult.error) {
          result.errors.push(transformResult.error);
        }
      }
    }

    // Handle merge action
    if (mapping.action === 'merge' && mapping.mergeWith) {
      const separator = mapping.mergeSeparator || ' ';
      const values = [value, ...mapping.mergeWith.map(col => record.data[col])];
      value = values.filter(Boolean).join(separator);
    }

    // Handle split action
    if (mapping.action === 'split' && mapping.splitInto) {
      const str = String(value || '');
      for (const split of mapping.splitInto) {
        try {
          const regex = new RegExp(split.extractPattern);
          const match = str.match(regex);
          if (match && match[1]) {
            setNestedValue(result.document, split.targetPath, match[1]);
          }
        } catch {
          result.errors.push({
            rowNumber: record.rowNumber,
            column: mapping.sourceColumn,
            value,
            error: `Split pattern error for "${split.targetPath}"`,
            errorCode: 'TRANSFORM_FAILED',
          });
        }
      }
      continue;
    }

    // Check required
    if (mapping.required && (value === null || value === undefined || value === '')) {
      result.errors.push({
        rowNumber: record.rowNumber,
        column: mapping.sourceColumn,
        value,
        error: `Required field "${mapping.sourceColumn}" is empty`,
        errorCode: 'REQUIRED_MISSING',
      });
    }

    // Skip if empty
    if (mapping.skipIfEmpty && (value === null || value === undefined || value === '')) {
      continue;
    }

    // Set value in document
    if (mapping.targetPath && mapping.action === 'import') {
      setNestedValue(result.document, mapping.targetPath, value);
    }
  }

  // Add computed fields
  if (config.computedFields) {
    for (const computed of config.computedFields) {
      try {
        // Simple template substitution
        let value: any = computed.expression;

        // Replace {{field}} patterns with values from record
        value = value.replace(/\{\{(\w+)\}\}/g, (match: string, fieldName: string) => {
          return record.data[fieldName] ?? '';
        });

        setNestedValue(result.document, computed.targetPath, value);
      } catch {
        result.errors.push({
          rowNumber: record.rowNumber,
          column: computed.targetPath,
          error: `Computed field error for "${computed.targetPath}"`,
          errorCode: 'TRANSFORM_FAILED',
        });
      }
    }
  }

  // Add static fields
  if (config.staticFields) {
    for (const static_ of config.staticFields) {
      setNestedValue(result.document, static_.targetPath, static_.value);
    }
  }

  return result;
}

/**
 * Transform a batch of records
 */
export function transformBatch(
  records: ParsedRecord[],
  config: ImportMappingConfig,
  options?: {
    stopOnError?: boolean;
    maxErrors?: number;
  }
): BatchTransformResult {
  const result: BatchTransformResult = {
    documents: [],
    errors: [],
    skipped: 0,
    processed: 0,
  };

  const seenKeys = new Set<string>();

  for (const record of records) {
    // Check error limit
    if (
      options?.maxErrors &&
      result.errors.length >= options.maxErrors &&
      options.stopOnError
    ) {
      break;
    }

    result.processed++;

    const transformResult = transformRecord(record, config);

    // Check for duplicates
    if (config.skipDuplicates && config.duplicateKey) {
      const keyValue = config.duplicateKey
        .map(key => transformResult.document[key])
        .join('|');
      if (seenKeys.has(keyValue)) {
        result.skipped++;
        continue;
      }
      seenKeys.add(keyValue);
    }

    if (transformResult.skipped) {
      result.skipped++;
      continue;
    }

    result.errors.push(...transformResult.errors);

    // Only add document if no critical errors or we're not stopping on error
    const hasCriticalError = transformResult.errors.some(
      e => e.errorCode === 'REQUIRED_MISSING'
    );

    if (!hasCriticalError) {
      result.documents.push(transformResult.document);
    } else if (options?.stopOnError) {
      break;
    }
  }

  return result;
}

/**
 * Validate transform result against expected schema
 */
export function validateTransformResult(
  document: Record<string, any>,
  expectedFields: string[]
): { valid: boolean; missingFields: string[]; extraFields: string[] } {
  const docFields = new Set(Object.keys(flattenObject(document)));
  const expectedSet = new Set(expectedFields);

  const missingFields = expectedFields.filter(f => !docFields.has(f));
  const extraFields = Array.from(docFields).filter(f => !expectedSet.has(f));

  return {
    valid: missingFields.length === 0,
    missingFields,
    extraFields,
  };
}

/**
 * Flatten a nested object to dot-notation keys
 */
function flattenObject(
  obj: Record<string, any>,
  prefix: string = ''
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof ObjectId)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
