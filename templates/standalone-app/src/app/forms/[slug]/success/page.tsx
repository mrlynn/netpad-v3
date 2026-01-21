/**
 * Form Success Page
 *
 * Displayed after a successful form submission.
 */

import Link from 'next/link';
import { getFormBySlug } from '@/lib/bundle';

interface SuccessPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}

export default async function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { slug } = await params;
  const { id } = await searchParams;
  const form = await getFormBySlug(slug);

  return (
    <main className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        {/* Success Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#d4edda',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#155724"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#155724' }}>
          Submission Received!
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Thank you for completing {form?.name || 'the form'}. Your response has been recorded.
        </p>

        {/* Reference ID */}
        {id && (
          <div
            style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '2rem',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
              Reference ID
            </p>
            <code style={{ fontSize: '0.875rem', color: '#333' }}>{id}</code>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link
            href={`/forms/${slug}`}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#00ED64',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Submit Another Response
          </Link>
          <Link
            href="/"
            style={{
              color: '#666',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: SuccessPageProps) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);

  return {
    title: `Success - ${form?.name || 'Form Submitted'}`,
    description: 'Your form submission was successful.',
  };
}
