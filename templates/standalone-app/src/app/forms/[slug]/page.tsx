/**
 * Form Rendering Page
 *
 * Displays and handles submission of a form by slug.
 * Supports both standard forms and conversational (AI-powered) forms.
 */

import { notFound } from 'next/navigation';
import { getFormBySlug } from '@/lib/bundle';
import { FormRenderer } from '@/components/FormRenderer';
import { ConversationalFormWrapper } from '@/components/ConversationalForm/ConversationalFormWrapper';
import { isAIConfigured } from '@/lib/ai/providers';

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

  // Check if this is a conversational form
  const isConversational = !!form.conversationalConfig;
  const aiConfigured = isAIConfigured();

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: isConversational ? '800px' : '640px', margin: '0 auto' }}>
        {/* Form Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{form.name}</h1>
          {form.description && (
            <p style={{ color: 'var(--muted)' }}>{form.description}</p>
          )}
          {isConversational && (
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                color: '#00ED64',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
              }}
            >
              <span>✨</span> AI-Powered Conversation
            </p>
          )}
        </header>

        {/* Form or Conversational Interface */}
        <div className="card animate-fadeIn">
          {isConversational ? (
            aiConfigured ? (
              <ConversationalFormWrapper
                formSlug={slug}
                config={form.conversationalConfig!}
              />
            ) : (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#fff3cd',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                }}
              >
                <h3 style={{ marginBottom: '1rem', color: '#856404' }}>
                  AI Configuration Required
                </h3>
                <p style={{ color: '#856404', marginBottom: '1rem' }}>
                  This form uses AI-powered conversations, but the OpenAI API key is not configured.
                </p>
                <p style={{ fontSize: '0.875rem', color: '#856404' }}>
                  Please set the <code>OPENAI_API_KEY</code> environment variable to enable
                  conversational forms.
                </p>
              </div>
            )
          ) : (
            <FormRenderer form={form} />
          )}
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
