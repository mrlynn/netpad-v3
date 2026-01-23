/**
 * Atlas Provisioning Service Implementation
 *
 * Handles automatic MongoDB Atlas cluster provisioning for free tier users.
 * This is cloud-only functionality.
 */

import type { AtlasProvisioningService } from '@/lib/extensions';

// Atlas API configuration
const ATLAS_API_BASE = 'https://cloud.mongodb.com/api/atlas/v2';
const ATLAS_ORG_ID = process.env.ATLAS_ORG_ID!;
const ATLAS_PUBLIC_KEY = process.env.ATLAS_PUBLIC_KEY!;
const ATLAS_PRIVATE_KEY = process.env.ATLAS_PRIVATE_KEY!;

/**
 * Make authenticated request to Atlas API
 */
async function atlasRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = Buffer.from(`${ATLAS_PUBLIC_KEY}:${ATLAS_PRIVATE_KEY}`).toString('base64');

  return fetch(`${ATLAS_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      Accept: 'application/vnd.atlas.2023-11-15+json',
      ...options.headers,
    },
  });
}

export const atlasProvisioningService: AtlasProvisioningService = {
  async provisionCluster({ organizationId, projectId, region }) {
    const defaultRegion = region ?? process.env.ATLAS_DEFAULT_REGION ?? 'US_EAST_1';
    const provider = process.env.ATLAS_DEFAULT_PROVIDER ?? 'AWS';

    // Step 1: Create Atlas project
    const projectName = `netpad-${organizationId}`;
    const projectResponse = await atlasRequest(`/orgs/${ATLAS_ORG_ID}/groups`, {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        orgId: ATLAS_ORG_ID,
      }),
    });

    if (!projectResponse.ok) {
      throw new Error(`Failed to create Atlas project: ${await projectResponse.text()}`);
    }

    const atlasProject = await projectResponse.json();
    const atlasProjectId = atlasProject.id;

    // Step 2: Create M0 cluster
    const clusterName = `netpad-${projectId}`;
    const clusterResponse = await atlasRequest(`/groups/${atlasProjectId}/clusters`, {
      method: 'POST',
      body: JSON.stringify({
        name: clusterName,
        clusterType: 'REPLICASET',
        replicationSpecs: [
          {
            regionConfigs: [
              {
                providerName: provider,
                regionName: defaultRegion,
                priority: 7,
                electableSpecs: {
                  instanceSize: 'M0',
                  nodeCount: 1,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!clusterResponse.ok) {
      throw new Error(`Failed to create cluster: ${await clusterResponse.text()}`);
    }

    const cluster = await clusterResponse.json();

    // Step 3: Create database user
    const username = `user-${organizationId}`;
    const password = generateSecurePassword();

    await atlasRequest(`/groups/${atlasProjectId}/databaseUsers`, {
      method: 'POST',
      body: JSON.stringify({
        databaseName: 'admin',
        roles: [
          {
            databaseName: 'admin',
            roleName: 'atlasAdmin',
          },
        ],
        username,
        password,
      }),
    });

    // Step 4: Configure network access (allow from NetPad IPs)
    const allowedIPs = (process.env.ATLAS_SERVER_IPS ?? '0.0.0.0/0').split(',');
    for (const ip of allowedIPs) {
      await atlasRequest(`/groups/${atlasProjectId}/accessList`, {
        method: 'POST',
        body: JSON.stringify({
          ipAddress: ip.trim(),
          comment: 'NetPad Cloud',
        }),
      });
    }

    // Build connection string (will be available once cluster is ready)
    const connectionString = `mongodb+srv://${username}:${encodeURIComponent(password)}@${clusterName}.${atlasProjectId}.mongodb.net`;

    return {
      clusterId: cluster.id,
      connectionString,
      status: 'creating',
    };
  },

  async getClusterStatus(clusterId) {
    // TODO: Look up cluster from database to get project ID
    // Then query Atlas API for status
    throw new Error('Not implemented - move from src/lib/atlas/');
  },

  async deleteCluster(clusterId) {
    // TODO: Look up cluster from database and delete from Atlas
    throw new Error('Not implemented - move from src/lib/atlas/');
  },
};

/**
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}
