/**
 * Admin Referrals API
 *
 * GET /api/admin/referrals - List all referrals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { isFeatureAvailable } from '@/lib/extensions';
import {
  getReferralsCollection,
  getOrganizationsCollection,
  getReferralCodesCollection,
} from '@/lib/platform/db';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permission
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get referrals from database
    const referralsCollection = await getReferralsCollection();
    const orgsCollection = await getOrganizationsCollection();
    const codesCollection = await getReferralCodesCollection();

    const query: Record<string, unknown> = {};
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

    // Enrich with org names
    const enrichedReferrals = await Promise.all(
      referrals.map(async (r) => {
        const referrerOrg = await orgsCollection.findOne({ orgId: r.referrerOrgId });
        const referredOrg = await orgsCollection.findOne({ orgId: r.referredOrgId });
        const code = await codesCollection.findOne({ code: r.referralCodeId });

        return {
          referralId: r.referralId,
          referrerOrgId: r.referrerOrgId,
          referrerOrgName: referrerOrg?.name || 'Unknown',
          referredOrgId: r.referredOrgId,
          referredOrgName: referredOrg?.name || 'Unknown',
          referralCode: r.referralCodeId,
          codeType: code?.type || 'standard',
          status: r.status,
          paymentCount: r.paymentCount,
          attributedAt: r.attributedAt,
          qualifiedAt: r.qualifiedAt,
          churnedAt: r.churnedAt,
          attribution: r.attribution,
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
    console.error('[Admin Referrals] Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}
