/**
 * Check Form Slug Availability API
 *
 * GET /api/forms/check-slug?slug=my-form&orgId=org_xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { validateSlug } from '@/lib/slugs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const orgId = searchParams.get('orgId');
    const formId = searchParams.get('formId'); // Optional: exclude current form

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing "slug" query parameter' },
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
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        error: validation.error,
      });
    }

    // Check if slug is taken in this org
    const formsCollection = await getOrgFormsCollection(orgId);

    const query: any = {
      organizationId: orgId,
      slug,
    };

    // Exclude current form if formId provided
    if (formId) {
      query.$and = [
        { formId: { $ne: formId } },
        { id: { $ne: formId } },
      ];
    }

    const existingForm = await formsCollection.findOne(query);

    return NextResponse.json({
      available: !existingForm,
      isCurrentSlug: false,
    });
  } catch (error) {
    console.error('[Check Slug API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check slug availability' },
      { status: 500 }
    );
  }
}
