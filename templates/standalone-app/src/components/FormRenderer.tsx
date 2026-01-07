'use client';

/**
 * Form Renderer Component
 *
 * A simple form renderer for standalone applications.
 * Renders form fields based on configuration and handles submission.
 */

import { useState, FormEvent } from 'react';
import { FormDefinition, FieldConfig } from '@/types/bundle';

interface FormRendererProps {
  form: FormDefinition;
}

export function FormRenderer({ form }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const includedFields = form.fieldConfigs?.filter((f) => f.included !== false) || [];

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user types
    if (errors[fieldName]) {
      setErrors((prev) => {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of includedFields) {
      const value = formData[field.name];

      // Required validation
      if (field.required && (value === undefined || value === '')) {
        newErrors[field.name] = `${field.label || field.name} is required`;
        continue;
      }

      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Please enter a valid email address';
        }
      }

      // Min/max length validation
      if (field.validation?.minLength && value?.length < field.validation.minLength) {
        newErrors[field.name] = `Must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation?.maxLength && value?.length > field.validation.maxLength) {
        newErrors[field.name] = `Must be no more than ${field.validation.maxLength} characters`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug: form.slug,
          data: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  // Show success message after submission
  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          Thank you!
        </h2>
        <p style={{ color: 'var(--muted)' }}>
          Your submission has been received.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({});
          }}
          className="btn btn-outline"
          style={{ marginTop: '1.5rem' }}
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {submitError && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#dc2626',
            fontSize: '0.875rem',
          }}
        >
          {submitError}
        </div>
      )}

      {includedFields.map((field) => (
        <div key={field.id} className="form-group">
          <label htmlFor={field.id} className="form-label">
            {field.label || field.name}
            {field.required && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
          {renderField(field, formData[field.name], (value) =>
            handleChange(field.name, value)
          )}
          {errors[field.name] && (
            <div className="form-error">{errors[field.name]}</div>
          )}
        </div>
      ))}

      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ width: '100%' }}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

function renderField(
  field: FieldConfig,
  value: any,
  onChange: (value: any) => void
) {
  const commonProps = {
    id: field.id,
    name: field.name,
    placeholder: field.placeholder,
    required: field.required,
    className: 'form-input',
  };

  switch (field.type) {
    case 'textarea':
    case 'long-text':
      return (
        <textarea
          {...commonProps}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      );

    case 'select':
    case 'dropdown':
      return (
        <select
          {...commonProps}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.placeholder || 'Select an option'}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id={field.id}
            name={field.name}
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 'auto' }}
          />
          {field.placeholder && (
            <span style={{ fontSize: '0.875rem' }}>{field.placeholder}</span>
          )}
        </div>
      );

    case 'radio':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <input
                type="radio"
                name={field.name}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );

    case 'number':
      return (
        <input
          {...commonProps}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case 'email':
      return (
        <input
          {...commonProps}
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'date':
      return (
        <input
          {...commonProps}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'tel':
    case 'phone':
      return (
        <input
          {...commonProps}
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'url':
      return (
        <input
          {...commonProps}
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'text':
    case 'short-text':
    default:
      return (
        <input
          {...commonProps}
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          minLength={field.validation?.minLength}
          maxLength={field.validation?.maxLength}
        />
      );
  }
}
