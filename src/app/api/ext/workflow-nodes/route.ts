/**
 * API endpoint for fetching extension-provided workflow nodes
 *
 * GET /api/ext/workflow-nodes
 * Returns all workflow nodes registered by extensions
 */

import { NextResponse } from 'next/server';
import { loadExtensions, waitForExtensions } from '@/lib/extensions/loader';
import { getExtensionNodeDefinitions, getExtensionNodeRegistryStatus } from '@/lib/extensions/workflowNodes';

// Ensure extensions are loaded
loadExtensions().catch(console.error);

export async function GET() {
  try {
    // Wait for extensions to be loaded
    await waitForExtensions();

    const nodes = getExtensionNodeDefinitions();
    const status = getExtensionNodeRegistryStatus();

    return NextResponse.json({
      success: true,
      data: {
        nodes,
        stats: {
          total: status.nodeCount,
          byExtension: status.byExtension,
          byCategory: status.byCategory,
        },
      },
    });
  } catch (error) {
    console.error('[API] Error fetching extension nodes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch extension workflow nodes',
      },
      { status: 500 }
    );
  }
}
