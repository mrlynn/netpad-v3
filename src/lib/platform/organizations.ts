/**
 * Organization Service
 *
 * Manages organizations, memberships, and invitations.
 * Each organization gets its own isolated database.
 */

import { ObjectId } from 'mongodb';
import {
  getOrganizationsCollection,
  getUsersCollection,
  getInvitationsCollection,
  getPlatformAuditCollection,
} from './db';
import { generateSecureId } from '../encryption';
import {
  Organization,
  OrgMembership,
  OrgRole,
  OrgPlan,
  OrganizationSettings,
  ORG_PLAN_LIMITS,
  ORG_ROLE_CAPABILITIES,
  OrgInvitation,
  PlatformUser,
  AuditLogEntry,
} from '@/types/platform';
import crypto from 'crypto';
import { isAutoProvisioningAvailable, queueClusterProvisioning, deleteProvisionedCluster } from '../atlas';

// ============================================
// Organization CRUD
// ============================================

export interface CreateOrgInput {
  name: string;
  slug: string;
  createdBy: string;
  plan?: OrgPlan;
  skipProvisioning?: boolean;  // Skip auto-provisioning of M0 cluster
}

/**
 * Create a new organization
 */
export async function createOrganization(input: CreateOrgInput): Promise<Organization> {
  const orgsCollection = await getOrganizationsCollection();
  const usersCollection = await getUsersCollection();

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(input.slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Check slug uniqueness
  const existing = await orgsCollection.findOne({ slug: input.slug });
  if (existing) {
    throw new Error('Organization slug already exists');
  }

  // Verify creator user exists - if not, create them
  const existingUser = await usersCollection.findOne({ userId: input.createdBy });
  if (!existingUser) {
    throw new Error('User not found. Please ensure you are logged in with a valid account.');
  }

  const plan = input.plan || 'free';
  const planLimits = ORG_PLAN_LIMITS[plan];

  const org: Organization = {
    orgId: generateSecureId('org'),
    name: input.name,
    slug: input.slug,
    plan,
    settings: {
      allowedAuthMethods: ['magic-link', 'passkey', 'google', 'github'],
      defaultFormAccess: 'public',
      dataRetentionDays: planLimits.dataRetentionDays || 30,
      maxForms: planLimits.maxForms || 5,
      maxSubmissionsPerMonth: planLimits.maxSubmissionsPerMonth || 100,
      maxConnections: planLimits.maxConnections || 2,
      allowCustomBranding: planLimits.allowCustomBranding || false,
    },
    currentMonthSubmissions: 0,
    usageResetDate: getNextMonthStart(),
    createdAt: new Date(),
    createdBy: input.createdBy,
    updatedAt: new Date(),
  };

  await orgsCollection.insertOne(org);

  // Add creator as owner - ensure this succeeds
  const updateResult = await usersCollection.updateOne(
    { userId: input.createdBy },
    {
      $push: {
        organizations: {
          orgId: org.orgId,
          role: 'owner' as OrgRole,
          joinedAt: new Date(),
        },
      },
      $set: { updatedAt: new Date() },
    }
  );

  // Verify the update was successful
  if (updateResult.matchedCount === 0) {
    // Rollback the org creation if we couldn't add the user
    await orgsCollection.deleteOne({ orgId: org.orgId });
    throw new Error('Failed to add creator as organization owner: user not found');
  }

  if (updateResult.modifiedCount === 0) {
    console.warn(`[Org] Warning: User ${input.createdBy} not modified when adding to org ${org.orgId}. May already be a member.`);
  }

  // Audit log
  await logOrgEvent({
    eventType: 'org.created',
    userId: input.createdBy,
    resourceType: 'organization',
    resourceId: org.orgId,
    organizationId: org.orgId,
    action: 'create',
    details: { name: org.name, slug: org.slug, plan: org.plan },
    timestamp: new Date(),
  });

  // Note: Auto-provisioning at org level is disabled in the new project-based model.
  // Cluster provisioning now happens at the project level to support multi-project orgs.
  // See: src/app/api/organizations/[orgId]/cluster/initialize/route.ts

  return org;
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const collection = await getOrganizationsCollection();
  return collection.findOne({ orgId });
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const collection = await getOrganizationsCollection();
  return collection.findOne({ slug });
}

/**
 * Update organization
 */
export async function updateOrganization(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'settings'>>,
  updatedBy: string
): Promise<boolean> {
  const collection = await getOrganizationsCollection();

  const result = await collection.updateOne(
    { orgId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    await logOrgEvent({
      eventType: 'org.updated',
      userId: updatedBy,
      resourceType: 'organization',
      resourceId: orgId,
      organizationId: orgId,
      action: 'update',
      details: updates,
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

/**
 * Delete organization and clean up all associated resources
 */
export async function deleteOrganization(
  orgId: string,
  deletedBy: string
): Promise<boolean> {
  const orgsCollection = await getOrganizationsCollection();
  const usersCollection = await getUsersCollection();

  // Clean up Atlas cluster resources first
  try {
    console.log(`[Org] Cleaning up Atlas cluster for org ${orgId}`);
    const clusterResult = await deleteProvisionedCluster(orgId, deletedBy);
    if (clusterResult.success) {
      console.log(`[Org] Successfully deleted Atlas cluster for org ${orgId}`);
    } else if (clusterResult.error !== 'No provisioned cluster found') {
      console.error(`[Org] Failed to delete Atlas cluster: ${clusterResult.error}`);
      // Continue with org deletion even if cluster cleanup fails
    }
  } catch (error) {
    console.error('[Org] Error cleaning up Atlas cluster:', error);
    // Continue with org deletion even if cluster cleanup fails
  }

  // Remove org from all users' memberships
  await usersCollection.updateMany(
    { 'organizations.orgId': orgId },
    {
      $pull: { organizations: { orgId } },
      $set: { updatedAt: new Date() },
    }
  );

  // Delete the organization
  const result = await orgsCollection.deleteOne({ orgId });

  if (result.deletedCount > 0) {
    await logOrgEvent({
      eventType: 'org.deleted',
      userId: deletedBy,
      resourceType: 'organization',
      resourceId: orgId,
      organizationId: orgId,
      action: 'delete',
      details: { clusterCleanedUp: true },
      timestamp: new Date(),
    });
  }

  return result.deletedCount > 0;
}

// ============================================
// Membership Management
// ============================================

/**
 * Get all members of an organization
 */
export async function getOrgMembers(
  orgId: string
): Promise<Array<PlatformUser & { orgRole: OrgRole }>> {
  const usersCollection = await getUsersCollection();

  const members = await usersCollection
    .find({ 'organizations.orgId': orgId })
    .toArray();

  return members.map((user) => {
    const membership = user.organizations.find((o) => o.orgId === orgId);
    return {
      ...user,
      orgRole: membership?.role || 'viewer',
    };
  });
}

/**
 * Get a user's role in an organization
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const usersCollection = await getUsersCollection();
  const user = await usersCollection.findOne({ userId });

  if (!user) return null;

  const membership = user.organizations.find((o) => o.orgId === orgId);
  return membership?.role || null;
}

/**
 * Check if user has a specific capability in an organization
 */
export async function checkOrgPermission(
  userId: string,
  orgId: string,
  capability: string
): Promise<boolean> {
  const role = await getUserOrgRole(userId, orgId);
  if (!role) return false;

  const capabilities = ORG_ROLE_CAPABILITIES[role];
  return capabilities.includes(capability);
}

/**
 * Check if user has admin access to an organization's dashboard
 *
 * Returns true if user is:
 * 1. A platform admin (can access any org), OR
 * 2. An organization owner or admin
 */
export async function checkOrgAdminAccess(
  userId: string,
  orgId: string
): Promise<boolean> {
  // Import isPlatformAdmin to avoid circular dependency
  const { isPlatformAdmin } = await import('./users');

  // Platform admins can access any org
  if (await isPlatformAdmin(userId)) {
    return true;
  }

  // Check if user has owner or admin role in the org
  const role = await getUserOrgRole(userId, orgId);
  return role === 'owner' || role === 'admin';
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  orgId: string,
  targetUserId: string,
  newRole: OrgRole,
  updatedBy: string
): Promise<boolean> {
  const usersCollection = await getUsersCollection();

  // Prevent removing the last owner
  if (newRole !== 'owner') {
    const owners = await usersCollection.countDocuments({
      'organizations.orgId': orgId,
      'organizations.role': 'owner',
    });

    const targetUser = await usersCollection.findOne({ userId: targetUserId });
    const isCurrentOwner = targetUser?.organizations.find(
      (o) => o.orgId === orgId && o.role === 'owner'
    );

    if (owners <= 1 && isCurrentOwner) {
      throw new Error('Cannot remove the last owner');
    }
  }

  const result = await usersCollection.updateOne(
    { userId: targetUserId, 'organizations.orgId': orgId },
    {
      $set: {
        'organizations.$.role': newRole,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Remove a member from an organization
 */
export async function removeMember(
  orgId: string,
  targetUserId: string,
  removedBy: string
): Promise<boolean> {
  const usersCollection = await getUsersCollection();

  // Prevent removing the last owner
  const owners = await usersCollection.countDocuments({
    'organizations.orgId': orgId,
    'organizations.role': 'owner',
  });

  const targetUser = await usersCollection.findOne({ userId: targetUserId });
  const isOwner = targetUser?.organizations.find(
    (o) => o.orgId === orgId && o.role === 'owner'
  );

  if (owners <= 1 && isOwner) {
    throw new Error('Cannot remove the last owner');
  }

  const result = await usersCollection.updateOne(
    { userId: targetUserId },
    {
      $pull: { organizations: { orgId } },
      $set: { updatedAt: new Date() },
    }
  );

  if (result.modifiedCount > 0) {
    await logOrgEvent({
      eventType: 'org.member_removed',
      userId: removedBy,
      resourceType: 'organization',
      resourceId: orgId,
      organizationId: orgId,
      action: 'remove_member',
      details: { removedUserId: targetUserId },
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

// ============================================
// Invitations
// ============================================

/**
 * Create an invitation to join an organization
 */
export async function createInvitation(
  orgId: string,
  email: string,
  role: OrgRole,
  invitedBy: string
): Promise<OrgInvitation> {
  const invitationsCollection = await getInvitationsCollection();
  const usersCollection = await getUsersCollection();

  // Check if user already in org
  const existingUser = await usersCollection.findOne({
    email: email.toLowerCase(),
    'organizations.orgId': orgId,
  });

  if (existingUser) {
    throw new Error('User is already a member of this organization');
  }

  // Check for existing pending invitation
  const existingInvite = await invitationsCollection.findOne({
    organizationId: orgId,
    email: email.toLowerCase(),
    status: 'pending',
  });

  if (existingInvite) {
    throw new Error('An invitation is already pending for this email');
  }

  const invitation: OrgInvitation = {
    invitationId: generateSecureId('inv'),
    organizationId: orgId,
    email: email.toLowerCase(),
    role,
    status: 'pending',
    invitedBy,
    token: crypto.randomBytes(32).toString('hex'),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  await invitationsCollection.insertOne(invitation);

  return invitation;
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ orgId: string; role: OrgRole }> {
  const invitationsCollection = await getInvitationsCollection();
  const usersCollection = await getUsersCollection();

  const invitation = await invitationsCollection.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Get the accepting user
  const user = await usersCollection.findOne({ userId });
  if (!user) {
    throw new Error('User not found');
  }

  // Verify email matches (optional - could allow any authenticated user)
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('Invitation was sent to a different email address');
  }

  // Add user to organization
  await usersCollection.updateOne(
    { userId },
    {
      $push: {
        organizations: {
          orgId: invitation.organizationId,
          role: invitation.role,
          joinedAt: new Date(),
          invitedBy: invitation.invitedBy,
        },
      },
      $set: { updatedAt: new Date() },
    }
  );

  // Mark invitation as accepted
  await invitationsCollection.updateOne(
    { token },
    {
      $set: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    }
  );

  await logOrgEvent({
    eventType: 'org.member_added',
    userId,
    resourceType: 'organization',
    resourceId: invitation.organizationId,
    organizationId: invitation.organizationId,
    action: 'accept_invitation',
    details: { role: invitation.role, invitedBy: invitation.invitedBy },
    timestamp: new Date(),
  });

  return { orgId: invitation.organizationId, role: invitation.role };
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
  invitationId: string,
  revokedBy: string
): Promise<boolean> {
  const collection = await getInvitationsCollection();

  const result = await collection.updateOne(
    { invitationId, status: 'pending' },
    { $set: { status: 'revoked' } }
  );

  return result.modifiedCount > 0;
}

/**
 * List pending invitations for an organization
 */
export async function listPendingInvitations(orgId: string): Promise<OrgInvitation[]> {
  const collection = await getInvitationsCollection();

  return collection
    .find({
      organizationId: orgId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
    .toArray();
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Increment submission count for an organization
 */
export async function incrementSubmissionCount(orgId: string): Promise<void> {
  const collection = await getOrganizationsCollection();

  await collection.updateOne(
    { orgId },
    {
      $inc: { currentMonthSubmissions: 1 },
      $set: { updatedAt: new Date() },
    }
  );
}

/**
 * Check if organization has reached submission limit
 */
export async function checkSubmissionLimit(orgId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const org = await getOrganization(orgId);
  if (!org) {
    return { allowed: false, current: 0, limit: 0 };
  }

  // Reset if past reset date
  if (new Date() > org.usageResetDate) {
    const collection = await getOrganizationsCollection();
    await collection.updateOne(
      { orgId },
      {
        $set: {
          currentMonthSubmissions: 0,
          usageResetDate: getNextMonthStart(),
          updatedAt: new Date(),
        },
      }
    );
    return { allowed: true, current: 0, limit: org.settings.maxSubmissionsPerMonth };
  }

  const limit = org.settings.maxSubmissionsPerMonth;
  const allowed = limit === -1 || org.currentMonthSubmissions < limit;

  return {
    allowed,
    current: org.currentMonthSubmissions,
    limit,
  };
}

// ============================================
// User's Organizations
// ============================================

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const usersCollection = await getUsersCollection();
  const orgsCollection = await getOrganizationsCollection();

  const user = await usersCollection.findOne({ userId });
  if (!user || !user.organizations.length) {
    return [];
  }

  const orgIds = user.organizations.map((o) => o.orgId);
  return orgsCollection.find({ orgId: { $in: orgIds } }).toArray();
}

// ============================================
// Helpers
// ============================================

function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

async function logOrgEvent(event: Omit<AuditLogEntry, '_id'>): Promise<void> {
  try {
    const collection = await getPlatformAuditCollection();
    await collection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[Org Audit] Failed to log event:', error);
  }
}

// ============================================
// Auto-Scaffolding for New Users
// ============================================

/**
 * Auto-scaffold organization, project, and application for a new user.
 * This eliminates the need for users to manually create these resources.
 *
 * Flow: Org → Project (via ensureDefaultProject) → Application (via ensureDefaultApplication)
 */
export async function autoScaffoldForUser(userId: string, userEmail: string, displayName?: string): Promise<{
  organization: Organization;
  projectId: string;
  applicationId: string;
} | null> {
  try {
    // Generate org name from display name or email
    const orgName = displayName
      ? `${displayName}'s Workspace`
      : `${userEmail.split('@')[0]}'s Workspace`;

    // Generate slug from email prefix (sanitized)
    const emailPrefix = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
    const baseSlug = `${emailPrefix}-workspace`;

    // Ensure unique slug by appending timestamp if needed
    const orgsCollection = await getOrganizationsCollection();
    const existingSlug = await orgsCollection.findOne({ slug: baseSlug });
    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    console.log(`[AutoScaffold] Creating organization "${orgName}" (${slug}) for user ${userId}`);

    // Create organization
    const organization = await createOrganization({
      name: orgName,
      slug,
      createdBy: userId,
    });

    // Create default project (this also creates default application)
    const { ensureDefaultProject } = await import('./projects');
    const project = await ensureDefaultProject(organization.orgId, userId);

    // Get the default application that was created
    const { getDefaultApplication } = await import('./applications');
    const application = await getDefaultApplication(organization.orgId, project.projectId);

    console.log(`[AutoScaffold] Complete: org=${organization.orgId}, project=${project.projectId}, app=${application?.applicationId}`);

    return {
      organization,
      projectId: project.projectId,
      applicationId: application?.applicationId || '',
    };
  } catch (error) {
    console.error('[AutoScaffold] Failed to auto-scaffold for user:', error);
    return null;
  }
}

// ============================================
// Data Repair Utilities
// ============================================

// ============================================
// Organization Reset (for Testing)
// ============================================

export interface ResetOrganizationOptions {
  /** Delete provisioned clusters */
  deleteClusters?: boolean;
  /** Delete connection vaults */
  deleteConnections?: boolean;
  /** Delete all forms */
  deleteForms?: boolean;
  /** Delete all workflows */
  deleteWorkflows?: boolean;
  /** Delete all applications (except recreate default) */
  deleteApplications?: boolean;
  /** Delete all projects (except recreate default) */
  deleteProjects?: boolean;
}

export interface ResetOrganizationResult {
  success: boolean;
  deleted: {
    forms: number;
    workflows: number;
    applications: number;
    projects: number;
    clusters: number;
    connections: number;
  };
  recreated: {
    project: boolean;
    application: boolean;
  };
  errors: string[];
}

/**
 * Reset an organization to a fresh state
 *
 * This deletes all resources associated with the organization but keeps the org itself.
 * Useful for testing and development purposes.
 *
 * WARNING: This is destructive and cannot be undone!
 */
export async function resetOrganization(
  orgId: string,
  resetBy: string,
  options: ResetOrganizationOptions = {}
): Promise<ResetOrganizationResult> {
  const {
    deleteClusters = true,
    deleteConnections = true,
    deleteForms = true,
    deleteWorkflows = true,
    deleteApplications = true,
    deleteProjects = true,
  } = options;

  const result: ResetOrganizationResult = {
    success: false,
    deleted: {
      forms: 0,
      workflows: 0,
      applications: 0,
      projects: 0,
      clusters: 0,
      connections: 0,
    },
    recreated: {
      project: false,
      application: false,
    },
    errors: [],
  };

  try {
    // Verify org exists
    const org = await getOrganization(orgId);
    if (!org) {
      result.errors.push('Organization not found');
      return result;
    }

    // Import required modules
    const { getOrgDb, getPlatformDb, getProjectsCollection, getConnectionVaultCollection } = await import('./db');
    const { getWorkflowsCollection } = await import('../workflow/db');

    const orgDb = await getOrgDb(orgId);
    const platformDb = await getPlatformDb();

    // 1. Delete forms
    if (deleteForms) {
      try {
        const formsCollection = orgDb.collection('forms');
        const submissionsCollection = orgDb.collection('submissions');

        // First delete all submissions
        const submissionsResult = await submissionsCollection.deleteMany({});
        console.log(`[Reset] Deleted ${submissionsResult.deletedCount} submissions for org ${orgId}`);

        // Then delete all forms
        const formsResult = await formsCollection.deleteMany({});
        result.deleted.forms = formsResult.deletedCount;
        console.log(`[Reset] Deleted ${formsResult.deletedCount} forms for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete forms: ${message}`);
      }
    }

    // 2. Delete workflows
    if (deleteWorkflows) {
      try {
        const workflowsCollection = await getWorkflowsCollection(orgId);
        const workflowsResult = await workflowsCollection.deleteMany({});
        result.deleted.workflows = workflowsResult.deletedCount;
        console.log(`[Reset] Deleted ${workflowsResult.deletedCount} workflows for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete workflows: ${message}`);
      }
    }

    // 3. Delete applications
    if (deleteApplications) {
      try {
        const applicationsCollection = orgDb.collection('applications');
        const appsResult = await applicationsCollection.deleteMany({});
        result.deleted.applications = appsResult.deletedCount;
        console.log(`[Reset] Deleted ${appsResult.deletedCount} applications for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete applications: ${message}`);
      }
    }

    // 4. Delete connection vaults
    if (deleteConnections) {
      try {
        const connectionVaultCollection = await getConnectionVaultCollection(orgId);
        const connectionsResult = await connectionVaultCollection.deleteMany({});
        result.deleted.connections = connectionsResult.deletedCount;
        console.log(`[Reset] Deleted ${connectionsResult.deletedCount} connections for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete connections: ${message}`);
      }
    }

    // 5. Delete provisioned clusters (from platform DB)
    if (deleteClusters) {
      try {
        const clustersCollection = platformDb.collection('provisioned_clusters');

        // Get clusters to delete them from Atlas
        const clusters = await clustersCollection.find({
          organizationId: orgId,
          deletedAt: { $exists: false }
        }).toArray();

        // Delete Atlas resources
        for (const cluster of clusters) {
          try {
            await deleteProvisionedCluster(orgId, resetBy);
          } catch (clusterError) {
            const msg = clusterError instanceof Error ? clusterError.message : 'Unknown error';
            console.warn(`[Reset] Warning: Failed to delete Atlas cluster: ${msg}`);
          }
        }

        // Mark all clusters as deleted in DB
        const clustersResult = await clustersCollection.updateMany(
          { organizationId: orgId, deletedAt: { $exists: false } },
          { $set: { deletedAt: new Date(), deletedBy: resetBy } }
        );
        result.deleted.clusters = clustersResult.modifiedCount;
        console.log(`[Reset] Deleted ${clustersResult.modifiedCount} clusters for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete clusters: ${message}`);
      }
    }

    // 6. Delete projects (from platform DB)
    if (deleteProjects) {
      try {
        const projectsCollection = await getProjectsCollection();
        const projectsResult = await projectsCollection.deleteMany({ organizationId: orgId });
        result.deleted.projects = projectsResult.deletedCount;
        console.log(`[Reset] Deleted ${projectsResult.deletedCount} projects for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete projects: ${message}`);
      }
    }

    // 7. Recreate default project and application
    if (deleteProjects || deleteApplications) {
      try {
        const { ensureDefaultProject } = await import('./projects');
        const project = await ensureDefaultProject(orgId, resetBy);
        result.recreated.project = true;
        result.recreated.application = true; // ensureDefaultProject also creates default app
        console.log(`[Reset] Recreated default project ${project.projectId} for org ${orgId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to recreate default project: ${message}`);
      }
    }

    // Log audit event
    await logOrgEvent({
      eventType: 'org.reset',
      userId: resetBy,
      resourceType: 'organization',
      resourceId: orgId,
      organizationId: orgId,
      action: 'reset',
      details: {
        deleted: result.deleted,
        recreated: result.recreated,
        options,
      },
      timestamp: new Date(),
    });

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Reset failed: ${message}`);
    return result;
  }
}

// ============================================
// Data Repair Utilities
// ============================================

/**
 * Repair organization membership for a user who created an org but isn't a member.
 * This can happen if there was a race condition or failure during org creation.
 */
export async function repairOrgCreatorMembership(userId: string, orgId: string): Promise<boolean> {
  const usersCollection = await getUsersCollection();
  const orgsCollection = await getOrganizationsCollection();

  // Verify the org exists and was created by this user
  const org = await orgsCollection.findOne({ orgId });
  if (!org) {
    console.error(`[Repair] Organization ${orgId} not found`);
    return false;
  }

  if (org.createdBy !== userId) {
    console.error(`[Repair] User ${userId} is not the creator of org ${orgId}`);
    return false;
  }

  // Check if user is already a member
  const user = await usersCollection.findOne({ userId });
  if (!user) {
    console.error(`[Repair] User ${userId} not found`);
    return false;
  }

  const existingMembership = user.organizations?.find((o) => o.orgId === orgId);
  if (existingMembership) {
    console.log(`[Repair] User ${userId} is already a member of org ${orgId} with role ${existingMembership.role}`);
    return true;
  }

  // Add user as owner
  const updateResult = await usersCollection.updateOne(
    { userId },
    {
      $push: {
        organizations: {
          orgId,
          role: 'owner' as OrgRole,
          joinedAt: new Date(),
        },
      },
      $set: { updatedAt: new Date() },
    }
  );

  if (updateResult.modifiedCount > 0) {
    console.log(`[Repair] Successfully added user ${userId} as owner of org ${orgId}`);
    return true;
  }

  console.error(`[Repair] Failed to add user ${userId} to org ${orgId}`);
  return false;
}

/**
 * Ensure the current user is properly added as owner to their created orgs.
 * Call this on login if the user's org list is empty but they've created orgs.
 */
export async function repairUserOrgMemberships(userId: string): Promise<number> {
  const usersCollection = await getUsersCollection();
  const orgsCollection = await getOrganizationsCollection();

  const user = await usersCollection.findOne({ userId });
  if (!user) {
    return 0;
  }

  // Find all orgs created by this user
  const createdOrgs = await orgsCollection.find({ createdBy: userId }).toArray();

  if (createdOrgs.length === 0) {
    return 0;
  }

  const userOrgIds = new Set((user.organizations || []).map((o) => o.orgId));
  let repaired = 0;

  for (const org of createdOrgs) {
    if (!userOrgIds.has(org.orgId)) {
      console.log(`[Repair] User ${userId} created org ${org.orgId} but isn't a member. Repairing...`);
      const success = await repairOrgCreatorMembership(userId, org.orgId);
      if (success) {
        repaired++;
      }
    }
  }

  return repaired;
}
