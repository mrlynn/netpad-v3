/**
 * Admin Dashboard - Overview Page
 *
 * Shows key stats and recent activity.
 */

import Link from 'next/link';
import { COLLECTIONS, getCollection } from '@/lib/database/schema';
import { getAllForms, getAllWorkflows, getAppState } from '@/lib/bundle';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Get stats
  const [forms, workflows, state, submissions, executions] = await Promise.all([
    getAllForms(),
    getAllWorkflows(),
    getAppState(),
    getSubmissionStats(),
    getExecutionStats(),
  ]);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Forms</div>
          <div className="admin-stat-value">{forms.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Workflows</div>
          <div className="admin-stat-value">{workflows.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Submissions (24h)</div>
          <div className="admin-stat-value">{submissions.last24h}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Workflow Runs (24h)</div>
          <div className="admin-stat-value">{executions.last24h}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        {/* Recent Submissions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Recent Submissions</h2>
            <Link href="/admin/submissions" className="admin-btn admin-btn-secondary">
              View All
            </Link>
          </div>
          {submissions.recent.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {submissions.recent.map((sub: any) => (
                  <tr key={sub.submissionId}>
                    <td>{sub.formName || sub.formSlug}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ color: '#666', fontSize: '0.875rem' }}>
                      {formatTimeAgo(sub.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="admin-empty">No submissions yet</div>
          )}
        </div>

        {/* Recent Workflow Executions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Recent Workflow Runs</h2>
            <Link href="/admin/workflows" className="admin-btn admin-btn-secondary">
              View All
            </Link>
          </div>
          {executions.recent.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {executions.recent.map((exec: any) => (
                  <tr key={exec.executionId}>
                    <td>{exec.workflowSlug}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${getExecutionStatusColor(exec.status)}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td style={{ color: '#666', fontSize: '0.875rem' }}>
                      {exec.duration ? `${exec.duration}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="admin-empty">No workflow runs yet</div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">System Information</h2>
        </div>
        <table className="admin-table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 500 }}>App Initialized</td>
              <td>{state?.initialized ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Bundle Version</td>
              <td>{state?.bundleVersion || '-'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Initialized At</td>
              <td>{state?.initializedAt ? new Date(state.initializedAt).toLocaleString() : '-'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Total Submissions</td>
              <td>{submissions.total}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Total Workflow Executions</td>
              <td>{executions.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function getSubmissionStats() {
  const collection = await getCollection(COLLECTIONS.FORM_SUBMISSIONS);
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [total, last24h, recent] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    collection.find().sort({ createdAt: -1 }).limit(5).toArray(),
  ]);

  return { total, last24h, recent };
}

async function getExecutionStats() {
  const collection = await getCollection(COLLECTIONS.WORKFLOW_EXECUTIONS);
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [total, last24h, recent] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ startedAt: { $gte: oneDayAgo } }),
    collection.find().sort({ startedAt: -1 }).limit(5).toArray(),
  ]);

  return { total, last24h, recent };
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

function getExecutionStatusColor(status: string): string {
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

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
