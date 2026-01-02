import { FieldConfig } from '../types';
import { getNestedValue } from './conditionalLogic';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a single field value
 */
export function validateField(
  field: FieldConfig,
  value: unknown,
  formData: Record<string, unknown> = {}
): string | null {
  // Skip validation for non-included or disabled fields
  if (!field.included || field.disabled) {
    return null;
  }

  // Required check
  if (field.required) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return field.validation?.errorMessage || `${field.label} is required`;
    }
  }

  // Skip further validation if empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const validation = field.validation;
  if (!validation) {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      return validation.errorMessage || `${field.label} must be at least ${validation.minLength} characters`;
    }

    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      return validation.errorMessage || `${field.label} must be at most ${validation.maxLength} characters`;
    }

    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return validation.errorMessage || `${field.label} format is invalid`;
      }
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return validation.errorMessage || `${field.label} must be at least ${validation.min}`;
    }

    if (validation.max !== undefined && value > validation.max) {
      return validation.errorMessage || `${field.label} must be at most ${validation.max}`;
    }
  }

  // Email validation
  if (field.type === 'email' && typeof value === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return validation.errorMessage || 'Please enter a valid email address';
    }
  }

  // URL validation
  if (field.type === 'url' && typeof value === 'string') {
    try {
      new URL(value);
    } catch {
      return validation.errorMessage || 'Please enter a valid URL';
    }
  }

  // Phone validation (basic)
  if (field.type === 'phone' && typeof value === 'string') {
    const phoneRegex = /^[\d\s\-+()]{7,}$/;
    if (!phoneRegex.test(value)) {
      return validation.errorMessage || 'Please enter a valid phone number';
    }
  }

  return null;
}

/**
 * Validate all form fields
 */
export function validateForm(
  fields: FieldConfig[],
  formData: Record<string, unknown>,
  options: { validateHidden?: boolean } = {}
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    // Skip layout fields
    if (field.layout) {
      continue;
    }

    const value = getNestedValue(formData, field.path);
    const error = validateField(field, value, formData);

    if (error) {
      errors[field.path] = error;
    }
  }

  return errors;
}

/**
 * Check if form has any validation errors
 */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get the first error message (useful for summary display)
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
}
