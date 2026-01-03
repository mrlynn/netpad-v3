/**
 * MongoDB Atlas Admin API Client
 *
 * A client for interacting with the Atlas Administration API v2.
 * Uses Digest Authentication with API keys.
 *
 * @see https://www.mongodb.com/docs/atlas/configure-api-access/
 */

import {
  AtlasApiConfig,
  AtlasProject,
  CreateProjectInput,
  AtlasCluster,
  CreateM0ClusterInput,
  AtlasDatabaseUser,
  CreateDatabaseUserInput,
  IpAccessListEntry,
  AtlasIpAccessListEntry,
  AtlasApiError,
  AtlasApiResponse,
  AtlasProjectRole,
  AtlasInvitation,
} from './types';

// ============================================
// Atlas API Client
// ============================================

export class AtlasApiClient {
  private publicKey: string;
  private privateKey: string;
  private baseUrl: string;

  constructor(config?: Partial<AtlasApiConfig>) {
    this.publicKey = config?.publicKey || process.env.ATLAS_PUBLIC_KEY || '';
    this.privateKey = config?.privateKey || process.env.ATLAS_PRIVATE_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://cloud.mongodb.com/api/atlas/v2';

    if (!this.publicKey || !this.privateKey) {
      console.warn('[AtlasApiClient] API keys not configured. Set ATLAS_PUBLIC_KEY and ATLAS_PRIVATE_KEY environment variables.');
    }
  }

  /**
   * Check if the client is configured with valid credentials
   */
  isConfigured(): boolean {
    return !!(this.publicKey && this.privateKey);
  }

  /**
   * Make an authenticated request to the Atlas API
   * Uses HTTP Digest Authentication
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<AtlasApiResponse<T>> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          error: 401,
          errorCode: 'NOT_CONFIGURED',
          detail: 'Atlas API credentials not configured',
        },
      };
    }

    const url = `${this.baseUrl}${path}`;
    console.log(`[AtlasAPI] ${method} ${path}`);

    // Atlas API uses Digest Authentication
    // For simplicity, we'll use Basic Auth with the API keys
    // (Atlas also supports this for API key authentication)
    const credentials = Buffer.from(`${this.publicKey}:${this.privateKey}`).toString('base64');

    const headers: HeadersInit = {
      'Authorization': `Digest username="${this.publicKey}"`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.atlas.2023-01-01+json',
    };

    try {
      // First request to get the digest challenge
      // Use 2023-01-01 API version which supports providerSettings for M0 clusters
      console.log(`[AtlasAPI] Sending initial request to get digest challenge...`);
      const initialResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.atlas.2023-01-01+json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      console.log(`[AtlasAPI] Initial response status: ${initialResponse.status}`);

      // If we get a 401 with WWW-Authenticate header, we need to do digest auth
      if (initialResponse.status === 401) {
        const wwwAuth = initialResponse.headers.get('WWW-Authenticate');
        console.log(`[AtlasAPI] Got 401, WWW-Authenticate header present: ${!!wwwAuth}`);
        if (wwwAuth && wwwAuth.includes('Digest')) {
          // Parse digest challenge and create response
          console.log(`[AtlasAPI] Performing Digest authentication...`);
          const digestResponse = await this.createDigestAuth(
            method,
            path,
            wwwAuth
          );

          const authResponse = await fetch(url, {
            method,
            headers: {
              'Authorization': digestResponse,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.atlas.2023-01-01+json',
            },
            body: body ? JSON.stringify(body) : undefined,
          });
          console.log(`[AtlasAPI] Auth response status: ${authResponse.status}`);

          return this.handleResponse<T>(authResponse);
        }
      }

      return this.handleResponse<T>(initialResponse);
    } catch (error: any) {
      console.error('[AtlasApiClient] Request error:', error);
      return {
        success: false,
        error: {
          error: 500,
          errorCode: 'REQUEST_FAILED',
          detail: error.message || 'Failed to connect to Atlas API',
        },
      };
    }
  }

  /**
   * Create Digest Authentication header
   */
  private async createDigestAuth(
    method: string,
    path: string,
    wwwAuth: string
  ): Promise<string> {
    // Parse the WWW-Authenticate header
    const params: Record<string, string> = {};
    const matches = wwwAuth.matchAll(/(\w+)="([^"]+)"/g);
    for (const match of matches) {
      params[match[1]] = match[2];
    }

    const realm = params['realm'] || 'MongoDB Cloud';
    const nonce = params['nonce'] || '';
    const qop = params['qop'] || 'auth';

    // Generate client nonce and nonce count
    const cnonce = this.generateCnonce();
    const nc = '00000001';

    // Calculate HA1 = MD5(username:realm:password)
    const ha1 = await this.md5(`${this.publicKey}:${realm}:${this.privateKey}`);

    // Calculate HA2 = MD5(method:uri)
    const uri = `/api/atlas/v2${path}`;
    const ha2 = await this.md5(`${method}:${uri}`);

    // Calculate response = MD5(HA1:nonce:nc:cnonce:qop:HA2)
    const response = await this.md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    return `Digest username="${this.publicKey}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  }

  /**
   * Generate a random client nonce
   */
  private generateCnonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calculate MD5 hash (used for Digest Auth)
   */
  private async md5(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => {
      // MD5 not available in all environments, use a fallback
      // In production, you'd use a library like crypto-js
      return null;
    });

    if (!hashBuffer) {
      // Fallback: use Node.js crypto if available
      const nodeCrypto = require('crypto');
      return nodeCrypto.createHash('md5').update(text).digest('hex');
    }

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<AtlasApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    console.log(`[AtlasAPI] Response content-type:`, contentType);
    let data: any = null;

    // Atlas API uses versioned content types like 'application/vnd.atlas.2024-08-05+json'
    if (contentType?.includes('json')) {
      try {
        data = await response.json();
      } catch (e) {
        console.error(`[AtlasAPI] Failed to parse JSON response:`, e);
        data = null;
      }
    }

    if (!response.ok) {
      console.error(`[AtlasAPI] Request failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: data,
      });
      return {
        success: false,
        error: data || {
          error: response.status,
          errorCode: 'API_ERROR',
          detail: response.statusText,
        },
      };
    }

    // Check if data is empty or null
    if (!data) {
      console.warn(`[AtlasAPI] Request successful but no data returned`);
    }

    console.log(`[AtlasAPI] Request successful, data:`, JSON.stringify(data, null, 2));
    return {
      success: true,
      data: data as T,
    };
  }

  // ============================================
  // Projects
  // ============================================

  /**
   * Create a new Atlas project
   */
  async createProject(input: CreateProjectInput): Promise<AtlasApiResponse<AtlasProject>> {
    return this.request<AtlasProject>('POST', '/groups', {
      name: input.name,
      orgId: input.orgId,
    });
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<AtlasApiResponse<AtlasProject>> {
    return this.request<AtlasProject>('GET', `/groups/${projectId}`);
  }

  /**
   * Get a project by name within an organization
   */
  async getProjectByName(orgId: string, projectName: string): Promise<AtlasApiResponse<AtlasProject | null>> {
    // Atlas API: GET /orgs/{orgId}/groups returns all projects in the org
    const result = await this.request<{ results: AtlasProject[] }>('GET', `/orgs/${orgId}/groups`);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    const project = result.data?.results?.find(p => p.name === projectName);
    return {
      success: true,
      data: project || null,
    };
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<AtlasApiResponse<void>> {
    return this.request<void>('DELETE', `/groups/${projectId}`);
  }

  // ============================================
  // Clusters
  // ============================================

  /**
   * Create an M0 free tier cluster
   */
  async createM0Cluster(
    projectId: string,
    input: CreateM0ClusterInput
  ): Promise<AtlasApiResponse<AtlasCluster>> {
    return this.request<AtlasCluster>('POST', `/groups/${projectId}/clusters`, input);
  }

  /**
   * List all clusters in a project
   */
  async listClusters(projectId: string): Promise<AtlasApiResponse<AtlasCluster[]>> {
    const result = await this.request<{ results: AtlasCluster[] }>('GET', `/groups/${projectId}/clusters`);
    if (result.success && result.data) {
      return { success: true, data: result.data.results || [] };
    }
    return { success: false, error: result.error };
  }

  /**
   * Get cluster by name
   */
  async getCluster(
    projectId: string,
    clusterName: string
  ): Promise<AtlasApiResponse<AtlasCluster>> {
    return this.request<AtlasCluster>('GET', `/groups/${projectId}/clusters/${clusterName}`);
  }

  /**
   * Delete a cluster
   */
  async deleteCluster(
    projectId: string,
    clusterName: string
  ): Promise<AtlasApiResponse<void>> {
    return this.request<void>('DELETE', `/groups/${projectId}/clusters/${clusterName}`);
  }

  /**
   * Wait for cluster to be ready
   */
  async waitForClusterReady(
    projectId: string,
    clusterName: string,
    maxWaitMs: number = 60000,
    pollIntervalMs: number = 5000
  ): Promise<AtlasApiResponse<AtlasCluster>> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getCluster(projectId, clusterName);

      if (!result.success) {
        return result;
      }

      if (result.data?.stateName === 'IDLE') {
        return result;
      }

      if (result.data?.stateName === 'DELETED') {
        return {
          success: false,
          error: {
            error: 404,
            errorCode: 'CLUSTER_DELETED',
            detail: 'Cluster was deleted',
          },
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return {
      success: false,
      error: {
        error: 408,
        errorCode: 'TIMEOUT',
        detail: `Cluster did not become ready within ${maxWaitMs}ms`,
      },
    };
  }

  // ============================================
  // Database Users
  // ============================================

  /**
   * Create a database user
   */
  async createDatabaseUser(
    projectId: string,
    input: CreateDatabaseUserInput
  ): Promise<AtlasApiResponse<AtlasDatabaseUser>> {
    return this.request<AtlasDatabaseUser>('POST', `/groups/${projectId}/databaseUsers`, {
      username: input.username,
      password: input.password,
      databaseName: 'admin',  // SCRAM users authenticate against admin db
      roles: input.roles,
      scopes: input.scopes,
      deleteAfterDate: input.deleteAfterDate,
    });
  }

  /**
   * Get a database user
   */
  async getDatabaseUser(
    projectId: string,
    databaseName: string,
    username: string
  ): Promise<AtlasApiResponse<AtlasDatabaseUser>> {
    return this.request<AtlasDatabaseUser>(
      'GET',
      `/groups/${projectId}/databaseUsers/${databaseName}/${username}`
    );
  }

  /**
   * Update a database user (e.g., change password, roles)
   */
  async updateDatabaseUser(
    projectId: string,
    databaseName: string,
    username: string,
    input: Partial<CreateDatabaseUserInput>
  ): Promise<AtlasApiResponse<AtlasDatabaseUser>> {
    return this.request<AtlasDatabaseUser>(
      'PATCH',
      `/groups/${projectId}/databaseUsers/${databaseName}/${username}`,
      input
    );
  }

  /**
   * Delete a database user
   */
  async deleteDatabaseUser(
    projectId: string,
    databaseName: string,
    username: string
  ): Promise<AtlasApiResponse<void>> {
    return this.request<void>(
      'DELETE',
      `/groups/${projectId}/databaseUsers/${databaseName}/${username}`
    );
  }

  // ============================================
  // Network Access (IP Access List)
  // ============================================

  /**
   * Add entries to the IP access list
   */
  async addIpAccessListEntries(
    projectId: string,
    entries: IpAccessListEntry[]
  ): Promise<AtlasApiResponse<AtlasIpAccessListEntry[]>> {
    return this.request<AtlasIpAccessListEntry[]>(
      'POST',
      `/groups/${projectId}/accessList`,
      entries
    );
  }

  /**
   * Add a single IP to the access list
   */
  async addIpToAccessList(
    projectId: string,
    ip: string,
    comment?: string
  ): Promise<AtlasApiResponse<AtlasIpAccessListEntry[]>> {
    return this.addIpAccessListEntries(projectId, [
      {
        ipAddress: ip,
        comment: comment || `Added by FormBuilder at ${new Date().toISOString()}`,
      },
    ]);
  }

  /**
   * Allow access from any IP (0.0.0.0/0)
   * WARNING: This is insecure and should only be used for development
   */
  async allowAllIps(
    projectId: string,
    comment?: string
  ): Promise<AtlasApiResponse<AtlasIpAccessListEntry[]>> {
    return this.addIpAccessListEntries(projectId, [
      {
        cidrBlock: '0.0.0.0/0',
        comment: comment || 'Allow all IPs - FormBuilder provisioned cluster',
      },
    ]);
  }

  /**
   * Get IP access list
   */
  async getIpAccessList(
    projectId: string
  ): Promise<AtlasApiResponse<{ results: AtlasIpAccessListEntry[] }>> {
    return this.request<{ results: AtlasIpAccessListEntry[] }>(
      'GET',
      `/groups/${projectId}/accessList`
    );
  }

  /**
   * Delete an IP access list entry
   */
  async deleteIpAccessListEntry(
    projectId: string,
    entry: string  // IP address or CIDR block
  ): Promise<AtlasApiResponse<void>> {
    const encodedEntry = encodeURIComponent(entry);
    return this.request<void>('DELETE', `/groups/${projectId}/accessList/${encodedEntry}`);
  }

  // ============================================
  // Cluster Metrics & Monitoring
  // ============================================

  /**
   * Get cluster process metrics
   * Note: Only available for M10+ clusters (not M0)
   */
  async getClusterProcesses(
    projectId: string
  ): Promise<AtlasApiResponse<{ results: any[] }>> {
    return this.request<{ results: any[] }>(
      'GET',
      `/groups/${projectId}/processes`
    );
  }

  /**
   * Get cluster measurements/metrics
   * Note: Limited for M0 clusters
   */
  async getClusterMeasurements(
    projectId: string,
    clusterName: string,
    granularity: 'PT1M' | 'PT5M' | 'PT1H' | 'P1D' = 'PT1H',
    period: string = 'P1D'
  ): Promise<AtlasApiResponse<any>> {
    return this.request<any>(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/measurements?granularity=${granularity}&period=${period}`
    );
  }

  // ============================================
  // Database Information
  // ============================================

  /**
   * List all databases in a cluster
   */
  async listDatabases(
    projectId: string,
    clusterName: string
  ): Promise<AtlasApiResponse<{ results: Array<{ databaseName: string }> }>> {
    return this.request<{ results: Array<{ databaseName: string }> }>(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/databases`
    );
  }

  /**
   * List all collections in a database
   */
  async listCollections(
    projectId: string,
    clusterName: string,
    databaseName: string
  ): Promise<AtlasApiResponse<{ results: Array<{ name: string; type: string }> }>> {
    return this.request<{ results: Array<{ name: string; type: string }> }>(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/databases/${databaseName}/collections`
    );
  }

  // ============================================
  // Alerts Configuration
  // ============================================

  /**
   * Get alerts for a project
   */
  async getAlerts(
    projectId: string,
    status?: 'OPEN' | 'CLOSED' | 'ACKNOWLEDGED'
  ): Promise<AtlasApiResponse<{ results: any[] }>> {
    const query = status ? `?status=${status}` : '';
    return this.request<{ results: any[] }>(
      'GET',
      `/groups/${projectId}/alerts${query}`
    );
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    projectId: string,
    alertId: string,
    acknowledgedUntil?: string,
    acknowledgementComment?: string
  ): Promise<AtlasApiResponse<any>> {
    return this.request<any>(
      'PATCH',
      `/groups/${projectId}/alerts/${alertId}`,
      {
        acknowledgedUntil: acknowledgedUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        acknowledgementComment: acknowledgementComment || 'Acknowledged via FormBuilder',
      }
    );
  }

  // ============================================
  // Project Configuration
  // ============================================

  /**
   * Get project settings
   */
  async getProjectSettings(
    projectId: string
  ): Promise<AtlasApiResponse<any>> {
    return this.request<any>('GET', `/groups/${projectId}/settings`);
  }

  /**
   * Update project settings
   */
  async updateProjectSettings(
    projectId: string,
    settings: {
      isCollectDatabaseSpecificsStatisticsEnabled?: boolean;
      isDataExplorerEnabled?: boolean;
      isPerformanceAdvisorEnabled?: boolean;
      isRealtimePerformancePanelEnabled?: boolean;
      isSchemaAdvisorEnabled?: boolean;
    }
  ): Promise<AtlasApiResponse<any>> {
    return this.request<any>('PATCH', `/groups/${projectId}/settings`, settings);
  }

  // ============================================
  // Sample Data
  // ============================================

  /**
   * Load sample dataset into a cluster
   * Useful for demos and testing
   */
  async loadSampleData(
    projectId: string,
    clusterName: string
  ): Promise<AtlasApiResponse<any>> {
    return this.request<any>(
      'POST',
      `/groups/${projectId}/sampleDatasetLoad/${clusterName}`
    );
  }

  /**
   * Get sample dataset load status
   */
  async getSampleDataStatus(
    projectId: string,
    sampleDatasetId: string
  ): Promise<AtlasApiResponse<any>> {
    return this.request<any>(
      'GET',
      `/groups/${projectId}/sampleDatasetLoad/${sampleDatasetId}`
    );
  }

  // ============================================
  // Organization Invitations
  // ============================================

  /**
   * Invite a user to the Atlas organization with project-scoped roles
   * The user will receive an email from MongoDB Atlas to accept the invitation.
   * Once accepted, they can log into cloud.mongodb.com and see only the specified project.
   *
   * @param orgId - The Atlas organization ID (ATLAS_ORG_ID)
   * @param email - The email address of the user to invite
   * @param projectId - The Atlas project ID to grant access to
   * @param roles - Project-level roles to assign (default: GROUP_DATA_ACCESS_READ_WRITE)
   *
   * @see https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Organizations/operation/createOrganizationInvitation
   */
  async inviteUserToProject(
    orgId: string,
    email: string,
    projectId: string,
    roles: AtlasProjectRole[] = ['GROUP_DATA_ACCESS_READ_WRITE']
  ): Promise<AtlasApiResponse<AtlasInvitation>> {
    return this.request<AtlasInvitation>('POST', `/orgs/${orgId}/invitations`, {
      username: email,
      roles: [],  // No org-level roles - project-scoped only
      groupRoleAssignments: [{
        groupId: projectId,
        roles: roles,
      }],
    });
  }

  /**
   * Get all pending invitations for an organization
   */
  async getOrgInvitations(
    orgId: string
  ): Promise<AtlasApiResponse<{ results: AtlasInvitation[] }>> {
    return this.request<{ results: AtlasInvitation[] }>(
      'GET',
      `/orgs/${orgId}/invitations`
    );
  }

  /**
   * Get a specific invitation by ID
   */
  async getOrgInvitation(
    orgId: string,
    invitationId: string
  ): Promise<AtlasApiResponse<AtlasInvitation>> {
    return this.request<AtlasInvitation>(
      'GET',
      `/orgs/${orgId}/invitations/${invitationId}`
    );
  }

  /**
   * Delete/cancel a pending invitation
   */
  async deleteOrgInvitation(
    orgId: string,
    invitationId: string
  ): Promise<AtlasApiResponse<void>> {
    return this.request<void>(
      'DELETE',
      `/orgs/${orgId}/invitations/${invitationId}`
    );
  }
}

// ============================================
// Singleton Instance
// ============================================

let atlasClientInstance: AtlasApiClient | null = null;

/**
 * Get the Atlas API client singleton
 */
export function getAtlasClient(): AtlasApiClient {
  if (!atlasClientInstance) {
    atlasClientInstance = new AtlasApiClient();
  }
  return atlasClientInstance;
}

/**
 * Create a new Atlas API client with custom config
 */
export function createAtlasClient(config: AtlasApiConfig): AtlasApiClient {
  return new AtlasApiClient(config);
}

/**
 * Create an Atlas API client from stored integration credentials
 *
 * @param organizationId - The NetPad organization ID
 * @param credentialId - The integration credential ID
 * @returns The Atlas client and Atlas org ID, or null if credentials not found
 */
export async function createAtlasClientFromCredential(
  organizationId: string,
  credentialId: string
): Promise<{ client: AtlasApiClient; atlasOrgId: string } | null> {
  // Import dynamically to avoid circular dependencies
  const { getAtlasCredentials } = await import('@/lib/platform/integrationCredentials');

  const creds = await getAtlasCredentials(organizationId, credentialId);

  if (!creds) {
    console.warn(`[AtlasClient] Could not retrieve credentials for ${credentialId}`);
    return null;
  }

  const client = new AtlasApiClient({
    publicKey: creds.publicKey,
    privateKey: creds.privateKey,
  });

  return {
    client,
    atlasOrgId: creds.atlasOrgId,
  };
}
