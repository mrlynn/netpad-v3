/**
 * Form Move API
 *
 * POST /api/forms/[formId]/move - Move a form to a different application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const { orgId, targetApplicationId } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    if (!targetApplicationId) {
      return NextResponse.json(
        { error: 'Target application ID is required' },
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

    // Find the form
    const form = await formsCollection.findOne({
      $or: [{ formId }, { id: formId }],
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Don't allow moving to the same application
    if (form.applicationId === targetApplicationId) {
      return NextResponse.json(
        { error: 'Form is already in this application' },
        { status: 400 }
      );
    }

    const previousApplicationId = form.applicationId;

    // Update the form's applicationId
    const result = await formsCollection.updateOne(
      { $or: [{ formId }, { id: formId }] },
      {
        $set: {
          applicationId: targetApplicationId,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to move form' },
        { status: 500 }
      );
    }

    console.log('[Form Move API] Form moved:', {
      formId,
      from: previousApplicationId,
      to: targetApplicationId,
      movedBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      formId,
      previousApplicationId,
      newApplicationId: targetApplicationId,
    });
  } catch (error) {
    console.error('[Form Move API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to move form' },
      { status: 500 }
    );
  }
}
