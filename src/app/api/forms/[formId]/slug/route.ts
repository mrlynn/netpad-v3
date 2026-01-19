/**
 * Form Slug API
 *
 * GET   /api/forms/[formId]/slug?check=new-slug&orgId=org_xxx - Check slug availability within org
 * PATCH /api/forms/[formId]/slug - Update form slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { validateSlug, generateSlug, generateUniqueSlug } from '@/lib/slugs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await getSession();
    const { formId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slugToCheck = searchParams.get('check');
    const orgId = searchParams.get('orgId');

    if (!slugToCheck) {
      return NextResponse.json(
        { error: 'Missing "check" query parameter' },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing "orgId" query parameter' },
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

    // Get forms collection for this org
    const formsCollection = await getOrgFormsCollection(orgId);

    // Get current form to check if it's the same slug
    const currentForm = await formsCollection.findOne({
      $or: [{ formId }, { id: formId }],
    });

    if (!currentForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // If checking the form's current slug, it's "available" for this form
    if (currentForm.slug === slugToCheck) {
      return NextResponse.json({
        available: true,
        isCurrentSlug: true,
      });
    }

    // Check if slug is taken by another form in the same org
    const existingForm = await formsCollection.findOne({
      organizationId: orgId,
      slug: slugToCheck,
    });

    const available = !existingForm;

    return NextResponse.json({
      available,
      isCurrentSlug: false,
    });
  } catch (error) {
    console.error('[Form Slug API] Check error:', error);
    return NextResponse.json(
      { error: 'Failed to check slug availability' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await getSession();
    const { formId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { slug, orgId } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check user has permission in this org
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get forms collection for this org
    const formsCollection = await getOrgFormsCollection(orgId);

    // Get current form
    const currentForm = await formsCollection.findOne({
      $or: [{ formId }, { id: formId }],
    });

    if (!currentForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    let newSlug = slug;

    // If no slug provided, generate one from the form name
    if (!newSlug) {
      const baseSlug = generateSlug(currentForm.name || 'form');

      // Get all existing slugs in this org
      const existingForms = await formsCollection
        .find({ organizationId: orgId }, { projection: { slug: 1 } })
        .toArray();
      const existingSlugs = new Set(existingForms.map((f) => f.slug).filter(Boolean));

      // Generate unique slug
      newSlug = generateUniqueSlug(baseSlug, existingSlugs);
    }

    // Validate slug format
    const validation = validateSlug(newSlug);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // If slug is unchanged, no need to update
    if (currentForm.slug === newSlug) {
      return NextResponse.json({
        success: true,
        slug: currentForm.slug,
        message: 'Slug unchanged',
      });
    }

    // Check if new slug is available within this org
    const existingForm = await formsCollection.findOne({
      organizationId: orgId,
      slug: newSlug,
      // Exclude current form
      $and: [
        { formId: { $ne: currentForm.formId } },
        { id: { $ne: currentForm.id } },
      ],
    });

    if (existingForm) {
      return NextResponse.json(
        { error: 'This slug is already taken in your organization' },
        { status: 409 }
      );
    }

    // Update the slug
    const result = await formsCollection.updateOne(
      { $or: [{ formId }, { id: formId }] },
      {
        $set: {
          slug: newSlug,
          updatedAt: new Date().toISOString(),
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
      slug: newSlug,
      previousSlug: currentForm.slug,
    });
  } catch (error) {
    console.error('[Form Slug API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update form slug' },
      { status: 500 }
    );
  }
}
