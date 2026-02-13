/**
 * Tests for AI Field Ordering Module
 *
 * Tests field priority detection, sorting, grouping, and
 * primary/metadata classification.
 */

import {
  sortFieldsByPriority,
  isPrimaryField,
  isMetadataField,
  groupFieldsByCategory,
} from '@/lib/ai/fieldOrdering';

// Helper to create minimal FieldConfig objects
function field(path: string, label?: string, type?: string): any {
  return {
    path,
    label: label || path,
    type: type || 'text',
    required: false,
    included: true,
    source: 'custom' as const,
    includeInDocument: true,
  };
}

// ============================================
// sortFieldsByPriority
// ============================================

describe('sortFieldsByPriority', () => {
  it('returns empty array for empty input', () => {
    expect(sortFieldsByPriority([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const fields = [field('comments'), field('name')];
    const original = [...fields];
    sortFieldsByPriority(fields);
    expect(fields).toEqual(original);
  });

  it('places name fields before email fields', () => {
    const fields = [field('email'), field('name')];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('name');
    expect(sorted[1].path).toBe('email');
  });

  it('places email before address', () => {
    const fields = [field('city'), field('email')];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('email');
    expect(sorted[1].path).toBe('city');
  });

  it('places identity fields first in a mixed set', () => {
    const fields = [
      field('comments'),
      field('_id'),
      field('email'),
      field('first_name'),
      field('status'),
      field('city'),
    ];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('first_name');
    // email should be near the top
    expect(sorted.findIndex(f => f.path === 'email')).toBeLessThan(
      sorted.findIndex(f => f.path === 'comments')
    );
  });

  it('places metadata fields last', () => {
    const fields = [
      field('_id'),
      field('name'),
      field('createdAt'),
      field('email'),
    ];
    const sorted = sortFieldsByPriority(fields);
    const lastTwo = sorted.slice(-2).map(f => f.path);
    expect(lastTwo).toContain('_id');
    expect(lastTwo).toContain('createdAt');
  });

  it('places long text fields near the bottom', () => {
    const fields = [
      field('comments'),
      field('name'),
      field('description'),
      field('email'),
    ];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('name');
    expect(sorted[1].path).toBe('email');
    // comments and description should be after email
    expect(sorted.findIndex(f => f.path === 'comments')).toBeGreaterThan(1);
  });

  it('handles full_name, first_name, last_name ordering', () => {
    const fields = [
      field('last_name'),
      field('first_name'),
      field('full_name'),
    ];
    const sorted = sortFieldsByPriority(fields);
    // full_name should be first among identity fields
    expect(sorted[0].path).toBe('full_name');
    expect(sorted[1].path).toBe('first_name');
    expect(sorted[2].path).toBe('last_name');
  });

  it('orders email before phone within contact fields', () => {
    const fields = [field('phone'), field('email')];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('email');
    expect(sorted[1].path).toBe('phone');
  });

  it('orders address fields logically (street, city, state, zip, country)', () => {
    const fields = [
      field('country'),
      field('zip'),
      field('city'),
      field('address'),
      field('state'),
    ];
    const sorted = sortFieldsByPriority(fields);
    const paths = sorted.map(f => f.path);
    expect(paths.indexOf('address')).toBeLessThan(paths.indexOf('city'));
    expect(paths.indexOf('city')).toBeLessThan(paths.indexOf('state'));
    expect(paths.indexOf('state')).toBeLessThan(paths.indexOf('zip'));
    expect(paths.indexOf('zip')).toBeLessThan(paths.indexOf('country'));
  });

  it('uses type-based priority when path does not match patterns', () => {
    const fields = [
      field('custom_long_field', 'Custom Long', 'long_text'),
      field('custom_number_field', 'Custom Number', 'number'),
      field('custom_email_field', 'Custom Email', 'email'),
    ];
    const sorted = sortFieldsByPriority(fields);
    // email type -> CONTACT_PRIMARY, number -> NUMBERS, long_text -> LONG_TEXT
    expect(sorted[0].path).toBe('custom_email_field');
    expect(sorted[1].path).toBe('custom_number_field');
    expect(sorted[2].path).toBe('custom_long_field');
  });

  it('handles single field', () => {
    const fields = [field('name')];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].path).toBe('name');
  });

  it('handles nested paths (uses last segment)', () => {
    const fields = [
      field('contact.email', 'Contact Email'),
      field('contact.name', 'Contact Name'),
    ];
    const sorted = sortFieldsByPriority(fields);
    // last segment 'name' -> IDENTITY, 'email' -> CONTACT_PRIMARY
    expect(sorted[0].path).toBe('contact.name');
    expect(sorted[1].path).toBe('contact.email');
  });

  it('handles demographics fields in correct position', () => {
    const fields = [
      field('age'),
      field('name'),
      field('email'),
      field('company'),
    ];
    const sorted = sortFieldsByPriority(fields);
    // name(0) < email(1) < age(3) < company(4)
    expect(sorted[0].path).toBe('name');
    expect(sorted[1].path).toBe('email');
    expect(sorted[2].path).toBe('age');
    expect(sorted[3].path).toBe('company');
  });

  it('places categorization fields (type, status) in middle range', () => {
    const fields = [
      field('status'),
      field('name'),
      field('comments'),
    ];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('name');
    expect(sorted[1].path).toBe('status');
    expect(sorted[2].path).toBe('comments');
  });

  it('handles preference/consent fields', () => {
    const fields = [
      field('subscribe'),
      field('name'),
      field('agree_to_terms', 'Agree to Terms'),
    ];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('name');
    // preferences come after identity
    expect(sorted.findIndex(f => f.path === 'subscribe')).toBeGreaterThan(0);
  });

  it('handles date fields', () => {
    const fields = [
      field('deadline'),
      field('name'),
      field('start_date'),
    ];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('name');
    expect(sorted.findIndex(f => f.path === 'deadline')).toBeGreaterThan(0);
  });

  it('handles quantity/number pattern fields', () => {
    const fields = [
      field('amount'),
      field('name'),
      field('quantity'),
    ];
    const sorted = sortFieldsByPriority(fields);
    expect(sorted[0].path).toBe('name');
  });
});

// ============================================
// isPrimaryField
// ============================================

describe('isPrimaryField', () => {
  it('returns true for name fields', () => {
    expect(isPrimaryField(field('name'))).toBe(true);
    expect(isPrimaryField(field('first_name'))).toBe(true);
    expect(isPrimaryField(field('last_name'))).toBe(true);
    expect(isPrimaryField(field('full_name'))).toBe(true);
  });

  it('returns true for email and phone', () => {
    expect(isPrimaryField(field('email'))).toBe(true);
    expect(isPrimaryField(field('phone'))).toBe(true);
    expect(isPrimaryField(field('mobile'))).toBe(true);
  });

  it('returns true for address fields', () => {
    expect(isPrimaryField(field('address'))).toBe(true);
    expect(isPrimaryField(field('city'))).toBe(true);
    expect(isPrimaryField(field('country'))).toBe(true);
  });

  it('returns false for non-primary fields', () => {
    expect(isPrimaryField(field('comments'))).toBe(false);
    expect(isPrimaryField(field('status'))).toBe(false);
    expect(isPrimaryField(field('_id'))).toBe(false);
    expect(isPrimaryField(field('age'))).toBe(false);
    expect(isPrimaryField(field('company'))).toBe(false);
  });

  it('returns true for email type regardless of path', () => {
    expect(isPrimaryField(field('my_custom_field', 'My Custom', 'email'))).toBe(true);
  });
});

// ============================================
// isMetadataField
// ============================================

describe('isMetadataField', () => {
  it('returns true for _id', () => {
    expect(isMetadataField(field('_id'))).toBe(true);
  });

  it('returns true for id', () => {
    expect(isMetadataField(field('id'))).toBe(true);
  });

  it('returns true for timestamp fields', () => {
    expect(isMetadataField(field('createdAt'))).toBe(true);
    expect(isMetadataField(field('updatedAt'))).toBe(true);
    expect(isMetadataField(field('timestamp'))).toBe(true);
  });

  it('returns true for version fields', () => {
    expect(isMetadataField(field('version'))).toBe(true);
    expect(isMetadataField(field('__v'))).toBe(true);
  });

  it('returns true for system/internal fields', () => {
    expect(isMetadataField(field('system_flag'))).toBe(true);
    expect(isMetadataField(field('internal_id'))).toBe(true);
    expect(isMetadataField(field('meta_data'))).toBe(true);
  });

  it('returns false for user-facing fields', () => {
    expect(isMetadataField(field('name'))).toBe(false);
    expect(isMetadataField(field('email'))).toBe(false);
    expect(isMetadataField(field('comments'))).toBe(false);
    expect(isMetadataField(field('status'))).toBe(false);
  });
});

// ============================================
// groupFieldsByCategory
// ============================================

describe('groupFieldsByCategory', () => {
  it('returns empty map for empty input', () => {
    const groups = groupFieldsByCategory([]);
    expect(groups.size).toBe(0);
  });

  it('groups identity fields under Personal Information', () => {
    const fields = [field('name'), field('first_name')];
    const groups = groupFieldsByCategory(fields);
    expect(groups.has('Personal Information')).toBe(true);
    expect(groups.get('Personal Information')).toHaveLength(2);
  });

  it('groups email and phone under Contact Information', () => {
    const fields = [field('email'), field('phone')];
    const groups = groupFieldsByCategory(fields);
    expect(groups.has('Contact Information')).toBe(true);
    expect(groups.get('Contact Information')).toHaveLength(2);
  });

  it('groups address fields under Address', () => {
    const fields = [field('city'), field('state'), field('zip')];
    const groups = groupFieldsByCategory(fields);
    expect(groups.has('Address')).toBe(true);
    expect(groups.get('Address')).toHaveLength(3);
  });

  it('groups metadata under System Fields', () => {
    const fields = [field('_id'), field('createdAt')];
    const groups = groupFieldsByCategory(fields);
    expect(groups.has('System Fields')).toBe(true);
    expect(groups.get('System Fields')).toHaveLength(2);
  });

  it('puts unknown fields under Other', () => {
    const fields = [field('foobar_xyz')];
    const groups = groupFieldsByCategory(fields);
    expect(groups.has('Other')).toBe(true);
    expect(groups.get('Other')).toHaveLength(1);
  });

  it('groups a complex field set into multiple categories', () => {
    const fields = [
      field('name'),
      field('email'),
      field('city'),
      field('age'),
      field('company'),
      field('subject'),
      field('status'),
      field('subscribe'),
      field('deadline'),
      field('amount'),
      field('comments'),
      field('_id'),
      field('random_field'),
    ];
    const groups = groupFieldsByCategory(fields);
    expect(groups.size).toBeGreaterThanOrEqual(8); // Many categories
    expect(groups.has('Personal Information')).toBe(true);
    expect(groups.has('Contact Information')).toBe(true);
    expect(groups.has('Address')).toBe(true);
    expect(groups.has('System Fields')).toBe(true);
  });

  it('each field appears in exactly one group', () => {
    const fields = [
      field('name'),
      field('email'),
      field('city'),
      field('comments'),
      field('_id'),
    ];
    const groups = groupFieldsByCategory(fields);
    let totalFields = 0;
    for (const [, groupFields] of groups) {
      totalFields += groupFields.length;
    }
    expect(totalFields).toBe(fields.length);
  });
});
