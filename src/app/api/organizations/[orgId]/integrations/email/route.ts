/**
 * Email Integration Credentials API
 *
 * GET /api/organizations/[orgId]/integrations/email - List email credentials (SMTP and SendGrid)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listEmailCredentials } from '@/lib/platform/integrationCredentials';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // List email credentials (SMTP and SendGrid) for this organization
    const credentials = await listEmailCredentials(orgId);

    // Map to response format with fromEmail extracted from metadata
    const response = credentials.map((c) => {
      // Try to get fromEmail from metadata (we store it there during creation)
      let fromEmail: string | undefined;

      // For display purposes, we can show basic info about the credential
      // The actual credentials are encrypted and not returned
      return {
        credentialId: c.credentialId,
        provider: c.provider,
        name: c.name,
        description: c.description,
        status: c.status,
        fromEmail,
        lastUsedAt: c.lastUsedAt,
        usageCount: c.usageCount,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      credentials: response,
    });
  } catch (error) {
    console.error('[Email Integrations API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list email credentials' },
      { status: 500 }
    );
  }
}
