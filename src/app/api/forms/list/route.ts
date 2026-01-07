import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const projectId = searchParams.get('projectId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId query parameter is required' }, { status: 400 });
    }

    // Check permissions
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get forms collection for the organization
    const formsCollection = await getOrgFormsCollection(orgId);

    // Build query
    const query: Record<string, any> = {};
    
    // Filter by projectId if provided
    if (projectId) {
      query.projectId = projectId;
    }

    // Fetch forms
    const forms = await formsCollection
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    // Return list of forms (without full field configs for performance)
    const formList = forms.map((form: any) => ({
      id: form.formId || form.id,
      name: form.name,
      description: form.description,
      collection: form.collection,
      database: form.database,
      slug: form.slug,
      isPublished: form.isPublished,
      publishedAt: form.publishedAt,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      fieldCount: form.fieldConfigs?.length || 0,
      thumbnailUrl: form.thumbnailUrl,
      projectId: form.projectId,
    }));

    return NextResponse.json({
      success: true,
      forms: formList,
    });
  } catch (error: any) {
    console.error('Error listing forms:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list forms' },
      { status: 500 }
    );
  }
}
