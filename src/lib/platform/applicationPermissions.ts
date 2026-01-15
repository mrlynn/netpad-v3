/**
 * Application Permissions Service (Phase 10)
 *
 * Manages application-level RBAC permissions.
 * Provides fine-grained access control for applications independent of organization roles.
 */

import { ObjectId } from 'mongodb';
import { getOrgDb } from './db';
import { findUserById, isPlatformAdmin } from './users';
import { getUserOrgRole } from './organizations';
import { getApplication } from './applications';
import { getActiveApplicationContract } from './applicationContracts';
import {
  ApplicationPermission,
  ApplicationRole,
} from '@/types/application';
import { APPLICATION_ROLE_CAPABILITIES } from '@/types/platform';
import { PermissionResult } from './permissions';

// ============================================
// Permission Checking
// ============================================

/**
 * Check if user has permission for a specific capability on an application
 */
export async function checkApplicationPermission(
  userId: string,
  orgId: string,
  applicationId: string,
  capability: string
): Promise<PermissionResult> {
  // 1. Platform admin: always allowed
  if (await isPlatformAdmin(userId)) {
    return { allowed: true, role: 'platform:admin' };
  }

  // 2. Get application
  const application = await getApplication(orgId, applicationId);
  if (!application) {
    return { allowed: false, reason: 'Application not found' };
  }

  // 3. Org owner/admin: allowed by default (unless defaultAccess: 'explicit')
  const orgRole = await getUserOrgRole(userId, orgId);
  if (orgRole === 'owner' || orgRole === 'admin') {
    if (application.defaultAccess !== 'explicit') {
      // Contract protection: Even org owners/admins need owner role when contract is active
      if (capability === 'edit') {
        const activeContract = await getActiveApplicationContract(orgId, applicationId);
        if (activeContract) {
          // Org owners/admins can still edit (they have ultimate control)
          // This allows org admins to manage contracts and make necessary changes
        }
      }
      return { allowed: true, role: `org:${orgRole}` };
    }
    // If explicit-only, continue to check application permissions
  }

  // 4. Contract Protection (Phase 10, Step 7)
  // If application has active contract and user wants to edit, restrict to owners only
  if (capability === 'edit') {
    const activeContract = await getActiveApplicationContract(orgId, applicationId);
    if (activeContract) {
      // Only owners can edit when contract is active
      // Check if user is application creator (implicit owner)
      const isCreator = application.createdBy === userId;
      
      // Check if user has explicit owner permission
      let isOwner = isCreator;
      if (!isOwner) {
        const permission = await getApplicationPermission(orgId, applicationId, userId);
        isOwner = permission?.role === 'owner';
      }
      
      // Also check org owner/admin (they can override)
      if (!isOwner && (orgRole === 'owner' || orgRole === 'admin')) {
        // Org owners/admins can edit even with contracts (they have ultimate control)
        isOwner = true;
      }
      
      if (!isOwner) {
        return {
          allowed: false,
          reason: 'Application has an active contract. Only owners can edit protected applications.',
        };
      }
    }
  }

  // 5. Application creator is implicit owner
  if (application.createdBy === userId) {
    const capabilities = APPLICATION_ROLE_CAPABILITIES.owner;
    if (capabilities.includes(capability)) {
      return { allowed: true, role: 'application:owner' };
    }
    return { allowed: false, reason: `Owner role does not have '${capability}' capability` };
  }

  // 6. Check explicit application permissions
  const permission = await getApplicationPermission(orgId, applicationId, userId);
  if (permission) {
    const capabilities = APPLICATION_ROLE_CAPABILITIES[permission.role];
    if (capabilities.includes(capability)) {
      return { allowed: true, role: `application:${permission.role}` };
    }
    return { allowed: false, reason: `Role '${permission.role}' does not have '${capability}' capability` };
  }

  // 7. Fallback: org members can view if defaultAccess !== 'explicit'
  if (application.defaultAccess !== 'explicit') {
    if ((orgRole === 'member' || orgRole === 'viewer') && capability === 'read') {
      return { allowed: true, role: `org:${orgRole}` };
    }
  }

  return { allowed: false, reason: 'No access to this application' };
}

/**
 * Check if user can edit a component (form/workflow) that belongs to an application
 * This enforces contract protection at the component level
 */
export async function checkComponentEditPermission(
  userId: string,
  orgId: string,
  applicationId: string | undefined,
  componentId: string,
  componentType: 'form' | 'workflow'
): Promise<PermissionResult> {
  // If no applicationId, allow edit (legacy forms/workflows)
  if (!applicationId) {
    return { allowed: true, role: 'legacy' };
  }

  // Check application-level edit permission
  return checkApplicationPermission(userId, orgId, applicationId, 'edit');
}

/**
 * Get user's effective role on an application
 */
export async function getApplicationRole(
  userId: string,
  orgId: string,
  applicationId: string
): Promise<ApplicationRole | 'platform_admin' | 'org_owner' | 'org_admin' | null> {
  // Platform admin
  if (await isPlatformAdmin(userId)) {
    return 'platform_admin';
  }

  // Get application
  const application = await getApplication(orgId, applicationId);
  if (!application) {
    return null;
  }

  // Org owner/admin
  const orgRole = await getUserOrgRole(userId, orgId);
  if (orgRole === 'owner') {
    return 'org_owner';
  }
  if (orgRole === 'admin') {
    return 'org_admin';
  }

  // Application creator is implicit owner
  if (application.createdBy === userId) {
    return 'owner';
  }

  // Check explicit permission
  const permission = await getApplicationPermission(orgId, applicationId, userId);
  if (permission) {
    return permission.role;
  }

  // No explicit permission
  return null;
}

// ============================================
// Permission Management
// ============================================

/**
 * Grant permission to a user on an application
 */
export async function grantApplicationPermission(
  orgId: string,
  applicationId: string,
  userId: string,
  role: ApplicationRole,
  grantedBy: string
): Promise<ApplicationPermission> {
  const db = await getOrgDb(orgId);
  const collection = db.collection<ApplicationPermission>('application_permissions');

  // Check if permission already exists
  const existing = await collection.findOne({
    applicationId,
    userId,
  });

  if (existing) {
    // Update existing permission
    const updated = await collection.findOneAndUpdate(
      { applicationId, userId },
      {
        $set: {
          role,
          grantedBy,
          grantedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw new Error('Failed to update application permission');
    }
    return updated;
  }

  // Create new permission
  const permissionId = `perm_${new ObjectId().toString()}`;
  const permission: ApplicationPermission = {
    permissionId,
    organizationId: orgId,
    applicationId,
    userId,
    role,
    grantedBy,
    grantedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(permission);
  return permission;
}

/**
 * Revoke permission from a user on an application
 */
export async function revokeApplicationPermission(
  orgId: string,
  applicationId: string,
  userId: string
): Promise<void> {
  const db = await getOrgDb(orgId);
  const collection = db.collection<ApplicationPermission>('application_permissions');

  await collection.deleteOne({
    applicationId,
    userId,
  });
}

/**
 * Update permission role for a user on an application
 */
export async function updateApplicationPermission(
  orgId: string,
  applicationId: string,
  userId: string,
  newRole: ApplicationRole
): Promise<ApplicationPermission> {
  const db = await getOrgDb(orgId);
  const collection = db.collection<ApplicationPermission>('application_permissions');

  const updated = await collection.findOneAndUpdate(
    { applicationId, userId },
    {
      $set: {
        role: newRole,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!updated) {
    throw new Error('Permission not found');
  }

  return updated;
}

/**
 * Get permission for a specific user on an application
 */
export async function getApplicationPermission(
  orgId: string,
  applicationId: string,
  userId: string
): Promise<ApplicationPermission | null> {
  const db = await getOrgDb(orgId);
  const collection = db.collection<ApplicationPermission>('application_permissions');

  return collection.findOne({
    applicationId,
    userId,
  });
}

/**
 * List all permissions for an application
 */
export async function listApplicationPermissions(
  orgId: string,
  applicationId: string
): Promise<ApplicationPermission[]> {
  const db = await getOrgDb(orgId);
  const collection = db.collection<ApplicationPermission>('application_permissions');

  return collection
    .find({
      organizationId: orgId,
      applicationId,
    })
    .toArray();
}

/**
 * Get all applications a user can access in an organization
 */
export async function getUserApplications(
  userId: string,
  orgId: string
): Promise<string[]> {
  const db = await getOrgDb(orgId);
  const applicationsCollection = db.collection('applications');
  const permissionsCollection = db.collection<ApplicationPermission>('application_permissions');

  // Get applications where:
  // 1. User has explicit permission
  // 2. User is the creator
  // 3. Application has defaultAccess !== 'explicit' (org members can view)

  const explicitPermissions = await permissionsCollection
    .find({ userId, organizationId: orgId })
    .toArray();
  const explicitApplicationIds = explicitPermissions.map((p) => p.applicationId);

  const createdApplications = await applicationsCollection
    .find({ createdBy: userId, organizationId: orgId })
    .toArray();
  const createdApplicationIds = createdApplications.map((a) => a.applicationId);

  const accessibleApplications = await applicationsCollection
    .find({
      organizationId: orgId,
      $or: [
        { applicationId: { $in: explicitApplicationIds } },
        { applicationId: { $in: createdApplicationIds } },
        { defaultAccess: { $ne: 'explicit' } },
        { defaultAccess: { $exists: false } }, // Legacy apps without defaultAccess field
      ],
    })
    .toArray();

  return accessibleApplications.map((a) => a.applicationId);
}
