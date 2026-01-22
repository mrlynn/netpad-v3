/**
 * Admin Submission Detail Page
 *
 * Shows details of a single submission.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COLLECTIONS, getCollection, FormSubmissionDocument } from '@/lib/database/schema';
import { SubmissionDetailActions } from '@/components/admin/SubmissionDetailActions';
import { EditableFormData } from '@/components/admin/EditableFormData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const { submissionId } = await params;
  const submission = await getSubmission(submissionId);

  if (!submission) {
    notFound();
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <Link
            href="/admin/submissions"
            style={{ color: '#666', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            &larr; Back to Submissions
          </Link>
          <h1 className="admin-page-title" style={{ marginTop: '0.5rem' }}>
            Submission Details
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={`admin-badge admin-badge-${getStatusColor(submission.status)}`}>
            {submission.status}
          </span>
          <SubmissionDetailActions
            submissionId={submission.submissionId}
            currentStatus={submission.status}
            notes={(submission as any).notes}
          />
        </div>
      </div>

      {/* Submission Info */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
          Submission Information
        </h2>
        <table className="admin-table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 500, width: '200px' }}>Submission ID</td>
              <td>
                <code style={{ fontSize: '0.875rem' }}>{submission.submissionId}</code>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Form</td>
              <td>
                {submission.formName || submission.formSlug}
                <code
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    background: '#f5f5f5',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '4px',
                  }}
                >
                  {submission.formSlug}
                </code>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Status</td>
              <td>{submission.status}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Submitted At</td>
              <td>{new Date(submission.createdAt).toLocaleString()}</td>
            </tr>
            {submission.processedAt && (
              <tr>
                <td style={{ fontWeight: 500 }}>Processed At</td>
                <td>{new Date(submission.processedAt).toLocaleString()}</td>
              </tr>
            )}
            {submission.metadata?.userAgent && (
              <tr>
                <td style={{ fontWeight: 500 }}>User Agent</td>
                <td style={{ fontSize: '0.875rem', color: '#666' }}>
                  {submission.metadata.userAgent}
                </td>
              </tr>
            )}
            {submission.metadata?.ipAddress && (
              <tr>
                <td style={{ fontWeight: 500 }}>IP Address</td>
                <td>{submission.metadata.ipAddress}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Submission Data (Editable) */}
      <EditableFormData submissionId={submission.submissionId} data={submission.data || {}} />

      {/* Conversational Data (if this was a conversational form submission) */}
      {(submission as any).conversational && (
        <div className="admin-card" style={{ marginTop: '1.5rem' }}>
          <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
            🤖 Conversation Details
          </h2>

          {/* Conversation Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#00ED64' }}>
                {(submission as any).conversational.turnCount || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Turns</div>
            </div>
            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#00ED64' }}>
                {Math.round(((submission as any).conversational.overallConfidence || 0) * 100)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Confidence</div>
            </div>
            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#00ED64' }}>
                {formatDuration((submission as any).conversational.durationSeconds)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Duration</div>
            </div>
            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#00ED64' }}>
                {((submission as any).conversational.topicsCovered || []).filter((t: any) => t.covered).length}/
                {((submission as any).conversational.topicsCovered || []).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Topics Covered</div>
            </div>
          </div>

          {/* Topics */}
          {(submission as any).conversational.topicsCovered && (submission as any).conversational.topicsCovered.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Topics</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(submission as any).conversational.topicsCovered.map((topic: any) => (
                  <span
                    key={topic.topicId}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: topic.covered ? '#d4edda' : '#f8f9fa',
                      color: topic.covered ? '#155724' : '#666',
                      border: `1px solid ${topic.covered ? '#c3e6cb' : '#dee2e6'}`,
                    }}
                  >
                    {topic.covered ? '✓ ' : ''}{topic.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {(submission as any).conversational.transcript && (submission as any).conversational.transcript.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Conversation Transcript ({(submission as any).conversational.transcript.length} messages)
              </h3>
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                }}
              >
                {(submission as any).conversational.transcript.map((message: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: index < (submission as any).conversational.transcript.length - 1 ? '1px solid #dee2e6' : 'none',
                      background: message.role === 'assistant' ? '#f8f9fa' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: message.role === 'assistant' ? '#9C27B0' : '#2196F3',
                        }}
                      >
                        {message.role === 'assistant' ? '🤖 Assistant' : '👤 User'}
                      </span>
                      {message.timestamp && (
                        <span style={{ fontSize: '0.7rem', color: '#999' }}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation ID */}
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#999' }}>
            Conversation ID: {(submission as any).conversational.conversationId}
          </div>
        </div>
      )}

      {/* Error (if any) */}
      {submission.error && (
        <div
          className="admin-card"
          style={{
            marginTop: '1.5rem',
            borderLeft: '4px solid #dc3545',
          }}
        >
          <h2 className="admin-card-title" style={{ marginBottom: '1rem', color: '#dc3545' }}>
            Error
          </h2>
          <pre
            style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem',
            }}
          >
            {submission.error}
          </pre>
        </div>
      )}
    </div>
  );
}

async function getSubmission(submissionId: string): Promise<FormSubmissionDocument | null> {
  const collection = await getCollection<FormSubmissionDocument>(COLLECTIONS.FORM_SUBMISSIONS);
  return await collection.findOne({ submissionId });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'submitted':
    case 'approved':
      return 'success';
    case 'processed':
      return 'info';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'rejected':
      return 'error';
    default:
      return 'info';
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
