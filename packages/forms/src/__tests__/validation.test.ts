import { describe, it, expect } from 'vitest';
import { validateField, validateForm } from '../utils/validation';
import { FieldConfig } from '../types';

describe('validateField', () => {
  describe('required validation', () => {
    const requiredField: FieldConfig = {
      path: 'name',
      label: 'Name',
      type: 'short_text',
      included: true,
      required: true,
    };

    it('returns error for empty string', () => {
      expect(validateField(requiredField, '')).toBe('Name is required');
    });

    it('returns error for null value', () => {
      expect(validateField(requiredField, null)).toBe('Name is required');
    });

    it('returns error for undefined value', () => {
      expect(validateField(requiredField, undefined)).toBe('Name is required');
    });

    it('passes for non-empty string', () => {
      expect(validateField(requiredField, 'John')).toBeNull();
    });

    it('passes for zero (valid number)', () => {
      const numberField: FieldConfig = { ...requiredField, type: 'number' };
      expect(validateField(numberField, 0)).toBeNull();
    });

    it('passes for false (valid boolean)', () => {
      const boolField: FieldConfig = { ...requiredField, type: 'yes_no' };
      expect(validateField(boolField, false)).toBeNull();
    });
  });

  describe('email validation', () => {
    const emailField: FieldConfig = {
      path: 'email',
      label: 'Email',
      type: 'email',
      included: true,
      validation: {},
    };

    it('passes for valid email', () => {
      expect(validateField(emailField, 'test@example.com')).toBeNull();
    });

    it('fails for invalid email - no @', () => {
      expect(validateField(emailField, 'testexample.com')).toBe('Please enter a valid email address');
    });

    it('fails for invalid email - no TLD', () => {
      // The regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ requires at least one char after the dot
      expect(validateField(emailField, 'test@example')).toBe('Please enter a valid email address');
    });

    it('passes for empty value (not required)', () => {
      expect(validateField(emailField, '')).toBeNull();
    });
  });

  describe('URL validation', () => {
    const urlField: FieldConfig = {
      path: 'website',
      label: 'Website',
      type: 'url',
      included: true,
      validation: {},
    };

    it('passes for valid http URL', () => {
      expect(validateField(urlField, 'http://example.com')).toBeNull();
    });

    it('passes for valid https URL', () => {
      expect(validateField(urlField, 'https://example.com/path?query=1')).toBeNull();
    });

    it('fails for invalid URL', () => {
      // URL constructor throws for truly invalid URLs
      expect(validateField(urlField, 'not a url with spaces')).toBe('Please enter a valid URL');
    });

    it('passes for empty value (not required)', () => {
      expect(validateField(urlField, '')).toBeNull();
    });
  });

  describe('minLength validation', () => {
    const textField: FieldConfig = {
      path: 'bio',
      label: 'Bio',
      type: 'long_text',
      included: true,
      validation: { minLength: 10 },
    };

    it('fails for too short string', () => {
      expect(validateField(textField, 'short')).toBe('Bio must be at least 10 characters');
    });

    it('passes for string at minimum length', () => {
      expect(validateField(textField, '1234567890')).toBeNull();
    });

    it('passes for string above minimum length', () => {
      expect(validateField(textField, 'This is a longer bio text')).toBeNull();
    });
  });

  describe('maxLength validation', () => {
    const textField: FieldConfig = {
      path: 'title',
      label: 'Title',
      type: 'short_text',
      included: true,
      validation: { maxLength: 50 },
    };

    it('fails for too long string', () => {
      const longString = 'a'.repeat(51);
      expect(validateField(textField, longString)).toBe('Title must be at most 50 characters');
    });

    it('passes for string at maximum length', () => {
      const exactString = 'a'.repeat(50);
      expect(validateField(textField, exactString)).toBeNull();
    });
  });

  describe('min/max number validation', () => {
    const numberField: FieldConfig = {
      path: 'age',
      label: 'Age',
      type: 'number',
      included: true,
      validation: { min: 18, max: 100 },
    };

    it('fails for number below min', () => {
      expect(validateField(numberField, 15)).toBe('Age must be at least 18');
    });

    it('fails for number above max', () => {
      expect(validateField(numberField, 150)).toBe('Age must be at most 100');
    });

    it('passes for number at min', () => {
      expect(validateField(numberField, 18)).toBeNull();
    });

    it('passes for number at max', () => {
      expect(validateField(numberField, 100)).toBeNull();
    });

    it('passes for number in range', () => {
      expect(validateField(numberField, 50)).toBeNull();
    });
  });

  describe('pattern validation', () => {
    const patternField: FieldConfig = {
      path: 'code',
      label: 'Code',
      type: 'short_text',
      included: true,
      validation: {
        pattern: '^[A-Z]{3}[0-9]{3}$',
        errorMessage: 'Code must be 3 letters followed by 3 numbers',
      },
    };

    it('fails for invalid pattern', () => {
      expect(validateField(patternField, 'abc123')).toBe('Code must be 3 letters followed by 3 numbers');
    });

    it('passes for valid pattern', () => {
      expect(validateField(patternField, 'ABC123')).toBeNull();
    });
  });

  describe('disabled and non-included fields', () => {
    it('skips validation for disabled fields', () => {
      const field: FieldConfig = {
        path: 'name',
        label: 'Name',
        type: 'short_text',
        included: true,
        required: true,
        disabled: true,
      };
      expect(validateField(field, '')).toBeNull();
    });

    it('skips validation for non-included fields', () => {
      const field: FieldConfig = {
        path: 'name',
        label: 'Name',
        type: 'short_text',
        included: false,
        required: true,
      };
      expect(validateField(field, '')).toBeNull();
    });
  });
});

describe('validateForm', () => {
  const fields: FieldConfig[] = [
    { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true, validation: {} },
    { path: 'age', label: 'Age', type: 'number', included: true, validation: { min: 18 } },
  ];

  it('returns empty object for valid data', () => {
    const data = { name: 'John', email: 'john@example.com', age: 25 };
    expect(validateForm(fields, data)).toEqual({});
  });

  it('returns errors for invalid data', () => {
    const data = { name: '', email: 'john@example.com', age: 15 };
    const errors = validateForm(fields, data);

    expect(errors.name).toBe('Name is required');
    expect(errors.age).toBe('Age must be at least 18');
  });

  it('only validates included fields', () => {
    const fieldsWithExcluded: FieldConfig[] = [
      { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
      { path: 'hidden', label: 'Hidden', type: 'short_text', included: false, required: true },
    ];

    const data = { name: 'John' }; // missing 'hidden' field
    const errors = validateForm(fieldsWithExcluded, data);

    expect(errors).toEqual({});
  });

  it('skips layout fields', () => {
    const fieldsWithLayout: FieldConfig[] = [
      { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
      {
        path: '_header',
        label: '',
        type: 'layout',
        included: true,
        layout: { type: 'section-header', title: 'Section' }
      },
    ];

    const data = { name: 'John' };
    const errors = validateForm(fieldsWithLayout, data);
    expect(errors).toEqual({});
  });
});
