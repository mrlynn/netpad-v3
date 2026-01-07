/**
 * Admin Submissions Page
 *
 * Lists all form submissions with filtering.
 */

import Link from 'next/link';
import { COLLECTIONS, getCollection, FormSubmissionDocument } from '@/lib/database/schema';
import { getAllForms } from '@/lib/bundle';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ formSlug?: string; page?: string }>;
}

export default async function AdminSubmissionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const formSlug = params.formSlug;
  const page = parseInt(params.page || '1', 10);
  const pageSize = 20;

  const forms = await getAllForms();
  const { submissions, total } = await getSubmissions(formSlug, page, pageSize);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Submissions</h1>
        <span style={{ color: '#666' }}>{total} total submissions</span>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Filter by Form:</span>
            <select
              name="formSlug"
              defaultValue={formSlug || ''}
              style={{
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">All Forms</option>
              {forms.map((form) => (
                <option key={form.slug} value={form.slug}>
                  {form.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="admin-btn admin-btn-primary">
            Filter
          </button>
          {formSlug && (
            <Link href="/admin/submissions" className="admin-btn admin-btn-secondary">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Submissions Table */}
      <div className="admin-card">
        {submissions.length > 0 ? (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Form</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.submissionId}>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>{sub.submissionId}</code>
                    </td>
                    <td>{sub.formName || sub.formSlug}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: '#666' }}>
                      {new Date(sub.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <Link
                        href={`/admin/submissions/${sub.submissionId}`}
                        className="admin-btn admin-btn-secondary"
                      >
                        View Details
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
                    href={`/admin/submissions?${formSlug ? `formSlug=${formSlug}&` : ''}page=${page - 1}`}
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
                    href={`/admin/submissions?${formSlug ? `formSlug=${formSlug}&` : ''}page=${page + 1}`}
                    className="admin-btn admin-btn-secondary"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="admin-empty">
            <p>No submissions found.</p>
            {formSlug && (
              <Link href="/admin/submissions" style={{ color: '#1a1a2e', marginTop: '0.5rem' }}>
                View all submissions
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

async function getSubmissions(
  formSlug: string | undefined,
  page: number,
  pageSize: number
): Promise<{ submissions: any[]; total: number }> {
  const collection = await getCollection<FormSubmissionDocument>(COLLECTIONS.FORM_SUBMISSIONS);

  const query = formSlug ? { formSlug } : {};
  const skip = (page - 1) * pageSize;

  const [submissions, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
    collection.countDocuments(query),
  ]);

  return { submissions, total };
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
