/**
 * Platform Database Connection
 *
 * Manages connections to:
 * 1. Platform database (shared) - users, organizations, rate limits
 * 2. Organization databases (isolated) - forms, submissions, connections
 */

import { MongoClient, Db, Collection } from 'mongodb';
import {
  Organization,
  PlatformUser,
  RateLimitEntry,
  OAuthState,
  OrgInvitation,
  AuditLogEntry,
  OrganizationUsage,
  BillingEvent,
  AtlasInvitationRecord,
} from '@/types/platform';

// Connection pool
let platformClient: MongoClient | null = null;
const orgClients: Map<string, MongoClient> = new Map();

// Database names
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

/**
 * Get the MongoDB URI for the platform
 */
function getPlatformUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  return uri;
}

/**
 * Get or create platform database connection
 */
export async function getPlatformDb(): Promise<Db> {
  if (!platformClient) {
    const uri = getPlatformUri();
    platformClient = new MongoClient(uri);
    await platformClient.connect();
    console.log('[Platform DB] Connected to platform database');

    // Create indexes on first connection
    const db = platformClient.db(PLATFORM_DB_NAME);
    await createPlatformIndexes(db);
  }

  return platformClient.db(PLATFORM_DB_NAME);
}

/**
 * Get organization-specific database
 * Database name format: org_{orgId}
 */
export async function getOrgDb(orgId: string): Promise<Db> {
  // Validate orgId format
  if (!orgId || !/^org_[a-zA-Z0-9_-]+$/.test(orgId)) {
    throw new Error(`Invalid organization ID format: ${orgId}`);
  }

  const dbName = orgId; // org_abc123 -> database name

  // Check if we have an existing client
  let client = orgClients.get(orgId);

  if (!client) {
    const uri = getPlatformUri();
    client = new MongoClient(uri);
    await client.connect();
    orgClients.set(orgId, client);
    console.log(`[Org DB] Connected to organization database: ${dbName}`);

    // Create indexes on first connection
    const db = client.db(dbName);
    await createOrgIndexes(db);
  }

  return client.db(dbName);
}

/**
 * Create indexes for platform database
 */
async function createPlatformIndexes(db: Db): Promise<void> {
  try {
    // Users collection
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ userId: 1 }, { unique: true });
    await users.createIndex({ 'organizations.orgId': 1 });
    await users.createIndex({ 'oauthConnections.provider': 1, 'oauthConnections.providerId': 1 });

    // Organizations collection
    const orgs = db.collection('organizations');
    await orgs.createIndex({ orgId: 1 }, { unique: true });
    await orgs.createIndex({ slug: 1 }, { unique: true });
    await orgs.createIndex({ createdBy: 1 });

    // Rate limits collection (with TTL)
    const rateLimits = db.collection('rate_limits');
    await rateLimits.createIndex({ key: 1, resource: 1 }, { unique: true });
    await rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // OAuth states collection (with TTL)
    const oauthStates = db.collection('oauth_states');
    await oauthStates.createIndex({ state: 1 }, { unique: true });
    await oauthStates.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Invitations collection
    const invitations = db.collection('invitations');
    await invitations.createIndex({ token: 1 }, { unique: true });
    await invitations.createIndex({ organizationId: 1, email: 1 });
    await invitations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Platform audit logs
    const auditLogs = db.collection('platform_audit_logs');
    await auditLogs.createIndex({ eventType: 1 });
    await auditLogs.createIndex({ userId: 1 });
    await auditLogs.createIndex({ timestamp: -1 });
    await auditLogs.createIndex({ resourceType: 1, resourceId: 1 });

    // Organization usage collection
    const usage = db.collection('organization_usage');
    await usage.createIndex({ organizationId: 1, period: 1 }, { unique: true });
    await usage.createIndex({ organizationId: 1 });
    await usage.createIndex({ period: 1 });

    // Billing events collection
    const billingEvents = db.collection('billing_events');
    await billingEvents.createIndex({ stripeEventId: 1 }, { unique: true });
    await billingEvents.createIndex({ organizationId: 1 });
    await billingEvents.createIndex({ type: 1 });
    await billingEvents.createIndex({ createdAt: -1 });

    // Atlas invitations collection (tracks user invitations to Atlas console)
    const atlasInvitations = db.collection('atlas_invitations');
    await atlasInvitations.createIndex({ invitationId: 1 }, { unique: true });
    await atlasInvitations.createIndex({ atlasInvitationId: 1 });
    await atlasInvitations.createIndex({ organizationId: 1, email: 1 });
    await atlasInvitations.createIndex({ userId: 1 });
    await atlasInvitations.createIndex({ status: 1 });

    console.log('[Platform DB] Indexes created successfully');
  } catch (error) {
    // Indexes may already exist
    console.log('[Platform DB] Index creation completed (some may already exist)');
  }
}

/**
 * Create indexes for organization database
 */
async function createOrgIndexes(db: Db): Promise<void> {
  try {
    // Connection vault collection
    const vault = db.collection('connection_vault');
    await vault.createIndex({ vaultId: 1 }, { unique: true });
    await vault.createIndex({ createdBy: 1 });
    await vault.createIndex({ status: 1 });

    // Forms collection
    const forms = db.collection('forms');
    await forms.createIndex({ formId: 1 }, { unique: true });
    await forms.createIndex({ slug: 1 }, { unique: true, sparse: true });
    await forms.createIndex({ createdBy: 1 });
    await forms.createIndex({ isPublished: 1 });
    await forms.createIndex({ 'dataSource.vaultId': 1 });

    // Form submissions collection
    const submissions = db.collection('form_submissions');
    await submissions.createIndex({ submissionId: 1 }, { unique: true });
    await submissions.createIndex({ formId: 1 });
    await submissions.createIndex({ syncStatus: 1 });
    await submissions.createIndex({ submittedAt: -1 });
    await submissions.createIndex({ 'respondent.userId': 1 });

    // Org audit logs
    const auditLogs = db.collection('org_audit_logs');
    await auditLogs.createIndex({ eventType: 1 });
    await auditLogs.createIndex({ userId: 1 });
    await auditLogs.createIndex({ timestamp: -1 });

    console.log(`[Org DB] Indexes created for ${db.databaseName}`);
  } catch (error) {
    console.log(`[Org DB] Index creation completed for ${db.databaseName}`);
  }
}

// ============================================
// Collection Accessors - Platform
// ============================================

export async function getUsersCollection(): Promise<Collection<PlatformUser>> {
  const db = await getPlatformDb();
  return db.collection<PlatformUser>('users');
}

export async function getOrganizationsCollection(): Promise<Collection<Organization>> {
  const db = await getPlatformDb();
  return db.collection<Organization>('organizations');
}

export async function getRateLimitsCollection(): Promise<Collection<RateLimitEntry>> {
  const db = await getPlatformDb();
  return db.collection<RateLimitEntry>('rate_limits');
}

export async function getOAuthStatesCollection(): Promise<Collection<OAuthState>> {
  const db = await getPlatformDb();
  return db.collection<OAuthState>('oauth_states');
}

export async function getInvitationsCollection(): Promise<Collection<OrgInvitation>> {
  const db = await getPlatformDb();
  return db.collection<OrgInvitation>('invitations');
}

export async function getPlatformAuditCollection(): Promise<Collection<AuditLogEntry>> {
  const db = await getPlatformDb();
  return db.collection<AuditLogEntry>('platform_audit_logs');
}

export async function getUsageCollection(): Promise<Collection<OrganizationUsage>> {
  const db = await getPlatformDb();
  return db.collection<OrganizationUsage>('organization_usage');
}

export async function getBillingEventsCollection(): Promise<Collection<BillingEvent>> {
  const db = await getPlatformDb();
  return db.collection<BillingEvent>('billing_events');
}

export async function getAtlasInvitationsCollection(): Promise<Collection<AtlasInvitationRecord>> {
  const db = await getPlatformDb();
  return db.collection<AtlasInvitationRecord>('atlas_invitations');
}

// ============================================
// Collection Accessors - Organization
// ============================================

import { ConnectionVault, PlatformFormSubmission } from '@/types/platform';

export async function getConnectionVaultCollection(orgId: string): Promise<Collection<ConnectionVault>> {
  const db = await getOrgDb(orgId);
  return db.collection<ConnectionVault>('connection_vault');
}

export async function getOrgFormsCollection(orgId: string): Promise<Collection> {
  const db = await getOrgDb(orgId);
  return db.collection('forms');
}

export async function getOrgSubmissionsCollection(orgId: string): Promise<Collection<PlatformFormSubmission>> {
  const db = await getOrgDb(orgId);
  return db.collection<PlatformFormSubmission>('form_submissions');
}

export async function getOrgAuditCollection(orgId: string): Promise<Collection<AuditLogEntry>> {
  const db = await getOrgDb(orgId);
  return db.collection<AuditLogEntry>('org_audit_logs');
}

// ============================================
// Cleanup
// ============================================

/**
 * Close all database connections
 * Call this on application shutdown
 */
export async function closeAllConnections(): Promise<void> {
  if (platformClient) {
    await platformClient.close();
    platformClient = null;
  }

  for (const [orgId, client] of orgClients) {
    await client.close();
    orgClients.delete(orgId);
  }

  console.log('[DB] All connections closed');
}
