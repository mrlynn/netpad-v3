import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getNextReleaseVersionSuggestion } from '@/lib/platform/applicationReleases';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const suggestedVersion = await getNextReleaseVersionSuggestion(orgId, applicationId);

    return NextResponse.json({
      success: true,
      suggestedVersion,
    });
  } catch (error) {
    console.error('[API] Failed to get next release version suggestion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get suggested version' },
      { status: 500 }
    );
  }
}

