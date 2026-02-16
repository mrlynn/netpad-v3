/**
 * Tests for Schema Inference
 */
import {
  inferSchema,
  generateDefaultMappings,
  validateMappings,
} from '@/lib/dataImport/schemaInference';
import { ParsedRecord } from '@/lib/dataImport/parser';

function makeRecords(data: Record<string, any>[]): ParsedRecord[] {
  return data.map((d, i) => ({ rowNumber: i + 1, data: d }));
}

describe('inferSchema', () => {
  it('infers string fields', () => {
    const records = makeRecords([
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Charlie' },
    ]);
    const schema = inferSchema(['name'], records);
    expect(schema.fields).toHaveLength(1);
    expect(schema.fields[0].inferredType).toBe('string');
    expect(schema.fields[0].originalName).toBe('name');
    expect(schema.fields[0].isRequired).toBe(true);
  });

  it('infers integer fields', () => {
    const records = makeRecords([{ age: '25' }, { age: '30' }, { age: '35' }]);
    const schema = inferSchema(['age'], records);
    expect(schema.fields[0].inferredType).toBe('integer');
  });

  it('infers decimal fields', () => {
    const records = makeRecords([{ price: '9.99' }, { price: '19.50' }, { price: '4.75' }]);
    const schema = inferSchema(['price'], records);
    expect(schema.fields[0].inferredType).toBe('decimal');
  });

  it('infers email fields', () => {
    const records = makeRecords([
      { email: 'alice@example.com' },
      { email: 'bob@test.org' },
      { email: 'charlie@foo.io' },
    ]);
    const schema = inferSchema(['email'], records);
    expect(schema.fields[0].inferredType).toBe('email');
  });

  it('infers boolean fields', () => {
    const records = makeRecords([{ active: 'true' }, { active: 'false' }, { active: 'yes' }]);
    const schema = inferSchema(['active'], records);
    expect(schema.fields[0].inferredType).toBe('boolean');
  });

  it('infers date fields (ISO)', () => {
    const records = makeRecords([
      { date: '2024-01-15' },
      { date: '2024-02-20' },
      { date: '2024-03-25' },
    ]);
    const schema = inferSchema(['date'], records);
    expect(schema.fields[0].inferredType).toBe('date');
  });

  it('infers URL fields', () => {
    const records = makeRecords([
      { url: 'https://example.com' },
      { url: 'http://test.org/page' },
      { url: 'https://foo.io/bar' },
    ]);
    const schema = inferSchema(['url'], records);
    expect(schema.fields[0].inferredType).toBe('url');
  });

  it('detects empty columns', () => {
    const records = makeRecords([{ col: '' }, { col: '' }, { col: '' }]);
    const schema = inferSchema(['col'], records);
    expect(schema.warnings.some(w => w.type === 'empty_column')).toBe(true);
  });

  it('detects mixed types', () => {
    const records = makeRecords([
      { val: '42' },
      { val: 'hello' },
      { val: '99' },
      { val: 'world' },
    ]);
    const schema = inferSchema(['val'], records);
    expect(schema.warnings.some(w => w.type === 'mixed_types')).toBe(true);
  });

  it('marks fields with nulls as not required', () => {
    const records = makeRecords([{ name: 'Alice' }, { name: '' }, { name: 'Bob' }]);
    const schema = inferSchema(['name'], records);
    expect(schema.fields[0].isRequired).toBe(false);
  });

  it('detects unique fields', () => {
    const records = makeRecords([{ id: '1' }, { id: '2' }, { id: '3' }]);
    const schema = inferSchema(['id'], records);
    expect(schema.fields[0].isUnique).toBe(true);
  });

  it('suggests enum options for low-cardinality fields', () => {
    const records = makeRecords([
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' },
      { status: 'pending' },
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' },
      { status: 'pending' },
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' },
      { status: 'pending' },
    ]);
    const schema = inferSchema(['status'], records);
    expect(schema.fields[0].suggestedValidation?.options).toBeDefined();
  });

  it('generates suggested field paths', () => {
    const records = makeRecords([{ 'First Name': 'Alice' }]);
    const schema = inferSchema(['First Name'], records);
    expect(schema.fields[0].suggestedPath).toBe('first_name');
    expect(schema.fields[0].suggestedLabel).toBe('First Name');
  });

  it('handles multiple headers', () => {
    const records = makeRecords([
      { name: 'Alice', age: '30', email: 'alice@example.com' },
    ]);
    const schema = inferSchema(['name', 'age', 'email'], records);
    expect(schema.fields).toHaveLength(3);
  });

  it('respects sampleSize option', () => {
    const records = makeRecords(
      Array.from({ length: 100 }, (_, i) => ({ val: String(i) }))
    );
    const schema = inferSchema(['val'], records, { sampleSize: 10 });
    expect(schema.sampleSize).toBe(10);
  });

  it('uses suggestedCollection option', () => {
    const records = makeRecords([{ name: 'Alice' }]);
    const schema = inferSchema(['name'], records, { suggestedCollection: 'users' });
    expect(schema.suggestedCollection).toBe('users');
  });

  it('calculates numeric stats', () => {
    const records = makeRecords([{ val: '10' }, { val: '20' }, { val: '30' }]);
    const schema = inferSchema(['val'], records);
    const stats = schema.fields[0].stats;
    expect(stats.minValue).toBe(10);
    expect(stats.maxValue).toBe(30);
    expect(stats.avgValue).toBe(20);
  });

  it('calculates string stats', () => {
    const records = makeRecords([{ name: 'Al' }, { name: 'Bob' }, { name: 'Charlie' }]);
    const schema = inferSchema(['name'], records);
    const stats = schema.fields[0].stats;
    expect(stats.minLength).toBe(2);
    expect(stats.maxLength).toBe(7);
  });
});

describe('generateDefaultMappings', () => {
  it('generates mappings for all fields', () => {
    const records = makeRecords([
      { name: 'Alice', age: '30', email: 'a@b.com', active: 'true', date: '2024-01-01' },
    ]);
    const schema = inferSchema(['name', 'age', 'email', 'active', 'date'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings).toHaveLength(5);
    expect(mappings.every(m => m.action === 'import')).toBe(true);
  });

  it('adds trim transform for string fields', () => {
    const records = makeRecords([{ name: 'Alice' }]);
    const schema = inferSchema(['name'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'trim')).toBe(true);
  });

  it('adds parseNumber transform for numeric fields', () => {
    const records = makeRecords([{ age: '30' }]);
    const schema = inferSchema(['age'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseNumber')).toBe(true);
  });

  it('adds parseBoolean transform for boolean fields', () => {
    const records = makeRecords([{ active: 'true' }]);
    const schema = inferSchema(['active'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseBoolean')).toBe(true);
  });

  it('adds parseDate transform for date fields', () => {
    const records = makeRecords([{ date: '2024-01-01' }]);
    const schema = inferSchema(['date'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseDate')).toBe(true);
  });

  it('always adds nullIfEmpty transform', () => {
    const records = makeRecords([{ name: 'Alice' }]);
    const schema = inferSchema(['name'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'nullIfEmpty')).toBe(true);
  });
});

describe('validateMappings', () => {
  it('validates correct mappings', () => {
    const records = makeRecords([{ name: 'Alice', age: '30' }]);
    const schema = inferSchema(['name', 'age'], records);
    const mappings = generateDefaultMappings(schema);
    const result = validateMappings(mappings, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches missing source columns', () => {
    const records = makeRecords([{ name: 'Alice' }]);
    const schema = inferSchema(['name'], records);
    const result = validateMappings(
      [{ sourceColumn: 'nonexistent', action: 'import', targetPath: 'x', targetType: 'short-answer' }],
      schema
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });

  it('catches duplicate target paths', () => {
    const records = makeRecords([{ a: '1', b: '2' }]);
    const schema = inferSchema(['a', 'b'], records);
    const result = validateMappings(
      [
        { sourceColumn: 'a', action: 'import', targetPath: 'same', targetType: 'short-answer' },
        { sourceColumn: 'b', action: 'import', targetPath: 'same', targetType: 'short-answer' },
      ],
      schema
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('ignores skipped mappings for duplicate check', () => {
    const records = makeRecords([{ a: '1', b: '2' }]);
    const schema = inferSchema(['a', 'b'], records);
    const result = validateMappings(
      [
        { sourceColumn: 'a', action: 'import', targetPath: 'x', targetType: 'short-answer' },
        { sourceColumn: 'b', action: 'skip', targetPath: 'x', targetType: 'short-answer' },
      ],
      schema
    );
    expect(result.valid).toBe(true);
  });
});
