/**
 * Batch Form Stats API
 *
 * GET /api/forms/batch-stats?formIds=id1,id2,id3&orgId=xxx
 *
 * Returns response counts for multiple forms in a single request,
 * eliminating N+1 query issues when loading form lists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getClient } from '@/lib/mongodb/clientCache';
import { getGlobalSubmissionsForForm } from '@/lib/storage';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'form_builder';

export const dynamic = 'force-dynamic';

interface FormStats {
  formId: string;
  total: number;
  submitted: number;
  draft: number;
  incomplete: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const formIdsParam = searchParams.get('formIds');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId query parameter is required' }, { status: 400 });
    }

    if (!formIdsParam) {
      return NextResponse.json({ error: 'formIds query parameter is required' }, { status: 400 });
    }

    // Check permissions
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const formIds = formIdsParam.split(',').filter(id => id.trim());

    if (formIds.length === 0) {
      return NextResponse.json({ success: true, stats: {} });
    }

    // Limit to prevent abuse
    if (formIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 form IDs allowed per request' },
        { status: 400 }
      );
    }

    // Initialize stats map
    const statsMap: Record<string, FormStats> = {};
    for (const formId of formIds) {
      statsMap[formId] = {
        formId,
        total: 0,
        submitted: 0,
        draft: 0,
        incomplete: 0,
      };
    }

    // Get counts from global_submissions (file storage) for each form
    // This is done in parallel for better performance
    await Promise.all(
      formIds.map(async (formId) => {
        try {
          const submissions = await getGlobalSubmissionsForForm(formId);
          for (const sub of submissions) {
            statsMap[formId].total++;
            if (sub.status === 'submitted') {
              statsMap[formId].submitted++;
            } else if (sub.status === 'draft') {
              statsMap[formId].draft++;
            } else if (sub.status === 'incomplete') {
              statsMap[formId].incomplete++;
            }
          }
        } catch (err) {
          // Silently continue if global submissions fails for a form
          console.error(`Error getting global submissions for form ${formId}:`, err);
        }
      })
    );

    // Get counts from MongoDB form_responses collection using aggregation (pooled connection)
    // This is a single query for all forms
    if (MONGODB_URI) {
      try {
        const client = await getClient(MONGODB_URI);
        const db = client.db(MONGODB_DATABASE);
        const collection = db.collection('form_responses');

        // Aggregate counts by formId and status in a single query
        const pipeline = [
          {
            $match: {
              formId: { $in: formIds }
            }
          },
          {
            $group: {
              _id: {
                formId: '$formId',
                status: '$status'
              },
              count: { $sum: 1 }
            }
          }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        // Process aggregation results
        for (const result of results) {
          const formId = result._id.formId;
          const status = result._id.status;
          const count = result.count;

          if (statsMap[formId]) {
            statsMap[formId].total += count;
            if (status === 'submitted') {
              statsMap[formId].submitted += count;
            } else if (status === 'draft') {
              statsMap[formId].draft += count;
            } else if (status === 'incomplete') {
              statsMap[formId].incomplete += count;
            }
          }
        }
        // Note: Don't close the client - it's managed by the cache
      } catch (err) {
        console.error('Error aggregating form response stats:', err);
        // Continue with partial data from global_submissions
      }
    }

    return NextResponse.json({
      success: true,
      stats: statsMap,
    });
  } catch (error: any) {
    console.error('Error fetching batch form stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch form stats' },
      { status: 500 }
    );
  }
}
