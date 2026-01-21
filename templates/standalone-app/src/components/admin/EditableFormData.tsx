'use client';

/**
 * Editable Form Data Component
 *
 * Displays form submission data with inline editing capability.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface EditableFormDataProps {
  submissionId: string;
  data: Record<string, any>;
}

export function EditableFormData({ submissionId, data }: EditableFormDataProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, any>>(data);
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = useCallback((key: string, value: any) => {
    setEditedData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: editedData }),
      });

      if (!response.ok) {
        throw new Error('Failed to update submission data');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  const renderEditableValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return (
        <input
          type="text"
          value=""
          onChange={(e) => handleFieldChange(key, e.target.value || null)}
          placeholder="(empty)"
          style={{
            width: '100%',
            padding: '0.375rem 0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        />
      );
    }

    if (typeof value === 'boolean') {
      return (
        <select
          value={value ? 'true' : 'false'}
          onChange={(e) => handleFieldChange(key, e.target.value === 'true')}
          style={{
            padding: '0.375rem 0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (Array.isArray(value)) {
      return (
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleFieldChange(key, parsed);
            } catch {
              // Allow invalid JSON while typing
            }
          }}
          rows={Math.min(value.length + 2, 6)}
          style={{
            width: '100%',
            padding: '0.375rem 0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
      );
    }

    if (typeof value === 'object') {
      return (
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleFieldChange(key, parsed);
            } catch {
              // Allow invalid JSON while typing
            }
          }}
          rows={4}
          style={{
            width: '100%',
            padding: '0.375rem 0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
      );
    }

    // String or number
    const stringValue = String(value);
    if (stringValue.length > 100 || stringValue.includes('\n')) {
      return (
        <textarea
          value={stringValue}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '0.375rem 0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
      );
    }

    return (
      <input
        type={typeof value === 'number' ? 'number' : 'text'}
        value={stringValue}
        onChange={(e) =>
          handleFieldChange(
            key,
            typeof value === 'number' ? Number(e.target.value) : e.target.value
          )
        }
        style={{
          width: '100%',
          padding: '0.375rem 0.5rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.875rem',
        }}
      />
    );
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#999' }}>—</span>;
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return (
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {value.map((item, index) => (
            <li key={index}>{renderValue(item)}</li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'object') {
      return (
        <pre
          style={{
            margin: 0,
            background: '#f5f5f5',
            padding: '0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return String(value);
  };

  const entries = Object.entries(isEditing ? editedData : data);

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Form Data</h2>
        {!isEditing ? (
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setIsEditing(true)}
            style={{ fontSize: '0.875rem' }}
          >
            Edit Data
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#d1ecf1',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#0c5460',
          }}
        >
          Edit the form data below. Click &quot;Save Changes&quot; when done.
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td style={{ fontWeight: 500, verticalAlign: 'top', paddingTop: '0.875rem' }}>
                {key}
              </td>
              <td>{isEditing ? renderEditableValue(key, value) : renderValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {entries.length === 0 && <div className="admin-empty">No data submitted</div>}
    </div>
  );
}
