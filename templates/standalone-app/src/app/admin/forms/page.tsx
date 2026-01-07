/**
 * Admin Forms Page
 *
 * Lists all forms and their stats.
 */

import Link from 'next/link';
import { getAllForms } from '@/lib/bundle';
import { COLLECTIONS, getCollection } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

export default async function AdminFormsPage() {
  const forms = await getAllForms();
  const formStats = await getFormStats(forms.map((f) => f.slug));

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Forms</h1>
        <span style={{ color: '#666' }}>{forms.length} forms</span>
      </div>

      <div className="admin-card">
        {forms.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Fields</th>
                <th>Submissions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.slug}>
                  <td>
                    <div>
                      <strong>{form.name}</strong>
                      {form.description && (
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                          {form.description.substring(0, 60)}
                          {form.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', background: '#f5f5f5', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                      {form.slug}
                    </code>
                  </td>
                  <td>{form.fieldConfigs?.length || 0}</td>
                  <td>{formStats[form.slug] || 0}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${form.isPublished ? 'success' : 'warning'}`}>
                      {form.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        href={`/forms/${form.slug}`}
                        className="admin-btn admin-btn-secondary"
                        target="_blank"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/submissions?formSlug=${form.slug}`}
                        className="admin-btn admin-btn-secondary"
                      >
                        Submissions
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <p>No forms have been configured.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Forms are defined in the application bundle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

async function getFormStats(formSlugs: string[]): Promise<Record<string, number>> {
  const collection = await getCollection(COLLECTIONS.FORM_SUBMISSIONS);

  const pipeline = [
    { $match: { formSlug: { $in: formSlugs } } },
    { $group: { _id: '$formSlug', count: { $sum: 1 } } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  const stats: Record<string, number> = {};
  for (const result of results) {
    stats[result._id] = result.count;
  }

  return stats;
}
