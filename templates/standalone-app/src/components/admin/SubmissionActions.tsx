'use client';

/**
 * Submission Actions Component
 *
 * Provides quick actions for managing submissions:
 * - Update status
 * - Delete submission
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubmissionActionsProps {
  submissionId: string;
  currentStatus: string;
  showViewButton?: boolean;
}

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'submitted', label: 'Submitted', color: 'success' },
  { value: 'processed', label: 'Processed', color: 'info' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'failed', label: 'Failed', color: 'error' },
];

export function SubmissionActions({
  submissionId,
  currentStatus,
  showViewButton = true,
}: SubmissionActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setShowStatusMenu(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update submission status');
    } finally {
      setIsUpdating(false);
      setShowStatusMenu(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete submission');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
      {showViewButton && (
        <a
          href={`/admin/submissions/${submissionId}`}
          className="admin-btn admin-btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
        >
          View
        </a>
      )}

      {/* Status Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : 'Status'}
        </button>

        {showStatusMenu && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
              }}
              onClick={() => setShowStatusMenu(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.25rem',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '140px',
              }}
            >
              {STATUSES.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleStatusChange(status.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    border: 'none',
                    background: currentStatus === status.value ? '#f0f0f0' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginRight: '0.5rem',
                      background:
                        status.color === 'success'
                          ? '#155724'
                          : status.color === 'warning'
                            ? '#856404'
                            : status.color === 'error'
                              ? '#721c24'
                              : '#0c5460',
                    }}
                  />
                  {status.label}
                  {currentStatus === status.value && ' (current)'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Button */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="admin-btn"
          style={{
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem',
            background: '#dc3545',
            color: 'white',
          }}
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              <div
                style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  width: '90%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Delete Submission?</h3>
                <p style={{ margin: '0 0 1.5rem', color: '#666' }}>
                  Are you sure you want to delete this submission? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    style={{ background: '#dc3545', color: 'white' }}
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
