/**
 * Data Export Utility Library
 * Converts MongoDB documents to various export formats
 */

export type ExportFormat = 'csv' | 'json' | 'jsonl';

export interface ExportOptions {
  format: ExportFormat;
  fields?: string[];  // Specific fields to export (all if not specified)
  includeId?: boolean;  // Include _id field (default: true)
  flattenObjects?: boolean;  // Flatten nested objects for CSV (default: true)
  dateFormat?: 'iso' | 'timestamp' | 'locale';  // How to format dates
  nullValue?: string;  // What to use for null values in CSV (default: '')
  delimiter?: string;  // CSV delimiter (default: ',')
}

const defaultOptions: ExportOptions = {
  format: 'json',
  includeId: true,
  flattenObjects: true,
  dateFormat: 'iso',
  nullValue: '',
  delimiter: ',',
};

/**
 * Flatten a nested object for CSV export
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      flattenObject(value as Record<string, unknown>, newKey, result);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Format a value for CSV output
 */
function formatCSVValue(value: unknown, options: ExportOptions): string {
  if (value === null || value === undefined) {
    return options.nullValue || '';
  }

  if (value instanceof Date) {
    switch (options.dateFormat) {
      case 'timestamp':
        return value.getTime().toString();
      case 'locale':
        return value.toLocaleString();
      default:
        return value.toISOString();
    }
  }

  if (typeof value === 'object') {
    // Handle ObjectId
    if (value && typeof value === 'object' && '$oid' in value) {
      return String((value as { $oid: string }).$oid);
    }
    // Handle Date in extended JSON format
    if (value && typeof value === 'object' && '$date' in value) {
      const dateValue = (value as { $date: string | number }).$date;
      const date = new Date(dateValue);
      switch (options.dateFormat) {
        case 'timestamp':
          return date.getTime().toString();
        case 'locale':
          return date.toLocaleString();
        default:
          return date.toISOString();
      }
    }
    // For arrays and other objects, stringify
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Escape a value for CSV (handle quotes and delimiters)
 */
function escapeCSV(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Get all unique field names from documents
 */
function getAllFields(documents: Record<string, unknown>[], options: ExportOptions): string[] {
  const fieldSet = new Set<string>();

  for (const doc of documents) {
    const processedDoc = options.flattenObjects ? flattenObject(doc) : doc;
    for (const key of Object.keys(processedDoc)) {
      if (key === '_id' && !options.includeId) continue;
      fieldSet.add(key);
    }
  }

  // Sort fields, keeping _id first if present
  const fields = Array.from(fieldSet);
  fields.sort((a, b) => {
    if (a === '_id') return -1;
    if (b === '_id') return 1;
    return a.localeCompare(b);
  });

  return fields;
}

/**
 * Export documents to CSV format
 */
export function exportToCSV(
  documents: Record<string, unknown>[],
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options, format: 'csv' as const };
  const delimiter = opts.delimiter || ',';

  if (documents.length === 0) {
    return '';
  }

  // Determine fields to export
  const fields = opts.fields || getAllFields(documents, opts);

  if (fields.length === 0) {
    return '';
  }

  // Create header row
  const headerRow = fields.map(f => escapeCSV(f, delimiter)).join(delimiter);

  // Create data rows
  const dataRows = documents.map(doc => {
    const processedDoc = opts.flattenObjects ? flattenObject(doc) : doc;

    return fields.map(field => {
      const value = processedDoc[field];
      const formatted = formatCSVValue(value, opts);
      return escapeCSV(formatted, delimiter);
    }).join(delimiter);
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Export documents to JSON format (array of objects)
 */
export function exportToJSON(
  documents: Record<string, unknown>[],
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options, format: 'json' as const };

  let processedDocs = documents;

  // Filter out _id if not included
  if (!opts.includeId) {
    processedDocs = documents.map(doc => {
      const { _id, ...rest } = doc;
      return rest;
    });
  }

  // Filter to specific fields if provided
  if (opts.fields && opts.fields.length > 0) {
    const fieldsSet = new Set(opts.fields);
    if (opts.includeId) fieldsSet.add('_id');

    processedDocs = processedDocs.map(doc => {
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(doc)) {
        if (fieldsSet.has(key)) {
          filtered[key] = doc[key];
        }
      }
      return filtered;
    });
  }

  return JSON.stringify(processedDocs, null, 2);
}

/**
 * Export documents to JSON Lines format (one JSON object per line)
 */
export function exportToJSONL(
  documents: Record<string, unknown>[],
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options, format: 'jsonl' as const };

  let processedDocs = documents;

  // Filter out _id if not included
  if (!opts.includeId) {
    processedDocs = documents.map(doc => {
      const { _id, ...rest } = doc;
      return rest;
    });
  }

  // Filter to specific fields if provided
  if (opts.fields && opts.fields.length > 0) {
    const fieldsSet = new Set(opts.fields);
    if (opts.includeId) fieldsSet.add('_id');

    processedDocs = processedDocs.map(doc => {
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(doc)) {
        if (fieldsSet.has(key)) {
          filtered[key] = doc[key];
        }
      }
      return filtered;
    });
  }

  return processedDocs.map(doc => JSON.stringify(doc)).join('\n');
}

/**
 * Export documents to TSV format
 */
export function exportToTSV(
  documents: Record<string, unknown>[],
  options: Partial<ExportOptions> = {}
): string {
  return exportToCSV(documents, { ...options, delimiter: '\t' });
}

/**
 * Main export function that routes to the appropriate format
 */
export function exportDocuments(
  documents: Record<string, unknown>[],
  options: Partial<ExportOptions> = {}
): string {
  const format = options.format || 'json';

  switch (format) {
    case 'csv':
      return exportToCSV(documents, options);
    case 'json':
      return exportToJSON(documents, options);
    case 'jsonl':
      return exportToJSONL(documents, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Get the appropriate MIME type for a format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'jsonl':
      return 'application/x-ndjson';
    default:
      return 'text/plain';
  }
}

/**
 * Get the appropriate file extension for a format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return '.csv';
    case 'json':
      return '.json';
    case 'jsonl':
      return '.jsonl';
    default:
      return '.txt';
  }
}
