/**
 * Data Parser Library
 * Parses CSV, TSV, JSON, JSONL, and Excel files into structured records
 */

import {
  ImportSourceConfig,
  ImportFileFormat,
  DelimiterType,
} from '@/types/dataImport';

export interface ParsedRecord {
  rowNumber: number;
  data: Record<string, any>;
  rawLine?: string;
}

export interface ParseResult {
  headers: string[];
  records: ParsedRecord[];
  totalRows: number;
  errors: ParseError[];
  warnings: string[];
}

export interface ParseError {
  rowNumber: number;
  message: string;
  rawLine?: string;
}

export interface ParseOptions extends ImportSourceConfig {
  maxRows?: number;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Get the actual delimiter character from config
 */
function getDelimiter(config: ParseOptions): string {
  if (config.customDelimiter) {
    return config.customDelimiter;
  }

  const delimiterMap: Record<DelimiterType, string> = {
    ',': ',',
    '\t': '\t',
    ';': ';',
    '|': '|',
    'custom': config.customDelimiter || ',',
  };

  return delimiterMap[config.delimiter || ','] || ',';
}

/**
 * Detect file format from content or MIME type
 */
export function detectFormat(content: string, mimeType?: string): ImportFileFormat {
  // Check MIME type first
  if (mimeType) {
    if (mimeType.includes('csv') || mimeType === 'text/csv') return 'csv';
    if (mimeType === 'text/tab-separated-values') return 'tsv';
    if (mimeType.includes('json')) return 'json';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx';
  }

  // Check content
  const firstLine = content.split('\n')[0];
  const firstChar = content.trim()[0];

  // JSON detection
  if (firstChar === '[' || firstChar === '{') {
    // Check if it's JSONL (multiple JSON objects per line)
    const lines = content.trim().split('\n');
    if (lines.length > 1 && lines.every(line => {
      try {
        JSON.parse(line.trim());
        return true;
      } catch {
        return false;
      }
    })) {
      return 'jsonl';
    }
    return 'json';
  }

  // Delimiter detection
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount && tabCount > pipeCount) {
    return 'tsv';
  }

  return 'csv'; // Default to CSV
}

/**
 * Detect the delimiter used in a CSV-like file
 */
export function detectDelimiter(content: string): DelimiterType {
  const firstLines = content.split('\n').slice(0, 5).join('\n');

  const counts = {
    ',': (firstLines.match(/,/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
    ';': (firstLines.match(/;/g) || []).length,
    '|': (firstLines.match(/\|/g) || []).length,
  };

  let maxDelimiter: DelimiterType = ',';
  let maxCount = counts[','];

  for (const [delimiter, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDelimiter = delimiter as DelimiterType;
    }
  }

  return maxDelimiter;
}

/**
 * Parse a CSV/TSV line handling quoted fields
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // Push the last field
  result.push(current.trim());

  return result;
}

/**
 * Parse CSV or TSV content
 */
export function parseDelimited(content: string, options: ParseOptions): ParseResult {
  const delimiter = getDelimiter(options);
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  const result: ParseResult = {
    headers: [],
    records: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  };

  if (lines.length === 0) {
    result.warnings.push('File is empty');
    return result;
  }

  // Skip initial rows if configured
  const startRow = options.skipRows || 0;
  const dataLines = lines.slice(startRow);

  if (dataLines.length === 0) {
    result.warnings.push('No data rows found after skipping');
    return result;
  }

  // Parse headers
  if (options.hasHeader !== false) {
    const headerLine = dataLines[0];
    result.headers = parseCSVLine(headerLine, delimiter);

    // Check for duplicate headers
    const headerCounts: Record<string, number> = {};
    result.headers = result.headers.map(header => {
      if (!header) {
        return `column_${Object.keys(headerCounts).length + 1}`;
      }
      if (headerCounts[header]) {
        headerCounts[header]++;
        result.warnings.push(`Duplicate header "${header}" renamed to "${header}_${headerCounts[header]}"`);
        return `${header}_${headerCounts[header]}`;
      }
      headerCounts[header] = 1;
      return header;
    });
  } else {
    // Generate column names
    const firstLine = parseCSVLine(dataLines[0], delimiter);
    result.headers = firstLine.map((_, i) => `column_${i + 1}`);
  }

  // Parse data rows
  const dataStartIndex = options.hasHeader !== false ? 1 : 0;
  const maxRows = options.maxRows || Infinity;

  result.totalRows = dataLines.length - dataStartIndex;

  for (let i = dataStartIndex; i < dataLines.length && result.records.length < maxRows; i++) {
    const line = dataLines[i];
    const rowNumber = startRow + i + 1; // 1-based row number in original file

    try {
      const values = parseCSVLine(line, delimiter);

      // Check for column count mismatch
      if (values.length !== result.headers.length) {
        if (values.length < result.headers.length) {
          // Pad with empty strings
          while (values.length < result.headers.length) {
            values.push('');
          }
          result.warnings.push(`Row ${rowNumber}: fewer columns than headers, padded with empty values`);
        } else {
          result.warnings.push(`Row ${rowNumber}: more columns than headers, extra values ignored`);
        }
      }

      // Create record
      const data: Record<string, any> = {};
      result.headers.forEach((header, idx) => {
        data[header] = values[idx] || '';
      });

      result.records.push({
        rowNumber,
        data,
        rawLine: line,
      });

      // Progress callback
      if (options.onProgress) {
        options.onProgress(result.records.length, result.totalRows);
      }
    } catch (error) {
      result.errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Unknown parse error',
        rawLine: line,
      });
    }
  }

  return result;
}

/**
 * Parse JSON content (array of objects)
 */
export function parseJSON(content: string, options: ParseOptions): ParseResult {
  const result: ParseResult = {
    headers: [],
    records: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  };

  try {
    let data = JSON.parse(content);

    // Navigate to root path if specified
    if (options.rootPath) {
      const pathParts = options.rootPath.split('.');
      for (const part of pathParts) {
        if (data && typeof data === 'object') {
          data = data[part];
        } else {
          throw new Error(`Path "${options.rootPath}" not found in JSON`);
        }
      }
    }

    // Ensure we have an array
    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        // Single object - wrap in array
        data = [data];
        result.warnings.push('JSON contains a single object, treating as single record');
      } else {
        throw new Error('JSON must be an array of objects or a single object');
      }
    }

    result.totalRows = data.length;

    // Extract all unique keys for headers
    const headerSet = new Set<string>();
    data.forEach((item: any) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => headerSet.add(key));
      }
    });
    result.headers = Array.from(headerSet);

    // Parse records
    const maxRows = options.maxRows || Infinity;

    for (let i = 0; i < data.length && result.records.length < maxRows; i++) {
      const item = data[i];

      if (item && typeof item === 'object') {
        result.records.push({
          rowNumber: i + 1,
          data: item,
        });
      } else {
        result.errors.push({
          rowNumber: i + 1,
          message: `Invalid record at index ${i}: expected object`,
        });
      }

      if (options.onProgress) {
        options.onProgress(result.records.length, result.totalRows);
      }
    }
  } catch (error) {
    result.errors.push({
      rowNumber: 0,
      message: error instanceof Error ? error.message : 'JSON parse error',
    });
  }

  return result;
}

/**
 * Parse JSONL (JSON Lines) content
 */
export function parseJSONL(content: string, options: ParseOptions): ParseResult {
  const result: ParseResult = {
    headers: [],
    records: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  };

  const lines = content.split(/\r?\n/).filter(line => line.trim());
  result.totalRows = lines.length;

  // Extract all unique keys for headers
  const headerSet = new Set<string>();
  const maxRows = options.maxRows || Infinity;

  for (let i = 0; i < lines.length && result.records.length < maxRows; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const item = JSON.parse(line);

      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item).forEach(key => headerSet.add(key));
        result.records.push({
          rowNumber: i + 1,
          data: item,
          rawLine: line,
        });
      } else {
        result.errors.push({
          rowNumber: i + 1,
          message: 'Expected JSON object',
          rawLine: line,
        });
      }

      if (options.onProgress) {
        options.onProgress(result.records.length, result.totalRows);
      }
    } catch (error) {
      result.errors.push({
        rowNumber: i + 1,
        message: error instanceof Error ? error.message : 'JSON parse error',
        rawLine: line,
      });
    }
  }

  result.headers = Array.from(headerSet);
  return result;
}

/**
 * Main parse function that delegates to format-specific parsers
 */
export function parseData(content: string, options: ParseOptions): ParseResult {
  const format = options.format || detectFormat(content);

  switch (format) {
    case 'csv':
      return parseDelimited(content, { ...options, delimiter: options.delimiter || ',' });

    case 'tsv':
      return parseDelimited(content, { ...options, delimiter: '\t' });

    case 'json':
      return parseJSON(content, options);

    case 'jsonl':
      return parseJSONL(content, options);

    case 'xlsx':
    case 'xls':
      // Excel parsing requires a different approach (binary)
      throw new Error('Excel parsing requires binary file handling - use parseExcel function');

    default:
      // Try CSV as default
      return parseDelimited(content, options);
  }
}

/**
 * Parse binary Excel content using xlsx library
 * Note: This function should be called with the file buffer, not string content
 */
export async function parseExcel(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<ParseResult> {
  // Dynamic import to avoid bundling xlsx in non-excel contexts
  const XLSX = await import('xlsx');

  const result: ParseResult = {
    headers: [],
    records: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  };

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Get sheet
    let sheetName: string;
    if (options.sheetName) {
      if (!workbook.SheetNames.includes(options.sheetName)) {
        throw new Error(`Sheet "${options.sheetName}" not found`);
      }
      sheetName = options.sheetName;
    } else if (options.sheetIndex !== undefined) {
      if (options.sheetIndex >= workbook.SheetNames.length) {
        throw new Error(`Sheet index ${options.sheetIndex} out of range`);
      }
      sheetName = workbook.SheetNames[options.sheetIndex];
    } else {
      sheetName = workbook.SheetNames[0];
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length === 0) {
      result.warnings.push('Sheet is empty');
      return result;
    }

    // Skip rows
    const startRow = options.skipRows || 0;
    const dataRows = rows.slice(startRow);

    // Parse headers
    if (options.hasHeader !== false) {
      result.headers = (dataRows[0] || []).map((h, i) =>
        h ? String(h).trim() : `column_${i + 1}`
      );
    } else {
      result.headers = (dataRows[0] || []).map((_, i) => `column_${i + 1}`);
    }

    // Parse data
    const dataStartIndex = options.hasHeader !== false ? 1 : 0;
    result.totalRows = dataRows.length - dataStartIndex;
    const maxRows = options.maxRows || Infinity;

    for (let i = dataStartIndex; i < dataRows.length && result.records.length < maxRows; i++) {
      const row = dataRows[i];
      const data: Record<string, any> = {};

      result.headers.forEach((header, idx) => {
        data[header] = row[idx] !== undefined ? row[idx] : '';
      });

      result.records.push({
        rowNumber: startRow + i + 1,
        data,
      });

      if (options.onProgress) {
        options.onProgress(result.records.length, result.totalRows);
      }
    }
  } catch (error) {
    result.errors.push({
      rowNumber: 0,
      message: error instanceof Error ? error.message : 'Excel parse error',
    });
  }

  return result;
}

/**
 * Convert parsed records to a preview format
 */
export function getPreview(result: ParseResult, maxRows: number = 10): {
  headers: string[];
  rows: any[][];
  totalRows: number;
} {
  return {
    headers: result.headers,
    rows: result.records.slice(0, maxRows).map(record =>
      result.headers.map(header => record.data[header])
    ),
    totalRows: result.totalRows,
  };
}
