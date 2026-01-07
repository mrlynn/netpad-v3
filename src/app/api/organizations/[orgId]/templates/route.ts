/**
 * Conversational Templates API
 *
 * GET  /api/organizations/[orgId]/templates - List templates
 * POST /api/organizations/[orgId]/templates - Create template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import {
  createTemplate,
  listTemplates,
  validateTemplate,
  getTemplateCategoryCounts,
} from '@/lib/conversational/templateService';
import {
  CreateTemplateRequest,
  StoredTemplateQueryOptions,
  TemplateCategory,
  TemplateStatus,
  TemplateScope,
} from '@/types/conversational';

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

    // Check permission - users need at least view access to the org
    try {
      await assertOrgPermission(session.userId, orgId, 'use_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Parse query options from URL params
    const { searchParams } = new URL(request.url);

    const options: StoredTemplateQueryOptions = {
      category: searchParams.get('category') as TemplateCategory | undefined,
      status: searchParams.get('status') as TemplateStatus | undefined,
      scope: searchParams.get('scope') as TemplateScope | undefined,
      includeDisabled: searchParams.get('includeDisabled') === 'true',
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      sortBy: (searchParams.get('sortBy') as StoredTemplateQueryOptions['sortBy']) || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : undefined,
    };

    // Check if they want category counts
    if (searchParams.get('counts') === 'true') {
      const counts = await getTemplateCategoryCounts(orgId);
      return NextResponse.json({ counts });
    }

    const result = await listTemplates(orgId, options);

    return NextResponse.json({
      templates: result.templates,
      total: result.total,
      offset: options.offset || 0,
      limit: options.limit || 50,
    });
  } catch (error) {
    console.error('[Templates API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Check permission - users need admin access to create templates
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body: CreateTemplateRequest = await request.json();

    // Validate request
    const validation = validateTemplate(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Validate required fields for create
    if (!body.name || !body.description || !body.category) {
      return NextResponse.json(
        { error: 'Name, description, and category are required' },
        { status: 400 }
      );
    }

    if (!body.promptConfig || !body.defaultConfig) {
      return NextResponse.json(
        { error: 'promptConfig and defaultConfig are required' },
        { status: 400 }
      );
    }

    if (!body.topics || body.topics.length === 0) {
      return NextResponse.json(
        { error: 'At least one topic is required' },
        { status: 400 }
      );
    }

    if (!body.extractionSchema || body.extractionSchema.length === 0) {
      return NextResponse.json(
        { error: 'At least one extraction field is required' },
        { status: 400 }
      );
    }

    const template = await createTemplate(orgId, session.userId, body);

    return NextResponse.json({
      success: true,
      template: {
        templateId: template.templateId,
        name: template.name,
        status: template.status,
      },
    });
  } catch (error) {
    console.error('[Templates API] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
