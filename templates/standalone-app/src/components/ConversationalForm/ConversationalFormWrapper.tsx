'use client';

/**
 * Conversational Form Wrapper
 *
 * Client component wrapper for ConversationalFormChat.
 * Handles the client-side rendering and submission logic.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationalFormChat } from './ConversationalFormChat';
import { ConversationalFormConfig, ConversationState } from '@/types/conversational';

interface ConversationalFormWrapperProps {
  formSlug: string;
  config: ConversationalFormConfig;
}

export function ConversationalFormWrapper({ formSlug, config }: ConversationalFormWrapperProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = async (
    extractedData: Record<string, any>,
    conversationState: ConversationState
  ) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Submit the extracted data as a form submission
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug,
          data: extractedData,
          metadata: {
            conversationId: conversationState.conversationId,
            turnCount: conversationState.turnCount,
            confidence: conversationState.confidence,
            submittedAt: new Date().toISOString(),
            isConversational: true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit');
      }

      const result = await response.json();
      setIsComplete(true);

      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push(`/forms/${formSlug}/success?id=${result.submissionId}`);
      }, 1500);
    } catch (error: any) {
      console.error('Submission error:', error);
      setSubmitError(error.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#d4edda',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <svg
            width="32"
            height="32"
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
        <h2 style={{ marginBottom: '0.5rem', color: '#155724' }}>Thank You!</h2>
        <p style={{ color: '#666' }}>Your submission has been received.</p>
        <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '1rem' }}>
          Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div>
      {submitError && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#721c24',
          }}
        >
          <strong>Error:</strong> {submitError}
        </div>
      )}

      {isSubmitting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '8px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #00ED64',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ color: '#666' }}>Submitting...</p>
          </div>
        </div>
      )}

      <ConversationalFormChat formSlug={formSlug} config={config} onComplete={handleComplete} />

      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
