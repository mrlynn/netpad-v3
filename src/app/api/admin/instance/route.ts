/**
 * Admin Instance Status API
 *
 * GET: Get current instance status including uptime, memory, environment info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getRegistryStatus } from '@/lib/extensions/registry';
import { getDeploymentMode } from '@/lib/runtime/deploymentMode';

// Track when the server started
const serverStartTime = Date.now();

/**
 * Detect the deployment environment
 */
function detectDeploymentEnvironment(): {
  type: 'vercel' | 'docker' | 'kubernetes' | 'pm2' | 'systemd' | 'standalone' | 'unknown';
  details: Record<string, string | boolean | undefined>;
  canRestart: boolean;
  restartMethod: string;
} {
  const env = process.env;

  // Vercel detection
  if (env.VERCEL === '1' || env.VERCEL_ENV) {
    return {
      type: 'vercel',
      details: {
        region: env.VERCEL_REGION,
        environment: env.VERCEL_ENV,
        gitCommit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
        gitBranch: env.VERCEL_GIT_COMMIT_REF,
      },
      canRestart: !!env.VERCEL_TOKEN && !!env.VERCEL_PROJECT_ID,
      restartMethod: 'Trigger redeployment via Vercel API',
    };
  }

  // Kubernetes detection
  if (env.KUBERNETES_SERVICE_HOST || env.KUBERNETES_PORT) {
    return {
      type: 'kubernetes',
      details: {
        namespace: env.POD_NAMESPACE,
        podName: env.HOSTNAME,
        nodeName: env.NODE_NAME,
      },
      canRestart: true,
      restartMethod: 'Exit process (Kubernetes will restart pod)',
    };
  }

  // Docker detection
  if (env.DOCKER === '1' || process.env.container === 'docker') {
    return {
      type: 'docker',
      details: {
        containerized: true,
      },
      canRestart: true,
      restartMethod: 'Exit process (container restart policy)',
    };
  }

  // PM2 detection
  if (env.PM2_HOME || env.pm_id !== undefined) {
    return {
      type: 'pm2',
      details: {
        instanceId: env.pm_id,
        instances: env.instances,
      },
      canRestart: true,
      restartMethod: 'Exit process (PM2 will restart)',
    };
  }

  // systemd detection (check if running under systemd)
  if (env.INVOCATION_ID || env.JOURNAL_STREAM) {
    return {
      type: 'systemd',
      details: {
        invocationId: env.INVOCATION_ID,
      },
      canRestart: true,
      restartMethod: 'Exit process (systemd will restart)',
    };
  }

  // Standalone/development
  return {
    type: 'standalone',
    details: {
      nodeEnv: env.NODE_ENV,
    },
    canRestart: true,
    restartMethod: 'Self-restart (spawn new process before exiting)',
  };
}

/**
 * Get memory usage in a readable format
 */
function getMemoryUsage(): {
  heapUsed: string;
  heapTotal: string;
  rss: string;
  external: string;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
} {
  const usage = process.memoryUsage();
  const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;

  return {
    heapUsed: `${toMB(usage.heapUsed)} MB`,
    heapTotal: `${toMB(usage.heapTotal)} MB`,
    rss: `${toMB(usage.rss)} MB`,
    external: `${toMB(usage.external)} MB`,
    heapUsedMB: toMB(usage.heapUsed),
    heapTotalMB: toMB(usage.heapTotal),
    rssMB: toMB(usage.rss),
  };
}

/**
 * Format uptime in a readable format
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export async function GET(req: NextRequest) {
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

    const uptime = Date.now() - serverStartTime;
    const environment = detectDeploymentEnvironment();
    const memory = getMemoryUsage();
    const extensionStatus = getRegistryStatus();
    const deploymentMode = getDeploymentMode();

    // Check if this instance was started via admin restart
    const wasRestarted = process.env.NETPAD_RESTARTED === 'true';
    const restartTime = process.env.NETPAD_RESTART_TIME;

    return NextResponse.json({
      instance: {
        startedAt: new Date(serverStartTime).toISOString(),
        uptime: formatUptime(uptime),
        uptimeMs: uptime,
        wasRestarted,
        restartTime: restartTime || null,
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      memory,
      environment: {
        type: environment.type,
        details: environment.details,
        canRestart: environment.canRestart,
        restartMethod: environment.restartMethod,
        deploymentMode,
      },
      extensions: {
        initialized: extensionStatus.initialized,
        count: extensionStatus.extensionCount,
        loaded: extensionStatus.extensions.map(e => e.id),
        features: extensionStatus.enabledFeatures,
      },
      config: {
        mongodbUri: process.env.MONGODB_URI ? '***configured***' : 'not configured',
        vercelToken: process.env.VERCEL_TOKEN ? '***configured***' : 'not configured',
        vercelProjectId: process.env.VERCEL_PROJECT_ID || null,
      },
    });
  } catch (error) {
    console.error('[Admin Instance] Error getting status:', error);
    return NextResponse.json(
      { error: 'Failed to get instance status' },
      { status: 500 }
    );
  }
}
