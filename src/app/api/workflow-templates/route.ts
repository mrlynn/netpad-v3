import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getWorkflowTemplatesCollection } from '@/lib/platform/db';
import { WorkflowTemplate } from '@/types/application';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const templatesCollection = await getWorkflowTemplatesCollection(orgId);

    // Build query
    const query: Record<string, unknown> = {};

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const templates = await templatesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('[API] Failed to list workflow templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list workflow templates' },
      { status: 500 }
    );
  }
}
