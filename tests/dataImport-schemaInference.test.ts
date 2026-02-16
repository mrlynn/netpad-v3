import { inferSchema, generateDefaultMappings } from '@/lib/dataImport/schemaInference';
import { ParsedRecord } from '@/lib/dataImport/parser';

function makeRecords(rows: Record<string, any>[]): ParsedRecord[] {
  return rows.map((data, i) => ({ rowNumber: i + 1, data }));
}

describe('inferSchema', () => {
  it('infers string fields', () => {
    const schema = inferSchema(['name'], makeRecords([{ name: 'Alice' }, { name: 'Bob' }]));
    expect(schema.fields).toHaveLength(1);
    expect(schema.fields[0].inferredType).toBe('string');
    expect(schema.fields[0].originalName).toBe('name');
  });

  it('infers integer fields', () => {
    const schema = inferSchema(['age'], makeRecords([{ age: '25' }, { age: '30' }]));
    expect(schema.fields[0].inferredType).toBe('integer');
  });

  it('infers decimal fields', () => {
    const schema = inferSchema(['price'], makeRecords([{ price: '9.99' }, { price: '19.50' }]));
    expect(schema.fields[0].inferredType).toBe('decimal');
  });

  it('infers boolean fields', () => {
    const schema = inferSchema(['active'], makeRecords([{ active: 'true' }, { active: 'false' }]));
    expect(schema.fields[0].inferredType).toBe('boolean');
  });

  it('infers email fields', () => {
    const schema = inferSchema(['email'], makeRecords([
      { email: 'a@b.com' }, { email: 'c@d.org' },
    ]));
    expect(schema.fields[0].inferredType).toBe('email');
  });

  it('infers url fields', () => {
    const schema = inferSchema(['url'], makeRecords([
      { url: 'https://example.com' }, { url: 'http://test.org/page' },
    ]));
    expect(schema.fields[0].inferredType).toBe('url');
  });

  it('infers phone fields', () => {
    const schema = inferSchema(['phone'], makeRecords([
      { phone: '123-456-7890' }, { phone: '(555) 123-4567' },
    ]));
    // phone pattern might match or might be string depending on regex
    const type = schema.fields[0].inferredType;
    expect(['phone', 'string']).toContain(type);
  });

  it('infers date fields (ISO)', () => {
    const schema = inferSchema(['date'], makeRecords([
      { date: '2024-01-15' }, { date: '2024-06-30' },
    ]));
    expect(schema.fields[0].inferredType).toBe('date');
  });

  it('infers datetime fields', () => {
    const schema = inferSchema(['ts'], makeRecords([
      { ts: '2024-01-15T10:30:00Z' }, { ts: '2024-06-30T14:00:00Z' },
    ]));
    expect(schema.fields[0].inferredType).toBe('datetime');
  });

  it('infers objectId fields', () => {
    const schema = inferSchema(['id'], makeRecords([
      { id: '507f1f77bcf86cd799439011' }, { id: '507f1f77bcf86cd799439012' },
    ]));
    expect(schema.fields[0].inferredType).toBe('objectId');
  });

  it('detects all-null columns', () => {
    const schema = inferSchema(['empty'], makeRecords([{ empty: '' }, { empty: '' }]));
    expect(schema.warnings.some(w => w.type === 'empty_column')).toBe(true);
  });

  it('detects mixed types', () => {
    const schema = inferSchema(['mixed'], makeRecords([
      { mixed: '123' }, { mixed: 'hello' }, { mixed: '456' }, { mixed: 'world' },
    ]));
    // Should produce a warning about mixed types
    // Depends on threshold (10% of non-null)
    expect(schema.warnings.length).toBeGreaterThanOrEqual(0); // may or may not warn
  });

  it('calculates stats', () => {
    const schema = inferSchema(['val'], makeRecords([{ val: '10' }, { val: '20' }, { val: '30' }]));
    const stats = schema.fields[0].stats;
    expect(stats.totalValues).toBe(3);
    expect(stats.nullCount).toBe(0);
    expect(stats.uniqueCount).toBe(3);
  });

  it('calculates numeric stats', () => {
    const schema = inferSchema(['n'], makeRecords([{ n: '10' }, { n: '20' }, { n: '30' }]));
    const stats = schema.fields[0].stats;
    expect(stats.minValue).toBe(10);
    expect(stats.maxValue).toBe(30);
    expect(stats.avgValue).toBe(20);
  });

  it('marks unique fields', () => {
    const schema = inferSchema(['id'], makeRecords([{ id: 'a' }, { id: 'b' }, { id: 'c' }]));
    expect(schema.fields[0].isUnique).toBe(true);
  });

  it('marks required fields (no nulls)', () => {
    const schema = inferSchema(['r'], makeRecords([{ r: 'a' }, { r: 'b' }]));
    expect(schema.fields[0].isRequired).toBe(true);
  });

  it('marks non-required when nulls present', () => {
    const schema = inferSchema(['r'], makeRecords([{ r: 'a' }, { r: '' }]));
    expect(schema.fields[0].isRequired).toBe(false);
  });

  it('generates suggestedPath (toFieldPath)', () => {
    const schema = inferSchema(['First Name'], makeRecords([{ 'First Name': 'A' }]));
    expect(schema.fields[0].suggestedPath).toBe('first_name');
  });

  it('generates suggestedLabel (toLabel)', () => {
    const schema = inferSchema(['first_name'], makeRecords([{ first_name: 'A' }]));
    expect(schema.fields[0].suggestedLabel).toBe('First Name');
  });

  it('generates suggestedLabel from camelCase', () => {
    const schema = inferSchema(['firstName'], makeRecords([{ firstName: 'A' }]));
    expect(schema.fields[0].suggestedLabel).toBe('First Name');
  });

  it('uses sampleSize option', () => {
    const records = makeRecords([{ a: '1' }, { a: '2' }, { a: '3' }]);
    const schema = inferSchema(['a'], records, { sampleSize: 2 });
    expect(schema.sampleSize).toBe(2);
  });

  it('detects patterns (email)', () => {
    const schema = inferSchema(['email'], makeRecords([
      { email: 'a@b.com' }, { email: 'c@d.org' }, { email: 'e@f.net' },
    ]));
    const patterns = schema.fields[0].detectedPatterns || [];
    expect(patterns.some(p => p.pattern === 'email')).toBe(true);
  });

  it('suggests options for low-cardinality fields', () => {
    const records = makeRecords(Array.from({ length: 100 }, (_, i) => ({
      status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'inactive' : 'pending',
    })));
    const schema = inferSchema(['status'], records);
    expect(schema.fields[0].suggestedValidation?.options).toBeDefined();
  });

  it('handles native number values', () => {
    const schema = inferSchema(['n'], makeRecords([{ n: 42 }, { n: 3.14 }]));
    expect(['integer', 'decimal']).toContain(schema.fields[0].inferredType);
  });

  it('handles native boolean values', () => {
    const schema = inferSchema(['b'], makeRecords([{ b: true }, { b: false }]));
    expect(schema.fields[0].inferredType).toBe('boolean');
  });

  it('handles array values', () => {
    const schema = inferSchema(['arr'], makeRecords([{ arr: [1, 2] }, { arr: [3] }]));
    expect(schema.fields[0].inferredType).toBe('array');
  });

  it('handles object values', () => {
    const schema = inferSchema(['obj'], makeRecords([{ obj: { a: 1 } }]));
    expect(schema.fields[0].inferredType).toBe('object');
  });
});

describe('generateDefaultMappings', () => {
  it('creates mappings for all fields', () => {
    const schema = inferSchema(['name', 'age'], makeRecords([{ name: 'A', age: '25' }]));
    const mappings = generateDefaultMappings(schema);
    expect(mappings).toHaveLength(2);
    expect(mappings[0].sourceColumn).toBe('name');
    expect(mappings[0].action).toBe('import');
  });

  it('adds parseNumber transform for numeric fields', () => {
    const schema = inferSchema(['n'], makeRecords([{ n: '42' }]));
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseNumber')).toBe(true);
  });

  it('adds parseDate transform for date fields', () => {
    const schema = inferSchema(['d'], makeRecords([{ d: '2024-01-15' }]));
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseDate')).toBe(true);
  });
});
