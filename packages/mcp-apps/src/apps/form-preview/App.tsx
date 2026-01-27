/**
 * Form Preview MCP App
 *
 * Renders a lightweight form preview without the full FormRenderer complexity.
 * This is a simplified renderer for MCP App contexts.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { FormPreviewData, FormField, FormTheme } from '../../types';

interface AppProps {
  initialData?: FormPreviewData;
}

export function App({ initialData }: AppProps) {
  const [data, setData] = useState<FormPreviewData | null>(initialData ?? null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = event.data;
        if (message?.type === 'MCP_TOOL_RESULT' && message.data) {
          setData(message.data as FormPreviewData);
          setError(null);
        }
      } catch (err) {
        setError('Failed to parse form data');
        console.error('Error parsing MCP message:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent?.postMessage({ type: 'READY' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const systemTheme = useMemo(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const theme = data?.theme ?? systemTheme;
  const formTheme = data?.form?.theme ?? {};

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    window.parent?.postMessage(
      {
        type: 'FORM_DATA_CHANGED',
        payload: { fieldId, value, formData: { ...formData, [fieldId]: value } },
      },
      '*'
    );
  };

  // Get fields for current page
  const currentFields = useMemo(() => {
    if (!data?.form?.fields) return [];
    if (!data.form.multiPage?.enabled) return data.form.fields;

    const pages = data.form.multiPage.pages;
    if (!pages || pages.length === 0) return data.form.fields;

    const currentPageDef = pages[currentPage];
    if (!currentPageDef) return [];

    return data.form.fields.filter((f) => currentPageDef.fields.includes(f.id));
  }, [data?.form, currentPage]);

  const totalPages = data?.form?.multiPage?.enabled
    ? data.form.multiPage.pages?.length ?? 1
    : 1;

  if (error) {
    return (
      <div style={containerStyle(theme)}>
        <div style={errorContainerStyle}>⚠️ {error}</div>
      </div>
    );
  }

  if (!data?.form) {
    return (
      <div style={containerStyle(theme)}>
        <div style={loadingStyle}>Loading form...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle(theme)}>
      {/* Form Header */}
      <div style={headerStyle(theme, formTheme)}>
        <h2 style={formTitleStyle(theme, formTheme)}>{data.form.name}</h2>
        {data.form.description && (
          <p style={formDescStyle(theme)}>{data.form.description}</p>
        )}
        {data.mode && (
          <div style={modeBadgeStyle(theme)}>
            {data.mode === 'both' ? 'Traditional + Conversational' : data.mode}
          </div>
        )}
      </div>

      {/* Form Content */}
      <div style={formContentStyle(theme)}>
        {/* Page indicator */}
        {totalPages > 1 && (
          <div style={pageIndicatorStyle(theme)}>
            Page {currentPage + 1} of {totalPages}
            {data.form.multiPage?.pages?.[currentPage]?.title && (
              <span style={pageTitleStyle(theme)}>
                {' — '}{data.form.multiPage.pages[currentPage].title}
              </span>
            )}
          </div>
        )}

        {/* Fields */}
        <div style={fieldsContainerStyle}>
          {currentFields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              theme={theme}
              formTheme={formTheme}
              readonly={data.readonly}
            />
          ))}
        </div>

        {/* Page Navigation */}
        {totalPages > 1 && (
          <div style={pageNavStyle}>
            <button
              style={navButtonStyle(theme, currentPage === 0)}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            <button
              style={navButtonStyle(theme, currentPage === totalPages - 1)}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next →
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button style={submitButtonStyle(theme, formTheme)}>
          {data.readonly ? 'Preview Mode' : 'Submit'}
        </button>
      </div>

      {/* Preview Badge */}
      <div style={previewBadgeStyle}>MCP App Preview</div>
    </div>
  );
}

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  theme: 'light' | 'dark';
  formTheme: FormTheme;
  readonly?: boolean;
}

function FieldRenderer({ field, value, onChange, theme, formTheme, readonly }: FieldRendererProps) {
  const inputStyle = getInputStyle(theme, formTheme);

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={inputStyle}
            disabled={readonly}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            placeholder={field.placeholder}
            style={inputStyle}
            disabled={readonly}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            disabled={readonly}
          />
        );

      case 'select':
      case 'dropdown':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
            disabled={readonly}
          >
            <option value="">{field.placeholder ?? 'Select...'}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div style={radioGroupStyle}>
            {field.options?.map((opt) => (
              <label key={opt.value} style={radioLabelStyle(theme)}>
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => onChange(e.target.value)}
                  style={radioInputStyle}
                  disabled={readonly}
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        if (field.options) {
          return (
            <div style={radioGroupStyle}>
              {field.options.map((opt) => (
                <label key={opt.value} style={radioLabelStyle(theme)}>
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(opt.value)}
                    onChange={(e) => {
                      const arr = Array.isArray(value) ? [...value] : [];
                      if (e.target.checked) {
                        arr.push(opt.value);
                      } else {
                        const idx = arr.indexOf(opt.value);
                        if (idx > -1) arr.splice(idx, 1);
                      }
                      onChange(arr);
                    }}
                    style={radioInputStyle}
                    disabled={readonly}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          );
        }
        return (
          <label style={radioLabelStyle(theme)}>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              style={radioInputStyle}
              disabled={readonly}
            />
            {field.label}
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
            disabled={readonly}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
            disabled={readonly}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0]?.name)}
            style={inputStyle}
            disabled={readonly}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={inputStyle}
            disabled={readonly}
          />
        );
    }
  };

  // Don't render label for standalone checkbox
  if (field.type === 'checkbox' && !field.options) {
    return <div style={fieldContainerStyle}>{renderInput()}</div>;
  }

  return (
    <div style={fieldContainerStyle}>
      <label style={labelStyle(theme)}>
        {field.label}
        {field.required && <span style={requiredStyle}>*</span>}
      </label>
      {renderInput()}
    </div>
  );
}

// Styles
const containerStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  width: '100%',
  height: '100%',
  backgroundColor: theme === 'dark' ? '#0a0e14' : '#F8FAF9',
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
  overflow: 'auto',
  fontFamily: "'Inter', -apple-system, 'Segoe UI', 'Roboto', sans-serif",
  position: 'relative',
});

const headerStyle = (theme: 'light' | 'dark', formTheme: FormTheme): React.CSSProperties => ({
  padding: '24px 24px 16px',
  borderBottom: `1px solid ${theme === 'dark' ? 'rgba(110, 118, 129, 0.2)' : 'rgba(0, 104, 74, 0.1)'}`,
  backgroundColor: formTheme.backgroundColor ?? (theme === 'dark' ? '#141920' : '#ffffff'),
});

const formTitleStyle = (theme: 'light' | 'dark', formTheme: FormTheme): React.CSSProperties => ({
  margin: 0,
  fontSize: '20px',
  fontWeight: 600,
  color: formTheme.textColor ?? (theme === 'dark' ? '#e6edf3' : '#1a1a2e'),
});

const formDescStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  margin: '8px 0 0',
  fontSize: '14px',
  color: theme === 'dark' ? '#8b949e' : '#5c6370',
});

const modeBadgeStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  display: 'inline-block',
  marginTop: '12px',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 500,
  borderRadius: '12px',
  backgroundColor: theme === 'dark' ? 'rgba(0, 212, 170, 0.15)' : 'rgba(0, 150, 107, 0.1)',
  color: theme === 'dark' ? '#00D4AA' : '#00684A',
});

const formContentStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  padding: '24px',
  maxWidth: '600px',
});

const pageIndicatorStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  marginBottom: '20px',
  fontSize: '13px',
  color: theme === 'dark' ? '#8b949e' : '#5c6370',
});

const pageTitleStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  fontWeight: 500,
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
});

const fieldsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const fieldContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  fontSize: '13px',
  fontWeight: 500,
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
});

const requiredStyle: React.CSSProperties = {
  color: '#f85149',
  marginLeft: '4px',
};

const getInputStyle = (theme: 'light' | 'dark', formTheme: FormTheme): React.CSSProperties => ({
  padding: '10px 12px',
  fontSize: '14px',
  borderRadius: `${formTheme.borderRadius ?? 8}px`,
  border: `1px solid ${theme === 'dark' ? 'rgba(110, 118, 129, 0.3)' : 'rgba(0, 104, 74, 0.2)'}`,
  backgroundColor: theme === 'dark' ? '#141920' : '#ffffff',
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  width: '100%',
});

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const radioLabelStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
  cursor: 'pointer',
});

const radioInputStyle: React.CSSProperties = {
  accentColor: '#00ED64',
};

const pageNavStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '24px',
  gap: '12px',
};

const navButtonStyle = (theme: 'light' | 'dark', disabled: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  border: `1px solid ${theme === 'dark' ? 'rgba(110, 118, 129, 0.3)' : 'rgba(0, 104, 74, 0.2)'}`,
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.15s ease',
});

const submitButtonStyle = (theme: 'light' | 'dark', formTheme: FormTheme): React.CSSProperties => ({
  marginTop: '24px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 500,
  border: 'none',
  borderRadius: `${formTheme.borderRadius ?? 8}px`,
  background: formTheme.primaryColor
    ? formTheme.primaryColor
    : theme === 'dark'
    ? 'linear-gradient(135deg, #00ED64 0%, #00D4AA 100%)'
    : 'linear-gradient(135deg, #00684A 0%, #00966B 100%)',
  color: theme === 'dark' ? '#000' : '#fff',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const previewBadgeStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '16px',
  right: '16px',
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 500,
  borderRadius: '6px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: '#fff',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontSize: '14px',
};

const errorContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#f85149',
  fontSize: '14px',
};

export default App;
