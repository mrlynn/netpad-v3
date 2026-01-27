/**
 * Organization Referral Code API
 *
 * GET  /api/organizations/[orgId]/referrals/code - Get referral code
 * POST /api/organizations/[orgId]/referrals/code - Create/customize code
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

    // Get or create referral code
    let codeInfo = await referralService.getReferralCode(orgId);

    if (!codeInfo) {
      // Auto-create standard code for organization
      const result = await referralService.createReferralCode({
        organizationId: orgId,
        type: 'standard',
      });
      codeInfo = await referralService.getReferralCode(orgId);
    }

    return NextResponse.json({ code: codeInfo });
  } catch (error) {
    console.error('[Referral API] Get code error:', error);
    return NextResponse.json(
      { error: 'Failed to get referral code' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Check permission to manage organization (admin required)
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_organization');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required' },
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

    const body = await request.json();
    const { customCode } = body;

    if (customCode) {
      // Customize existing code
      const result = await referralService.customizeCode(orgId, customCode);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to customize code' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        code: result.code,
        message: 'Referral code updated',
      });
    } else {
      // Create new code
      const result = await referralService.createReferralCode({
        organizationId: orgId,
        type: 'standard',
      });

      return NextResponse.json({
        success: true,
        code: result.code,
        shareUrl: result.shareUrl,
        message: 'Referral code created',
      });
    }
  } catch (error) {
    console.error('[Referral API] Create/update code error:', error);
    return NextResponse.json(
      { error: 'Failed to manage referral code' },
      { status: 500 }
    );
  }
}
