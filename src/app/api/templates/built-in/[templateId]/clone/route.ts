/**
 * Clone Built-in Template API
 *
 * POST /api/templates/built-in/[templateId]/clone - Clone a built-in template to an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { cloneFromBuiltIn } from '@/lib/conversational/templateService';
import {
  ensureTemplatesInitialized,
  templateRegistry,
} from '@/lib/conversational/templates';
import { TemplateCategory } from '@/types/conversational';

interface CloneRequest {
  orgId: string;
  name?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getSession();
    const { templateId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CloneRequest = await request.json();
    const { orgId, name: newName } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Ensure built-in templates are loaded
    ensureTemplatesInitialized();

    // Get the built-in template
    const builtInTemplate = templateRegistry.get(templateId);

    if (!builtInTemplate) {
      return NextResponse.json(
        { error: 'Built-in template not found' },
        { status: 404 }
      );
    }

    // Create the clone
    const clonedTemplate = await cloneFromBuiltIn(
      orgId,
      session.userId,
      templateId,
      {
        name: builtInTemplate.name,
        description: builtInTemplate.description,
        category: builtInTemplate.category as TemplateCategory,
        icon: builtInTemplate.icon,
        objective: builtInTemplate.defaultConfig.objective,
        context: builtInTemplate.defaultConfig.context,
        persona: builtInTemplate.defaultConfig.persona,
        conversationLimits: builtInTemplate.defaultConfig.conversationLimits,
        topics: builtInTemplate.defaultTopics,
        extractionSchema: builtInTemplate.defaultSchema,
        metadata: {
          previewDescription: builtInTemplate.metadata?.previewDescription,
          useCases: builtInTemplate.metadata?.useCases,
          tags: builtInTemplate.metadata?.tags,
          estimatedDuration: builtInTemplate.metadata?.estimatedDuration,
        },
      },
      newName
    );

    return NextResponse.json({
      success: true,
      template: {
        templateId: clonedTemplate.templateId,
        name: clonedTemplate.name,
        status: clonedTemplate.status,
        clonedFrom: `builtin:${templateId}`,
      },
    });
  } catch (error) {
    console.error('[Built-in Templates API] Clone error:', error);
    return NextResponse.json(
      { error: 'Failed to clone template' },
      { status: 500 }
    );
  }
}
