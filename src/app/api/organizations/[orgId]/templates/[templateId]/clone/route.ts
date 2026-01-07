/**
 * Clone Template API
 *
 * POST /api/organizations/[orgId]/templates/[templateId]/clone - Clone template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { cloneTemplate } from '@/lib/conversational/templateService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId, templateId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission - admin access required for cloning templates
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get optional new name from request body
    let newName: string | undefined;
    try {
      const body = await request.json();
      newName = body.name;
    } catch {
      // No body or invalid JSON - that's fine, we'll use default name
    }

    const result = await cloneTemplate(orgId, templateId, session.userId, newName);

    if (!result) {
      return NextResponse.json(
        { error: 'Source template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        templateId: result.template.templateId,
        name: result.template.name,
        status: result.template.status,
        clonedFrom: result.sourceTemplateId,
      },
    });
  } catch (error) {
    console.error('[Templates API] Clone error:', error);
    return NextResponse.json(
      { error: 'Failed to clone template' },
      { status: 500 }
    );
  }
}
