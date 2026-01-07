/**
 * Admin Workflow Execution Detail Page
 *
 * Shows details and logs of a single workflow execution.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COLLECTIONS, getCollection, WorkflowExecutionDocument } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ executionId: string }>;
}

export default async function ExecutionDetailPage({ params }: PageProps) {
  const { executionId } = await params;
  const execution = await getExecution(executionId);

  if (!execution) {
    notFound();
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <Link
            href="/admin/workflows"
            style={{ color: '#666', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            &larr; Back to Workflows
          </Link>
          <h1 className="admin-page-title" style={{ marginTop: '0.5rem' }}>
            Execution Details
          </h1>
        </div>
        <span className={`admin-badge admin-badge-${getStatusColor(execution.status)}`}>
          {execution.status}
        </span>
      </div>

      {/* Execution Info */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
          Execution Information
        </h2>
        <table className="admin-table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 500, width: '200px' }}>Execution ID</td>
              <td>
                <code style={{ fontSize: '0.875rem' }}>{execution.executionId}</code>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Workflow</td>
              <td>
                <code
                  style={{
                    fontSize: '0.875rem',
                    background: '#f5f5f5',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  {execution.workflowSlug}
                </code>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Status</td>
              <td>{execution.status}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Started At</td>
              <td>{new Date(execution.startedAt).toLocaleString()}</td>
            </tr>
            {execution.completedAt && (
              <tr>
                <td style={{ fontWeight: 500 }}>Completed At</td>
                <td>{new Date(execution.completedAt).toLocaleString()}</td>
              </tr>
            )}
            <tr>
              <td style={{ fontWeight: 500 }}>Duration</td>
              <td>{execution.duration ? `${execution.duration}ms` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Error (if any) */}
      {execution.error && (
        <div
          className="admin-card"
          style={{
            marginBottom: '1.5rem',
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
              margin: 0,
            }}
          >
            {execution.error}
          </pre>
        </div>
      )}

      {/* Input */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
          Input
        </h2>
        <pre
          style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.75rem',
            margin: 0,
            maxHeight: '300px',
          }}
        >
          {JSON.stringify(execution.input, null, 2)}
        </pre>
      </div>

      {/* Output */}
      {execution.output && (
        <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
            Output
          </h2>
          <pre
            style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.75rem',
              margin: 0,
              maxHeight: '300px',
            }}
          >
            {JSON.stringify(execution.output, null, 2)}
          </pre>
        </div>
      )}

      {/* Execution Logs */}
      <div className="admin-card">
        <h2 className="admin-card-title" style={{ marginBottom: '1rem' }}>
          Execution Logs
        </h2>
        {execution.logs && execution.logs.length > 0 ? (
          <div
            style={{
              maxHeight: '500px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          >
            {execution.logs.map((log, index) => (
              <div
                key={index}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid #eee',
                  background: getLogBackground(log.level),
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#666' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: getLogColor(log.level),
                      textTransform: 'uppercase',
                    }}
                  >
                    {log.level}
                  </span>
                  {log.nodeId && (
                    <span style={{ color: '#666' }}>
                      [Node: {log.nodeId}]
                    </span>
                  )}
                </div>
                <div style={{ color: '#333' }}>{log.message}</div>
                {log.data && (
                  <pre
                    style={{
                      marginTop: '0.5rem',
                      marginBottom: 0,
                      padding: '0.5rem',
                      background: 'rgba(0,0,0,0.05)',
                      borderRadius: '4px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty">No logs available</div>
        )}
      </div>
    </div>
  );
}

async function getExecution(executionId: string): Promise<WorkflowExecutionDocument | null> {
  const collection = await getCollection<WorkflowExecutionDocument>(
    COLLECTIONS.WORKFLOW_EXECUTIONS
  );
  return await collection.findOne({ executionId });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'running':
      return 'info';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'warning';
    default:
      return 'info';
  }
}

function getLogColor(level: string): string {
  switch (level) {
    case 'error':
      return '#dc3545';
    case 'warn':
      return '#ffc107';
    case 'info':
      return '#17a2b8';
    default:
      return '#666';
  }
}

function getLogBackground(level: string): string {
  switch (level) {
    case 'error':
      return 'rgba(220, 53, 69, 0.05)';
    case 'warn':
      return 'rgba(255, 193, 7, 0.05)';
    default:
      return 'transparent';
  }
}
