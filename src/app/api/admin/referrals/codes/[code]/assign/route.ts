/**
 * Admin Code Assignment API
 *
 * POST /api/admin/referrals/codes/[code]/assign - Assign a code to an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { isFeatureAvailable } from '@/lib/extensions';
import {
  getReferralCodesCollection,
  getOrganizationsCollection,
} from '@/lib/platform/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getSession();
    const { code } = await params;

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

    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const codesCollection = await getReferralCodesCollection();
    const orgsCollection = await getOrganizationsCollection();

    // Check if code exists
    const existingCode = await codesCollection.findOne({ code: code.toUpperCase() });
    if (!existingCode) {
      return NextResponse.json(
        { error: 'Code not found' },
        { status: 404 }
      );
    }

    // Check if code is already assigned
    if (existingCode.organizationId) {
      return NextResponse.json(
        { error: 'Code is already assigned to an organization' },
        { status: 400 }
      );
    }

    // Check if organization exists
    const org = await orgsCollection.findOne({ orgId: organizationId });
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization already has a code
    const existingOrgCode = await codesCollection.findOne({ organizationId });
    if (existingOrgCode) {
      return NextResponse.json(
        { error: `Organization already has code: ${existingOrgCode.code}` },
        { status: 400 }
      );
    }

    // Assign the code
    await codesCollection.updateOne(
      { code: code.toUpperCase() },
      {
        $set: {
          organizationId,
          assignedAt: new Date(),
          assignedBy: session.userId,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Code ${code.toUpperCase()} assigned to ${org.name}`,
    });
  } catch (error) {
    console.error('[Admin Referrals] Error assigning code:', error);
    return NextResponse.json(
      { error: 'Failed to assign code' },
      { status: 500 }
    );
  }
}
