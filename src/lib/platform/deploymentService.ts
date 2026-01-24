/**
 * Deployment Service
 *
 * Extracts deployment information from Vercel environment variables
 */

export interface DeploymentInfo {
  commitSha: string;
  commitShortSha: string;
  commitMessage?: string;
  commitAuthor?: string;
  commitRef?: string;
  environment: 'production' | 'preview' | 'development';
  deploymentUrl?: string;
  vercelUrl?: string;
  deployedAt: string;
  gitProvider?: string;
  repoOwner?: string;
  repoName?: string;
  pullRequestId?: string;
}

/**
 * Get current deployment information from environment
 */
export function getCurrentDeployment(): DeploymentInfo {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'unknown';
  const environment = (process.env.VERCEL_ENV || process.env.NODE_ENV || 'development') as DeploymentInfo['environment'];

  return {
    commitSha,
    commitShortSha: commitSha.substring(0, 7),
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE,
    commitAuthor: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME,
    commitRef: process.env.VERCEL_GIT_COMMIT_REF,
    environment,
    deploymentUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    vercelUrl: process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
    deployedAt: process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN
      ? new Date().toISOString()
      : new Date().toISOString(),
    gitProvider: process.env.VERCEL_GIT_PROVIDER,
    repoOwner: process.env.VERCEL_GIT_REPO_OWNER,
    repoName: process.env.VERCEL_GIT_REPO_SLUG,
    pullRequestId: process.env.VERCEL_GIT_PULL_REQUEST_ID,
  };
}

/**
 * Get environment badge info
 */
export function getEnvironmentInfo(env: DeploymentInfo['environment']): {
  label: string;
  color: string;
  description: string;
} {
  switch (env) {
    case 'production':
      return {
        label: 'Production',
        color: '#00ED64',
        description: 'Live production deployment',
      };
    case 'preview':
      return {
        label: 'Preview',
        color: '#FF9800',
        description: 'Preview deployment for testing',
      };
    case 'development':
    default:
      return {
        label: 'Development',
        color: '#2196F3',
        description: 'Local development environment',
      };
  }
}

/**
 * Build info for display
 */
export interface BuildInfo {
  nodeVersion: string;
  nextVersion?: string;
  platform: string;
  timezone: string;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export function getBuildInfo(): BuildInfo {
  const memUsage = process.memoryUsage();
  const heapUsed = memUsage.heapUsed;
  const heapTotal = memUsage.heapTotal;

  return {
    nodeVersion: process.version,
    nextVersion: process.env.npm_package_dependencies_next,
    platform: process.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    uptime: process.uptime(),
    memoryUsage: {
      used: Math.round(heapUsed / 1024 / 1024),
      total: Math.round(heapTotal / 1024 / 1024),
      percentage: Math.round((heapUsed / heapTotal) * 100),
    },
  };
}

/**
 * Format uptime for display
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}
