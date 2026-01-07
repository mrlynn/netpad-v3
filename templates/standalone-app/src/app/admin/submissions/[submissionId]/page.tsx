/**
 * Admin Submission Detail Page
 *
 * Shows details of a single submission.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COLLECTIONS, getCollection, FormSubmissionDocument } from '@/lib/database/schema';

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
        <span className={`admin-badge admin-badge-${getStatusColor(submission.status)}`}>
          {submission.status}
        </span>
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

      {/* Submission Data */}
      <div className="admin-card">
        <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
          Form Data
        </h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(submission.data || {}).map(([key, value]) => (
              <tr key={key}>
                <td style={{ fontWeight: 500 }}>{key}</td>
                <td>
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {Object.keys(submission.data || {}).length === 0 && (
          <div className="admin-empty">No data submitted</div>
        )}
      </div>

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
      return 'success';
    case 'processed':
      return 'info';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'info';
  }
}

function formatValue(value: any): React.ReactNode {
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
          <li key={index}>{formatValue(item)}</li>
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
}
