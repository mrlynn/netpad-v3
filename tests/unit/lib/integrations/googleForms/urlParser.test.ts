/**
 * Tests for Google Forms URL Parser (pure functions)
 *
 * Tests: extractFormIdFromUrl, buildViewFormUrl, mapParsedFormToNetPad
 */
import {
  extractFormIdFromUrl,
  buildViewFormUrl,
  mapParsedFormToNetPad,
  ParsedGoogleForm,
  ParsedFormField,
  GoogleFormFieldType,
} from '@/lib/integrations/googleForms/urlParser';

// ============================================
// extractFormIdFromUrl
// ============================================

describe('extractFormIdFromUrl', () => {
  it('should extract ID from standard forms URL', () => {
    const url = 'https://docs.google.com/forms/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789/viewform';
    expect(extractFormIdFromUrl(url)).toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');
  });

  it('should extract ID from edit URL', () => {
    const url = 'https://docs.google.com/forms/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789/edit';
    expect(extractFormIdFromUrl(url)).toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');
  });

  it('should extract ID from published URL (/d/e/)', () => {
    const url = 'https://docs.google.com/forms/d/e/1FAIpQLSeLongPublishedId/viewform';
    expect(extractFormIdFromUrl(url)).toBe('1FAIpQLSeLongPublishedId');
  });

  it('should return null for forms.gle short URLs', () => {
    const url = 'https://forms.gle/abc123';
    expect(extractFormIdFromUrl(url)).toBeNull();
  });

  it('should return null for invalid URLs', () => {
    expect(extractFormIdFromUrl('not a url')).toBeNull();
    expect(extractFormIdFromUrl('https://example.com')).toBeNull();
  });

  it('should handle bare form IDs', () => {
    const bareId = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
    expect(extractFormIdFromUrl(bareId)).toBe(bareId);
  });

  it('should handle URL with query parameters', () => {
    const url = 'https://docs.google.com/forms/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789/viewform?usp=sf_link';
    expect(extractFormIdFromUrl(url)).toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');
  });

  it('should return null for short strings that are not form IDs', () => {
    expect(extractFormIdFromUrl('abc')).toBeNull();
    expect(extractFormIdFromUrl('short_id')).toBeNull();
  });
});

// ============================================
// buildViewFormUrl
// ============================================

describe('buildViewFormUrl', () => {
  it('should build correct viewform URL', () => {
    expect(buildViewFormUrl('myFormId123'))
      .toBe('https://docs.google.com/forms/d/myFormId123/viewform');
  });

  it('should handle IDs with dashes and underscores', () => {
    expect(buildViewFormUrl('form-id_with-mixed_chars'))
      .toBe('https://docs.google.com/forms/d/form-id_with-mixed_chars/viewform');
  });
});

// ============================================
// mapParsedFormToNetPad
// ============================================

function createMockField(overrides: Partial<ParsedFormField> = {}): ParsedFormField {
  return {
    id: 'field_1',
    title: 'Test Field',
    type: 'SHORT_TEXT' as GoogleFormFieldType,
    required: false,
    pageIndex: 0,
    ...overrides,
  };
}

function createMockForm(overrides: Partial<ParsedGoogleForm> = {}): ParsedGoogleForm {
  return {
    formId: 'test_form',
    title: 'Test Form',
    fields: [],
    pageCount: 1,
    sourceUrl: 'https://docs.google.com/forms/d/test_form/viewform',
    ...overrides,
  };
}

describe('mapParsedFormToNetPad', () => {
  describe('basic mapping', () => {
    it('should map SHORT_TEXT to text', () => {
      const form = createMockForm({ fields: [createMockField({ type: 'SHORT_TEXT', title: 'Name' })] });
      const result = mapParsedFormToNetPad(form);
      expect(result.success).toBe(true);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].type).toBe('text');
      expect(result.fields[0].label).toBe('Name');
    });

    it('should map PARAGRAPH to long_text', () => {
      const form = createMockForm({ fields: [createMockField({ type: 'PARAGRAPH' })] });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('long_text');
    });

    it('should map MULTIPLE_CHOICE to radio', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'MULTIPLE_CHOICE', options: ['A', 'B', 'C'] })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('radio');
      expect(result.fields[0].validation?.options).toHaveLength(3);
    });

    it('should map CHECKBOXES to checkbox', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'CHECKBOXES', options: ['X', 'Y'] })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('checkbox');
    });

    it('should map DROPDOWN to select', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'DROPDOWN', options: ['Option 1', 'Option 2'] })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('select');
    });

    it('should map LINEAR_SCALE to rating', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'LINEAR_SCALE', validation: { min: 1, max: 5 } })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('rating');
      expect(result.fields[0].validation?.min).toBe(1);
      expect(result.fields[0].validation?.max).toBe(5);
    });

    it('should map DATE to date', () => {
      const form = createMockForm({ fields: [createMockField({ type: 'DATE' })] });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('date');
    });

    it('should map FILE_UPLOAD to file', () => {
      const form = createMockForm({ fields: [createMockField({ type: 'FILE_UPLOAD' })] });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('file');
    });

    it('should map UNKNOWN to text', () => {
      const form = createMockForm({ fields: [createMockField({ type: 'UNKNOWN' })] });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].type).toBe('text');
    });
  });

  describe('required fields', () => {
    it('should preserve required flag', () => {
      const form = createMockForm({
        fields: [createMockField({ required: true })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].required).toBe(true);
    });

    it('should preserve non-required flag', () => {
      const form = createMockForm({
        fields: [createMockField({ required: false })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].required).toBe(false);
    });
  });

  describe('path generation', () => {
    it('should generate snake_case paths from titles', () => {
      const form = createMockForm({
        fields: [createMockField({ title: 'First Name' })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].path).toBe('first_name');
    });

    it('should handle special characters in titles', () => {
      const form = createMockForm({
        fields: [createMockField({ title: 'Email (work)' })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].path).toMatch(/^[a-z0-9_]+$/);
    });

    it('should deduplicate paths', () => {
      const form = createMockForm({
        fields: [
          createMockField({ id: 'f1', title: 'Name' }),
          createMockField({ id: 'f2', title: 'Name' }),
        ],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].path).toBe('name');
      expect(result.fields[1].path).toBe('name_1');
    });

    it('should truncate long paths to 50 chars', () => {
      const longTitle = 'A'.repeat(100);
      const form = createMockForm({
        fields: [createMockField({ title: longTitle })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].path.length).toBeLessThanOrEqual(50);
    });
  });

  describe('options mapping', () => {
    it('should map options with label and value', () => {
      const form = createMockForm({
        fields: [createMockField({
          type: 'MULTIPLE_CHOICE',
          options: ['Red', 'Green', 'Blue'],
        })],
      });
      const result = mapParsedFormToNetPad(form);
      const options = result.fields[0].validation?.options;
      expect(options).toEqual([
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green' },
        { label: 'Blue', value: 'blue' },
      ]);
    });

    it('should handle options with spaces', () => {
      const form = createMockForm({
        fields: [createMockField({
          type: 'DROPDOWN',
          options: ['Very Good', 'Not Bad'],
        })],
      });
      const result = mapParsedFormToNetPad(form);
      const options = result.fields[0].validation?.options;
      expect(options?.[0].value).toBe('very_good');
      expect(options?.[1].value).toBe('not_bad');
    });
  });

  describe('description handling', () => {
    it('should use description as placeholder', () => {
      const form = createMockForm({
        fields: [createMockField({ description: 'Enter your full name' })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].placeholder).toBe('Enter your full name');
    });

    it('should not set placeholder when no description', () => {
      const form = createMockForm({
        fields: [createMockField({ description: undefined })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.fields[0].placeholder).toBeUndefined();
    });
  });

  describe('warnings', () => {
    it('should warn about grid fields', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'MULTIPLE_CHOICE_GRID', title: 'Matrix Q' })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Grid');
    });

    it('should warn about file upload fields', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'FILE_UPLOAD', title: 'Upload' })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.warnings.some(w => w.includes('File upload'))).toBe(true);
    });

    it('should warn about unknown fields', () => {
      const form = createMockForm({
        fields: [createMockField({ type: 'UNKNOWN', title: 'Mystery' })],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.warnings.some(w => w.includes('Unknown'))).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should report correct statistics', () => {
      const form = createMockForm({
        fields: [
          createMockField({ id: 'f1', title: 'Name', type: 'SHORT_TEXT' }),
          createMockField({ id: 'f2', title: 'Grid', type: 'MULTIPLE_CHOICE_GRID' }),
          createMockField({ id: 'f3', title: 'Email', type: 'SHORT_TEXT' }),
        ],
      });
      const result = mapParsedFormToNetPad(form);
      expect(result.statistics.totalFields).toBe(3);
      expect(result.statistics.mappedFields).toBe(2); // Grid is unmapped
      expect(result.statistics.unmappedFields).toBe(1);
    });

    it('should succeed when there are fields', () => {
      const form = createMockForm({
        fields: [createMockField()],
      });
      expect(mapParsedFormToNetPad(form).success).toBe(true);
    });

    it('should fail when there are no fields', () => {
      const form = createMockForm({ fields: [] });
      expect(mapParsedFormToNetPad(form).success).toBe(false);
    });
  });

  describe('all fields included', () => {
    it('should set included=true on all mapped fields', () => {
      const form = createMockForm({
        fields: [
          createMockField({ id: 'f1', title: 'A' }),
          createMockField({ id: 'f2', title: 'B' }),
        ],
      });
      const result = mapParsedFormToNetPad(form);
      result.fields.forEach(f => expect(f.included).toBe(true));
    });
  });
});
