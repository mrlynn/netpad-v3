/**
 * Organization Referral Earnings API
 *
 * GET /api/organizations/[orgId]/referrals/earnings - Get earnings list
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { getReferralService, isFeatureAvailable } from '@/lib/extensions';

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

    // Check feature availability
    const referralAvailable = isFeatureAvailable('referral_commissions');
    if (!referralAvailable.available) {
      return NextResponse.json(
        { error: 'Referral commissions are not available' },
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const earnings = await referralService.getEarnings(orgId, {
      status,
      limit,
      offset,
    });

    // Also get available balance
    const balance = await referralService.getAvailableBalance(orgId);

    return NextResponse.json({
      earnings: earnings.earnings,
      total: earnings.total,
      availableBalance: balance,
    });
  } catch (error) {
    console.error('[Referral API] Get earnings error:', error);
    return NextResponse.json(
      { error: 'Failed to get earnings' },
      { status: 500 }
    );
  }
}
