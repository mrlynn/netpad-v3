import { mapExtractedDataToFormFields, validateMappedData } from './mapping';

const makeField = (path: string, label: string = '', required = false, included = true) => ({
  path,
  label,
  type: 'short-answer',
  included,
  required,
});

describe('mapExtractedDataToFormFields', () => {
  it('maps exact match', () => {
    const fields = [makeField('name')];
    const schema = [{ field: 'name', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ name: 'Alice' }, schema, fields);
    expect(result.mappedData.name).toBe('Alice');
    expect(result.mappingReport[0].strategy).toBe('exact');
  });

  it('maps case-insensitive match', () => {
    const fields = [makeField('Name')];
    const schema = [{ field: 'name', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ name: 'Alice' }, schema, fields);
    expect(result.mappedData.Name).toBe('Alice');
    expect(result.mappingReport[0].strategy).toBe('case-insensitive');
  });

  it('maps camelCase conversion', () => {
    const fields = [makeField('firstName')];
    const schema = [{ field: 'first name', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ 'first name': 'Alice' }, schema, fields);
    expect(result.mappedData.firstName).toBe('Alice');
    expect(result.mappingReport[0].matched).toBe(true);
  });

  it('maps snake_case conversion', () => {
    const fields = [makeField('first_name')];
    const schema = [{ field: 'firstName', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ firstName: 'Alice' }, schema, fields);
    expect(result.mappedData.first_name).toBe('Alice');
    expect(result.mappingReport[0].matched).toBe(true);
  });

  it('maps by label match', () => {
    const fields = [makeField('field_123', 'Email Address')];
    const schema = [{ field: 'email address', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ 'email address': 'a@b.com' }, schema, fields);
    expect(result.mappedData.field_123).toBe('a@b.com');
    expect(result.mappingReport[0].strategy).toBe('label-match');
  });

  it('puts unmapped fields in unmappedFields', () => {
    const fields = [makeField('name')];
    const schema = [
      { field: 'name', type: 'string' as const, required: false, description: '' },
      { field: 'zzz', type: 'string' as const, required: false, description: '' },
    ];
    const result = mapExtractedDataToFormFields({ name: 'Alice', zzz: 'val' }, schema, fields);
    expect(result.unmappedFields.zzz).toBe('val');
    expect(result.mappedData._unmappedFields).toEqual({ zzz: 'val' });
  });

  it('handles nested path', () => {
    const fields = [makeField('address.city')];
    const schema = [{ field: 'address.city', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ 'address.city': 'NYC' }, schema, fields);
    expect(result.mappedData.address.city).toBe('NYC');
  });

  it('skips null/undefined values', () => {
    const fields = [makeField('name')];
    const schema = [{ field: 'name', type: 'string' as const, required: false, description: '' }];
    const result = mapExtractedDataToFormFields({ name: null }, schema, fields);
    expect(result.mappedData).toEqual({});
    expect(result.mappingReport).toHaveLength(0);
  });

  it('generates mapping report', () => {
    const fields = [makeField('name')];
    const schema = [
      { field: 'name', type: 'string' as const, required: false, description: '' },
      { field: 'nope', type: 'string' as const, required: false, description: '' },
    ];
    const result = mapExtractedDataToFormFields({ name: 'A', nope: 'B' }, schema, fields);
    expect(result.mappingReport).toHaveLength(2);
    expect(result.mappingReport.find(r => r.extractionField === 'nope')?.matched).toBe(false);
  });
});

describe('validateMappedData', () => {
  it('returns no warnings when all required fields present', () => {
    const fields = [makeField('name', 'Name', true)];
    const result = validateMappedData({ name: 'Alice' }, fields);
    expect(result.warnings).toHaveLength(0);
    expect(result.missingRequiredFields).toHaveLength(0);
  });

  it('warns on missing required field', () => {
    const fields = [makeField('name', 'Name', true)];
    const result = validateMappedData({}, fields);
    expect(result.missingRequiredFields).toContain('name');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns on empty string for required field', () => {
    const fields = [makeField('name', 'Name', true)];
    const result = validateMappedData({ name: '' }, fields);
    expect(result.missingRequiredFields).toContain('name');
  });

  it('skips excluded fields', () => {
    const fields = [makeField('name', 'Name', true, false)]; // included=false
    const result = validateMappedData({}, fields);
    expect(result.missingRequiredFields).toHaveLength(0);
  });

  it('checks nested path for required field', () => {
    const fields = [makeField('address.city', 'City', true)];
    const result = validateMappedData({ address: { city: 'NYC' } }, fields);
    expect(result.missingRequiredFields).toHaveLength(0);
  });

  it('catches missing nested required field', () => {
    const fields = [makeField('address.city', 'City', true)];
    const result = validateMappedData({ address: {} }, fields);
    expect(result.missingRequiredFields).toContain('address.city');
  });
});
