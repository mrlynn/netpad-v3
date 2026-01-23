/**
 * Admin Instance Restart API
 *
 * POST: Trigger instance restart based on deployment environment
 *
 * Supports:
 * - Vercel: Trigger redeployment via Vercel API
 * - Docker/Kubernetes/PM2/systemd: Exit process (relies on restart policy)
 * - Standalone: Spawn new process then exit (self-restart)
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';

// Flag to prevent multiple restart attempts
let restartPending = false;

/**
 * Detect deployment environment (same as in instance/route.ts)
 */
function detectDeploymentEnvironment(): {
  type: 'vercel' | 'docker' | 'kubernetes' | 'pm2' | 'systemd' | 'standalone' | 'unknown';
  canRestart: boolean;
} {
  const env = process.env;

  if (env.VERCEL === '1' || env.VERCEL_ENV) {
    return {
      type: 'vercel',
      canRestart: !!env.VERCEL_TOKEN && !!env.VERCEL_PROJECT_ID,
    };
  }

  if (env.KUBERNETES_SERVICE_HOST || env.KUBERNETES_PORT) {
    return { type: 'kubernetes', canRestart: true };
  }

  if (env.DOCKER === '1' || process.env.container === 'docker') {
    return { type: 'docker', canRestart: true };
  }

  if (env.PM2_HOME || env.pm_id !== undefined) {
    return { type: 'pm2', canRestart: true };
  }

  if (env.INVOCATION_ID || env.JOURNAL_STREAM) {
    return { type: 'systemd', canRestart: true };
  }

  return { type: 'standalone', canRestart: true };
}

/**
 * Trigger Vercel redeployment
 */
async function triggerVercelRedeploy(): Promise<{ success: boolean; message: string; deploymentUrl?: string }> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return {
      success: false,
      message: 'Vercel API token or project ID not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables.',
    };
  }

  try {
    // Get the latest deployment to redeploy from
    const deploymentsUrl = new URL('https://api.vercel.com/v6/deployments');
    deploymentsUrl.searchParams.set('projectId', projectId);
    deploymentsUrl.searchParams.set('limit', '1');
    deploymentsUrl.searchParams.set('state', 'READY');
    if (teamId) {
      deploymentsUrl.searchParams.set('teamId', teamId);
    }

    const deploymentsRes = await fetch(deploymentsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!deploymentsRes.ok) {
      const error = await deploymentsRes.text();
      return {
        success: false,
        message: `Failed to get deployments: ${error}`,
      };
    }

    const deploymentsData = await deploymentsRes.json();
    const latestDeployment = deploymentsData.deployments?.[0];

    if (!latestDeployment) {
      return {
        success: false,
        message: 'No existing deployment found to redeploy from',
      };
    }

    // Create a new deployment (redeploy)
    const createDeployUrl = new URL('https://api.vercel.com/v13/deployments');
    if (teamId) {
      createDeployUrl.searchParams.set('teamId', teamId);
    }

    const createRes = await fetch(createDeployUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: latestDeployment.name,
        deploymentId: latestDeployment.uid,
        target: latestDeployment.target || 'production',
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      return {
        success: false,
        message: `Failed to create deployment: ${error}`,
      };
    }

    const newDeployment = await createRes.json();

    return {
      success: true,
      message: 'Redeployment triggered successfully',
      deploymentUrl: newDeployment.url ? `https://${newDeployment.url}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: `Vercel API error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Trigger process exit (for containerized/managed environments)
 */
function triggerProcessExit(delayMs: number = 1000): void {
  console.log(`[Instance] Restart requested, exiting in ${delayMs}ms...`);

  // Set flag to prevent multiple restarts
  restartPending = true;

  // Delayed exit to allow response to be sent
  setTimeout(() => {
    console.log('[Instance] Exiting process for restart...');
    process.exit(0);
  }, delayMs);
}

/**
 * Trigger self-restart for standalone instances
 *
 * Strategy: Exit first, then spawn new process via a shell command with delay.
 * This ensures the port is released before the new process tries to bind.
 */
function triggerSelfRestart(delayMs: number = 1000): { success: boolean; message: string } {
  console.log(`[Instance] Self-restart requested...`);

  // Set flag to prevent multiple restarts
  restartPending = true;

  // Determine the command to run
  const npmScript = process.env.npm_lifecycle_event; // e.g., 'dev', 'start'
  const packageManager = process.env.npm_execpath?.includes('yarn')
    ? 'yarn'
    : process.env.npm_execpath?.includes('pnpm')
    ? 'pnpm'
    : 'npm';

  const cwd = process.cwd();
  let restartCommand: string;

  if (npmScript) {
    restartCommand = `${packageManager} run ${npmScript}`;
  } else {
    // Running directly via node
    restartCommand = `${process.argv[0]} ${process.argv.slice(1).join(' ')}`;
  }

  console.log(`[Instance] Will restart using: ${restartCommand}`);

  // Use a shell to wait, then start the new process
  // This runs: sleep 2 && npm run dev (or equivalent)
  // The sleep gives time for the current process to fully exit and release the port
  const isWindows = process.platform === 'win32';
  const sleepCommand = isWindows ? 'timeout /t 2 /nobreak >nul' : 'sleep 2';
  const fullCommand = `${sleepCommand} && cd "${cwd}" && ${restartCommand}`;

  console.log(`[Instance] Spawning delayed restart command...`);

  try {
    // Spawn a shell that will wait, then start the new process
    const shell = isWindows ? 'cmd' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', fullCommand] : ['-c', fullCommand];

    const child = spawn(shell, shellArgs, {
      cwd,
      detached: true,
      stdio: 'ignore', // Don't inherit stdio - let it run independently
      env: {
        ...process.env,
        NETPAD_RESTARTED: 'true',
        NETPAD_RESTART_TIME: new Date().toISOString(),
      },
    });

    // Unref so the parent can exit
    child.unref();

    console.log(`[Instance] Delayed restart scheduled (PID ${child.pid})`);

    // Exit the current process after a short delay to send the response
    setTimeout(() => {
      console.log('[Instance] Exiting current process... New process will start in ~2 seconds.');
      process.exit(0);
    }, delayMs);

  } catch (error) {
    console.error('[Instance] Failed to schedule restart:', error);
    restartPending = false;
    return {
      success: false,
      message: `Failed to schedule restart: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return {
    success: true,
    message: 'Self-restart initiated. The server will restart in a few seconds.',
  };
}

export async function POST(req: NextRequest) {
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

    // Check if restart is already pending
    if (restartPending) {
      return NextResponse.json({
        success: false,
        message: 'Restart already pending',
      });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { confirm, force } = body;

    // Require confirmation
    if (!confirm) {
      return NextResponse.json({
        success: false,
        message: 'Confirmation required. Send { "confirm": true } to proceed.',
        requiresConfirmation: true,
      });
    }

    const environment = detectDeploymentEnvironment();

    // Log the restart request
    console.log(`[Instance] Restart requested by user ${session.userId} in ${environment.type} environment`);

    // Handle Vercel differently - trigger redeployment
    if (environment.type === 'vercel') {
      const result = await triggerVercelRedeploy();
      return NextResponse.json({
        success: result.success,
        message: result.message,
        deploymentUrl: result.deploymentUrl,
        environment: environment.type,
      });
    }

    // Handle standalone differently - self-restart
    if (environment.type === 'standalone') {
      const result = triggerSelfRestart(500);
      return NextResponse.json({
        success: result.success,
        message: result.message,
        environment: environment.type,
        restartPending: true,
        selfRestart: true,
      });
    }

    // For managed environments (Docker, K8s, PM2, systemd), trigger process exit
    triggerProcessExit(500);

    return NextResponse.json({
      success: true,
      message: `Restart initiated. The process will exit and ${environment.type} will restart it automatically.`,
      environment: environment.type,
      restartPending: true,
    });
  } catch (error) {
    console.error('[Admin Instance] Error triggering restart:', error);
    return NextResponse.json(
      { error: 'Failed to trigger restart' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check if restart is pending
 */
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

    return NextResponse.json({
      restartPending,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check restart status' },
      { status: 500 }
    );
  }
}
