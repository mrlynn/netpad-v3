/**
 * Application Contracts API
 *
 * GET /api/applications/[applicationId]/contracts - List contracts
 * POST /api/applications/[applicationId]/contracts - Create contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  createApplicationContract,
  listApplicationContracts,
  CreateContractInput,
} from '@/lib/platform/applicationContracts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applications/[applicationId]/contracts
 * List contracts for an application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);

    // Get organization ID from query params
    const orgId = searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const status = searchParams.get('status') as 'draft' | 'active' | 'deprecated' | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await listApplicationContracts(orgId, applicationId, {
      status: status || undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      contracts: result.contracts,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    console.error('[Contracts API] List error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list contracts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications/[applicationId]/contracts
 * Create a new contract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { applicationId } = await params;
    const body = await request.json();
    const { orgId, ...contractData } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate required fields
    if (!contractData.version) {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    const input: CreateContractInput = {
      applicationId,
      version: contractData.version,
      status: contractData.status || 'draft',
      inputs: contractData.inputs || {},
      outputs: contractData.outputs || {},
      sideEffects: contractData.sideEffects || [],
      events: contractData.events || [],
      behaviors: contractData.behaviors || [],
      stability: contractData.stability || {
        inputs: true,
        outputs: true,
        sideEffects: true,
        events: true,
      },
    };

    const contract = await createApplicationContract(orgId, input);

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error: any) {
    console.error('[Contracts API] Create error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contract' },
      { status: 500 }
    );
  }
}
