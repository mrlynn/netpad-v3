/**
 * Form API Endpoint
 *
 * GET /api/forms/[slug]
 * Returns form configuration by slug for rendering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFormBySlug } from '@/lib/bundle';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Form slug is required' },
        { status: 400 }
      );
    }

    const form = await getFormBySlug(slug);

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Return form configuration (exclude sensitive fields if any)
    return NextResponse.json({
      success: true,
      form: {
        name: form.name,
        description: form.description,
        slug: form.slug,
        fieldConfigs: form.fieldConfigs,
        theme: form.theme,
        branding: form.branding,
        multiPage: form.multiPage,
        botProtection: form.botProtection ? {
          honeypot: form.botProtection.honeypot,
          timing: form.botProtection.timing,
          // Don't expose turnstile secret
          turnstile: form.botProtection.turnstile?.enabled
            ? { enabled: true }
            : undefined,
        } : undefined,
      },
    });
  } catch (error) {
    console.error('[Form API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load form',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
