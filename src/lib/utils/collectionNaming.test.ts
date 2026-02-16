import { formNameToCollectionName, validateCollectionName, suggestCollectionName } from './collectionNaming';

describe('formNameToCollectionName', () => {
  it('converts basic name', () => {
    expect(formNameToCollectionName('IT Helpdesk')).toBe('it_helpdesk_responses');
  });

  it('converts with special chars', () => {
    expect(formNameToCollectionName('Customer Feedback!')).toBe('customer_feedback_responses');
  });

  it('returns default for empty string', () => {
    expect(formNameToCollectionName('')).toBe('form_responses');
    expect(formNameToCollectionName('   ')).toBe('form_responses');
  });

  it('returns default for all special chars', () => {
    expect(formNameToCollectionName('!!!')).toBe('form_responses');
  });

  it('handles dots and hyphens', () => {
    expect(formNameToCollectionName('my-form.v2')).toBe('my_form_v2_responses');
  });

  it('collapses multiple underscores', () => {
    expect(formNameToCollectionName('a   b')).toBe('a_b_responses');
  });

  it('truncates long names to fit 64 char limit', () => {
    const long = 'a'.repeat(100);
    const result = formNameToCollectionName(long);
    expect(result.length).toBeLessThanOrEqual(65);
    expect(result).toMatch(/_responses$/);
  });

  it('handles system. prefix', () => {
    const result = formNameToCollectionName('system.test');
    expect(result).not.toMatch(/^system\./);
  });
});

describe('validateCollectionName', () => {
  it('accepts valid name', () => {
    expect(validateCollectionName('my_collection').isValid).toBe(true);
  });

  it('rejects empty', () => {
    expect(validateCollectionName('').isValid).toBe(false);
  });

  it('rejects too long', () => {
    expect(validateCollectionName('a'.repeat(65)).isValid).toBe(false);
  });

  it('rejects invalid chars', () => {
    expect(validateCollectionName('my collection!').isValid).toBe(false);
  });

  it('rejects system. prefix', () => {
    expect(validateCollectionName('system.test').isValid).toBe(false);
  });

  it('accepts underscore start', () => {
    expect(validateCollectionName('_private').isValid).toBe(true);
  });
});

describe('suggestCollectionName', () => {
  it('suggests from form name', () => {
    expect(suggestCollectionName('My Form')).toBe('my_form_responses');
  });

  it('avoids conflicts', () => {
    const existing = ['my_form_responses'];
    const result = suggestCollectionName('My Form', existing);
    expect(result).toBe('my_form_1_responses');
    expect(existing).not.toContain(result);
  });

  it('avoids multiple conflicts', () => {
    const existing = ['my_form_responses', 'my_form_1_responses'];
    const result = suggestCollectionName('My Form', existing);
    expect(result).toBe('my_form_2_responses');
  });
});
