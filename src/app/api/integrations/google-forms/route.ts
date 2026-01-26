/**
 * Google Forms Integration API - List Forms
 *
 * GET /api/integrations/google-forms?orgId=xxx&credentialId=xxx
 *
 * Lists Google Forms accessible via the provided credential.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createGoogleFormsClient } from '@/lib/integrations/googleForms';
import { listUserIntegrationCredentials } from '@/lib/platform/integrationCredentials';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const credentialId = searchParams.get('credentialId');
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const pageToken = searchParams.get('pageToken') || undefined;
    const searchQuery = searchParams.get('q') || undefined;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // If no credential ID provided, list available Google Forms credentials
    if (!credentialId) {
      const credentials = await listUserIntegrationCredentials(
        orgId,
        session.userId,
        'google_forms'
      );

      return NextResponse.json({
        credentials: credentials.map((c) => ({
          credentialId: c.credentialId,
          name: c.name,
          status: c.status,
          connectedEmail: c.oauthMetadata?.connectedEmail,
          lastUsedAt: c.lastUsedAt,
        })),
      });
    }

    // Create Google Forms client
    const client = createGoogleFormsClient(orgId, credentialId);

    // List forms
    const result = await client.listForms({
      pageSize,
      pageToken,
      searchQuery,
    });

    if (!result.success) {
      console.error('[Google Forms API] List failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to list forms' },
        { status: result.error?.status || 500 }
      );
    }

    return NextResponse.json({
      forms: result.data?.forms || [],
      nextPageToken: result.data?.nextPageToken,
    });
  } catch (error) {
    console.error('[Google Forms API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
