/**
 * Atlas Cluster Provisioning Service
 *
 * Handles the complete flow of provisioning an M0 cluster for a new organization:
 * 1. Create Atlas project
 * 2. Create M0 cluster
 * 3. Create database user
 * 4. Configure network access
 * 5. Store connection in vault
 */

import { MongoClient, ObjectId } from 'mongodb';
import { getAtlasClient } from './client';
import {
  ProvisionClusterOptions,
  ProvisioningResult,
  ProvisioningStatus,
  ProvisionedCluster,
  ClusterBackingProvider,
  M0Region,
} from './types';
import { createConnectionVault, deleteVault } from '../platform/connectionVault';
import { getPlatformDb, getOrgDb, getUsersCollection, getAtlasInvitationsCollection } from '../platform/db';
import { inviteUserToAtlasProject, cancelAtlasInvitation } from './invitations';

// ============================================
// Configuration
// ============================================

const ATLAS_ORG_ID = process.env.ATLAS_ORG_ID || '';
const DEFAULT_PROVIDER = (process.env.ATLAS_DEFAULT_PROVIDER || 'AWS') as ClusterBackingProvider;
const DEFAULT_REGION = (process.env.ATLAS_DEFAULT_REGION || 'US_EAST_1') as M0Region;
const SERVER_IPS = process.env.ATLAS_SERVER_IPS?.split(',').filter(Boolean) || [];

// Log configuration at startup
console.log('[Atlas Provisioning] Configuration:', {
  orgId: ATLAS_ORG_ID ? `${ATLAS_ORG_ID.slice(0, 8)}...` : 'NOT SET',
  provider: DEFAULT_PROVIDER,
  region: DEFAULT_REGION,
  hasPublicKey: !!process.env.ATLAS_PUBLIC_KEY,
  hasPrivateKey: !!process.env.ATLAS_PRIVATE_KEY,
});

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * Generate a unique cluster name
 */
function generateClusterName(orgId: string): string {
  const suffix = orgId.slice(-6);
  return `forms-${suffix}`;
}

/**
 * Generate a database username
 */
function generateDbUsername(orgId: string): string {
  const suffix = orgId.slice(-8);
  return `netpad-${suffix}`;
}

/**
 * Build the connection string from cluster and user info
 */
function buildConnectionString(
  clusterSrvHost: string,
  username: string,
  password: string,
  database: string
): string {
  // The cluster.connectionStrings.standardSrv looks like: mongodb+srv://cluster.xxx.mongodb.net
  // We need to inject the username:password
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);

  // Extract the host from the SRV connection string
  const hostMatch = clusterSrvHost.match(/mongodb\+srv:\/\/(.+)/);
  const host = hostMatch ? hostMatch[1] : clusterSrvHost;

  return `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${database}?retryWrites=true&w=majority`;
}

// ============================================
// Provisioned Cluster Collection Operations
// ============================================

async function getProvisionedClustersCollection() {
  const db = await getPlatformDb();
  return db.collection<ProvisionedCluster>('provisioned_clusters');
}

/**
 * Create a new provisioned cluster record
 */
async function createProvisionedClusterRecord(
  data: Omit<ProvisionedCluster, '_id' | 'clusterId' | 'createdAt' | 'updatedAt'>
): Promise<ProvisionedCluster> {
  const collection = await getProvisionedClustersCollection();

  const clusterId = `cluster_${new ObjectId().toHexString()}`;
  const now = new Date();

  const record: ProvisionedCluster = {
    ...data,
    clusterId,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(record);
  return record;
}

/**
 * Update provisioned cluster status
 */
async function updateProvisionedClusterStatus(
  clusterId: string,
  status: ProvisioningStatus,
  updates: Partial<ProvisionedCluster> = {}
): Promise<void> {
  const collection = await getProvisionedClustersCollection();

  await collection.updateOne(
    { clusterId },
    {
      $set: {
        status,
        ...updates,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Get provisioned cluster for an organization
 */
export async function getProvisionedClusterForOrg(
  organizationId: string
): Promise<ProvisionedCluster | null> {
  const collection = await getProvisionedClustersCollection();
  return collection.findOne({
    organizationId,
    status: { $nin: ['deleted', 'failed'] },
  });
}

/**
 * Get all provisioned clusters (admin use)
 */
export async function getAllProvisionedClusters(): Promise<ProvisionedCluster[]> {
  const collection = await getProvisionedClustersCollection();
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

// ============================================
// Database Initialization
// ============================================

/**
 * Default collections to create in a newly provisioned database
 * These provide immediate value and show users where their data will go
 */
interface CollectionIndex {
  key: Record<string, 1 | -1>;
  name: string;
  unique?: boolean;
  sparse?: boolean;
}

interface DefaultCollection {
  name: string;
  description: string;
  indexes: CollectionIndex[];
}

const DEFAULT_COLLECTIONS: DefaultCollection[] = [
  {
    name: 'form_responses',
    description: 'Stores all form submission responses',
    indexes: [
      { key: { formId: 1, submittedAt: -1 }, name: 'formId_submittedAt' },
      { key: { submittedAt: -1 }, name: 'submittedAt' },
    ],
  },
  {
    name: 'contacts',
    description: 'Store contact information collected from forms',
    indexes: [
      { key: { email: 1 }, name: 'email', unique: true, sparse: true },
      { key: { createdAt: -1 }, name: 'createdAt' },
    ],
  },
  {
    name: 'workflow_data',
    description: 'Data produced by workflow executions',
    indexes: [
      { key: { workflowId: 1, createdAt: -1 }, name: 'workflowId_createdAt' },
    ],
  },
];

/**
 * Initialize a newly provisioned database with default collections
 * This helps users understand where their data will be stored
 */
async function initializeDefaultCollections(
  connectionString: string,
  databaseName: string
): Promise<void> {
  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    const db = client.db(databaseName);

    for (const collectionDef of DEFAULT_COLLECTIONS) {
      try {
        // Create collection (this is idempotent - won't fail if exists)
        const collection = await db.createCollection(collectionDef.name);

        // Create indexes
        for (const indexDef of collectionDef.indexes) {
          const { key, name, ...options } = indexDef;
          await collection.createIndex(key, { name, ...options });
        }

        // Insert a welcome document to make the collection visible
        await collection.insertOne({
          _netpad_init: true,
          _description: collectionDef.description,
          _createdAt: new Date(),
          _message: `This collection was automatically created for you. You can delete this document once you start adding real data.`,
        });

        console.log(`[Provisioning] Created collection: ${collectionDef.name}`);
      } catch (collError: any) {
        // Collection might already exist, that's fine
        if (collError.code !== 48) { // 48 = NamespaceExists
          console.warn(`[Provisioning] Warning creating ${collectionDef.name}:`, collError.message);
        }
      }
    }
  } finally {
    await client.close();
  }
}

// ============================================
// Main Provisioning Function
// ============================================

/**
 * Provision a new M0 cluster for an organization
 *
 * This is the main entry point for cluster provisioning.
 * It handles the complete flow and tracks progress.
 */
export async function provisionM0Cluster(
  options: ProvisionClusterOptions
): Promise<ProvisioningResult> {
  console.log('[Provisioning] Starting M0 cluster provisioning for org:', options.organizationId);

  const client = getAtlasClient();

  // Check if Atlas API is configured
  if (!client.isConfigured()) {
    console.error('[Provisioning] Atlas API not configured!', {
      hasPublicKey: !!process.env.ATLAS_PUBLIC_KEY,
      hasPrivateKey: !!process.env.ATLAS_PRIVATE_KEY,
    });
    return {
      success: false,
      status: 'failed',
      error: 'Atlas API not configured. Set ATLAS_PUBLIC_KEY and ATLAS_PRIVATE_KEY.',
    };
  }

  if (!ATLAS_ORG_ID) {
    console.error('[Provisioning] ATLAS_ORG_ID not configured!');
    return {
      success: false,
      status: 'failed',
      error: 'Atlas organization ID not configured. Set ATLAS_ORG_ID.',
    };
  }

  console.log('[Provisioning] Configuration validated, proceeding with Atlas org:', ATLAS_ORG_ID);

  const {
    organizationId,
    userId,
    clusterName = generateClusterName(organizationId),
    provider = DEFAULT_PROVIDER,
    region = DEFAULT_REGION,
    databaseName = 'forms',
  } = options;

  // Check if org already has a cluster
  const existingCluster = await getProvisionedClusterForOrg(organizationId);
  if (existingCluster) {
    return {
      success: false,
      status: existingCluster.status,
      clusterId: existingCluster.clusterId,
      vaultId: existingCluster.vaultId,
      error: 'Organization already has a provisioned cluster',
    };
  }

  // Create initial tracking record
  const projectName = `netpad-${organizationId.slice(-8)}`;
  const clusterRecord = await createProvisionedClusterRecord({
    organizationId,
    atlasProjectId: '',
    atlasProjectName: projectName,
    atlasClusterName: clusterName,
    provider,
    region,
    instanceSize: 'M0',
    status: 'pending',
    provisioningStartedAt: new Date(),
    storageLimitMb: 512,
    maxConnections: 500,
    createdBy: userId,
  });

  try {
    // Step 1: Create or reuse Atlas Project
    console.log(`[Provisioning] Setting up Atlas project: ${projectName}`);
    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_project');

    let atlasProjectId: string;

    // First, check if a project with this name already exists (e.g., from a previous deleted cluster)
    const existingProjectResult = await client.getProjectByName(ATLAS_ORG_ID, projectName);

    if (existingProjectResult.success && existingProjectResult.data) {
      // Reuse existing project
      atlasProjectId = existingProjectResult.data.id || (existingProjectResult.data as any).groupId;
      console.log(`[Provisioning] Found existing Atlas project: ${projectName} (${atlasProjectId}), reusing it`);
    } else {
      // Create new project
      console.log(`[Provisioning] Creating new Atlas project: ${projectName}`);
      const projectResult = await client.createProject({
        name: projectName,
        orgId: ATLAS_ORG_ID,
      });

      console.log('[Provisioning] Project creation result:', JSON.stringify(projectResult, null, 2));
      if (!projectResult.success) {
        throw new Error(projectResult.error?.detail || 'Failed to create Atlas project');
      }

      if (!projectResult.data) {
        throw new Error('Atlas API returned success but no project data');
      }

      // Atlas API may return 'id' or 'groupId' for the project ID
      atlasProjectId = projectResult.data.id || (projectResult.data as any).groupId;
      if (!atlasProjectId) {
        console.error('[Provisioning] Project data missing ID:', projectResult.data);
        throw new Error('Atlas project created but no project ID returned');
      }

      console.log('[Provisioning] Created Atlas project with ID:', atlasProjectId);
    }

    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_project', {
      atlasProjectId,
    });

    // Step 2: Create or reuse M0 Cluster
    console.log(`[Provisioning] Setting up M0 cluster: ${clusterName}`);
    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_cluster');

    let connectionStringSrv: string;
    let atlasClusterId: string | undefined;
    let actualClusterName = clusterName;

    // First, check if any cluster already exists in this project (Atlas allows only 1 M0 per project)
    const existingClustersResult = await client.listClusters(atlasProjectId);

    if (existingClustersResult.success && existingClustersResult.data && existingClustersResult.data.length > 0) {
      // Reuse existing cluster
      const existingCluster = existingClustersResult.data[0];
      actualClusterName = existingCluster.name;
      atlasClusterId = existingCluster.id;
      console.log(`[Provisioning] Found existing cluster: ${actualClusterName} (${atlasClusterId}), reusing it`);

      // Update the cluster record with the actual cluster name
      await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_cluster', {
        atlasClusterName: actualClusterName,
        atlasClusterId,
      });

      // Wait for cluster to be ready (in case it's still initializing)
      if (existingCluster.stateName !== 'IDLE') {
        console.log(`[Provisioning] Existing cluster state: ${existingCluster.stateName}, waiting for ready...`);
        const readyResult = await client.waitForClusterReady(atlasProjectId, actualClusterName, 120000);
        if (!readyResult.success || !readyResult.data) {
          throw new Error(readyResult.error?.detail || 'Existing cluster did not become ready');
        }
        connectionStringSrv = readyResult.data.connectionStrings?.standardSrv || '';
      } else {
        connectionStringSrv = existingCluster.connectionStrings?.standardSrv || '';
      }
    } else {
      // Create new cluster
      console.log(`[Provisioning] Creating new M0 cluster: ${clusterName}`);

      // M0 free tier clusters use the providerSettings format (not replicationSpecs)
      const clusterInput = {
        name: clusterName,
        providerSettings: {
          providerName: 'TENANT' as const,
          backingProviderName: provider,
          regionName: region,
          instanceSizeName: 'M0' as const,
        },
      };
      console.log('[Provisioning] Cluster creation input:', JSON.stringify(clusterInput, null, 2));

      const clusterResult = await client.createM0Cluster(atlasProjectId, clusterInput);

      if (!clusterResult.success || !clusterResult.data) {
        throw new Error(clusterResult.error?.detail || 'Failed to create M0 cluster');
      }

      atlasClusterId = clusterResult.data.id;
      await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_cluster', {
        atlasClusterId,
      });

      // Wait for cluster to be ready
      console.log('[Provisioning] Waiting for cluster to be ready...');
      const readyResult = await client.waitForClusterReady(atlasProjectId, clusterName, 120000);

      if (!readyResult.success || !readyResult.data) {
        throw new Error(readyResult.error?.detail || 'Cluster did not become ready');
      }

      connectionStringSrv = readyResult.data.connectionStrings?.standardSrv || '';
    }

    if (!connectionStringSrv) {
      throw new Error('Cluster ready but no connection string available');
    }

    // Step 4: Create or update Database User
    console.log('[Provisioning] Setting up database user');
    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_user');

    const dbUsername = generateDbUsername(organizationId);
    const dbPassword = generateSecurePassword();

    const userResult = await client.createDatabaseUser(atlasProjectId, {
      username: dbUsername,
      password: dbPassword,
      roles: [
        {
          roleName: 'readWrite',
          databaseName: databaseName,
        },
      ],
      scopes: [
        {
          name: actualClusterName,
          type: 'CLUSTER',
        },
      ],
    });

    if (!userResult.success) {
      // Check if user already exists (from a previous deleted cluster)
      if (userResult.error?.errorCode === 'USER_ALREADY_EXISTS') {
        console.log(`[Provisioning] User ${dbUsername} already exists, updating password and roles`);
        const updateResult = await client.updateDatabaseUser(atlasProjectId, 'admin', dbUsername, {
          password: dbPassword,
          roles: [
            {
              roleName: 'readWrite',
              databaseName: databaseName,
            },
          ],
          scopes: [
            {
              name: actualClusterName,
              type: 'CLUSTER',
            },
          ],
        });

        if (!updateResult.success) {
          throw new Error(updateResult.error?.detail || 'Failed to update existing database user');
        }
        console.log(`[Provisioning] Successfully updated existing user ${dbUsername}`);
      } else {
        throw new Error(userResult.error?.detail || 'Failed to create database user');
      }
    }

    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'creating_user', {
      databaseUsername: dbUsername,
    });

    // Step 5: Configure Network Access
    console.log('[Provisioning] Configuring network access');
    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'configuring_network');

    if (SERVER_IPS.length > 0) {
      // Add specific server IPs
      const ipEntries = SERVER_IPS.map((ip) => ({
        ipAddress: ip.trim(),
        comment: 'FormBuilder server',
      }));
      await client.addIpAccessListEntries(atlasProjectId, ipEntries);
    } else {
      // Allow all IPs (for development/simplicity)
      await client.allowAllIps(atlasProjectId, 'FormBuilder - Allow all (provisioned cluster)');
    }

    // Step 6: Build connection string and store in vault
    console.log('[Provisioning] Storing connection in vault');
    const connectionString = buildConnectionString(
      connectionStringSrv,
      dbUsername,
      dbPassword,
      databaseName
    );

    const vault = await createConnectionVault({
      organizationId,
      createdBy: 'system',
      name: 'Default Database (Auto-provisioned)',
      description: `M0 cluster automatically provisioned on ${new Date().toLocaleDateString()}`,
      connectionString,
      database: databaseName,
      allowedCollections: [], // Allow all collections
    });

    // Step 7: Invite user to Atlas console
    // This allows them to log into cloud.mongodb.com and see their cluster
    console.log('[Provisioning] Inviting user to Atlas console');
    let atlasInvitationId: string | undefined;

    try {
      const usersCollection = await getUsersCollection();
      const user = await usersCollection.findOne({ userId });

      if (user?.email) {
        const inviteResult = await inviteUserToAtlasProject({
          organizationId,
          atlasProjectId,
          email: user.email,
          userId,
          role: 'GROUP_DATA_ACCESS_READ_WRITE',
        });

        if (inviteResult.success) {
          atlasInvitationId = inviteResult.invitationId;
          console.log(`[Provisioning] Atlas invitation sent to ${user.email}`);
        } else {
          // Don't fail provisioning if invite fails - just log warning
          console.warn(`[Provisioning] Failed to invite user to Atlas: ${inviteResult.error}`);
        }
      } else {
        console.warn('[Provisioning] Could not invite user to Atlas - no email found');
      }
    } catch (inviteError: any) {
      // Don't fail provisioning if invitation fails
      console.warn('[Provisioning] Error sending Atlas invitation:', inviteError.message);
    }

    // Step 8: Initialize database with default collections
    console.log('[Provisioning] Initializing database with default collections');
    try {
      await initializeDefaultCollections(connectionString, databaseName);
      console.log('[Provisioning] Default collections created');
    } catch (initError: any) {
      // Don't fail provisioning if collection initialization fails
      console.warn('[Provisioning] Warning: Failed to initialize collections:', initError.message);
    }

    // Step 9: Mark as ready
    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'ready', {
      vaultId: vault.vaultId,
      atlasInvitationId,
      provisioningCompletedAt: new Date(),
    });

    console.log(`[Provisioning] Successfully provisioned cluster for org ${organizationId}`);

    return {
      success: true,
      clusterId: clusterRecord.clusterId,
      vaultId: vault.vaultId,
      connectionString: '[REDACTED]', // Never expose connection string
      status: 'ready',
    };
  } catch (error: any) {
    console.error('[Provisioning] Error:', error);

    await updateProvisionedClusterStatus(clusterRecord.clusterId, 'failed', {
      statusMessage: error.message,
    });

    return {
      success: false,
      clusterId: clusterRecord.clusterId,
      status: 'failed',
      error: error.message,
    };
  }
}

// ============================================
// Background Provisioning
// ============================================

/**
 * Queue cluster provisioning to run in background
 *
 * This is useful when you don't want to block the user during signup.
 * The provisioning will happen asynchronously and the user can check status.
 */
export async function queueClusterProvisioning(
  options: ProvisionClusterOptions
): Promise<{ clusterId: string; status: ProvisioningStatus }> {
  console.log('[Provisioning] Queueing cluster provisioning for org:', options.organizationId);

  const client = getAtlasClient();

  // Check if Atlas API is configured
  if (!client.isConfigured()) {
    console.error('[Provisioning] Queue failed - Atlas API not configured');
    return {
      clusterId: '',
      status: 'failed',
    };
  }

  // Start provisioning directly (provisionM0Cluster handles record creation)
  // Run in background but log errors
  console.log('[Provisioning] Starting background provisioning...');
  provisionM0Cluster(options)
    .then((result) => {
      console.log('[Provisioning] Background provisioning completed:', result);
    })
    .catch((err) => {
      console.error('[Provisioning] Background provisioning failed:', err);
    });

  return {
    clusterId: 'pending',
    status: 'pending',
  };
}

// ============================================
// Cluster Management
// ============================================

/**
 * Get provisioning status for an organization
 */
export async function getProvisioningStatus(
  organizationId: string
): Promise<{ status: ProvisioningStatus; message?: string; vaultId?: string } | null> {
  const cluster = await getProvisionedClusterForOrg(organizationId);

  if (!cluster) {
    return null;
  }

  return {
    status: cluster.status,
    message: cluster.statusMessage,
    vaultId: cluster.vaultId,
  };
}

/**
 * Check if auto-provisioning is available
 */
export function isAutoProvisioningAvailable(): boolean {
  const client = getAtlasClient();
  return client.isConfigured() && !!ATLAS_ORG_ID;
}

/**
 * Initialize database for an existing cluster that doesn't have a vault
 *
 * This is a repair function for clusters that were provisioned but:
 * - Don't have a vaultId set
 * - Don't have default collections created
 *
 * It will:
 * 1. Get the cluster connection details from Atlas
 * 2. Create a new vault entry
 * 3. Initialize default collections
 * 4. Update the cluster record with the vaultId
 */
export async function initializeClusterDatabase(
  organizationId: string,
  userId: string
): Promise<{
  success: boolean;
  vaultId?: string;
  collectionsCreated?: string[];
  error?: string;
}> {
  console.log(`[Provisioning] Initializing database for org ${organizationId}`);

  const cluster = await getProvisionedClusterForOrg(organizationId);
  if (!cluster) {
    return { success: false, error: 'No cluster found' };
  }

  if (cluster.status !== 'ready') {
    return { success: false, error: `Cluster not ready: ${cluster.status}` };
  }

  // If already has a vault, verify it exists and works
  if (cluster.vaultId) {
    console.log(`[Provisioning] Cluster has vault ${cluster.vaultId}, verifying...`);
    // Check if the vault actually exists and has a working connection
    try {
      const db = await getPlatformDb();
      const vaultsCollection = db.collection('connection_vaults');
      const existingVault = await vaultsCollection.findOne({
        vaultId: cluster.vaultId,
        organizationId,
        status: 'active',
      });

      if (existingVault) {
        console.log(`[Provisioning] Vault ${cluster.vaultId} is valid`);
        return { success: true, vaultId: cluster.vaultId, collectionsCreated: [] };
      }

      console.log(`[Provisioning] Vault ${cluster.vaultId} not found or inactive, will create new one`);
      // Clear the stale vaultId so we create a new one
    } catch (vaultCheckError: any) {
      console.warn(`[Provisioning] Error checking vault: ${vaultCheckError.message}, will create new one`);
    }
  }

  const client = getAtlasClient();
  if (!client.isConfigured()) {
    return { success: false, error: 'Atlas API not configured' };
  }

  try {
    // We need to get the connection string from Atlas
    // First get the cluster details
    if (!cluster.atlasProjectId || !cluster.atlasClusterName) {
      return { success: false, error: 'Cluster missing Atlas project or cluster name' };
    }

    // Get cluster from Atlas to get connection string
    const clusterResult = await client.getCluster(cluster.atlasProjectId, cluster.atlasClusterName);
    if (!clusterResult.success || !clusterResult.data) {
      return { success: false, error: 'Failed to get cluster from Atlas' };
    }

    const connectionStringSrv = clusterResult.data.connectionStrings?.standardSrv;
    if (!connectionStringSrv) {
      return { success: false, error: 'No connection string available from Atlas' };
    }

    // Create a new database user (since we don't have the password from the old one)
    const dbUsername = generateDbUsername(organizationId);
    const dbPassword = generateSecurePassword();
    const databaseName = 'forms';

    console.log(`[Provisioning] Creating new database user: ${dbUsername}`);

    const userResult = await client.createDatabaseUser(cluster.atlasProjectId, {
      username: dbUsername,
      password: dbPassword,
      roles: [
        {
          roleName: 'readWrite',
          databaseName: databaseName,
        },
      ],
      scopes: [
        {
          name: cluster.atlasClusterName,
          type: 'CLUSTER',
        },
      ],
    });

    if (!userResult.success) {
      // User might already exist, try with a different name
      const altUsername = `${dbUsername}_${Date.now().toString(36)}`;
      console.log(`[Provisioning] User might exist, trying: ${altUsername}`);

      const altUserResult = await client.createDatabaseUser(cluster.atlasProjectId, {
        username: altUsername,
        password: dbPassword,
        roles: [{ roleName: 'readWrite', databaseName }],
        scopes: [{ name: cluster.atlasClusterName, type: 'CLUSTER' }],
      });

      if (!altUserResult.success) {
        return { success: false, error: 'Failed to create database user' };
      }
    }

    const finalUsername = userResult.success ? dbUsername : `${dbUsername}_${Date.now().toString(36)}`;

    // Build connection string
    const connectionString = buildConnectionString(
      connectionStringSrv,
      finalUsername,
      dbPassword,
      databaseName
    );

    // Create vault entry
    console.log(`[Provisioning] Creating vault entry for org ${organizationId}`);
    const vault = await createConnectionVault({
      organizationId,
      createdBy: userId,
      name: 'Default Database (Auto-provisioned)',
      description: `M0 cluster database initialized on ${new Date().toLocaleDateString()}`,
      connectionString,
      database: databaseName,
      allowedCollections: [],
    });

    // Initialize default collections
    console.log(`[Provisioning] Initializing default collections`);
    const collectionsCreated: string[] = [];
    try {
      await initializeDefaultCollections(connectionString, databaseName);
      collectionsCreated.push('form_responses', 'contacts', 'workflow_data');
    } catch (collError: any) {
      console.warn(`[Provisioning] Warning: Could not create collections: ${collError.message}`);
    }

    // Update cluster record with vaultId
    const collection = await getProvisionedClustersCollection();
    await collection.updateOne(
      { clusterId: cluster.clusterId },
      {
        $set: {
          vaultId: vault.vaultId,
          databaseUsername: finalUsername,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`[Provisioning] Database initialized successfully for org ${organizationId}`);

    return {
      success: true,
      vaultId: vault.vaultId,
      collectionsCreated,
    };
  } catch (error: any) {
    console.error(`[Provisioning] Error initializing database:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a provisioned cluster and all associated resources
 *
 * This will:
 * 1. Cancel any pending Atlas console invitations
 * 2. Delete the cluster from Atlas
 * 3. Delete the Atlas project
 * 4. Delete the connection vault
 * 5. Mark the provisioned cluster record as deleted
 */
export async function deleteProvisionedCluster(
  organizationId: string,
  deletedBy: string
): Promise<{ success: boolean; error?: string }> {
  const cluster = await getProvisionedClusterForOrg(organizationId);

  if (!cluster) {
    return { success: false, error: 'No provisioned cluster found' };
  }

  console.log(`[Provisioning] Deleting cluster ${cluster.clusterId} for org ${organizationId}`);

  const client = getAtlasClient();
  const errors: string[] = [];

  try {
    // Step 1: Cancel any pending Atlas console invitations
    console.log('[Provisioning] Cancelling Atlas invitations...');
    try {
      const invitationsCollection = await getAtlasInvitationsCollection();
      const pendingInvitations = await invitationsCollection
        .find({ organizationId, status: 'pending' })
        .toArray();

      for (const invitation of pendingInvitations) {
        try {
          await cancelAtlasInvitation(invitation.invitationId);
          console.log(`[Provisioning] Cancelled invitation ${invitation.invitationId}`);
        } catch (inviteError: any) {
          console.warn(`[Provisioning] Failed to cancel invitation ${invitation.invitationId}:`, inviteError.message);
          // Continue with other cleanup even if invitation cancellation fails
        }
      }
    } catch (inviteError: any) {
      console.warn('[Provisioning] Error cancelling invitations:', inviteError.message);
      errors.push(`Failed to cancel invitations: ${inviteError.message}`);
    }

    // Step 2: Delete the cluster from Atlas
    if (cluster.atlasProjectId && cluster.atlasClusterName) {
      console.log(`[Provisioning] Deleting Atlas cluster ${cluster.atlasClusterName}...`);
      try {
        const deleteResult = await client.deleteCluster(cluster.atlasProjectId, cluster.atlasClusterName);
        if (!deleteResult.success && deleteResult.error?.error !== 404) {
          errors.push(`Failed to delete cluster: ${deleteResult.error?.detail}`);
        }
      } catch (clusterError: any) {
        console.warn('[Provisioning] Error deleting cluster:', clusterError.message);
        errors.push(`Failed to delete cluster: ${clusterError.message}`);
      }
    }

    // Step 3: Wait a moment for cluster deletion to register, then delete the project
    if (cluster.atlasProjectId) {
      console.log(`[Provisioning] Deleting Atlas project ${cluster.atlasProjectId}...`);
      // Wait briefly for cluster deletion to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const deleteProjectResult = await client.deleteProject(cluster.atlasProjectId);
        if (!deleteProjectResult.success && deleteProjectResult.error?.error !== 404) {
          errors.push(`Failed to delete project: ${deleteProjectResult.error?.detail}`);
        }
      } catch (projectError: any) {
        console.warn('[Provisioning] Error deleting project:', projectError.message);
        errors.push(`Failed to delete project: ${projectError.message}`);
      }
    }

    // Step 4: Delete the connection vault
    if (cluster.vaultId) {
      console.log(`[Provisioning] Deleting connection vault ${cluster.vaultId}...`);
      try {
        await deleteVault(organizationId, cluster.vaultId, deletedBy);
      } catch (vaultError: any) {
        console.warn('[Provisioning] Error deleting vault:', vaultError.message);
        errors.push(`Failed to delete vault: ${vaultError.message}`);
      }
    }

    // Step 5: Mark the provisioned cluster record as deleted
    await updateProvisionedClusterStatus(cluster.clusterId, 'deleted', {
      deletedAt: new Date(),
      statusMessage: errors.length > 0 ? `Deleted with warnings: ${errors.join('; ')}` : 'Deleted successfully',
    });

    console.log(`[Provisioning] Cluster ${cluster.clusterId} deleted`);

    if (errors.length > 0) {
      return {
        success: true,
        error: `Cluster deleted with some warnings: ${errors.join('; ')}`
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Provisioning] Error deleting cluster:', error);

    // Still try to mark as deleted even if cleanup failed
    try {
      await updateProvisionedClusterStatus(cluster.clusterId, 'deleted', {
        deletedAt: new Date(),
        statusMessage: `Deletion failed: ${error.message}`,
      });
    } catch (updateError) {
      console.error('[Provisioning] Failed to update cluster status:', updateError);
    }

    return { success: false, error: error.message };
  }
}
