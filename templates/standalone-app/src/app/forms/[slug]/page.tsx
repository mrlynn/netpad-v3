/**
 * Form Rendering Page
 *
 * Displays and handles submission of a form by slug.
 */

import { notFound } from 'next/navigation';
import { getFormBySlug } from '@/lib/bundle';
import { FormRenderer } from '@/components/FormRenderer';

export const dynamic = 'force-dynamic';

interface FormPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FormPage({ params }: FormPageProps) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);

  if (!form) {
    notFound();
  }

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Form Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{form.name}</h1>
          {form.description && (
            <p style={{ color: 'var(--muted)' }}>{form.description}</p>
          )}
        </header>

        {/* Form */}
        <div className="card animate-fadeIn">
          <FormRenderer form={form} />
        </div>

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: FormPageProps) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);

  if (!form) {
    return { title: 'Form Not Found' };
  }

  return {
    title: form.name,
    description: form.description || `Fill out the ${form.name} form`,
  };
}
