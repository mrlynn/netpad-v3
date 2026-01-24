import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getClient } from '@/lib/mongodb/clientCache';
import { getGlobalSubmissionsForForm } from '@/lib/storage';
import { withMetrics } from '@/lib/api/metricsMiddleware';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'form_builder';

export const dynamic = 'force-dynamic';

export const GET = withMetrics(async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const applicationId = searchParams.get('applicationId'); // Phase 2: Filter by application

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

    // Phase 2: Filter by applicationId if provided
    if (applicationId) {
      query.applicationId = applicationId;
    }

    // Fetch forms
    const forms = await formsCollection
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    // Check if response counts are requested (default: true for backwards compatibility)
    const includeStats = searchParams.get('includeStats') !== 'false';

    // Build initial form list (without full field configs for performance)
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
      applicationId: form.applicationId,
      responseCount: 0, // Will be populated below if includeStats=true
    }));

    // Get response counts for all forms in batch (if requested)
    if (includeStats && formList.length > 0) {
      const formIds = formList.map((f) => f.id);
      const responseCountMap: Record<string, number> = {};

      // Initialize counts
      for (const formId of formIds) {
        responseCountMap[formId] = 0;
      }

      // Get counts from global_submissions in parallel
      await Promise.all(
        formIds.map(async (formId) => {
          try {
            const submissions = await getGlobalSubmissionsForForm(formId);
            responseCountMap[formId] += submissions.length;
          } catch {
            // Silently continue
          }
        })
      );

      // Get counts from MongoDB form_responses using aggregation (pooled connection)
      if (MONGODB_URI) {
        try {
          const client = await getClient(MONGODB_URI);
          const db = client.db(MONGODB_DATABASE);
          const collection = db.collection('form_responses');

          const pipeline = [
            { $match: { formId: { $in: formIds } } },
            { $group: { _id: '$formId', count: { $sum: 1 } } },
          ];

          const results = await collection.aggregate(pipeline).toArray();
          for (const result of results) {
            if (responseCountMap[result._id] !== undefined) {
              responseCountMap[result._id] += result.count;
            }
          }
          // Note: Don't close the client - it's managed by the cache
        } catch (err) {
          console.error('Error aggregating response counts:', err);
        }
      }

      // Apply counts to form list
      for (const form of formList) {
        form.responseCount = responseCountMap[form.id] || 0;
      }
    }

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
});
