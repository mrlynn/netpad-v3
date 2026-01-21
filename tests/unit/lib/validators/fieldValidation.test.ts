/**
 * Comprehensive Field Validation Tests
 *
 * Tests validation logic for all 25+ field types supported by NetPad.
 * Uses the @netpad/forms package validation functions.
 */

import { validateField, validateForm } from '@netpad/forms';
import { FieldFactory, TestData } from '../../../factories';

describe('Field Validation', () => {
  // ============================================
  // Text Fields
  // ============================================

  describe('short_text field', () => {
    it('accepts valid short text', () => {
      const field = FieldFactory.shortText();
      expect(validateField(field, 'Hello World')).toBeNull();
    });

    it('accepts empty value when not required', () => {
      const field = FieldFactory.shortText();
      expect(validateField(field, '')).toBeNull();
    });

    it('rejects empty value when required', () => {
      const field = FieldFactory.required(FieldFactory.shortText());
      expect(validateField(field, '')).toContain('required');
    });

    it('enforces maxLength validation', () => {
      const field = FieldFactory.withValidation(FieldFactory.shortText(), { maxLength: 10 });
      expect(validateField(field, 'a'.repeat(11))).toContain('at most 10');
      expect(validateField(field, 'a'.repeat(10))).toBeNull();
    });

    it('enforces minLength validation', () => {
      const field = FieldFactory.withValidation(FieldFactory.shortText(), { minLength: 5 });
      expect(validateField(field, 'abc')).toContain('at least 5');
      expect(validateField(field, 'abcde')).toBeNull();
    });

    it('enforces pattern validation', () => {
      const field = FieldFactory.withValidation(FieldFactory.shortText(), {
        pattern: '^[A-Z]{3}[0-9]{3}$',
        errorMessage: 'Must be 3 letters followed by 3 numbers',
      });
      expect(validateField(field, 'abc123')).toContain('3 letters');
      expect(validateField(field, 'ABC123')).toBeNull();
    });

    it('handles special characters', () => {
      const field = FieldFactory.shortText();
      expect(validateField(field, TestData.edge.specialChars)).toBeNull();
    });

    it('handles unicode characters', () => {
      const field = FieldFactory.shortText();
      expect(validateField(field, TestData.edge.unicode)).toBeNull();
    });

    it('skips validation for disabled fields', () => {
      const field = FieldFactory.disabled(FieldFactory.required(FieldFactory.shortText()));
      expect(validateField(field, '')).toBeNull();
    });
  });

  describe('long_text field', () => {
    it('accepts valid long text', () => {
      const field = FieldFactory.longText();
      expect(validateField(field, TestData.valid.longText)).toBeNull();
    });

    it('enforces minLength for long text', () => {
      const field = FieldFactory.withValidation(FieldFactory.longText(), { minLength: 50 });
      expect(validateField(field, 'Short text')).toContain('at least 50');
    });

    it('enforces maxLength for long text', () => {
      const field = FieldFactory.withValidation(FieldFactory.longText(), { maxLength: 100 });
      expect(validateField(field, 'a'.repeat(101))).toContain('at most 100');
    });

    it('handles very long strings within limits', () => {
      // Long text with no maxLength constraint
      const fieldNoLimit = {
        ...FieldFactory.longText(),
        validation: {}, // Remove default maxLength
      };
      expect(validateField(fieldNoLimit, TestData.edge.veryLongString)).toBeNull();
    });

    it('enforces default maxLength on very long strings', () => {
      // Default long text has maxLength: 5000
      const field = FieldFactory.longText();
      expect(validateField(field, TestData.edge.veryLongString)).toContain('at most 5000');
    });
  });

  // ============================================
  // Contact Fields
  // ============================================

  describe('email field', () => {
    it('accepts valid email addresses', () => {
      const field = FieldFactory.email();
      expect(validateField(field, 'test@example.com')).toBeNull();
      expect(validateField(field, 'user.name+tag@domain.co.uk')).toBeNull();
      expect(validateField(field, 'user123@sub.domain.org')).toBeNull();
    });

    it('rejects invalid email - no @', () => {
      const field = FieldFactory.email();
      expect(validateField(field, 'notanemail')).toContain('valid email');
    });

    it('rejects invalid email - no domain', () => {
      const field = FieldFactory.email();
      expect(validateField(field, 'test@')).toContain('valid email');
    });

    it('rejects invalid email - no TLD', () => {
      const field = FieldFactory.email();
      expect(validateField(field, 'test@example')).toContain('valid email');
    });

    it('rejects invalid email - spaces', () => {
      const field = FieldFactory.email();
      expect(validateField(field, 'test @example.com')).toContain('valid email');
    });

    it('accepts empty value when not required', () => {
      const field = FieldFactory.email();
      expect(validateField(field, '')).toBeNull();
    });

    it('rejects empty value when required', () => {
      const field = FieldFactory.required(FieldFactory.email());
      expect(validateField(field, '')).toContain('required');
    });

    // Test all invalid email samples
    TestData.invalid.email.forEach((invalidEmail, index) => {
      if (invalidEmail !== '') {
        it(`rejects invalid email sample ${index + 1}: "${invalidEmail}"`, () => {
          const field = FieldFactory.email();
          const result = validateField(field, invalidEmail);
          expect(result).toContain('valid email');
        });
      }
    });
  });

  describe('phone field', () => {
    it('accepts valid phone numbers', () => {
      const field = FieldFactory.phone();
      expect(validateField(field, '+1-555-123-4567')).toBeNull();
      expect(validateField(field, '(555) 123-4567')).toBeNull();
      expect(validateField(field, '5551234567')).toBeNull();
      expect(validateField(field, '+44 20 7946 0958')).toBeNull();
    });

    it('rejects phone numbers that are too short', () => {
      const field = FieldFactory.phone();
      expect(validateField(field, '123')).toContain('valid phone');
    });

    it('rejects non-phone strings', () => {
      const field = FieldFactory.phone();
      expect(validateField(field, 'not-a-phone')).toContain('valid phone');
    });

    it('accepts empty value when not required', () => {
      const field = FieldFactory.phone();
      expect(validateField(field, '')).toBeNull();
    });
  });

  describe('url field', () => {
    it('accepts valid URLs', () => {
      const field = FieldFactory.url();
      expect(validateField(field, 'https://example.com')).toBeNull();
      expect(validateField(field, 'http://example.com/path?query=1')).toBeNull();
      expect(validateField(field, 'https://sub.domain.co.uk/path#anchor')).toBeNull();
    });

    it('rejects invalid URLs', () => {
      const field = FieldFactory.url();
      expect(validateField(field, 'not a url')).toContain('valid URL');
      expect(validateField(field, 'example.com')).toContain('valid URL'); // No protocol
    });

    it('accepts empty value when not required', () => {
      const field = FieldFactory.url();
      expect(validateField(field, '')).toBeNull();
    });
  });

  // ============================================
  // Number Fields
  // ============================================

  describe('number field', () => {
    it('accepts valid numbers', () => {
      const field = FieldFactory.number();
      expect(validateField(field, 42)).toBeNull();
      expect(validateField(field, 0)).toBeNull();
      expect(validateField(field, -10)).toBeNull();
      expect(validateField(field, 3.14159)).toBeNull();
    });

    it('enforces min validation', () => {
      const field = FieldFactory.withValidation(FieldFactory.number(), { min: 0 });
      expect(validateField(field, -1)).toContain('at least 0');
      expect(validateField(field, 0)).toBeNull();
    });

    it('enforces max validation', () => {
      const field = FieldFactory.withValidation(FieldFactory.number(), { max: 100 });
      expect(validateField(field, 101)).toContain('at most 100');
      expect(validateField(field, 100)).toBeNull();
    });

    it('enforces min and max together', () => {
      const field = FieldFactory.withValidation(FieldFactory.number(), { min: 18, max: 65 });
      expect(validateField(field, 17)).toContain('at least 18');
      expect(validateField(field, 66)).toContain('at most 65');
      expect(validateField(field, 30)).toBeNull();
    });

    it('accepts zero as valid number when required', () => {
      const field = FieldFactory.required(FieldFactory.number());
      expect(validateField(field, 0)).toBeNull();
    });
  });

  // ============================================
  // Choice Fields
  // ============================================

  describe('dropdown field', () => {
    it('accepts valid option value', () => {
      const field = FieldFactory.dropdown();
      expect(validateField(field, 'option1')).toBeNull();
      expect(validateField(field, 'option2')).toBeNull();
    });

    it('accepts empty value when not required', () => {
      const field = FieldFactory.dropdown();
      expect(validateField(field, '')).toBeNull();
    });

    it('rejects empty value when required', () => {
      const field = FieldFactory.required(FieldFactory.dropdown());
      expect(validateField(field, '')).toContain('required');
    });
  });

  describe('multiple_choice field', () => {
    it('accepts valid choice', () => {
      const field = FieldFactory.multipleChoice();
      expect(validateField(field, 'a')).toBeNull();
    });

    it('accepts empty when not required', () => {
      const field = FieldFactory.multipleChoice();
      expect(validateField(field, '')).toBeNull();
    });
  });

  describe('checkboxes field', () => {
    it('accepts array of values', () => {
      const field = FieldFactory.checkboxes();
      expect(validateField(field, ['a', 'b'])).toBeNull();
    });

    it('accepts single value array', () => {
      const field = FieldFactory.checkboxes();
      expect(validateField(field, ['a'])).toBeNull();
    });

    it('rejects empty array when required', () => {
      const field = FieldFactory.required(FieldFactory.checkboxes());
      expect(validateField(field, [])).toContain('required');
    });

    it('accepts empty array when not required', () => {
      const field = FieldFactory.checkboxes();
      expect(validateField(field, [])).toBeNull();
    });
  });

  describe('yes_no field', () => {
    it('accepts true value', () => {
      const field = FieldFactory.yesNo();
      expect(validateField(field, true)).toBeNull();
    });

    it('accepts false value', () => {
      const field = FieldFactory.yesNo();
      expect(validateField(field, false)).toBeNull();
    });

    it('accepts false as valid when required (boolean false is a valid answer)', () => {
      const field = FieldFactory.required(FieldFactory.yesNo());
      expect(validateField(field, false)).toBeNull();
    });
  });

  // ============================================
  // Rating/Scale Fields
  // ============================================

  describe('rating field', () => {
    it('accepts valid rating', () => {
      const field = FieldFactory.rating();
      expect(validateField(field, 4)).toBeNull();
      expect(validateField(field, 1)).toBeNull();
      expect(validateField(field, 5)).toBeNull();
    });

    it('accepts empty when not required', () => {
      const field = FieldFactory.rating();
      expect(validateField(field, null)).toBeNull();
    });
  });

  describe('nps field', () => {
    it('accepts valid NPS scores (0-10)', () => {
      const field = FieldFactory.nps();
      expect(validateField(field, 0)).toBeNull();
      expect(validateField(field, 5)).toBeNull();
      expect(validateField(field, 10)).toBeNull();
    });

    it('enforces NPS range when configured', () => {
      const field = FieldFactory.withValidation(FieldFactory.nps(), { min: 0, max: 10 });
      expect(validateField(field, -1)).toContain('at least 0');
      expect(validateField(field, 11)).toContain('at most 10');
    });
  });

  describe('scale field', () => {
    it('accepts valid scale values', () => {
      const field = FieldFactory.scale();
      expect(validateField(field, 5)).toBeNull();
      expect(validateField(field, 10)).toBeNull();
    });
  });

  describe('slider field', () => {
    it('accepts valid slider values', () => {
      const field = FieldFactory.slider();
      expect(validateField(field, 50)).toBeNull();
      expect(validateField(field, 0)).toBeNull();
      expect(validateField(field, 100)).toBeNull();
    });
  });

  // ============================================
  // Date/Time Fields
  // ============================================

  describe('date field', () => {
    it('accepts valid date strings', () => {
      const field = FieldFactory.date();
      expect(validateField(field, '2024-01-15')).toBeNull();
      expect(validateField(field, '2024-12-31')).toBeNull();
    });

    it('accepts empty when not required', () => {
      const field = FieldFactory.date();
      expect(validateField(field, '')).toBeNull();
    });

    it('rejects empty when required', () => {
      const field = FieldFactory.required(FieldFactory.date());
      expect(validateField(field, '')).toContain('required');
    });
  });

  describe('time field', () => {
    it('accepts valid time strings', () => {
      const field = FieldFactory.time();
      expect(validateField(field, '14:30')).toBeNull();
      expect(validateField(field, '00:00')).toBeNull();
      expect(validateField(field, '23:59')).toBeNull();
    });
  });

  describe('datetime field', () => {
    it('accepts valid datetime strings', () => {
      const field = FieldFactory.datetime();
      expect(validateField(field, '2024-01-15T14:30:00')).toBeNull();
    });
  });

  // ============================================
  // File Upload Fields
  // ============================================

  describe('file field', () => {
    it('accepts file objects', () => {
      const field = FieldFactory.file();
      expect(validateField(field, { name: 'doc.pdf', size: 1024, type: 'application/pdf' })).toBeNull();
    });

    it('accepts empty when not required', () => {
      const field = FieldFactory.file();
      expect(validateField(field, null)).toBeNull();
    });

    it('rejects empty when required', () => {
      const field = FieldFactory.required(FieldFactory.file());
      expect(validateField(field, null)).toContain('required');
    });
  });

  describe('image field', () => {
    it('accepts image objects', () => {
      const field = FieldFactory.image();
      expect(validateField(field, { name: 'photo.jpg', size: 2048, type: 'image/jpeg' })).toBeNull();
    });
  });

  describe('signature field', () => {
    it('accepts signature data URL', () => {
      const field = FieldFactory.signature();
      expect(validateField(field, TestData.valid.signature)).toBeNull();
    });

    it('accepts empty when not required', () => {
      const field = FieldFactory.signature();
      expect(validateField(field, '')).toBeNull();
    });
  });

  // ============================================
  // Advanced Fields
  // ============================================

  describe('address field', () => {
    it('accepts valid address object', () => {
      const field = FieldFactory.address();
      expect(validateField(field, TestData.valid.address)).toBeNull();
    });
  });

  describe('tags field', () => {
    it('accepts array of tags', () => {
      const field = FieldFactory.tags();
      expect(validateField(field, ['tag1', 'tag2', 'tag3'])).toBeNull();
    });

    it('accepts empty array when not required', () => {
      const field = FieldFactory.tags();
      expect(validateField(field, [])).toBeNull();
    });
  });

  describe('color field', () => {
    it('accepts valid hex color', () => {
      const field = FieldFactory.colorPicker();
      expect(validateField(field, '#FF5733')).toBeNull();
      expect(validateField(field, '#000')).toBeNull();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles null values correctly', () => {
      const field = FieldFactory.shortText();
      expect(validateField(field, null)).toBeNull(); // Not required

      const requiredField = FieldFactory.required(FieldFactory.shortText());
      expect(validateField(requiredField, null)).toContain('required');
    });

    it('handles undefined values correctly', () => {
      const field = FieldFactory.shortText();
      expect(validateField(field, undefined)).toBeNull(); // Not required

      const requiredField = FieldFactory.required(FieldFactory.shortText());
      expect(validateField(requiredField, undefined)).toContain('required');
    });

    it('skips validation for non-included fields', () => {
      const field = {
        ...FieldFactory.required(FieldFactory.shortText()),
        included: false,
      };
      expect(validateField(field, '')).toBeNull();
    });

    it('handles XSS attempts gracefully', () => {
      const field = FieldFactory.shortText();
      // Validation should not fail - XSS sanitization is a different concern
      expect(validateField(field, TestData.edge.xssAttempt)).toBeNull();
    });

    it('handles SQL injection attempts gracefully', () => {
      const field = FieldFactory.shortText();
      // Validation should not fail - SQL sanitization is a different concern
      expect(validateField(field, TestData.edge.sqlInjection)).toBeNull();
    });
  });

  // ============================================
  // Form-Level Validation
  // ============================================

  describe('Form Validation', () => {
    it('validates all form fields', () => {
      const fields = [
        FieldFactory.required(FieldFactory.shortText({ path: 'name', label: 'Name' })),
        FieldFactory.required(FieldFactory.email({ path: 'email', label: 'Email' })),
        FieldFactory.number({ path: 'age', label: 'Age' }),
      ];

      const validData = { name: 'John', email: 'john@example.com', age: 25 };
      expect(validateForm(fields, validData)).toEqual({});

      const invalidData = { name: '', email: 'invalid', age: 25 };
      const errors = validateForm(fields, invalidData);
      expect(errors.name).toContain('required');
      expect(errors.email).toContain('valid email');
    });

    it('only validates included fields', () => {
      const fields = [
        FieldFactory.required(FieldFactory.shortText({ path: 'visible', label: 'Visible', included: true })),
        FieldFactory.required(FieldFactory.shortText({ path: 'hidden', label: 'Hidden', included: false })),
      ];

      const data = { visible: 'value' }; // Missing hidden field
      const errors = validateForm(fields, data);
      expect(errors.hidden).toBeUndefined();
    });

    it('skips layout fields', () => {
      const fields = [
        FieldFactory.shortText({ path: 'name', label: 'Name' }),
        { path: '_header', label: '', type: 'layout', included: true, layout: { type: 'section-header', title: 'Section' } },
      ];

      const data = { name: 'Test' };
      expect(validateForm(fields, data)).toEqual({});
    });
  });
});
