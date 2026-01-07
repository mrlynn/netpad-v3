/**
 * Publish Template API
 *
 * POST /api/organizations/[orgId]/templates/[templateId]/publish - Publish template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { publishTemplate } from '@/lib/conversational/templateService';

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

    // Check permission - admin access required
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const template = await publishTemplate(orgId, templateId, session.userId);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        templateId: template.templateId,
        name: template.name,
        status: template.status,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Templates API] Publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish template' },
      { status: 500 }
    );
  }
}
