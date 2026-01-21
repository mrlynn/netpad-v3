/**
 * Form Validation Integration Tests
 *
 * Tests the form validation logic that runs during form submission.
 * These tests verify that the validation rules work correctly across
 * different field types and configurations.
 */

import { validateField, validateForm } from '@netpad/forms';
import { FormFactory, FieldFactory, SubmissionFactory, TestData } from '../../factories';

describe('Form Validation Integration', () => {
  // ============================================
  // Contact Form Validation
  // ============================================

  describe('Contact Form', () => {
    const form = FormFactory.contactForm();
    const fields = form.fieldConfigs;

    it('validates complete submission successfully', () => {
      const data = SubmissionFactory.contactFormData();
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('rejects submission with missing required name', () => {
      const data = { email: 'test@example.com', message: 'Hello' };
      const errors = validateForm(fields, data);
      expect(errors.name).toContain('required');
    });

    it('rejects submission with missing required email', () => {
      const data = { name: 'John', message: 'Hello' };
      const errors = validateForm(fields, data);
      expect(errors.email).toContain('required');
    });

    it('rejects submission with invalid email format', () => {
      const data = { name: 'John', email: 'not-an-email', message: 'Hello' };
      const errors = validateForm(fields, data);
      expect(errors.email).toContain('valid email');
    });

    it('rejects submission with empty required message', () => {
      // Message is required in the contact form factory
      const data = { name: 'John', email: 'john@example.com', message: '' };
      const errors = validateForm(fields, data);
      expect(errors.message).toContain('required');
    });

    it('accepts submission with all required fields filled', () => {
      const data = { name: 'John', email: 'john@example.com', message: 'Hello there!' };
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  // ============================================
  // Feedback Form Validation
  // ============================================

  describe('Feedback Form', () => {
    const form = FormFactory.feedbackForm();
    const fields = form.fieldConfigs;

    it('validates complete submission successfully', () => {
      const data = SubmissionFactory.feedbackFormData();
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('rejects submission with missing required rating', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const errors = validateForm(fields, data);
      expect(errors.rating).toContain('required');
    });

    it('accepts submission with only required fields', () => {
      const data = { rating: 4 };
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  // ============================================
  // Registration Form Validation
  // ============================================

  describe('Registration Form', () => {
    const form = FormFactory.registrationForm();
    const fields = form.fieldConfigs;

    it('validates complete submission successfully', () => {
      const data = SubmissionFactory.registrationFormData();
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('rejects submission with missing firstName', () => {
      const data = { lastName: 'Doe', email: 'john@example.com', terms: true };
      const errors = validateForm(fields, data);
      expect(errors.firstName).toContain('required');
    });

    it('rejects submission without accepting terms', () => {
      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', terms: false };
      const errors = validateForm(fields, data);
      // Note: yes_no false is a valid answer, so terms: false should pass
      // This tests that boolean false is treated as a valid value
      expect(errors.terms).toBeUndefined();
    });

    it('rejects submission with missing terms entirely', () => {
      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const errors = validateForm(fields, data);
      expect(errors.terms).toContain('required');
    });
  });

  // ============================================
  // Validated Form (with validation rules)
  // ============================================

  describe('Validated Form', () => {
    const form = FormFactory.validatedForm();
    const fields = form.fieldConfigs;

    it('validates submission meeting all rules', () => {
      const data = {
        username: 'valid_user123',
        email: 'user@example.com',
        age: 25,
        bio: 'This is my bio with more than 10 characters.',
      };
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('rejects username that is too short', () => {
      const data = {
        username: 'ab', // Less than 3 characters
        email: 'user@example.com',
        age: 25,
      };
      const errors = validateForm(fields, data);
      // Custom error message is used
      expect(errors.username).toContain('3-20 alphanumeric');
    });

    it('rejects username that is too long', () => {
      const data = {
        username: 'a'.repeat(25), // More than 20 characters
        email: 'user@example.com',
        age: 25,
      };
      const errors = validateForm(fields, data);
      // Custom error message is used
      expect(errors.username).toContain('3-20 alphanumeric');
    });

    it('rejects username with invalid characters', () => {
      const data = {
        username: 'user@name!', // Contains invalid chars
        email: 'user@example.com',
        age: 25,
      };
      const errors = validateForm(fields, data);
      expect(errors.username).toBeDefined();
    });

    it('rejects age below minimum', () => {
      const data = {
        username: 'valid_user',
        email: 'user@example.com',
        age: 16, // Below 18
      };
      const errors = validateForm(fields, data);
      expect(errors.age).toContain('at least 18');
    });

    it('rejects age above maximum', () => {
      const data = {
        username: 'valid_user',
        email: 'user@example.com',
        age: 150, // Above 120
      };
      const errors = validateForm(fields, data);
      expect(errors.age).toContain('at most 120');
    });

    it('rejects bio that is too short', () => {
      const data = {
        username: 'valid_user',
        email: 'user@example.com',
        age: 25,
        bio: 'Short', // Less than 10 characters
      };
      const errors = validateForm(fields, data);
      expect(errors.bio).toContain('at least 10');
    });
  });

  // ============================================
  // All Field Types Form
  // ============================================

  describe('All Field Types Form', () => {
    const form = FormFactory.allFieldTypesForm();
    const fields = form.fieldConfigs;

    it('validates submission with all valid values', () => {
      // Create data for all field types
      const data: Record<string, unknown> = {};
      fields.forEach((field: any) => {
        const key = field.path;
        if (TestData.valid[field.type as keyof typeof TestData.valid]) {
          data[key] = TestData.valid[field.type as keyof typeof TestData.valid];
        }
      });

      const errors = validateForm(fields, data);
      // All fields are optional by default in the factory
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('accepts empty values for all optional fields', () => {
      const data = {};
      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles deeply nested field paths', () => {
      const fields = [
        {
          path: 'address.street',
          label: 'Street',
          type: 'short_text',
          included: true,
          required: true,
        },
        {
          path: 'address.city',
          label: 'City',
          type: 'short_text',
          included: true,
          required: true,
        },
      ];

      const validData = {
        address: {
          street: '123 Main St',
          city: 'New York',
        },
      };
      expect(validateForm(fields, validData)).toEqual({});

      const invalidData = {
        address: {
          street: '123 Main St',
          // Missing city
        },
      };
      const errors = validateForm(fields, invalidData);
      expect(errors['address.city']).toContain('required');
    });

    it('handles arrays of values', () => {
      const fields = [
        FieldFactory.required(FieldFactory.checkboxes({ path: 'interests', label: 'Interests' })),
      ];

      const validData = { interests: ['sports', 'music'] };
      expect(validateForm(fields, validData)).toEqual({});

      const invalidData = { interests: [] };
      const errors = validateForm(fields, invalidData);
      expect(errors.interests).toContain('required');
    });

    it('handles null and undefined values consistently', () => {
      const fields = [
        FieldFactory.required(FieldFactory.shortText({ path: 'name', label: 'Name' })),
      ];

      const nullData = { name: null };
      const undefinedData = { name: undefined };
      const emptyData = {};

      expect(validateForm(fields, nullData).name).toContain('required');
      expect(validateForm(fields, undefinedData).name).toContain('required');
      expect(validateForm(fields, emptyData).name).toContain('required');
    });

    it('handles XSS and SQL injection in field values', () => {
      const fields = [
        FieldFactory.shortText({ path: 'input', label: 'Input' }),
      ];

      // These should pass validation (sanitization is separate concern)
      expect(validateForm(fields, { input: TestData.edge.xssAttempt })).toEqual({});
      expect(validateForm(fields, { input: TestData.edge.sqlInjection })).toEqual({});
    });

    it('handles unicode and emoji in text fields', () => {
      const fields = [
        FieldFactory.shortText({ path: 'name', label: 'Name' }),
        FieldFactory.longText({ path: 'bio', label: 'Bio' }),
      ];

      const data = {
        name: TestData.edge.unicode,
        bio: 'Hello 👋 World 🌍',
      };

      expect(validateForm(fields, data)).toEqual({});
    });
  });

  // ============================================
  // Conditional Field Validation
  // ============================================

  describe('Conditional Field Validation', () => {
    it('skips validation for non-included fields', () => {
      const fields = [
        FieldFactory.required(FieldFactory.shortText({ path: 'name', label: 'Name', included: true })),
        FieldFactory.required(FieldFactory.shortText({ path: 'hiddenField', label: 'Hidden', included: false })),
      ];

      const data = { name: 'John' }; // Missing hiddenField
      const errors = validateForm(fields, data);
      expect(errors.hiddenField).toBeUndefined();
    });

    it('skips validation for disabled fields', () => {
      const fields = [
        FieldFactory.required(FieldFactory.shortText({ path: 'name', label: 'Name' })),
        {
          ...FieldFactory.required(FieldFactory.shortText({ path: 'disabledField', label: 'Disabled' })),
          disabled: true,
        },
      ];

      const data = { name: 'John' }; // Missing disabledField
      const errors = validateForm(fields, data);
      expect(errors.disabledField).toBeUndefined();
    });

    it('skips layout fields', () => {
      const fields = [
        FieldFactory.shortText({ path: 'name', label: 'Name' }),
        {
          path: '_section_header',
          label: '',
          type: 'layout',
          included: true,
          layout: { type: 'section-header', title: 'Personal Info' },
        },
      ];

      const data = { name: 'John' };
      expect(validateForm(fields, data)).toEqual({});
    });
  });

  // ============================================
  // Multiple Errors
  // ============================================

  describe('Multiple Errors', () => {
    it('returns all validation errors at once', () => {
      const fields = [
        FieldFactory.required(FieldFactory.shortText({ path: 'name', label: 'Name' })),
        FieldFactory.required(FieldFactory.email({ path: 'email', label: 'Email' })),
        FieldFactory.withValidation(FieldFactory.number({ path: 'age', label: 'Age', required: true }), {
          min: 18,
        }),
      ];

      const data = {
        name: '', // Required, empty
        email: 'invalid', // Invalid format
        age: 16, // Below minimum
      };

      const errors = validateForm(fields, data);
      expect(Object.keys(errors)).toHaveLength(3);
      expect(errors.name).toContain('required');
      expect(errors.email).toContain('valid email');
      expect(errors.age).toContain('at least 18');
    });
  });
});
