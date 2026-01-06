import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { MongoClient } from 'mongodb';
import { getForms, getPublishedFormById, getPublishedFormBySlug } from '@/lib/storage';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';

/**
 * Distinct Values API
 *
 * Fetches unique values for a field from a MongoDB collection,
 * optionally with counts. Ideal for populating search form dropdowns
 * with actual data values.
 *
 * This enables "smart dropdowns" that:
 * - Show only values that exist in the data
 * - Display counts next to each option
 * - Sort by frequency (most common first)
 * - Auto-update as data changes
 */

export interface DistinctValueResult {
  value: any;
  label: string;
  count: number;
}

export interface DistinctValuesResponse {
  success: boolean;
  values?: DistinctValueResult[];
  total?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      formId,
      collection,
      field,
      labelField,        // Optional: field to use for label (defaults to field value)
      labelMap,          // Optional: map of value -> label for display
      includeCounts = true,
      sortBy = 'count',  // 'count' | 'value' | 'label'
      sortDirection = 'desc',
      limit = 100,
      filter = {},       // Optional base filter to apply
    } = body;

    if (!formId || !field) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: formId and field are required' },
        { status: 400 }
      );
    }

    // Get session ID
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Find form - check session forms first, then published forms
    const sessionForms = await getForms(sessionId);
    let form = sessionForms.find((f) => f.id === formId || f.slug === formId);

    if (!form) {
      // Try published forms
      const publishedForm = await getPublishedFormBySlug(formId) || await getPublishedFormById(formId);
      form = publishedForm || undefined;
    }

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Get connection string - support both legacy connectionString and new dataSource.vaultId
    let connectionString: string | undefined;
    let database: string | undefined;

    if (form.dataSource?.vaultId && form.organizationId) {
      // New vault-based connection
      const credentials = await getDecryptedConnectionString(form.organizationId, form.dataSource.vaultId);
      if (credentials) {
        connectionString = credentials.connectionString;
        database = credentials.database;
      }
    } else if (form.connectionString && form.database) {
      // Legacy direct connection string
      connectionString = form.connectionString;
      database = form.database;
    }

    if (!connectionString || !database) {
      return NextResponse.json(
        { success: false, error: 'Form does not have database connection configured' },
        { status: 400 }
      );
    }

    // Use provided collection or form's dataSource collection
    const targetCollection = collection || form.dataSource?.collection || form.collection;

    if (!targetCollection) {
      return NextResponse.json(
        { success: false, error: 'No collection specified' },
        { status: 400 }
      );
    }

    const client = new MongoClient(connectionString);

    try {
      await client.connect();
      const db = client.db(database);
      const coll = db.collection(targetCollection);

      // Build aggregation pipeline for distinct values with counts
      const pipeline: any[] = [];

      // Apply base filter if provided
      if (Object.keys(filter).length > 0) {
        pipeline.push({ $match: filter });
      }

      // Only include documents where the field exists and is not null
      pipeline.push({
        $match: {
          [field]: { $exists: true, $ne: null }
        }
      });

      // Group by field value and count
      const groupStage: any = {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 }
        }
      };

      // If labelField is different from the value field, capture it
      if (labelField && labelField !== field) {
        groupStage.$group.label = { $first: `$${labelField}` };
      }

      pipeline.push(groupStage);

      // Sort based on preference
      let sortStage: any = {};
      switch (sortBy) {
        case 'count':
          sortStage = { count: sortDirection === 'desc' ? -1 : 1 };
          break;
        case 'value':
          sortStage = { _id: sortDirection === 'desc' ? -1 : 1 };
          break;
        case 'label':
          sortStage = { label: sortDirection === 'desc' ? -1 : 1, _id: 1 };
          break;
        default:
          sortStage = { count: -1 };
      }
      pipeline.push({ $sort: sortStage });

      // Limit results
      pipeline.push({ $limit: limit });

      // Execute aggregation
      const results = await coll.aggregate(pipeline).toArray();

      // Transform results into consistent format
      const values: DistinctValueResult[] = results.map((doc) => {
        const value = doc._id;
        let label: string;

        // Determine label: labelMap > labelField > value
        if (labelMap && labelMap[value]) {
          label = labelMap[value];
        } else if (doc.label) {
          label = doc.label;
        } else if (typeof value === 'string') {
          label = value;
        } else {
          label = String(value);
        }

        return {
          value,
          label,
          count: includeCounts ? doc.count : 0,
        };
      });

      // Get total distinct count (for showing "X of Y values")
      const totalDistinct = await coll.aggregate([
        ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
        { $match: { [field]: { $exists: true, $ne: null } } },
        { $group: { _id: `$${field}` } },
        { $count: 'total' }
      ]).toArray();

      await client.close();

      return NextResponse.json({
        success: true,
        values,
        total: totalDistinct[0]?.total || values.length,
      } as DistinctValuesResponse);

    } catch (error: any) {
      await client.close().catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error('Distinct values error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch distinct values' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for simpler usage with query params
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const formId = searchParams.get('formId');
  const field = searchParams.get('field');
  const collection = searchParams.get('collection');
  const includeCounts = searchParams.get('includeCounts') !== 'false';
  const sortBy = searchParams.get('sortBy') || 'count';
  const sortDirection = searchParams.get('sortDirection') || 'desc';
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  if (!formId || !field) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameters: formId and field are required' },
      { status: 400 }
    );
  }

  // Create a mock request with JSON body and call POST handler
  const mockBody = {
    formId,
    field,
    collection,
    includeCounts,
    sortBy,
    sortDirection,
    limit,
  };

  // Create new request with body
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(mockBody),
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(request.headers),
    },
  });

  return POST(postRequest);
}
