import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/slack/install
 * Installation page that redirects to OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!session.userId) {
      // Redirect to login
      return NextResponse.redirect(new URL('/login?redirect=/integrations/slack/install', request.url));
    }

    if (!organizationId) {
      // Organization ID is required as a query parameter
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Redirect to OAuth initiation
    const oauthUrl = new URL('/api/integrations/slack/oauth', request.url);
    oauthUrl.searchParams.set('organizationId', organizationId);

    return NextResponse.redirect(oauthUrl.toString());
  } catch (error: any) {
    console.error('[Slack Install] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate installation' },
      { status: 500 }
    );
  }
}
