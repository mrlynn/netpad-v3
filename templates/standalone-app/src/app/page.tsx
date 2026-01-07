/**
 * Home Page
 *
 * Landing page for the standalone application.
 * Shows available forms and application info.
 */

import Link from 'next/link';
import { getAllForms, getAppState, isInitialized, loadBundle } from '@/lib/bundle';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initialized = await isInitialized();
  const state = await getAppState();
  const bundle = loadBundle();

  // If not initialized, show setup message
  if (!initialized) {
    return (
      <main className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Application Setup Required
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            This application needs to be initialized before it can be used.
          </p>
          <InitButton />
        </div>
      </main>
    );
  }

  // Get forms to display
  const forms = await getAllForms();
  const appName = bundle?.project?.name || bundle?.manifest.name || 'NetPad Application';

  return (
    <main className="container" style={{ paddingTop: '2rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{appName}</h1>
        {bundle?.project?.description && (
          <p style={{ color: 'var(--muted)' }}>{bundle.project.description}</p>
        )}
      </header>

      {/* Forms Grid */}
      {forms.length > 0 ? (
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Available Forms</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
            }}
          >
            {forms.map((form) => (
              <Link
                key={form.slug}
                href={`/forms/${form.slug}`}
                className="card"
                style={{
                  display: 'block',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  {form.name}
                </h3>
                {form.description && (
                  <p
                    style={{
                      color: 'var(--muted)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {form.description}
                  </p>
                )}
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: 'var(--primary-color)',
                  }}
                >
                  Fill out form →
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>No forms available yet.</p>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--muted)',
        }}
      >
        Powered by{' '}
        <a
          href="https://netpad.io"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--primary-color)' }}
        >
          NetPad
        </a>
      </footer>
    </main>
  );
}

/**
 * Client component for initialization button
 */
function InitButton() {
  return (
    <form action="/api/init" method="POST">
      <button type="submit" className="btn btn-primary">
        Initialize Application
      </button>
    </form>
  );
}
