'use client';

/**
 * Submission Detail Actions Component
 *
 * Provides actions for the submission detail page:
 * - Update status with status history display
 * - Edit form data
 * - Delete submission
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubmissionDetailActionsProps {
  submissionId: string;
  currentStatus: string;
  notes?: string;
}

const STATUSES = [
  { value: 'pending', label: 'Pending', color: '#856404', bg: '#fff3cd' },
  { value: 'submitted', label: 'Submitted', color: '#155724', bg: '#d4edda' },
  { value: 'processed', label: 'Processed', color: '#0c5460', bg: '#d1ecf1' },
  { value: 'approved', label: 'Approved', color: '#155724', bg: '#d4edda' },
  { value: 'rejected', label: 'Rejected', color: '#721c24', bg: '#f8d7da' },
  { value: 'failed', label: 'Failed', color: '#721c24', bg: '#f8d7da' },
];

export function SubmissionDetailActions({
  submissionId,
  currentStatus,
  notes: initialNotes,
}: SubmissionDetailActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(initialNotes || '');

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus && notes === (initialNotes || '')) {
      setShowStatusDialog(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update submission');
      }

      setShowStatusDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission');
    } finally {
      setIsUpdating(false);
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

      router.push('/admin/submissions');
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const currentStatusInfo = STATUSES.find((s) => s.value === currentStatus) || STATUSES[0];

  return (
    <>
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => setShowStatusDialog(true)}
        >
          Update Status
        </button>
        <button
          type="button"
          className="admin-btn"
          style={{ background: '#dc3545', color: 'white' }}
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete
        </button>
      </div>

      {/* Status Update Dialog */}
      {showStatusDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowStatusDialog(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: '450px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.125rem' }}>Update Submission Status</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Current Status
              </label>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  background: currentStatusInfo.bg,
                  color: currentStatusInfo.color,
                }}
              >
                {currentStatusInfo.label}
              </span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                New Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this status change..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowStatusDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleStatusUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowDeleteDialog(false)}
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
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', color: '#dc3545' }}>
              Delete Submission?
            </h3>
            <p style={{ margin: '0 0 0.5rem', color: '#666' }}>
              Are you sure you want to delete this submission?
            </p>
            <p
              style={{
                margin: '0 0 1.5rem',
                padding: '0.5rem',
                background: '#fff3cd',
                borderRadius: '4px',
                fontSize: '0.875rem',
                color: '#856404',
              }}
            >
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowDeleteDialog(false)}
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
                {isDeleting ? 'Deleting...' : 'Delete Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
