/**
 * Organization Referrals API
 *
 * GET /api/organizations/[orgId]/referrals - List referrals made by this org
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { isFeatureAvailable } from '@/lib/extensions';
import {
  getReferralsCollection,
  getOrganizationsCollection,
} from '@/lib/platform/db';

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get referrals from database
    const referralsCollection = await getReferralsCollection();
    const orgsCollection = await getOrganizationsCollection();

    const query: Record<string, unknown> = { referrerOrgId: orgId };
    if (status) {
      query.status = status;
    }

    const referrals = await referralsCollection
      .find(query)
      .sort({ attributedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await referralsCollection.countDocuments(query);

    // Enrich with referred org names (masked for privacy)
    const enrichedReferrals = await Promise.all(
      referrals.map(async (r) => {
        const referredOrg = await orgsCollection.findOne({ orgId: r.referredOrgId });
        const orgName = referredOrg?.name || 'Unknown';
        // Mask the org name for privacy
        const maskedName = orgName.length > 3
          ? `${orgName.substring(0, 3)}***`
          : `${orgName[0]}***`;

        return {
          referralId: r.referralId,
          status: r.status,
          paymentCount: r.paymentCount,
          attributedAt: r.attributedAt,
          qualifiedAt: r.qualifiedAt,
          churnedAt: r.churnedAt,
          referredOrgName: maskedName,
        };
      })
    );

    return NextResponse.json({
      referrals: enrichedReferrals,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Referral API] List referrals error:', error);
    return NextResponse.json(
      { error: 'Failed to list referrals' },
      { status: 500 }
    );
  }
}
