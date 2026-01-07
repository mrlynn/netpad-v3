/**
 * Vercel API Client
 * 
 * Enhanced client for Vercel API operations including:
 * - Project creation
 * - Deployment management
 * - Environment variable configuration
 * - Domain management
 */

import { getPlatformDb } from '@/lib/platform/db';
import {
  VercelProject,
  VercelDeployment,
  DeploymentStatusResponse,
} from '@/types/deployment';

/**
 * Vercel API response wrapper
 */
interface VercelApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Get Vercel integration access token
 */
async function getVercelAccessToken(
  installationId: string
): Promise<{ accessToken: string; teamId?: string } | null> {
  const db = await getPlatformDb();
  const integrationsCollection = db.collection('vercel_integrations');
  const integration = await integrationsCollection.findOne({ installationId });

  if (!integration || !integration.accessToken) {
    return null;
  }

  return {
    accessToken: integration.accessToken,
    teamId: integration.teamId,
  };
}

/**
 * Make authenticated request to Vercel API
 */
async function vercelApiRequest<T>(
  endpoint: string,
  options: {
    accessToken: string;
    teamId?: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    body?: any;
  }
): Promise<VercelApiResponse<T>> {
  const { accessToken, teamId, method = 'GET', body } = options;

  const baseUrl = 'https://api.vercel.com';
  const url = teamId
    ? `${baseUrl}${endpoint}?teamId=${teamId}`
    : `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `Vercel API error: ${response.status}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a Vercel project from template or Git repository
 */
export async function createVercelProject(options: {
  installationId: string;
  name: string;
  framework?: string;
  gitRepository?: string;
  rootDirectory?: string;
}): Promise<VercelApiResponse<VercelProject>> {
  const { installationId, name, framework, gitRepository, rootDirectory } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  const body: any = {
    name,
  };

  if (framework) {
    body.framework = framework;
  }

  if (gitRepository) {
    body.gitRepository = gitRepository;
  }

  if (rootDirectory) {
    body.rootDirectory = rootDirectory;
  }

  return vercelApiRequest<VercelProject>('/v9/projects', {
    accessToken: auth.accessToken,
    teamId: auth.teamId,
    method: 'POST',
    body,
  });
}

/**
 * Get Vercel project by ID
 */
export async function getVercelProject(options: {
  installationId: string;
  projectId: string;
}): Promise<VercelApiResponse<VercelProject>> {
  const { installationId, projectId } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  return vercelApiRequest<VercelProject>(`/v9/projects/${projectId}`, {
    accessToken: auth.accessToken,
    teamId: auth.teamId,
    method: 'GET',
  });
}

/**
 * Create a deployment to Vercel
 */
export async function createVercelDeployment(options: {
  installationId: string;
  projectId: string;
  name?: string;
  target?: 'production' | 'staging';
  files?: Array<{ file: string; data: string }>;
  gitSource?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    repo: string;
    ref: string;
  };
}): Promise<VercelApiResponse<VercelDeployment>> {
  const { installationId, projectId, name, target, files, gitSource } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  const body: any = {
    name: name || projectId,
    projectId,
  };

  if (target) {
    body.target = target;
  }

  if (files) {
    body.files = files;
  }

  if (gitSource) {
    body.gitSource = gitSource;
  }

  return vercelApiRequest<VercelDeployment>('/v13/deployments', {
    accessToken: auth.accessToken,
    teamId: auth.teamId,
    method: 'POST',
    body,
  });
}

/**
 * Get deployment status from Vercel
 */
export async function getVercelDeploymentStatus(options: {
  installationId: string;
  deploymentId: string;
}): Promise<VercelApiResponse<VercelDeployment>> {
  const { installationId, deploymentId } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  return vercelApiRequest<VercelDeployment>(`/v13/deployments/${deploymentId}`, {
    accessToken: auth.accessToken,
    teamId: auth.teamId,
    method: 'GET',
  });
}

/**
 * List deployments for a Vercel project
 */
export async function listVercelDeployments(options: {
  installationId: string;
  projectId: string;
  limit?: number;
  target?: 'production' | 'staging';
}): Promise<VercelApiResponse<{ deployments: VercelDeployment[] }>> {
  const { installationId, projectId, limit = 20, target } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  let endpoint = `/v6/deployments?projectId=${projectId}&limit=${limit}`;
  if (target) {
    endpoint += `&target=${target}`;
  }

  return vercelApiRequest<{ deployments: VercelDeployment[] }>(endpoint, {
    accessToken: auth.accessToken,
    teamId: auth.teamId,
    method: 'GET',
  });
}

/**
 * Push environment variables to Vercel project
 * Enhanced version of existing pushEnvVarsToVercel with better error handling
 */
export async function pushEnvironmentVariables(options: {
  installationId: string;
  projectId: string;
  envVars: Record<string, string>;
}): Promise<VercelApiResponse<{ set: string[] }>> {
  const { installationId, projectId, envVars } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  const baseUrl = auth.teamId
    ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${auth.teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/env`;

  const set: string[] = [];
  const errors: string[] = [];

  try {
    for (const [key, value] of Object.entries(envVars)) {
      // Check if env var already exists
      const getResponse = await fetch(
        `${baseUrl.replace('/env', `/env/${key}`)}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      let method = 'POST';
      let url = baseUrl;

      if (getResponse.ok) {
        // Env var exists, update it
        method = 'PATCH';
        const existing = await getResponse.json();
        url = `${baseUrl.replace('/env', `/env/${existing.id}`)}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`${key}: ${errorText}`);
      } else {
        set.push(key);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Failed to set some environment variables: ${errors.join(', ')}`,
      };
    }

    return {
      success: true,
      data: { set },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Configure custom domain for Vercel project
 */
export async function configureCustomDomain(options: {
  installationId: string;
  projectId: string;
  domain: string;
}): Promise<VercelApiResponse<{ domain: string; verified: boolean }>> {
  const { installationId, projectId, domain } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  // Add domain to project
  const addResult = await vercelApiRequest<{ domain: string }>(
    `/v9/projects/${projectId}/domains`,
    {
      accessToken: auth.accessToken,
      teamId: auth.teamId,
      method: 'POST',
      body: { name: domain },
    }
  );

  if (!addResult.success) {
    return addResult as any;
  }

  // Verify domain
  const verifyResult = await vercelApiRequest<{ verified: boolean }>(
    `/v9/projects/${projectId}/domains/${domain}/verify`,
    {
      accessToken: auth.accessToken,
      teamId: auth.teamId,
      method: 'POST',
    }
  );

  return {
    success: verifyResult.success,
    data: {
      domain,
      verified: verifyResult.data?.verified || false,
    },
    error: verifyResult.error,
  };
}

/**
 * Delete a Vercel project
 */
export async function deleteVercelProject(options: {
  installationId: string;
  projectId: string;
}): Promise<VercelApiResponse<void>> {
  const { installationId, projectId } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  return vercelApiRequest<void>(`/v9/projects/${projectId}`, {
    accessToken: auth.accessToken,
    teamId: auth.teamId,
    method: 'DELETE',
  });
}

/**
 * Get deployment logs from Vercel
 */
export async function getDeploymentLogs(options: {
  installationId: string;
  deploymentId: string;
}): Promise<VercelApiResponse<{ logs: Array<{ timestamp: number; message: string }> }>> {
  const { installationId, deploymentId } = options;

  const auth = await getVercelAccessToken(installationId);
  if (!auth) {
    return {
      success: false,
      error: 'Vercel integration not found or access token missing',
    };
  }

  return vercelApiRequest<{ logs: Array<{ timestamp: number; message: string }> }>(
    `/v2/deployments/${deploymentId}/events`,
    {
      accessToken: auth.accessToken,
      teamId: auth.teamId,
      method: 'GET',
    }
  );
}
