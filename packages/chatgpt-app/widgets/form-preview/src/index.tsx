/**
 * Form Preview Widget for ChatGPT
 *
 * Displays form previews with live field rendering.
 * Phase 2 will add editing capabilities.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
}

interface FormPreviewData {
  form: {
    id?: string;
    name: string;
    description?: string;
    fields: FormField[];
    settings?: {
      submitButtonText?: string;
    };
  };
  mode: 'preview' | 'edit';
  theme: 'light' | 'dark';
  importUrl?: string; // URL to open form in NetPad
}

interface OpenAIGlobal {
  toolOutput?: {
    structuredContent?: FormPreviewData;
  };
  theme?: 'light' | 'dark';
  callTool?: (name: string, args: Record<string, unknown>) => Promise<void>;
  sendFollowUpMessage?: (message: string) => void;
  notifyIntrinsicHeight?: (height: number) => void;
  setWidgetState?: (state: Record<string, unknown>) => void;
  widgetState?: Record<string, unknown>;
  openExternal?: (options: { href: string }) => void; // Open external URL
}

declare global {
  interface Window {
    openai?: OpenAIGlobal;
  }
}

function useOpenAI() {
  const [openai, setOpenai] = useState(window.openai);

  useEffect(() => {
    const handleSetGlobals = () => setOpenai({ ...window.openai });
    window.addEventListener('openai:set_globals', handleSetGlobals);
    return () => window.removeEventListener('openai:set_globals', handleSetGlobals);
  }, []);

  return openai;
}

const FIELD_ICONS: Record<string, string> = {
  text: '📝',
  email: '📧',
  phone: '📞',
  number: '🔢',
  textarea: '📄',
  select: '📋',
  checkbox: '☑️',
  radio: '🔘',
  date: '📅',
  file: '📎',
  default: '⬜',
};

function FormField({ field }: { field: FormField }) {
  const [value, setValue] = useState('');

  const renderInput = () => {
    const baseStyle = {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #333',
      background: '#1a1a1a',
      color: '#fff',
      fontSize: '14px',
      outline: 'none',
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...baseStyle, minHeight: '80px', resize: 'vertical' }}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={baseStyle}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => setValue(e.target.checked ? 'true' : 'false')}
            />
            <span style={{ fontSize: '14px', color: '#ccc' }}>
              {field.placeholder || 'Yes'}
            </span>
          </label>
        );

      case 'radio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <span style={{ fontSize: '14px', color: '#ccc' }}>{opt.label}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={baseStyle}
          />
        );
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#fff',
        }}
      >
        {FIELD_ICONS[field.type] || FIELD_ICONS.default} {field.label}
        {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>
      {renderInput()}
      {field.helpText && (
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
          {field.helpText}
        </p>
      )}
    </div>
  );
}

function FormPreview() {
  const openai = useOpenAI();
  const data = openai?.toolOutput?.structuredContent;

  useEffect(() => {
    openai?.notifyIntrinsicHeight?.(document.body.scrollHeight);
  }, [data, openai]);

  const handleOpenInNetPad = () => {
    if (data?.importUrl) {
      openai?.openExternal?.({ href: data.importUrl });
    } else {
      // Fallback: ask to export
      openai?.sendFollowUpMessage?.(
        `Export this form to my NetPad workspace`
      );
    }
  };

  const handleModify = () => {
    openai?.sendFollowUpMessage?.(
      `I'd like to modify this form. What changes would you suggest?`
    );
  };

  if (!data?.form) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        <span style={{ fontSize: '48px' }}>📝</span>
        <p style={{ marginTop: '12px' }}>No form data available</p>
      </div>
    );
  }

  const { form } = data;

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: '#1a1a1a',
        color: '#fff',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>
          📝 {form.name}
        </h2>
        {form.description && (
          <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
            {form.description}
          </p>
        )}
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
          {form.fields.length} fields • {data.mode === 'edit' ? 'Edit mode' : 'Preview mode'}
        </p>
      </div>

      {/* Form Fields */}
      <div
        style={{
          background: '#222',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #333',
        }}
      >
        {form.fields.map((field) => (
          <FormField key={field.id} field={field} />
        ))}

        {/* Submit Button */}
        <button
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          {form.settings?.submitButtonText || 'Submit'}
        </button>
      </div>

      {/* Primary Action: Open in NetPad */}
      <button
        onClick={handleOpenInNetPad}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        }}
      >
        🚀 Open in NetPad
      </button>

      {/* Secondary Action */}
      <button
        onClick={handleModify}
        style={{
          width: '100%',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '1px solid #444',
          background: 'transparent',
          color: '#aaa',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        ✏️ Modify this form
      </button>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<FormPreview />);
}

export default FormPreview;
