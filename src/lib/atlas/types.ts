/**
 * MongoDB Atlas Admin API Types
 *
 * Types for interacting with the Atlas Administration API v2
 * for programmatic cluster and user management.
 */

// ============================================
// Atlas API Configuration
// ============================================

export interface AtlasApiConfig {
  publicKey: string;
  privateKey: string;
  baseUrl?: string;  // Defaults to https://cloud.mongodb.com/api/atlas/v2
}

// ============================================
// Projects (Groups)
// ============================================

export interface AtlasProject {
  id: string;
  name: string;
  orgId: string;
  clusterCount: number;
  created: string;
}

export interface CreateProjectInput {
  name: string;
  orgId: string;
}

// ============================================
// Clusters
// ============================================

export type ClusterProviderName = 'TENANT' | 'AWS' | 'GCP' | 'AZURE';
export type ClusterBackingProvider = 'AWS' | 'GCP' | 'AZURE';
export type ClusterInstanceSize = 'M0' | 'M2' | 'M5' | 'M10' | 'M20' | 'M30' | 'M40' | 'M50' | 'M60';
export type ClusterState = 'CREATING' | 'UPDATING' | 'DELETING' | 'DELETED' | 'IDLE' | 'REPAIRING';

// AWS regions that support M0
export type AwsM0Region =
  | 'US_EAST_1'
  | 'US_WEST_2'
  | 'EU_WEST_1'
  | 'EU_CENTRAL_1'
  | 'AP_SOUTH_1'
  | 'AP_SOUTHEAST_1'
  | 'AP_SOUTHEAST_2';

// GCP regions that support M0
export type GcpM0Region =
  | 'CENTRAL_US'
  | 'EASTERN_US'
  | 'WESTERN_US'
  | 'WESTERN_EUROPE'
  | 'EASTERN_ASIA_PACIFIC'
  | 'SOUTHEASTERN_ASIA_PACIFIC';

// Azure regions that support M0
export type AzureM0Region =
  | 'US_EAST_2'
  | 'US_WEST_2'
  | 'EUROPE_NORTH'
  | 'EUROPE_WEST';

export type M0Region = AwsM0Region | GcpM0Region | AzureM0Region;

export interface ClusterProviderSettings {
  providerName: ClusterProviderName;
  backingProviderName?: ClusterBackingProvider;  // Required for TENANT (M0)
  regionName: string;
  instanceSizeName: ClusterInstanceSize;
}

export interface AtlasCluster {
  id: string;
  name: string;
  groupId: string;  // Project ID
  stateName: ClusterState;
  clusterType: 'REPLICASET' | 'SHARDED';
  mongoDBVersion: string;
  mongoDBMajorVersion: string;
  providerSettings: ClusterProviderSettings;
  connectionStrings?: {
    standard?: string;
    standardSrv?: string;
  };
  createDate: string;
  paused?: boolean;
}

export interface CreateM0ClusterInput {
  name: string;
  clusterType?: 'REPLICASET';
  replicationFactor?: number;
  numShards?: number;
  // For older API format
  providerSettings?: {
    providerName: 'TENANT';
    backingProviderName: ClusterBackingProvider;
    regionName: M0Region;
    instanceSizeName: 'M0';
  };
  // For newer API format (v2)
  replicationSpecs?: Array<{
    numShards?: number;
    regionConfigs: Array<{
      providerName: ClusterBackingProvider;
      regionName: string;
      priority?: number;
      electableSpecs?: {
        instanceSize: 'M0';
        nodeCount?: number;
      };
    }>;
  }>;
}

// ============================================
// Database Users
// ============================================

export type DatabaseUserRole =
  | 'atlasAdmin'
  | 'readWriteAnyDatabase'
  | 'readAnyDatabase'
  | 'read'
  | 'readWrite'
  | 'dbAdmin'
  | 'dbAdminAnyDatabase'
  | 'clusterMonitor';

export interface DatabaseUserRoleAssignment {
  roleName: DatabaseUserRole | string;  // Can be built-in or custom role
  databaseName: string;
  collectionName?: string;
}

export interface DatabaseUserScope {
  name: string;  // Cluster name
  type: 'CLUSTER' | 'DATA_LAKE';
}

export interface AtlasDatabaseUser {
  username: string;
  groupId: string;
  databaseName: string;  // 'admin' for SCRAM, '$external' for other auth
  roles: DatabaseUserRoleAssignment[];
  scopes?: DatabaseUserScope[];
  deleteAfterDate?: string;
  awsIAMType?: 'NONE' | 'USER' | 'ROLE';
  x509Type?: 'NONE' | 'MANAGED' | 'CUSTOMER';
  ldapAuthType?: 'NONE' | 'USER' | 'GROUP';
  oidcAuthType?: 'NONE' | 'IDP_GROUP' | 'USER';
}

export interface CreateDatabaseUserInput {
  username: string;
  password: string;
  roles: DatabaseUserRoleAssignment[];
  scopes?: DatabaseUserScope[];
  deleteAfterDate?: string;  // ISO 8601 date (within 7 days for temp users)
  description?: string;
}

// ============================================
// Network Access (IP Access List)
// ============================================

export interface IpAccessListEntry {
  ipAddress?: string;     // Single IP, mutually exclusive with cidrBlock
  cidrBlock?: string;     // CIDR range, mutually exclusive with ipAddress
  awsSecurityGroup?: string;  // AWS SG, mutually exclusive with above
  comment?: string;
  deleteAfterDate?: string;  // ISO 8601 (for temporary access)
}

export interface AtlasIpAccessListEntry extends IpAccessListEntry {
  groupId: string;
  created?: string;
}

// ============================================
// Provisioned Cluster (Our Platform Tracking)
// ============================================

export type ProvisioningStatus =
  | 'pending'
  | 'creating_project'
  | 'creating_cluster'
  | 'creating_user'
  | 'configuring_network'
  | 'ready'
  | 'failed'
  | 'deleted';

export interface ProvisionedCluster {
  _id?: any;
  clusterId: string;                    // Our internal ID: "cluster_abc123"
  organizationId: string;               // Our org ID

  // Atlas identifiers
  atlasProjectId: string;
  atlasProjectName: string;
  atlasClusterId?: string;
  atlasClusterName: string;

  // Connection details (stored encrypted via vault)
  vaultId?: string;                     // Reference to connection vault

  // Atlas console access
  atlasInvitationId?: string;           // Reference to our atlas_invitations record

  // Configuration
  provider: ClusterBackingProvider;
  region: M0Region;
  instanceSize: 'M0';                   // Only M0 for now

  // Status tracking
  status: ProvisioningStatus;
  statusMessage?: string;
  provisioningStartedAt: Date;
  provisioningCompletedAt?: Date;

  // Database user created for this cluster
  databaseUsername?: string;

  // Limits
  storageLimitMb: number;               // 512 for M0
  maxConnections: number;               // 500 for M0

  // Ownership
  createdBy: string;                    // User who triggered provisioning
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================
// API Response Types
// ============================================

export interface AtlasApiError {
  error: number;
  errorCode: string;
  detail: string;
  reason?: string;
}

export interface AtlasApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AtlasApiError;
}

// ============================================
// Provisioning Options
// ============================================

export interface ProvisionClusterOptions {
  organizationId: string;               // Our org ID
  userId: string;                       // User triggering provisioning
  clusterName?: string;                 // Optional custom name
  provider?: ClusterBackingProvider;    // Default: AWS
  region?: M0Region;                    // Default: US_EAST_1
  databaseName?: string;                // Default: 'forms'
}

export interface ProvisioningResult {
  success: boolean;
  clusterId?: string;
  vaultId?: string;
  connectionString?: string;
  error?: string;
  status: ProvisioningStatus;
}

// ============================================
// Organization Invitations
// ============================================

/**
 * Atlas organization-level roles
 * @see https://www.mongodb.com/docs/atlas/reference/user-roles/#organization-roles
 */
export type AtlasOrgRole =
  | 'ORG_OWNER'
  | 'ORG_GROUP_CREATOR'
  | 'ORG_BILLING_ADMIN'
  | 'ORG_BILLING_READ_ONLY'
  | 'ORG_READ_ONLY'
  | 'ORG_MEMBER';

/**
 * Atlas project-level roles
 * @see https://www.mongodb.com/docs/atlas/reference/user-roles/#project-roles
 */
export type AtlasProjectRole =
  | 'GROUP_CLUSTER_MANAGER'
  | 'GROUP_DATA_ACCESS_ADMIN'
  | 'GROUP_DATA_ACCESS_READ_WRITE'
  | 'GROUP_DATA_ACCESS_READ_ONLY'
  | 'GROUP_READ_ONLY'
  | 'GROUP_OWNER';

/**
 * Project role assignment for an invitation
 */
export interface AtlasGroupRoleAssignment {
  groupId: string;  // Atlas project ID
  roles: AtlasProjectRole[];
}

/**
 * Input for creating an Atlas organization invitation
 */
export interface CreateAtlasInvitationInput {
  username: string;  // Email address of invitee
  roles?: AtlasOrgRole[];  // Org-level roles (empty for project-only access)
  groupRoleAssignments: AtlasGroupRoleAssignment[];
}

/**
 * Atlas invitation as returned by the API
 */
export interface AtlasInvitation {
  id: string;
  groupRoleAssignments: AtlasGroupRoleAssignment[];
  createdAt: string;
  expiresAt: string;
  inviterUsername: string;
  username: string;  // Invitee email
  roles: AtlasOrgRole[];
}
