/**
 * Tests for Conversational Data Mapping
 * 
 * Tests: mapExtractedDataToFormFields, validateMappedData
 */

import {
  mapExtractedDataToFormFields,
  validateMappedData,
} from '@/lib/conversational/mapping';

import type { ExtractionSchema } from '@/types/conversational';
import type { FieldConfig } from '@/types/form';

// ─── Test Helpers ───

function makeFieldConfigs(): FieldConfig[] {
  return [
    { path: 'fullName', label: 'Full Name', type: 'text', required: true } as FieldConfig,
    { path: 'emailAddress', label: 'Email Address', type: 'email', required: true } as FieldConfig,
    { path: 'category', label: 'Category', type: 'select', required: true } as FieldConfig,
    { path: 'urgency_level', label: 'Urgency Level', type: 'select', required: false } as FieldConfig,
    { path: 'details.description', label: 'Description', type: 'textarea', required: true } as FieldConfig,
    { path: 'notes', label: 'Additional Notes', type: 'text', required: false, included: false } as FieldConfig,
  ];
}

function makeExtractionSchema(): ExtractionSchema[] {
  return [
    { field: 'fullName', type: 'string', required: true, description: 'Name' },
    { field: 'emailAddress', type: 'string', required: true, description: 'Email' },
    { field: 'category', type: 'enum', required: true, description: 'Category', options: ['Hardware', 'Software'] },
    { field: 'urgencyLevel', type: 'string', required: false, description: 'Urgency' },
    { field: 'description', type: 'string', required: true, description: 'Description' },
  ];
}

// ─── mapExtractedDataToFormFields ───

describe('mapExtractedDataToFormFields', () => {
  it('maps exact field name matches', () => {
    const data = { fullName: 'John Doe', category: 'Hardware' };
    const result = mapExtractedDataToFormFields(data, makeExtractionSchema(), makeFieldConfigs());
    expect(result.mappedData.fullName).toBe('John Doe');
    expect(result.mappedData.category).toBe('Hardware');
  });

  it('maps case-insensitive matches', () => {
    const fields: FieldConfig[] = [
      { path: 'FullName', label: 'Full Name', type: 'text', required: true } as FieldConfig,
    ];
    const schema: ExtractionSchema[] = [
      { field: 'fullname', type: 'string', required: true, description: 'Name' },
    ];
    const data = { fullname: 'Jane' };
    const result = mapExtractedDataToFormFields(data, schema, fields);
    expect(result.mappedData.FullName).toBe('Jane');
    expect(result.mappingReport[0].strategy).toBe('case-insensitive');
  });

  it('maps via camelCase conversion', () => {
    const fields: FieldConfig[] = [
      { path: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: false } as FieldConfig,
    ];
    const schema: ExtractionSchema[] = [
      { field: 'urgencyLevel', type: 'string', required: false, description: 'Urgency' },
    ];
    const data = { urgencyLevel: 'High' };
    const result = mapExtractedDataToFormFields(data, schema, fields);
    expect(result.mappedData.urgencyLevel).toBe('High');
  });

  it('maps via label matching', () => {
    const fields: FieldConfig[] = [
      { path: 'contact_info', label: 'Contact Email', type: 'email', required: false } as FieldConfig,
    ];
    const schema: ExtractionSchema[] = [
      { field: 'contact email', type: 'string', required: false, description: 'Contact' },
    ];
    const data = { 'contact email': 'a@b.com' };
    const result = mapExtractedDataToFormFields(data, schema, fields);
    expect(result.mappedData.contact_info).toBe('a@b.com');
    expect(result.mappingReport[0].strategy).toBe('label-match');
  });

  it('sets nested values using dot notation paths', () => {
    const data = { description: 'Laptop is broken' };
    const schema: ExtractionSchema[] = [
      { field: 'description', type: 'string', required: true, description: 'Desc' },
    ];
    const fields: FieldConfig[] = [
      { path: 'details.description', label: 'Description', type: 'textarea', required: true } as FieldConfig,
    ];
    const result = mapExtractedDataToFormFields(data, schema, fields);
    expect(result.mappedData.details.description).toBe('Laptop is broken');
  });

  it('puts unmatched fields in unmappedFields', () => {
    const data = { unknownField: 'value', fullName: 'John' };
    const schema: ExtractionSchema[] = [
      { field: 'unknownField', type: 'string', required: false, description: 'Unknown' },
      { field: 'fullName', type: 'string', required: true, description: 'Name' },
    ];
    const result = mapExtractedDataToFormFields(data, schema, makeFieldConfigs());
    expect(result.unmappedFields.unknownField).toBe('value');
    expect(result.mappedData._unmappedFields).toEqual({ unknownField: 'value' });
  });

  it('skips null and undefined values', () => {
    const data = { fullName: null, emailAddress: undefined, category: 'Software' };
    const result = mapExtractedDataToFormFields(data, makeExtractionSchema(), makeFieldConfigs());
    expect(result.mappedData.fullName).toBeUndefined();
    expect(result.mappedData.category).toBe('Software');
  });

  it('generates mapping report with correct matched flag', () => {
    const data = { fullName: 'John', weirdField: 'x' };
    const schema: ExtractionSchema[] = [
      { field: 'fullName', type: 'string', required: true, description: 'Name' },
      { field: 'weirdField', type: 'string', required: false, description: 'Weird' },
    ];
    const result = mapExtractedDataToFormFields(data, schema, makeFieldConfigs());
    const nameReport = result.mappingReport.find((r) => r.extractionField === 'fullName');
    const weirdReport = result.mappingReport.find((r) => r.extractionField === 'weirdField');
    expect(nameReport?.matched).toBe(true);
    expect(weirdReport?.matched).toBe(false);
  });

  it('handles empty data', () => {
    const result = mapExtractedDataToFormFields({}, makeExtractionSchema(), makeFieldConfigs());
    expect(result.mappedData).toEqual({});
    expect(result.unmappedFields).toEqual({});
    expect(result.mappingReport).toHaveLength(0);
  });

  it('handles deeply nested paths', () => {
    const fields: FieldConfig[] = [
      { path: 'a.b.c.d', label: 'Deep', type: 'text', required: false } as FieldConfig,
    ];
    const schema: ExtractionSchema[] = [
      { field: 'a.b.c.d', type: 'string', required: false, description: 'Deep field' },
    ];
    const data = { 'a.b.c.d': 'deep value' };
    const result = mapExtractedDataToFormFields(data, schema, fields);
    expect(result.mappedData.a.b.c.d).toBe('deep value');
  });
});

// ─── validateMappedData ───

describe('validateMappedData', () => {
  it('returns no warnings when all required fields present', () => {
    const data = { fullName: 'John', emailAddress: 'a@b.com', category: 'Hardware', details: { description: 'Broken' } };
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.warnings).toHaveLength(0);
    expect(result.missingRequiredFields).toHaveLength(0);
  });

  it('reports missing required fields', () => {
    const data = { fullName: 'John' };
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.missingRequiredFields).toContain('emailAddress');
    expect(result.missingRequiredFields).toContain('category');
    expect(result.missingRequiredFields).toContain('details.description');
  });

  it('treats empty string as missing', () => {
    const data = { fullName: '', emailAddress: 'a@b.com', category: 'Hardware', details: { description: 'OK' } };
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.missingRequiredFields).toContain('fullName');
  });

  it('ignores fields with included=false', () => {
    const data = {}; // notes is required: false AND included: false
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.missingRequiredFields).not.toContain('notes');
  });

  it('ignores non-required fields', () => {
    const data = { fullName: 'John', emailAddress: 'a@b.com', category: 'H', details: { description: 'D' } };
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.missingRequiredFields).not.toContain('urgency_level');
  });

  it('handles nested path validation', () => {
    const data = { fullName: 'John', emailAddress: 'a@b.com', category: 'H' };
    // details.description is missing
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.missingRequiredFields).toContain('details.description');
  });

  it('handles partially nested data', () => {
    const data = { fullName: 'John', emailAddress: 'a@b.com', category: 'H', details: {} };
    const result = validateMappedData(data, makeFieldConfigs());
    expect(result.missingRequiredFields).toContain('details.description');
  });

  it('returns empty arrays for empty field configs', () => {
    const result = validateMappedData({ foo: 'bar' }, []);
    expect(result.warnings).toEqual([]);
    expect(result.missingRequiredFields).toEqual([]);
  });
});
