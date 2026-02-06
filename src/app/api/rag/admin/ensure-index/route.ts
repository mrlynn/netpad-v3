/**
 * RAG Admin API - Ensure Vector Search Index
 *
 * POST /api/rag/admin/ensure-index
 * Creates the vector search index if it doesn't exist
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { ensureVectorSearchIndex, getVectorIndexStatus } from '@/lib/rag/indexManagement';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    console.log(`[RAG Admin] Ensuring vector search index for org ${organizationId}`);

    // Create or check index
    const result = await ensureVectorSearchIndex(organizationId);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          created: result.created,
          exists: result.exists,
        },
        { status: 500 }
      );
    }

    // Get current status
    const status = await getVectorIndexStatus(organizationId);

    return NextResponse.json({
      success: true,
      created: result.created,
      exists: result.exists,
      status: result.status,
      indexStatus: status,
      message: result.created
        ? 'Vector search index is being created. It may take a few minutes to become ready.'
        : `Vector search index already exists (status: ${result.status})`,
    });
  } catch (error) {
    console.error('[RAG Admin] Error ensuring index:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check index status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId parameter is required' },
        { status: 400 }
      );
    }

    const status = await getVectorIndexStatus(organizationId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[RAG Admin] Error checking index status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
