/**
 * Single Template API
 *
 * GET    /api/organizations/[orgId]/templates/[templateId] - Get template
 * PATCH  /api/organizations/[orgId]/templates/[templateId] - Update template
 * DELETE /api/organizations/[orgId]/templates/[templateId] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
  validateTemplate,
} from '@/lib/conversational/templateService';
import { UpdateTemplateRequest } from '@/types/conversational';

export async function GET(
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

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'use_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const template = await getTemplate(orgId, templateId);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('[Templates API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check permission - admin access required for editing templates
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body: UpdateTemplateRequest = await request.json();

    // Validate request
    const validation = validateTemplate(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const template = await updateTemplate(orgId, templateId, session.userId, body);

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
    console.error('[Templates API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check permission - admin access required for deleting templates
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const deleted = await deleteTemplate(orgId, templateId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Templates API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
