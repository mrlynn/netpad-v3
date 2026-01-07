/**
 * Built-in Templates API
 *
 * GET /api/templates/built-in - List built-in (platform) templates
 *
 * This endpoint returns templates that are bundled with the platform.
 * These templates are read-only and cannot be modified.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  ensureTemplatesInitialized,
  templateRegistry,
} from '@/lib/conversational/templates';
import { TemplateListItem, TemplateCategory } from '@/types/conversational';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure built-in templates are loaded
    ensureTemplatesInitialized();

    // Get all built-in templates from the registry
    const templates = templateRegistry.getAll({ builtInOnly: true });

    // Convert to list items format
    const listItems: TemplateListItem[] = templates.map((t) => ({
      templateId: t.id,
      name: t.name,
      description: t.description,
      category: t.category as TemplateCategory,
      icon: t.icon,
      status: 'published' as const, // Built-in templates are always published
      scope: 'platform' as const,
      enabled: true,
      priority: 100, // High priority for built-ins
      topicCount: t.defaultTopics.length,
      fieldCount: t.defaultSchema.length,
      createdAt: t.metadata?.updatedAt || new Date(),
      updatedAt: t.metadata?.updatedAt || new Date(),
      createdBy: t.metadata?.author || 'NetPad',
    }));

    return NextResponse.json({
      templates: listItems,
      total: listItems.length,
    });
  } catch (error) {
    console.error('[Built-in Templates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch built-in templates' },
      { status: 500 }
    );
  }
}
