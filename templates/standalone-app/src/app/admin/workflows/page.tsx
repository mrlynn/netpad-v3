/**
 * Admin Workflows Page
 *
 * Lists workflows and their execution history.
 */

import Link from 'next/link';
import { getAllWorkflows } from '@/lib/bundle';
import { COLLECTIONS, getCollection, WorkflowExecutionDocument } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminWorkflowsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = 20;

  const workflows = await getAllWorkflows();
  const { executions, total } = await getExecutions(page, pageSize);
  const workflowStats = await getWorkflowStats(workflows.map((w) => w.slug));

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Workflows</h1>
      </div>

      {/* Workflows List */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Configured Workflows</h2>
          <span style={{ color: '#666', fontSize: '0.875rem' }}>{workflows.length} workflows</span>
        </div>
        {workflows.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Nodes</th>
                <th>Executions</th>
                <th>Success Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => {
                const stats = workflowStats[workflow.slug] || { total: 0, success: 0 };
                const successRate =
                  stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

                return (
                  <tr key={workflow.slug}>
                    <td>
                      <div>
                        <strong>{workflow.name}</strong>
                        {workflow.description && (
                          <div
                            style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}
                          >
                            {workflow.description.substring(0, 60)}
                            {workflow.description.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: '0.75rem',
                          background: '#f5f5f5',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {workflow.slug}
                      </code>
                    </td>
                    <td>{workflow.canvas?.nodes?.length || 0}</td>
                    <td>{stats.total}</td>
                    <td>
                      {stats.total > 0 ? (
                        <span
                          style={{
                            color:
                              successRate >= 80
                                ? '#155724'
                                : successRate >= 50
                                  ? '#856404'
                                  : '#721c24',
                          }}
                        >
                          {successRate}%
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`admin-badge admin-badge-${workflow.status === 'active' ? 'success' : 'warning'}`}
                      >
                        {workflow.status || 'active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <p>No workflows have been configured.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Workflows are defined in the application bundle.
            </p>
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Recent Executions</h2>
          <span style={{ color: '#666', fontSize: '0.875rem' }}>{total} total</span>
        </div>
        {executions.length > 0 ? (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Execution ID</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => (
                  <tr key={exec.executionId}>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>{exec.executionId}</code>
                    </td>
                    <td>{exec.workflowSlug}</td>
                    <td>
                      <span
                        className={`admin-badge admin-badge-${getExecutionStatusColor(exec.status)}`}
                      >
                        {exec.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: '#666' }}>
                      {exec.duration ? `${exec.duration}ms` : '—'}
                    </td>
                    <td style={{ fontSize: '0.875rem', color: '#666' }}>
                      {new Date(exec.startedAt).toLocaleString()}
                    </td>
                    <td>
                      <Link
                        href={`/admin/workflows/${exec.executionId}`}
                        className="admin-btn admin-btn-secondary"
                      >
                        View Logs
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #eee',
                }}
              >
                {page > 1 && (
                  <Link
                    href={`/admin/workflows?page=${page - 1}`}
                    className="admin-btn admin-btn-secondary"
                  >
                    Previous
                  </Link>
                )}
                <span style={{ padding: '0.5rem 1rem', color: '#666' }}>
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/admin/workflows?page=${page + 1}`}
                    className="admin-btn admin-btn-secondary"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="admin-empty">No workflow executions yet</div>
        )}
      </div>
    </div>
  );
}

async function getExecutions(
  page: number,
  pageSize: number
): Promise<{ executions: WorkflowExecutionDocument[]; total: number }> {
  const collection = await getCollection<WorkflowExecutionDocument>(
    COLLECTIONS.WORKFLOW_EXECUTIONS
  );
  const skip = (page - 1) * pageSize;

  const [executions, total] = await Promise.all([
    collection.find().sort({ startedAt: -1 }).skip(skip).limit(pageSize).toArray(),
    collection.countDocuments(),
  ]);

  return { executions, total };
}

async function getWorkflowStats(
  workflowSlugs: string[]
): Promise<Record<string, { total: number; success: number }>> {
  const collection = await getCollection(COLLECTIONS.WORKFLOW_EXECUTIONS);

  const pipeline = [
    { $match: { workflowSlug: { $in: workflowSlugs } } },
    {
      $group: {
        _id: '$workflowSlug',
        total: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  const stats: Record<string, { total: number; success: number }> = {};
  for (const result of results) {
    stats[result._id] = { total: result.total, success: result.success };
  }

  return stats;
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
