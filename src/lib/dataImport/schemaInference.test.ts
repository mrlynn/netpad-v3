import { inferSchema, generateDefaultMappings, validateMappings } from './schemaInference';

const makeRecords = (data: Record<string, any>[]) =>
  data.map((d, i) => ({ rowIndex: i, data: d, errors: [] }));

describe('inferSchema', () => {
  it('infers string type', () => {
    const records = makeRecords([{ name: 'Alice' }, { name: 'Bob' }]);
    const schema = inferSchema(['name'], records);
    expect(schema.fields[0].inferredType).toBe('string');
  });

  it('infers integer type', () => {
    const records = makeRecords([{ age: '25' }, { age: '30' }]);
    const schema = inferSchema(['age'], records);
    expect(schema.fields[0].inferredType).toBe('integer');
  });

  it('infers decimal type', () => {
    const records = makeRecords([{ price: '19.99' }, { price: '5.50' }]);
    const schema = inferSchema(['price'], records);
    expect(schema.fields[0].inferredType).toBe('decimal');
  });

  it('infers email type', () => {
    const records = makeRecords([{ email: 'a@b.com' }, { email: 'x@y.org' }]);
    const schema = inferSchema(['email'], records);
    expect(schema.fields[0].inferredType).toBe('email');
  });

  it('infers url type', () => {
    const records = makeRecords([{ site: 'https://a.com' }, { site: 'http://b.org' }]);
    const schema = inferSchema(['site'], records);
    expect(schema.fields[0].inferredType).toBe('url');
  });

  it('infers boolean type', () => {
    const records = makeRecords([{ active: 'true' }, { active: 'false' }]);
    const schema = inferSchema(['active'], records);
    expect(schema.fields[0].inferredType).toBe('boolean');
  });

  it('infers date type', () => {
    const records = makeRecords([{ d: '2024-01-01' }, { d: '2024-02-15' }]);
    const schema = inferSchema(['d'], records);
    expect(schema.fields[0].inferredType).toBe('date');
  });

  it('infers objectId type', () => {
    const records = makeRecords([{ id: '507f1f77bcf86cd799439011' }, { id: '507f1f77bcf86cd799439012' }]);
    const schema = inferSchema(['id'], records);
    expect(schema.fields[0].inferredType).toBe('objectId');
  });

  it('infers phone type', () => {
    const records = makeRecords([{ ph: '123-456-7890' }, { ph: '987-654-3210' }]);
    const schema = inferSchema(['ph'], records);
    expect(schema.fields[0].inferredType).toBe('phone');
  });

  it('warns on mixed types', () => {
    const records = makeRecords([{ x: 'hello' }, { x: '123' }]);
    const schema = inferSchema(['x'], records);
    expect(schema.warnings.some(w => w.type === 'mixed_types')).toBe(true);
  });

  it('warns on empty column', () => {
    const records = makeRecords([{ x: '' }, { x: null }]);
    const schema = inferSchema(['x'], records);
    expect(schema.warnings.some(w => w.type === 'empty_column')).toBe(true);
  });

  it('calculates stats', () => {
    const records = makeRecords([{ n: '10' }, { n: '20' }, { n: '' }]);
    const schema = inferSchema(['n'], records);
    const stats = schema.fields[0].stats;
    expect(stats.totalValues).toBe(3);
    expect(stats.nullCount).toBe(1);
  });

  it('detects required (no nulls)', () => {
    const records = makeRecords([{ x: 'a' }, { x: 'b' }]);
    const schema = inferSchema(['x'], records);
    expect(schema.fields[0].isRequired).toBe(true);
  });

  it('detects not required (has nulls)', () => {
    const records = makeRecords([{ x: 'a' }, { x: '' }]);
    const schema = inferSchema(['x'], records);
    expect(schema.fields[0].isRequired).toBe(false);
  });

  it('generates suggestedPath and suggestedLabel', () => {
    const records = makeRecords([{ 'First Name': 'A' }]);
    const schema = inferSchema(['First Name'], records);
    expect(schema.fields[0].suggestedPath).toBe('first_name');
    expect(schema.fields[0].suggestedLabel).toBe('First Name');
  });

  it('respects sampleSize option', () => {
    const records = makeRecords(Array.from({ length: 100 }, (_, i) => ({ x: String(i) })));
    const schema = inferSchema(['x'], records, { sampleSize: 10 });
    expect(schema.sampleSize).toBe(10);
  });
});

describe('generateDefaultMappings', () => {
  it('creates mappings from schema', () => {
    const records = makeRecords([{ name: 'A', age: '25' }]);
    const schema = inferSchema(['name', 'age'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings).toHaveLength(2);
    expect(mappings[0].sourceColumn).toBe('name');
    expect(mappings[0].action).toBe('import');
  });

  it('adds trim transform for strings', () => {
    const records = makeRecords([{ email: 'a@b.com' }]);
    const schema = inferSchema(['email'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'trim')).toBe(true);
  });

  it('adds parseNumber transform for numbers', () => {
    const records = makeRecords([{ n: '42' }]);
    const schema = inferSchema(['n'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseNumber')).toBe(true);
  });

  it('adds parseBoolean transform for booleans', () => {
    const records = makeRecords([{ b: 'true' }, { b: 'false' }]);
    const schema = inferSchema(['b'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseBoolean')).toBe(true);
  });

  it('adds parseDate transform for dates', () => {
    const records = makeRecords([{ d: '2024-01-01' }, { d: '2024-02-01' }]);
    const schema = inferSchema(['d'], records);
    const mappings = generateDefaultMappings(schema);
    expect(mappings[0].transforms?.some(t => t.type === 'parseDate')).toBe(true);
  });
});

describe('validateMappings', () => {
  it('returns valid for correct mappings', () => {
    const records = makeRecords([{ a: '1' }]);
    const schema = inferSchema(['a'], records);
    const mappings = generateDefaultMappings(schema);
    expect(validateMappings(mappings, schema).valid).toBe(true);
  });

  it('errors on unknown source column', () => {
    const records = makeRecords([{ a: '1' }]);
    const schema = inferSchema(['a'], records);
    const mappings = [{ sourceColumn: 'nonexistent', action: 'import' as const, targetPath: 'x', targetType: 'string', required: false }];
    const result = validateMappings(mappings, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('nonexistent'))).toBe(true);
  });

  it('errors on duplicate target paths', () => {
    const records = makeRecords([{ a: '1', b: '2' }]);
    const schema = inferSchema(['a', 'b'], records);
    const mappings = [
      { sourceColumn: 'a', action: 'import' as const, targetPath: 'same', targetType: 'string', required: false },
      { sourceColumn: 'b', action: 'import' as const, targetPath: 'same', targetType: 'string', required: false },
    ];
    const result = validateMappings(mappings, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });
});
