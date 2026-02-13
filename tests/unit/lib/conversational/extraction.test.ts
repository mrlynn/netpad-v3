/**
 * Tests for Conversational Data Extraction Pipeline
 * 
 * Tests pure functions: validateExtractedData, calculateOverallConfidence, mergeExtractions
 * (extractDataFromConversation and extractDataFromState require AI provider — skip)
 */

import {
  validateExtractedData,
  calculateOverallConfidence,
  mergeExtractions,
} from '@/lib/conversational/extraction';

import type { ExtractionSchema, ExtractedData } from '@/lib/ai/providers/base';

// ─── Test Helpers ───

function makeSchema(overrides?: Partial<ExtractionSchema>[]): ExtractionSchema[] {
  return [
    { field: 'name', type: 'string', required: true, description: 'Full name', ...overrides?.[0] },
    { field: 'email', type: 'string', required: true, description: 'Email', validation: { pattern: '^[^@]+@[^@]+$' }, ...overrides?.[1] },
    { field: 'age', type: 'number', required: false, description: 'Age', validation: { min: 0, max: 150 }, ...overrides?.[2] },
    { field: 'category', type: 'enum', required: true, description: 'Category', options: ['Hardware', 'Software', 'Network'], ...overrides?.[3] },
    { field: 'tags', type: 'array', required: false, description: 'Tags', ...overrides?.[4] },
    { field: 'active', type: 'boolean', required: false, description: 'Active', ...overrides?.[5] },
  ];
}

function makeExtractedData(overrides?: Partial<ExtractedData>): ExtractedData {
  return {
    data: { name: 'John Doe', email: 'john@example.com', category: 'Hardware' },
    confidence: { name: 0.95, email: 0.9, category: 0.85 },
    overallConfidence: 0.9,
    missingFields: [],
    warnings: [],
    ...overrides,
  };
}

// ─── validateExtractedData ───

describe('validateExtractedData', () => {
  it('validates complete valid data with no errors', () => {
    const schema = makeSchema();
    const data = makeExtractedData();
    const result = validateExtractedData(data, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing required fields', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { name: 'John' } }); // missing email, category
    const result = validateExtractedData(data, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Required field 'email' is missing");
    expect(result.errors).toContain("Required field 'category' is missing");
  });

  it('treats empty string as missing for required fields', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { name: '', email: 'a@b.com', category: 'Hardware' } });
    const result = validateExtractedData(data, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('validates string type', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { name: 123, email: 'a@b.com', category: 'Hardware' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors).toContain("Field 'name' must be a string");
  });

  it('validates string minLength', () => {
    const schema: ExtractionSchema[] = [
      { field: 'bio', type: 'string', required: false, description: 'Bio', validation: { minLength: 10 } },
    ];
    const data = makeExtractedData({ data: { bio: 'hi' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('at least 10'))).toBe(true);
  });

  it('validates string maxLength', () => {
    const schema: ExtractionSchema[] = [
      { field: 'code', type: 'string', required: false, description: 'Code', validation: { maxLength: 5 } },
    ];
    const data = makeExtractedData({ data: { code: 'toolong' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('at most 5'))).toBe(true);
  });

  it('validates string pattern', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { name: 'John', email: 'invalid-email', category: 'Hardware' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('pattern'))).toBe(true);
  });

  it('validates number type', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { ...makeExtractedData().data, age: 'twenty' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors).toContain("Field 'age' must be a number");
  });

  it('validates number min', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { ...makeExtractedData().data, age: -5 } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('at least 0'))).toBe(true);
  });

  it('validates number max', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { ...makeExtractedData().data, age: 200 } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('at most 150'))).toBe(true);
  });

  it('validates boolean type', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { ...makeExtractedData().data, active: 'yes' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors).toContain("Field 'active' must be a boolean");
  });

  it('validates enum with valid option', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { name: 'John', email: 'a@b.com', category: 'Hardware' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.filter((e) => e.includes('category'))).toHaveLength(0);
  });

  it('validates enum with invalid option', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { name: 'John', email: 'a@b.com', category: 'Plumbing' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('one of'))).toBe(true);
  });

  it('validates enum without options defined', () => {
    const schema: ExtractionSchema[] = [
      { field: 'level', type: 'enum', required: false, description: 'Level' },
    ];
    const data = makeExtractedData({ data: { level: 'A' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors.some((e) => e.includes('no options defined'))).toBe(true);
  });

  it('validates array type', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ data: { ...makeExtractedData().data, tags: 'not-array' } });
    const result = validateExtractedData(data, schema);
    expect(result.errors).toContain("Field 'tags' must be an array");
  });

  it('validates object type', () => {
    const schema: ExtractionSchema[] = [
      { field: 'meta', type: 'object', required: false, description: 'Metadata' },
    ];
    const data = makeExtractedData({ data: { meta: [1, 2] } }); // array is not an object for this check
    const result = validateExtractedData(data, schema);
    expect(result.errors).toContain("Field 'meta' must be an object");
  });

  it('accepts valid object type', () => {
    const schema: ExtractionSchema[] = [
      { field: 'meta', type: 'object', required: false, description: 'Metadata' },
    ];
    const data = makeExtractedData({ data: { meta: { key: 'value' } } });
    const result = validateExtractedData(data, schema);
    expect(result.errors).toHaveLength(0);
  });

  it('adds warnings for low confidence fields', () => {
    const schema = makeSchema();
    const data = makeExtractedData({
      data: { name: 'John', email: 'a@b.com', category: 'Hardware' },
      confidence: { name: 0.4, email: 0.9, category: 0.85 },
    });
    const result = validateExtractedData(data, schema);
    expect(result.warnings.some((w) => w.includes('Low confidence') && w.includes('name'))).toBe(true);
  });

  it('includes extraction warnings in output', () => {
    const schema = makeSchema();
    const data = makeExtractedData({ warnings: ['Ambiguous category'] });
    const result = validateExtractedData(data, schema);
    expect(result.warnings).toContain('Ambiguous category');
  });

  it('skips optional fields that are missing', () => {
    const schema = makeSchema();
    const data = makeExtractedData(); // no age, tags, active
    const result = validateExtractedData(data, schema);
    expect(result.isValid).toBe(true);
  });
});

// ─── calculateOverallConfidence ───

describe('calculateOverallConfidence', () => {
  it('returns 0 for empty confidences', () => {
    expect(calculateOverallConfidence({}, [])).toBe(0);
  });

  it('weights required fields higher (weight 2)', () => {
    const schema: ExtractionSchema[] = [
      { field: 'name', type: 'string', required: true, description: 'Name' },
      { field: 'bio', type: 'string', required: false, description: 'Bio' },
    ];
    const confidences = { name: 1.0, bio: 0.0 };
    const result = calculateOverallConfidence(confidences, schema);
    // (1.0*2 + 0.0*1) / (2+1) = 0.6667
    expect(result).toBeCloseTo(2 / 3, 4);
  });

  it('returns simple average when all fields optional', () => {
    const schema: ExtractionSchema[] = [
      { field: 'a', type: 'string', required: false, description: 'A' },
      { field: 'b', type: 'string', required: false, description: 'B' },
    ];
    const confidences = { a: 0.8, b: 0.4 };
    const result = calculateOverallConfidence(confidences, schema);
    expect(result).toBeCloseTo(0.6, 4);
  });

  it('ignores schema fields without confidence values', () => {
    const schema: ExtractionSchema[] = [
      { field: 'a', type: 'string', required: true, description: 'A' },
      { field: 'b', type: 'string', required: true, description: 'B' },
    ];
    const confidences = { a: 0.8 }; // b missing
    const result = calculateOverallConfidence(confidences, schema);
    // (0.8*2) / 2 = 0.8
    expect(result).toBeCloseTo(0.8, 4);
  });
});

// ─── mergeExtractions ───

describe('mergeExtractions', () => {
  it('merges partial and final extractions', () => {
    const partial = { name: 'John', notes: 'early note' };
    const final = makeExtractedData({
      data: { email: 'john@example.com', category: 'Software' },
      confidence: { email: 0.9, category: 0.85 },
    });
    const merged = mergeExtractions(partial, final);
    expect(merged.data.name).toBe('John');
    expect(merged.data.email).toBe('john@example.com');
    expect(merged.data.category).toBe('Software');
    expect(merged.data.notes).toBe('early note');
  });

  it('final extraction overrides partial for same field', () => {
    const partial = { category: 'Hardware' };
    const final = makeExtractedData({
      data: { category: 'Software' },
      confidence: { category: 0.9 },
    });
    const merged = mergeExtractions(partial, final);
    expect(merged.data.category).toBe('Software');
  });

  it('assigns 0.5 confidence to partial-only fields', () => {
    const partial = { notes: 'something' };
    const final = makeExtractedData({ data: {}, confidence: {} });
    const merged = mergeExtractions(partial, final);
    expect(merged.confidence.notes).toBe(0.5);
  });

  it('calculates overall confidence as average', () => {
    const partial = {};
    const final = makeExtractedData({
      data: { a: 1, b: 2 },
      confidence: { a: 0.8, b: 0.6 },
    });
    const merged = mergeExtractions(partial, final);
    expect(merged.overallConfidence).toBeCloseTo(0.7, 4);
  });

  it('returns 0 overall confidence when no fields', () => {
    const merged = mergeExtractions({}, makeExtractedData({ data: {}, confidence: {} }));
    expect(merged.overallConfidence).toBe(0);
  });

  it('preserves missingFields and warnings from final extraction', () => {
    const final = makeExtractedData({
      data: {},
      missingFields: ['urgency'],
      warnings: ['Low confidence overall'],
    });
    const merged = mergeExtractions({}, final);
    expect(merged.missingFields).toEqual(['urgency']);
    expect(merged.warnings).toEqual(['Low confidence overall']);
  });
});
