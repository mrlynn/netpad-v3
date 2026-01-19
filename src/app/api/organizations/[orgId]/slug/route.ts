/**
 * Organization Slug API
 *
 * GET   /api/organizations/[orgId]/slug?check=new-slug - Check slug availability
 * PATCH /api/organizations/[orgId]/slug - Update organization slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrganization, getOrganizationBySlug } from '@/lib/platform/organizations';
import { getOrganizationsCollection } from '@/lib/platform/db';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { validateSlug, canChangeSlug } from '@/lib/slugs';

const SLUG_COOLDOWN_DAYS = 30;

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

    // Get slug to check from query params
    const { searchParams } = new URL(request.url);
    const slugToCheck = searchParams.get('check');

    if (!slugToCheck) {
      return NextResponse.json(
        { error: 'Missing "check" query parameter' },
        { status: 400 }
      );
    }

    // Validate slug format
    const validation = validateSlug(slugToCheck);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        error: validation.error,
      });
    }

    // Get current org to check if it's the same slug
    const currentOrg = await getOrganization(orgId);
    if (!currentOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // If checking the org's current slug, it's "available" for this org
    if (currentOrg.slug === slugToCheck) {
      return NextResponse.json({
        available: true,
        isCurrentSlug: true,
      });
    }

    // Check if slug is taken by another org
    const existingOrg = await getOrganizationBySlug(slugToCheck);
    const available = !existingOrg;

    return NextResponse.json({
      available,
      isCurrentSlug: false,
    });
  } catch (error) {
    console.error('[Org Slug API] Check error:', error);
    return NextResponse.json(
      { error: 'Failed to check slug availability' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check admin permission
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_org');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get current org
    const currentOrg = await getOrganization(orgId);
    if (!currentOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // If slug is unchanged, no need to update
    if (currentOrg.slug === slug) {
      return NextResponse.json({
        success: true,
        slug: currentOrg.slug,
        message: 'Slug unchanged',
      });
    }

    // Check cooldown period
    const cooldownCheck = canChangeSlug(currentOrg.slugChangedAt, SLUG_COOLDOWN_DAYS);
    if (!cooldownCheck.allowed) {
      return NextResponse.json(
        {
          error: `Slug can only be changed once every ${SLUG_COOLDOWN_DAYS} days. ${cooldownCheck.daysRemaining} days remaining.`,
        },
        { status: 429 }
      );
    }

    // Check if new slug is available
    const existingOrg = await getOrganizationBySlug(slug);
    if (existingOrg) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 409 }
      );
    }

    // Update the slug
    const collection = await getOrganizationsCollection();
    const result = await collection.updateOne(
      { orgId },
      {
        $set: {
          slug,
          slugChangedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update slug' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slug,
      previousSlug: currentOrg.slug,
    });
  } catch (error) {
    console.error('[Org Slug API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization slug' },
      { status: 500 }
    );
  }
}
