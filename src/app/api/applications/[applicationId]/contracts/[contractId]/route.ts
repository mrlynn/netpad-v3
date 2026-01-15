/**
 * Application Contract Detail API
 *
 * GET /api/applications/[applicationId]/contracts/[contractId] - Get contract
 * PATCH /api/applications/[applicationId]/contracts/[contractId] - Update contract
 * DELETE /api/applications/[applicationId]/contracts/[contractId] - Delete contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  getApplicationContract,
  updateApplicationContract,
  deleteApplicationContract,
  activateApplicationContract,
  deprecateApplicationContract,
  UpdateContractInput,
} from '@/lib/platform/applicationContracts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applications/[applicationId]/contracts/[contractId]
 * Get contract by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; contractId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { contractId } = await params;
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contract = await getApplicationContract(orgId, contractId);

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error: any) {
    console.error('[Contracts API] Get error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get contract' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/applications/[applicationId]/contracts/[contractId]
 * Update contract
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; contractId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { contractId } = await params;
    const body = await request.json();
    const { orgId, action, ...updateData } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle special actions
    if (action === 'activate') {
      const contract = await activateApplicationContract(orgId, contractId);
      return NextResponse.json({
        success: true,
        contract,
      });
    }

    if (action === 'deprecate') {
      const contract = await deprecateApplicationContract(orgId, contractId);
      return NextResponse.json({
        success: true,
        contract,
      });
    }

    // Regular update
    const input: UpdateContractInput = {
      status: updateData.status,
      inputs: updateData.inputs,
      outputs: updateData.outputs,
      sideEffects: updateData.sideEffects,
      events: updateData.events,
      behaviors: updateData.behaviors,
      stability: updateData.stability,
    };

    // Remove undefined fields
    Object.keys(input).forEach((key) => {
      if (input[key as keyof UpdateContractInput] === undefined) {
        delete input[key as keyof UpdateContractInput];
      }
    });

    const contract = await updateApplicationContract(orgId, contractId, input);

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error: any) {
    console.error('[Contracts API] Update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update contract' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/applications/[applicationId]/contracts/[contractId]
 * Delete contract
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; contractId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { contractId } = await params;
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await deleteApplicationContract(orgId, contractId);

    if (!deleted) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contract deleted successfully',
    });
  } catch (error: any) {
    console.error('[Contracts API] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete contract' },
      { status: 500 }
    );
  }
}
