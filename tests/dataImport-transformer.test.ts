/**
 * Tests for src/lib/dataImport/transformer.ts
 *
 * applyTransform is private, so we test it through transformRecord.
 * We create single-field mappings with specific transforms.
 */
import { transformRecord, transformBatch, validateTransformResult } from '@/lib/dataImport/transformer';
import { ParsedRecord } from '@/lib/dataImport/parser';
import { ColumnTransform, ImportMappingConfig } from '@/types/dataImport';
import { ObjectId } from 'mongodb';

function makeRecord(data: Record<string, any>, rowNumber = 1): ParsedRecord {
  return { rowNumber, data };
}

function makeConfig(sourceColumn: string, transforms: ColumnTransform[]): ImportMappingConfig {
  return {
    mappings: [{
      sourceColumn,
      action: 'import',
      targetPath: sourceColumn,
      transforms,
    }],
  };
}

function applyOne(value: any, transform: ColumnTransform) {
  const result = transformRecord(makeRecord({ col: value }), makeConfig('col', [transform]));
  return { value: result.document.col, errors: result.errors };
}

describe('transform: trim', () => {
  it('trims whitespace', () => {
    expect(applyOne('  hello  ', { type: 'trim' }).value).toBe('hello');
  });
  it('returns non-string as-is', () => {
    expect(applyOne(42, { type: 'trim' }).value).toBe(42);
  });
});

describe('transform: uppercase', () => {
  it('uppercases string', () => {
    expect(applyOne('hello', { type: 'uppercase' }).value).toBe('HELLO');
  });
  it('returns non-string as-is', () => {
    expect(applyOne(42, { type: 'uppercase' }).value).toBe(42);
  });
});

describe('transform: lowercase', () => {
  it('lowercases string', () => {
    expect(applyOne('HELLO', { type: 'lowercase' }).value).toBe('hello');
  });
});

describe('transform: titlecase', () => {
  it('title-cases string', () => {
    expect(applyOne('hello world', { type: 'titlecase' }).value).toBe('Hello World');
  });
  it('returns non-string as-is', () => {
    expect(applyOne(42, { type: 'titlecase' }).value).toBe(42);
  });
});

describe('transform: parseNumber', () => {
  it('parses integer', () => {
    expect(applyOne('42', { type: 'parseNumber' }).value).toBe(42);
  });
  it('parses float', () => {
    expect(applyOne('3.14', { type: 'parseNumber' }).value).toBe(3.14);
  });
  it('strips currency symbols', () => {
    expect(applyOne('$1,234.56', { type: 'parseNumber' }).value).toBe(1234.56);
  });
  it('returns null for empty', () => {
    expect(applyOne('', { type: 'parseNumber' }).value).toBeNull();
  });
  it('returns null with error for non-numeric', () => {
    const r = applyOne('abc', { type: 'parseNumber' });
    expect(r.value).toBeNull();
    expect(r.errors).toHaveLength(1);
  });
  it('returns null for null input', () => {
    expect(applyOne(null, { type: 'parseNumber' }).value).toBeNull();
  });
});

describe('transform: parseDate', () => {
  it('parses ISO date', () => {
    const r = applyOne('2024-01-15', { type: 'parseDate' });
    expect(r.value).toBeInstanceOf(Date);
  });
  it('returns null for empty', () => {
    expect(applyOne('', { type: 'parseDate' }).value).toBeNull();
  });
  it('returns error for unparseable date', () => {
    const r = applyOne('not-a-date', { type: 'parseDate' });
    expect(r.value).toBeNull();
    expect(r.errors).toHaveLength(1);
  });
  it('uses inputFormat', () => {
    const r = applyOne('2024-01-15', { type: 'parseDate', inputFormat: 'YYYY-MM-DD' });
    expect(r.value).toBeInstanceOf(Date);
    expect((r.value as Date).getFullYear()).toBe(2024);
    expect((r.value as Date).getMonth()).toBe(0); // January
    expect((r.value as Date).getDate()).toBe(15);
  });
});

describe('transform: parseBoolean', () => {
  it('parses true values', () => {
    expect(applyOne('yes', { type: 'parseBoolean' }).value).toBe(true);
    expect(applyOne('1', { type: 'parseBoolean' }).value).toBe(true);
    expect(applyOne('true', { type: 'parseBoolean' }).value).toBe(true);
  });
  it('parses false values', () => {
    expect(applyOne('no', { type: 'parseBoolean' }).value).toBe(false);
    expect(applyOne('0', { type: 'parseBoolean' }).value).toBe(false);
  });
  it('returns null for empty', () => {
    expect(applyOne('', { type: 'parseBoolean' }).value).toBeNull();
  });
  it('errors on unknown value', () => {
    const r = applyOne('maybe', { type: 'parseBoolean' });
    expect(r.value).toBeNull();
    expect(r.errors).toHaveLength(1);
  });
  it('supports custom true/false values', () => {
    const r = applyOne('si', { type: 'parseBoolean', trueValues: ['si'], falseValues: ['no'] });
    expect(r.value).toBe(true);
  });
});

describe('transform: parseJSON', () => {
  it('parses JSON string', () => {
    expect(applyOne('{"a":1}', { type: 'parseJSON' }).value).toEqual({ a: 1 });
  });
  it('parses JSON array', () => {
    expect(applyOne('[1,2]', { type: 'parseJSON' }).value).toEqual([1, 2]);
  });
  it('returns null for empty', () => {
    expect(applyOne('', { type: 'parseJSON' }).value).toBeNull();
  });
  it('errors on invalid JSON', () => {
    const r = applyOne('{bad}', { type: 'parseJSON' });
    expect(r.value).toBeNull();
    expect(r.errors).toHaveLength(1);
  });
});

describe('transform: splitToArray', () => {
  it('splits by comma by default', () => {
    expect(applyOne('a,b,c', { type: 'splitToArray' }).value).toEqual(['a', 'b', 'c']);
  });
  it('uses custom separator', () => {
    expect(applyOne('a|b', { type: 'splitToArray', separator: '|' }).value).toEqual(['a', 'b']);
  });
  it('returns empty array for empty string', () => {
    expect(applyOne('', { type: 'splitToArray' }).value).toEqual([]);
  });
  it('trims and filters empty', () => {
    expect(applyOne('a, ,b', { type: 'splitToArray' }).value).toEqual(['a', 'b']);
  });
});

describe('transform: joinFromArray', () => {
  it('joins array', () => {
    expect(applyOne(['a', 'b'], { type: 'joinFromArray' }).value).toBe('a, b');
  });
  it('uses custom separator', () => {
    expect(applyOne(['a', 'b'], { type: 'joinFromArray', separator: '|' }).value).toBe('a|b');
  });
  it('handles non-array', () => {
    expect(applyOne('hello', { type: 'joinFromArray' }).value).toBe('hello');
  });
});

describe('transform: regex', () => {
  it('replaces pattern', () => {
    expect(applyOne('hello123', { type: 'regex', pattern: '\\d+', replacement: '' }).value).toBe('hello');
  });
  it('returns null for null input', () => {
    expect(applyOne(null, { type: 'regex', pattern: 'x' }).value).toBeNull();
  });
  it('returns value if no pattern', () => {
    expect(applyOne('hello', { type: 'regex' }).value).toBe('hello');
  });
});

describe('transform: default', () => {
  it('applies default for empty', () => {
    expect(applyOne('', { type: 'default', defaultValue: 'N/A' }).value).toBe('N/A');
  });
  it('applies default for null', () => {
    expect(applyOne(null, { type: 'default', defaultValue: 0 }).value).toBe(0);
  });
  it('does not apply default for existing value', () => {
    expect(applyOne('hello', { type: 'default', defaultValue: 'N/A' }).value).toBe('hello');
  });
});

describe('transform: nullIfEmpty', () => {
  it('converts empty string to null', () => {
    expect(applyOne('', { type: 'nullIfEmpty' }).value).toBeNull();
  });
  it('converts whitespace-only to null', () => {
    expect(applyOne('   ', { type: 'nullIfEmpty' }).value).toBeNull();
  });
  it('keeps non-empty value', () => {
    expect(applyOne('hello', { type: 'nullIfEmpty' }).value).toBe('hello');
  });
});

describe('transform: objectId', () => {
  it('creates ObjectId from valid hex', () => {
    const r = applyOne('507f1f77bcf86cd799439011', { type: 'objectId' });
    expect(r.value).toBeInstanceOf(ObjectId);
  });
  it('returns null for empty', () => {
    expect(applyOne('', { type: 'objectId' }).value).toBeNull();
  });
  it('errors on invalid objectId', () => {
    const r = applyOne('not-valid', { type: 'objectId' });
    expect(r.value).toBeNull();
    expect(r.errors).toHaveLength(1);
  });
});

describe('transformBatch', () => {
  it('transforms multiple records', () => {
    const records = [makeRecord({ col: '  a  ' }, 1), makeRecord({ col: '  b  ' }, 2)];
    const config = makeConfig('col', [{ type: 'trim' }]);
    const result = transformBatch(records, config);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].col).toBe('a');
    expect(result.processed).toBe(2);
  });
});

describe('validateTransformResult', () => {
  it('reports missing fields', () => {
    const r = validateTransformResult({ a: 1 }, ['a', 'b']);
    expect(r.valid).toBe(false);
    expect(r.missingFields).toContain('b');
  });
  it('reports extra fields', () => {
    const r = validateTransformResult({ a: 1, b: 2 }, ['a']);
    expect(r.extraFields).toContain('b');
  });
  it('valid when all expected fields present', () => {
    expect(validateTransformResult({ a: 1 }, ['a']).valid).toBe(true);
  });
});
