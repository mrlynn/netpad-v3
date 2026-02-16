import {
  detectFormat,
  detectDelimiter,
  parseDelimited,
  parseJSON,
  parseJSONL,
  parseData,
  getPreview,
  ParseOptions,
  ParseResult,
} from '@/lib/dataImport/parser';

describe('detectFormat', () => {
  it('detects CSV from MIME type', () => {
    expect(detectFormat('', 'text/csv')).toBe('csv');
  });

  it('detects TSV from MIME type', () => {
    expect(detectFormat('', 'text/tab-separated-values')).toBe('tsv');
  });

  it('detects JSON from MIME type', () => {
    expect(detectFormat('', 'application/json')).toBe('json');
  });

  it('detects XLSX from MIME type', () => {
    expect(detectFormat('', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
  });

  it('detects JSON from content starting with [', () => {
    expect(detectFormat('[{"a":1}]')).toBe('json');
  });

  it('detects JSON from content starting with {', () => {
    expect(detectFormat('{"a":1}')).toBe('json');
  });

  it('detects JSONL from multi-line JSON objects', () => {
    expect(detectFormat('{"a":1}\n{"a":2}\n{"a":3}')).toBe('jsonl');
  });

  it('detects TSV from tab-delimited content', () => {
    expect(detectFormat('name\tage\ncity\n')).toBe('tsv');
  });

  it('defaults to CSV', () => {
    expect(detectFormat('name,age\nAlice,30')).toBe('csv');
  });
});

describe('detectDelimiter', () => {
  it('detects comma', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('detects tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('detects pipe', () => {
    expect(detectDelimiter('a|b|c\n1|2|3')).toBe('|');
  });

  it('defaults to comma for no delimiters', () => {
    expect(detectDelimiter('abc')).toBe(',');
  });
});

describe('parseDelimited', () => {
  it('parses simple CSV', () => {
    const result = parseDelimited('name,age\nAlice,30\nBob,25', { format: 'csv' });
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].data).toEqual({ name: 'Alice', age: '30' });
  });

  it('handles quoted fields with commas', () => {
    const result = parseDelimited('name,city\n"Doe, John","New York"', { format: 'csv' });
    expect(result.records[0].data.name).toBe('Doe, John');
  });

  it('handles escaped quotes', () => {
    const result = parseDelimited('val\n"He said ""hi"""', { format: 'csv' });
    expect(result.records[0].data.val).toBe('He said "hi"');
  });

  it('returns warning for empty file', () => {
    const result = parseDelimited('', { format: 'csv' });
    expect(result.warnings).toContain('File is empty');
    expect(result.records).toHaveLength(0);
  });

  it('handles hasHeader=false', () => {
    const result = parseDelimited('Alice,30\nBob,25', { format: 'csv', hasHeader: false });
    expect(result.headers).toEqual(['column_1', 'column_2']);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].data).toEqual({ column_1: 'Alice', column_2: '30' });
  });

  it('respects maxRows', () => {
    const result = parseDelimited('h\na\nb\nc\nd', { format: 'csv', maxRows: 2 });
    expect(result.records).toHaveLength(2);
  });

  it('respects skipRows', () => {
    const result = parseDelimited('junk\nname\nAlice', { format: 'csv', skipRows: 1 });
    expect(result.headers).toEqual(['name']);
    expect(result.records[0].data.name).toBe('Alice');
  });

  it('handles duplicate headers', () => {
    const result = parseDelimited('a,a\n1,2', { format: 'csv' });
    expect(result.headers[1]).toBe('a_2');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns on column count mismatch', () => {
    const result = parseDelimited('a,b\n1', { format: 'csv' });
    expect(result.warnings.some(w => w.includes('fewer columns'))).toBe(true);
  });

  it('warns on extra columns', () => {
    const result = parseDelimited('a\n1,2', { format: 'csv' });
    expect(result.warnings.some(w => w.includes('more columns'))).toBe(true);
  });

  it('calls onProgress', () => {
    const progress = jest.fn();
    parseDelimited('h\na\nb', { format: 'csv', onProgress: progress });
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it('handles custom delimiter', () => {
    const result = parseDelimited('a~b\n1~2', { format: 'csv', customDelimiter: '~' });
    expect(result.headers).toEqual(['a', 'b']);
  });

  it('uses delimiter from config', () => {
    const result = parseDelimited('a;b\n1;2', { format: 'csv', delimiter: ';' });
    expect(result.headers).toEqual(['a', 'b']);
  });

  it('handles skipRows that skip all data', () => {
    const result = parseDelimited('a\nb', { format: 'csv', skipRows: 5 });
    expect(result.warnings).toContain('No data rows found after skipping');
  });
});

describe('parseJSON', () => {
  it('parses JSON array', () => {
    const result = parseJSON('[{"name":"Alice"},{"name":"Bob"}]', { format: 'json' });
    expect(result.headers).toContain('name');
    expect(result.records).toHaveLength(2);
  });

  it('wraps single object in array', () => {
    const result = parseJSON('{"name":"Alice"}', { format: 'json' });
    expect(result.records).toHaveLength(1);
    expect(result.warnings.some(w => w.includes('single object'))).toBe(true);
  });

  it('navigates rootPath', () => {
    const result = parseJSON('{"data":{"items":[{"x":1}]}}', { format: 'json', rootPath: 'data.items' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].data.x).toBe(1);
  });

  it('errors on invalid rootPath', () => {
    const result = parseJSON('{"a":1}', { format: 'json', rootPath: 'x.y.z' });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('errors on invalid JSON', () => {
    const result = parseJSON('not json', { format: 'json' });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('errors on non-object items', () => {
    const result = parseJSON('[1, 2, 3]', { format: 'json' });
    expect(result.errors).toHaveLength(3);
  });

  it('respects maxRows', () => {
    const result = parseJSON('[{"a":1},{"a":2},{"a":3}]', { format: 'json', maxRows: 1 });
    expect(result.records).toHaveLength(1);
  });

  it('calls onProgress', () => {
    const progress = jest.fn();
    parseJSON('[{"a":1},{"a":2}]', { format: 'json', onProgress: progress });
    expect(progress).toHaveBeenCalled();
  });

  it('collects all unique headers', () => {
    const result = parseJSON('[{"a":1},{"b":2}]', { format: 'json' });
    expect(result.headers).toEqual(expect.arrayContaining(['a', 'b']));
  });
});

describe('parseJSONL', () => {
  it('parses JSONL', () => {
    const result = parseJSONL('{"a":1}\n{"a":2}', { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
    expect(result.headers).toContain('a');
  });

  it('errors on non-object lines', () => {
    const result = parseJSONL('[1,2]\n{"a":1}', { format: 'jsonl' });
    expect(result.errors).toHaveLength(1);
    expect(result.records).toHaveLength(1);
  });

  it('errors on invalid JSON lines', () => {
    const result = parseJSONL('not json\n{"a":1}', { format: 'jsonl' });
    expect(result.errors).toHaveLength(1);
  });

  it('respects maxRows', () => {
    const result = parseJSONL('{"a":1}\n{"a":2}\n{"a":3}', { format: 'jsonl', maxRows: 2 });
    expect(result.records).toHaveLength(2);
  });

  it('handles empty lines', () => {
    const result = parseJSONL('{"a":1}\n\n{"a":2}', { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
  });
});

describe('parseData', () => {
  it('auto-detects CSV', () => {
    const result = parseData('name,age\nAlice,30', {});
    expect(result.headers).toEqual(['name', 'age']);
  });

  it('auto-detects JSON', () => {
    const result = parseData('[{"x":1}]', {});
    expect(result.records).toHaveLength(1);
  });

  it('auto-detects JSONL', () => {
    const result = parseData('{"x":1}\n{"x":2}', {});
    expect(result.records).toHaveLength(2);
  });

  it('uses explicit format', () => {
    const result = parseData('a,b\n1,2', { format: 'csv' });
    expect(result.headers).toEqual(['a', 'b']);
  });

  it('throws for xlsx', () => {
    expect(() => parseData('', { format: 'xlsx' })).toThrow('Excel');
  });

  it('uses TSV format with tab delimiter', () => {
    const result = parseData('a\tb\n1\t2', { format: 'tsv' });
    expect(result.headers).toEqual(['a', 'b']);
  });
});

describe('getPreview', () => {
  it('returns limited rows', () => {
    const result: ParseResult = {
      headers: ['a'],
      records: Array.from({ length: 20 }, (_, i) => ({ rowNumber: i + 1, data: { a: i } })),
      totalRows: 20,
      errors: [],
      warnings: [],
    };
    const preview = getPreview(result, 5);
    expect(preview.rows).toHaveLength(5);
    expect(preview.totalRows).toBe(20);
    expect(preview.headers).toEqual(['a']);
  });

  it('defaults to 10 rows', () => {
    const result: ParseResult = {
      headers: ['a'],
      records: Array.from({ length: 20 }, (_, i) => ({ rowNumber: i + 1, data: { a: i } })),
      totalRows: 20,
      errors: [],
      warnings: [],
    };
    const preview = getPreview(result);
    expect(preview.rows).toHaveLength(10);
  });

  it('maps record data to arrays by header order', () => {
    const result: ParseResult = {
      headers: ['x', 'y'],
      records: [{ rowNumber: 1, data: { x: 'a', y: 'b' } }],
      totalRows: 1,
      errors: [],
      warnings: [],
    };
    expect(getPreview(result).rows[0]).toEqual(['a', 'b']);
  });
});
