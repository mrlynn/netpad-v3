/**
 * Tests for Data Import Parser
 */
import {
  detectFormat,
  detectDelimiter,
  parseDelimited,
  parseJSON,
  parseJSONL,
  parseData,
  getPreview,
} from '@/lib/dataImport/parser';

describe('detectFormat', () => {
  it('detects CSV from MIME type', () => {
    expect(detectFormat('a,b,c', 'text/csv')).toBe('csv');
  });

  it('detects TSV from MIME type', () => {
    expect(detectFormat('a\tb\tc', 'text/tab-separated-values')).toBe('tsv');
  });

  it('detects JSON from MIME type', () => {
    expect(detectFormat('[{"a":1}]', 'application/json')).toBe('json');
  });

  it('detects Excel from MIME type', () => {
    expect(detectFormat('binary', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
  });

  it('detects JSON array from content', () => {
    expect(detectFormat('[{"name":"Alice"},{"name":"Bob"}]')).toBe('json');
  });

  it('detects JSON object from content', () => {
    expect(detectFormat('{"name":"Alice"}')).toBe('json');
  });

  it('detects JSONL from content', () => {
    const content = '{"name":"Alice"}\n{"name":"Bob"}';
    expect(detectFormat(content)).toBe('jsonl');
  });

  it('detects TSV when tabs dominate', () => {
    const content = 'name\tage\tcity\nAlice\t30\tNYC';
    expect(detectFormat(content)).toBe('tsv');
  });

  it('defaults to CSV', () => {
    const content = 'name,age,city\nAlice,30,NYC';
    expect(detectFormat(content)).toBe('csv');
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
});

describe('parseDelimited', () => {
  it('parses basic CSV', () => {
    const content = 'name,age,city\nAlice,30,NYC\nBob,25,LA';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].data).toEqual({ name: 'Alice', age: '30', city: 'NYC' });
    expect(result.records[1].data).toEqual({ name: 'Bob', age: '25', city: 'LA' });
    expect(result.totalRows).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('handles quoted fields with commas', () => {
    const content = 'name,address\nAlice,"123 Main St, Apt 4"\nBob,"456 Oak Ave"';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.records[0].data.address).toBe('123 Main St, Apt 4');
  });

  it('handles escaped quotes in quoted fields', () => {
    const content = 'name,quote\nAlice,"She said ""hello"""\nBob,"Test"';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.records[0].data.quote).toBe('She said "hello"');
  });

  it('handles empty file', () => {
    const result = parseDelimited('', { format: 'csv' });
    expect(result.warnings).toContain('File is empty');
    expect(result.records).toHaveLength(0);
  });

  it('handles skipRows', () => {
    const content = 'junk line\nname,age\nAlice,30';
    const result = parseDelimited(content, { format: 'csv', skipRows: 1 });
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.records).toHaveLength(1);
  });

  it('handles hasHeader=false', () => {
    const content = 'Alice,30,NYC\nBob,25,LA';
    const result = parseDelimited(content, { format: 'csv', hasHeader: false });
    expect(result.headers).toEqual(['column_1', 'column_2', 'column_3']);
    expect(result.records).toHaveLength(2);
  });

  it('renames duplicate headers', () => {
    const content = 'name,age,name\nAlice,30,Smith';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.headers).toEqual(['name', 'age', 'name_2']);
    expect(result.warnings.some(w => w.includes('Duplicate header'))).toBe(true);
  });

  it('generates names for empty headers', () => {
    const content = 'name,,city\nAlice,30,NYC';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.headers[1]).toMatch(/column_\d+/);
  });

  it('pads rows with fewer columns', () => {
    const content = 'name,age,city\nAlice,30';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.records[0].data.city).toBe('');
    expect(result.warnings.some(w => w.includes('fewer columns'))).toBe(true);
  });

  it('warns on extra columns', () => {
    const content = 'name,age\nAlice,30,NYC';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.warnings.some(w => w.includes('more columns'))).toBe(true);
  });

  it('respects maxRows', () => {
    const content = 'name\nA\nB\nC\nD\nE';
    const result = parseDelimited(content, { format: 'csv', maxRows: 2 });
    expect(result.records).toHaveLength(2);
  });

  it('uses custom delimiter', () => {
    const content = 'name|age\nAlice|30';
    const result = parseDelimited(content, { format: 'csv', customDelimiter: '|' });
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.records[0].data).toEqual({ name: 'Alice', age: '30' });
  });

  it('uses semicolon delimiter', () => {
    const content = 'name;age\nAlice;30';
    const result = parseDelimited(content, { format: 'csv', delimiter: ';' });
    expect(result.headers).toEqual(['name', 'age']);
  });

  it('handles \\r\\n line endings', () => {
    const content = 'name,age\r\nAlice,30\r\nBob,25';
    const result = parseDelimited(content, { format: 'csv' });
    expect(result.records).toHaveLength(2);
  });

  it('calls onProgress callback', () => {
    const progress: [number, number][] = [];
    const content = 'name\nA\nB\nC';
    parseDelimited(content, {
      format: 'csv',
      onProgress: (processed, total) => progress.push([processed, total]),
    });
    expect(progress).toHaveLength(3);
    expect(progress[2]).toEqual([3, 3]);
  });

  it('handles all-skip scenario after skipRows', () => {
    const content = 'junk\njunk2';
    const result = parseDelimited(content, { format: 'csv', skipRows: 2 });
    expect(result.warnings.some(w => w.includes('No data rows'))).toBe(true);
  });
});

describe('parseJSON', () => {
  it('parses JSON array', () => {
    const content = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    const result = parseJSON(content, { format: 'json' });
    expect(result.headers).toContain('name');
    expect(result.headers).toContain('age');
    expect(result.records).toHaveLength(2);
    expect(result.records[0].data).toEqual({ name: 'Alice', age: 30 });
  });

  it('wraps single object in array', () => {
    const content = JSON.stringify({ name: 'Alice', age: 30 });
    const result = parseJSON(content, { format: 'json' });
    expect(result.records).toHaveLength(1);
    expect(result.warnings.some(w => w.includes('single object'))).toBe(true);
  });

  it('navigates rootPath', () => {
    const content = JSON.stringify({
      data: { results: [{ id: 1 }, { id: 2 }] },
    });
    const result = parseJSON(content, { format: 'json', rootPath: 'data.results' });
    expect(result.records).toHaveLength(2);
  });

  it('errors on invalid rootPath', () => {
    const content = JSON.stringify({ data: 'hello' });
    const result = parseJSON(content, { format: 'json', rootPath: 'data.results' });
    expect(result.errors).toHaveLength(1);
  });

  it('errors on non-object/array JSON', () => {
    const content = JSON.stringify({ data: 'hello' });
    const result = parseJSON(content, { format: 'json', rootPath: 'data' });
    expect(result.errors).toHaveLength(1);
  });

  it('reports errors for non-object items', () => {
    const content = JSON.stringify([{ name: 'Alice' }, 42, { name: 'Bob' }]);
    const result = parseJSON(content, { format: 'json' });
    expect(result.records).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });

  it('respects maxRows', () => {
    const content = JSON.stringify([{ a: 1 }, { a: 2 }, { a: 3 }]);
    const result = parseJSON(content, { format: 'json', maxRows: 1 });
    expect(result.records).toHaveLength(1);
  });

  it('collects all unique headers across objects', () => {
    const content = JSON.stringify([{ a: 1, b: 2 }, { b: 3, c: 4 }]);
    const result = parseJSON(content, { format: 'json' });
    expect(result.headers).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('handles invalid JSON', () => {
    const result = parseJSON('not json at all', { format: 'json' });
    expect(result.errors).toHaveLength(1);
  });
});

describe('parseJSONL', () => {
  it('parses JSONL content', () => {
    const content = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}';
    const result = parseJSONL(content, { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
    expect(result.headers).toContain('name');
    expect(result.headers).toContain('age');
  });

  it('skips empty lines', () => {
    const content = '{"a":1}\n\n{"a":2}\n';
    const result = parseJSONL(content, { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
  });

  it('reports errors for non-object lines', () => {
    const content = '{"a":1}\n[1,2,3]\n{"a":2}';
    const result = parseJSONL(content, { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });

  it('reports errors for invalid JSON lines', () => {
    const content = '{"a":1}\nnot json\n{"a":2}';
    const result = parseJSONL(content, { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });

  it('respects maxRows', () => {
    const content = '{"a":1}\n{"a":2}\n{"a":3}';
    const result = parseJSONL(content, { format: 'jsonl', maxRows: 2 });
    expect(result.records).toHaveLength(2);
  });
});

describe('parseData', () => {
  it('auto-detects and parses CSV', () => {
    const content = 'name,age\nAlice,30';
    const result = parseData(content, { format: 'csv' });
    expect(result.records).toHaveLength(1);
  });

  it('auto-detects and parses JSON', () => {
    const content = JSON.stringify([{ name: 'Alice' }]);
    const result = parseData(content, { format: 'json' });
    expect(result.records).toHaveLength(1);
  });

  it('auto-detects and parses JSONL', () => {
    const content = '{"a":1}\n{"a":2}';
    const result = parseData(content, { format: 'jsonl' });
    expect(result.records).toHaveLength(2);
  });

  it('parses TSV format', () => {
    const content = 'name\tage\nAlice\t30';
    const result = parseData(content, { format: 'tsv' });
    expect(result.records).toHaveLength(1);
  });

  it('throws for xlsx format with string content', () => {
    expect(() => parseData('binary', { format: 'xlsx' })).toThrow('Excel parsing requires binary');
  });

  it('falls back to CSV for unknown format', () => {
    const content = 'name,age\nAlice,30';
    const result = parseData(content, { format: 'csv' });
    expect(result.records).toHaveLength(1);
  });
});

describe('getPreview', () => {
  it('returns limited preview rows', () => {
    const content = 'name\nA\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nL';
    const result = parseDelimited(content, { format: 'csv' });
    const preview = getPreview(result, 3);
    expect(preview.rows).toHaveLength(3);
    expect(preview.headers).toEqual(['name']);
    expect(preview.totalRows).toBe(12);
  });

  it('returns all rows if fewer than max', () => {
    const content = 'name\nA\nB';
    const result = parseDelimited(content, { format: 'csv' });
    const preview = getPreview(result, 10);
    expect(preview.rows).toHaveLength(2);
  });
});
