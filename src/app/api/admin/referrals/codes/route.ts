/**
 * Admin Referral Codes API
 *
 * GET  /api/admin/referrals/codes - List all referral codes
 * POST /api/admin/referrals/codes - Create special code (influencer/partner/campaign)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getReferralService, isFeatureAvailable } from '@/lib/extensions';
import {
  getReferralCodesCollection,
  getOrganizationsCollection,
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
    const type = searchParams.get('type') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get codes from database
    const codesCollection = await getReferralCodesCollection();
    const orgsCollection = await getOrganizationsCollection();

    const query: Record<string, unknown> = {};
    if (type) {
      query.type = type;
    }

    const codes = await codesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await codesCollection.countDocuments(query);

    // Enrich with org names
    const enrichedCodes = await Promise.all(
      codes.map(async (c) => {
        let orgName = null;
        if (c.organizationId) {
          const org = await orgsCollection.findOne({ orgId: c.organizationId });
          orgName = org?.name || 'Unknown';
        }

        return {
          code: c.code,
          type: c.type,
          organizationId: c.organizationId,
          organizationName: orgName,
          commissionRates: c.commissionRates,
          referredUserBenefits: c.referredUserBenefits || null,
          isActive: c.isActive,
          createdAt: c.createdAt,
        };
      })
    );

    return NextResponse.json({
      codes: enrichedCodes,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Admin Referrals] Error fetching codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral codes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const referralService = getReferralService();
    if (!referralService) {
      return NextResponse.json(
        { error: 'Referral service not available' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { code, organizationId, type, commissionRates, referredUserBenefits } = body;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    const validTypes = ['influencer', 'partner', 'campaign'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Type must be influencer, partner, or campaign' },
        { status: 400 }
      );
    }

    // Default commission rates based on type if not provided
    const defaultRates: Record<string, { year1: number; year2: number; year3: number; yearN: number }> = {
      influencer: { year1: 0.25, year2: 0.20, year3: 0.15, yearN: 0.10 },
      partner: { year1: 0.30, year2: 0.25, year3: 0.20, yearN: 0.15 },
      campaign: { year1: 0.20, year2: 0.15, year3: 0.10, yearN: 0.10 },
    };

    const finalRates = commissionRates || defaultRates[type];

    // Validate rates if provided
    if (commissionRates) {
      const rates = [commissionRates.year1, commissionRates.year2, commissionRates.year3, commissionRates.yearN];
      if (rates.some(r => typeof r !== 'number' || r < 0 || r > 1)) {
        return NextResponse.json(
          { error: 'Commission rates must be numbers between 0 and 1 (e.g., 0.20 for 20%)' },
          { status: 400 }
        );
      }
    }

    // Validate referred user benefits if provided
    if (referredUserBenefits) {
      const { discountPercent, discountPayments, creditAmountCents, trialExtensionDays, featureUnlocks, featureUnlockDays } = referredUserBenefits;

      if (discountPercent !== undefined && (typeof discountPercent !== 'number' || discountPercent < 0 || discountPercent > 1)) {
        return NextResponse.json(
          { error: 'discountPercent must be a number between 0 and 1 (e.g., 0.10 for 10%)' },
          { status: 400 }
        );
      }

      if (discountPayments !== undefined && (typeof discountPayments !== 'number' || discountPayments < 1)) {
        return NextResponse.json(
          { error: 'discountPayments must be a positive number' },
          { status: 400 }
        );
      }

      if (creditAmountCents !== undefined && (typeof creditAmountCents !== 'number' || creditAmountCents < 0)) {
        return NextResponse.json(
          { error: 'creditAmountCents must be a non-negative number' },
          { status: 400 }
        );
      }

      if (trialExtensionDays !== undefined && (typeof trialExtensionDays !== 'number' || trialExtensionDays < 0)) {
        return NextResponse.json(
          { error: 'trialExtensionDays must be a non-negative number' },
          { status: 400 }
        );
      }

      if (featureUnlocks !== undefined && !Array.isArray(featureUnlocks)) {
        return NextResponse.json(
          { error: 'featureUnlocks must be an array of feature names' },
          { status: 400 }
        );
      }

      if (featureUnlockDays !== undefined && (typeof featureUnlockDays !== 'number' || featureUnlockDays < 0)) {
        return NextResponse.json(
          { error: 'featureUnlockDays must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    try {
      const result = await referralService.createSpecialCode({
        code,
        organizationId: organizationId || undefined,
        type,
        commissionRates: finalRates,
        referredUserBenefits: referredUserBenefits || undefined,
      });

      return NextResponse.json({
        success: true,
        code: result.code,
        message: `Special ${type} code created`,
      });
    } catch (err) {
      const error = err as Error;
      return NextResponse.json(
        { error: error.message || 'Failed to create code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Admin Referrals] Error creating code:', error);
    return NextResponse.json(
      { error: 'Failed to create referral code' },
      { status: 500 }
    );
  }
}
