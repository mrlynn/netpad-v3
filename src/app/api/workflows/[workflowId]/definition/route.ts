/**
 * Workflow Definition Export API
 * 
 * GET /api/workflows/[workflowId]/definition
 * Export workflow configuration as a portable JSON definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getWorkflowById } from '@/lib/workflow/db';
import { cleanWorkflowForExport } from '@/lib/templates/export';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/[workflowId]/definition
 * Export workflow definition as JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      );
    }
    
    // Get workflow
    const workflow = await getWorkflowById(orgId, workflowId);
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    // Clean for export
    const definition = cleanWorkflowForExport(workflow);
    
    return NextResponse.json({
      success: true,
      definition,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${workflow.name || 'workflow'}-definition.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting workflow definition:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export workflow definition' },
      { status: 500 }
    );
  }
}
