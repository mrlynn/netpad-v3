import { validateExtractedData, calculateOverallConfidence, mergeExtractions } from './extraction';

describe('validateExtractedData', () => {
  it('returns valid for correct data', () => {
    const result = validateExtractedData(
      { data: { name: 'Alice' }, confidence: { name: 0.9 }, overallConfidence: 0.9, missingFields: [] },
      [{ field: 'name', type: 'string', required: true, description: '' }]
    );
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors on missing required field', () => {
    const result = validateExtractedData(
      { data: {}, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'name', type: 'string', required: true, description: '' }]
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Required field 'name' is missing");
  });

  it('errors on empty string for required field', () => {
    const result = validateExtractedData(
      { data: { name: '' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'name', type: 'string', required: true, description: '' }]
    );
    expect(result.isValid).toBe(false);
  });

  it('skips missing optional fields', () => {
    const result = validateExtractedData(
      { data: {}, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'bio', type: 'string', required: false, description: '' }]
    );
    expect(result.isValid).toBe(true);
  });

  // String validations
  it('errors on non-string value for string field', () => {
    const result = validateExtractedData(
      { data: { name: 123 }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'name', type: 'string', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'name' must be a string");
  });

  it('errors on string too short', () => {
    const result = validateExtractedData(
      { data: { name: 'ab' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'name', type: 'string', required: false, description: '', validation: { minLength: 3 } }]
    );
    expect(result.errors).toContain("Field 'name' must be at least 3 characters");
  });

  it('errors on string too long', () => {
    const result = validateExtractedData(
      { data: { name: 'abcdef' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'name', type: 'string', required: false, description: '', validation: { maxLength: 3 } }]
    );
    expect(result.errors).toContain("Field 'name' must be at most 3 characters");
  });

  it('errors on pattern mismatch', () => {
    const result = validateExtractedData(
      { data: { code: 'abc' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'code', type: 'string', required: false, description: '', validation: { pattern: '^\\d+$' } }]
    );
    expect(result.errors).toContain("Field 'code' does not match required pattern");
  });

  // Number validations
  it('errors on non-number', () => {
    const result = validateExtractedData(
      { data: { age: 'old' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'age', type: 'number', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'age' must be a number");
  });

  it('errors on number below min', () => {
    const result = validateExtractedData(
      { data: { age: 5 }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'age', type: 'number', required: false, description: '', validation: { min: 18 } }]
    );
    expect(result.errors).toContain("Field 'age' must be at least 18");
  });

  it('errors on number above max', () => {
    const result = validateExtractedData(
      { data: { age: 200 }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'age', type: 'number', required: false, description: '', validation: { max: 150 } }]
    );
    expect(result.errors).toContain("Field 'age' must be at most 150");
  });

  // Boolean
  it('errors on non-boolean', () => {
    const result = validateExtractedData(
      { data: { active: 'yes' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'active', type: 'boolean', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'active' must be a boolean");
  });

  it('accepts boolean', () => {
    const result = validateExtractedData(
      { data: { active: true }, confidence: { active: 0.9 }, overallConfidence: 0.9, missingFields: [] },
      [{ field: 'active', type: 'boolean', required: false, description: '' }]
    );
    expect(result.isValid).toBe(true);
  });

  // Enum
  it('errors on invalid enum value', () => {
    const result = validateExtractedData(
      { data: { color: 'purple' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'color', type: 'enum', required: false, description: '', options: ['red', 'blue'] }]
    );
    expect(result.errors).toContain("Field 'color' must be one of: red, blue");
  });

  it('errors on enum with no options defined', () => {
    const result = validateExtractedData(
      { data: { color: 'red' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'color', type: 'enum', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'color' is enum type but has no options defined");
  });

  // Array
  it('errors on non-array', () => {
    const result = validateExtractedData(
      { data: { tags: 'notarray' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'tags', type: 'array', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'tags' must be an array");
  });

  // Object
  it('errors on non-object', () => {
    const result = validateExtractedData(
      { data: { meta: 'notobj' }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'meta', type: 'object', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'meta' must be an object");
  });

  it('errors when array passed for object field', () => {
    const result = validateExtractedData(
      { data: { meta: [1, 2] }, confidence: {}, overallConfidence: 0, missingFields: [] },
      [{ field: 'meta', type: 'object', required: false, description: '' }]
    );
    expect(result.errors).toContain("Field 'meta' must be an object");
  });

  // Confidence warnings
  it('warns on low confidence', () => {
    const result = validateExtractedData(
      { data: { name: 'Alice' }, confidence: { name: 0.3 }, overallConfidence: 0.3, missingFields: [] },
      [{ field: 'name', type: 'string', required: false, description: '' }]
    );
    expect(result.warnings.some(w => w.includes('Low confidence'))).toBe(true);
  });

  it('no warning for high confidence', () => {
    const result = validateExtractedData(
      { data: { name: 'Alice' }, confidence: { name: 0.9 }, overallConfidence: 0.9, missingFields: [] },
      [{ field: 'name', type: 'string', required: false, description: '' }]
    );
    expect(result.warnings.filter(w => w.includes('Low confidence'))).toHaveLength(0);
  });

  it('includes extracted warnings', () => {
    const result = validateExtractedData(
      { data: {}, confidence: {}, overallConfidence: 0, missingFields: [], warnings: ['extra warn'] },
      []
    );
    expect(result.warnings).toContain('extra warn');
  });
});

describe('calculateOverallConfidence', () => {
  it('returns 0 for empty confidences', () => {
    expect(calculateOverallConfidence({}, [])).toBe(0);
  });

  it('weights required fields higher', () => {
    const conf = { a: 1.0, b: 0.5 };
    const schema = [
      { field: 'a', type: 'string' as const, required: true, description: '' },
      { field: 'b', type: 'string' as const, required: false, description: '' },
    ];
    // weighted: (1.0*2 + 0.5*1) / (2+1) = 2.5/3 ≈ 0.833
    expect(calculateOverallConfidence(conf, schema)).toBeCloseTo(0.833, 2);
  });

  it('ignores schema fields without confidence', () => {
    const conf = { a: 0.8 };
    const schema = [
      { field: 'a', type: 'string' as const, required: false, description: '' },
      { field: 'b', type: 'string' as const, required: false, description: '' },
    ];
    expect(calculateOverallConfidence(conf, schema)).toBeCloseTo(0.8);
  });
});

describe('mergeExtractions', () => {
  it('merges partial and final extractions', () => {
    const partial = { name: 'Alice', age: 30 };
    const final = {
      data: { name: 'Bob' },
      confidence: { name: 0.9 },
      overallConfidence: 0.9,
      missingFields: ['email'],
      warnings: [],
    };
    const result = mergeExtractions(partial, final);
    expect(result.data.name).toBe('Bob'); // final overrides
    expect(result.data.age).toBe(30); // partial kept
    expect(result.confidence.name).toBe(0.9);
    expect(result.confidence.age).toBe(0.5); // partial gets 0.5
    expect(result.missingFields).toEqual(['email']);
  });

  it('calculates overall confidence as average', () => {
    const result = mergeExtractions({}, {
      data: { a: 1, b: 2 },
      confidence: { a: 0.8, b: 0.6 },
      overallConfidence: 0.7,
      missingFields: [],
    });
    expect(result.overallConfidence).toBeCloseTo(0.7);
  });

  it('handles empty inputs', () => {
    const result = mergeExtractions({}, {
      data: {},
      confidence: {},
      overallConfidence: 0,
      missingFields: [],
    });
    expect(result.overallConfidence).toBe(0);
    expect(result.data).toEqual({});
  });
});
