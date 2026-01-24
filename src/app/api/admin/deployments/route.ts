/**
 * Admin Deployments API
 *
 * GET: Get current deployment information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getCurrentDeployment,
  getEnvironmentInfo,
  getBuildInfo,
  formatUptime,
} from '@/lib/platform/deploymentService';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const deployment = getCurrentDeployment();
    const environmentInfo = getEnvironmentInfo(deployment.environment);
    const buildInfo = getBuildInfo();

    return NextResponse.json({
      success: true,
      deployment: {
        ...deployment,
        environmentInfo,
      },
      build: {
        ...buildInfo,
        uptimeFormatted: formatUptime(buildInfo.uptime),
      },
    });
  } catch (error) {
    console.error('[Admin Deployments] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch deployment info' }, { status: 500 });
  }
}
