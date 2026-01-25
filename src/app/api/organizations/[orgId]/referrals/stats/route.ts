/**
 * Organization Referral Stats API
 *
 * GET /api/organizations/[orgId]/referrals/stats - Get referral statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { getReferralService, isFeatureAvailable } from '@/lib/extensions';

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

    // Check feature availability
    const referralAvailable = isFeatureAvailable('referral_program');
    if (!referralAvailable.available) {
      return NextResponse.json(
        { error: 'Referral program is not available' },
        { status: 403 }
      );
    }

    // Check permission to view referrals
    try {
      await assertOrgPermission(session.userId, orgId, 'view_organization');
    } catch {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const referralService = getReferralService();
    if (!referralService) {
      return NextResponse.json(
        { error: 'Referral service not available' },
        { status: 503 }
      );
    }

    const stats = await referralService.getReferralStats(orgId);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[Referral API] Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get referral statistics' },
      { status: 500 }
    );
  }
}
