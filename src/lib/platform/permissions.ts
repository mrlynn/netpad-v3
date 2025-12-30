/**
 * RBAC Permission Service
 *
 * Centralized permission checking for:
 * - Platform-level access
 * - Organization-level access
 * - Connection vault access
 * - Form access
 */

import { findUserById, isPlatformAdmin } from './users';
import { getUserOrgRole, getOrganization } from './organizations';
import { getVaultRole } from './connectionVault';
import { getOrgFormsCollection } from './db';
import {
  PlatformUser,
  OrgRole,
  ConnectionRole,
  FormRole,
  ORG_ROLE_CAPABILITIES,
  CONNECTION_ROLE_CAPABILITIES,
  FORM_ROLE_CAPABILITIES,
  FormPermission,
} from '@/types/platform';

// ============================================
// Permission Types
// ============================================

export type ResourceType = 'platform' | 'organization' | 'connection' | 'form';

export interface PermissionContext {
  userId: string;
  resourceType: ResourceType;
  resourceId?: string;
  organizationId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  role?: string;
}

// ============================================
// Platform-Level Permissions
// ============================================

/**
 * Check if user has platform-level permission
 */
export async function checkPlatformPermission(
  userId: string,
  capability: string
): Promise<PermissionResult> {
  const user = await findUserById(userId);

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (user.platformRole === 'admin') {
    return { allowed: true, role: 'platform:admin' };
  }

  if (user.platformRole === 'support') {
    // Support can only view, not modify
    const supportCapabilities = ['view_users', 'view_orgs', 'view_audit'];
    if (supportCapabilities.includes(capability)) {
      return { allowed: true, role: 'platform:support' };
    }
  }

  return { allowed: false, reason: 'Insufficient platform permissions' };
}

// ============================================
// Organization-Level Permissions
// ============================================

/**
 * Check if user has organization-level permission
 */
export async function checkOrganizationPermission(
  userId: string,
  orgId: string,
  capability: string
): Promise<PermissionResult> {
  // Platform admins have full access
  if (await isPlatformAdmin(userId)) {
    return { allowed: true, role: 'platform:admin' };
  }

  const role = await getUserOrgRole(userId, orgId);

  if (!role) {
    console.warn(`[Permission] User ${userId} is not a member of org ${orgId}. Requested capability: ${capability}`);
    return { allowed: false, reason: 'Not a member of this organization' };
  }

  const capabilities = ORG_ROLE_CAPABILITIES[role];

  if (capabilities.includes(capability)) {
    return { allowed: true, role: `org:${role}` };
  }

  return { allowed: false, reason: `Role '${role}' does not have '${capability}' permission` };
}

/**
 * Get user's effective org role (considering platform role)
 */
export async function getEffectiveOrgRole(
  userId: string,
  orgId: string
): Promise<OrgRole | 'platform_admin' | null> {
  if (await isPlatformAdmin(userId)) {
    return 'platform_admin';
  }

  return getUserOrgRole(userId, orgId);
}

// ============================================
// Connection Vault Permissions
// ============================================

/**
 * Check if user has connection vault permission
 */
export async function checkConnectionPermission(
  userId: string,
  orgId: string,
  vaultId: string,
  capability: string
): Promise<PermissionResult> {
  // Platform admins have full access
  if (await isPlatformAdmin(userId)) {
    return { allowed: true, role: 'platform:admin' };
  }

  // Org admins/owners have full access to all connections
  const orgRole = await getUserOrgRole(userId, orgId);
  if (orgRole === 'owner' || orgRole === 'admin') {
    return { allowed: true, role: `org:${orgRole}` };
  }

  // Check vault-specific permissions
  const vaultRole = await getVaultRole(orgId, vaultId, userId);

  if (!vaultRole) {
    // Org members can use connections
    if (orgRole === 'member' && capability === 'use') {
      return { allowed: true, role: 'org:member' };
    }
    return { allowed: false, reason: 'No access to this connection' };
  }

  const capabilities = CONNECTION_ROLE_CAPABILITIES[vaultRole];

  if (capabilities.includes(capability)) {
    return { allowed: true, role: `connection:${vaultRole}` };
  }

  return { allowed: false, reason: `Role '${vaultRole}' does not have '${capability}' permission` };
}

// ============================================
// Form Permissions
// ============================================

/**
 * Get form with permissions
 */
async function getFormWithPermissions(
  orgId: string,
  formId: string
): Promise<{ permissions: FormPermission[]; createdBy: string } | null> {
  const collection = await getOrgFormsCollection(orgId);
  const form = await collection.findOne({ formId });

  if (!form) return null;

  return {
    permissions: form.permissions || [],
    createdBy: form.createdBy,
  };
}

/**
 * Check if user has form permission
 */
export async function checkFormPermission(
  userId: string,
  orgId: string,
  formId: string,
  capability: string
): Promise<PermissionResult> {
  // Platform admins have full access
  if (await isPlatformAdmin(userId)) {
    return { allowed: true, role: 'platform:admin' };
  }

  // Org admins/owners have full access to all forms
  const orgRole = await getUserOrgRole(userId, orgId);
  if (orgRole === 'owner' || orgRole === 'admin') {
    return { allowed: true, role: `org:${orgRole}` };
  }

  // Get form permissions
  const form = await getFormWithPermissions(orgId, formId);
  if (!form) {
    return { allowed: false, reason: 'Form not found' };
  }

  // Check if user is form creator (implicit owner)
  if (form.createdBy === userId) {
    return { allowed: true, role: 'form:owner' };
  }

  // Check explicit form permissions
  const userPermission = form.permissions.find((p) => p.userId === userId);

  if (!userPermission) {
    // Org members can view forms they don't own
    if (orgRole === 'member' && capability === 'read') {
      return { allowed: true, role: 'org:member' };
    }
    // Org viewers can only read
    if (orgRole === 'viewer' && capability === 'read') {
      return { allowed: true, role: 'org:viewer' };
    }
    return { allowed: false, reason: 'No access to this form' };
  }

  const capabilities = FORM_ROLE_CAPABILITIES[userPermission.role];

  if (capabilities.includes(capability)) {
    return { allowed: true, role: `form:${userPermission.role}` };
  }

  return {
    allowed: false,
    reason: `Role '${userPermission.role}' does not have '${capability}' permission`,
  };
}

/**
 * Get user's effective form role
 */
export async function getEffectiveFormRole(
  userId: string,
  orgId: string,
  formId: string
): Promise<FormRole | 'org_admin' | 'platform_admin' | null> {
  if (await isPlatformAdmin(userId)) {
    return 'platform_admin';
  }

  const orgRole = await getUserOrgRole(userId, orgId);
  if (orgRole === 'owner' || orgRole === 'admin') {
    return 'org_admin';
  }

  const form = await getFormWithPermissions(orgId, formId);
  if (!form) return null;

  if (form.createdBy === userId) {
    return 'owner';
  }

  const userPermission = form.permissions.find((p) => p.userId === userId);
  return userPermission?.role || null;
}

// ============================================
// Unified Permission Check
// ============================================

/**
 * Check permission for any resource type
 */
export async function checkPermission(
  context: PermissionContext,
  capability: string
): Promise<PermissionResult> {
  switch (context.resourceType) {
    case 'platform':
      return checkPlatformPermission(context.userId, capability);

    case 'organization':
      if (!context.organizationId) {
        return { allowed: false, reason: 'Organization ID required' };
      }
      return checkOrganizationPermission(context.userId, context.organizationId, capability);

    case 'connection':
      if (!context.organizationId || !context.resourceId) {
        return { allowed: false, reason: 'Organization ID and resource ID required' };
      }
      return checkConnectionPermission(
        context.userId,
        context.organizationId,
        context.resourceId,
        capability
      );

    case 'form':
      if (!context.organizationId || !context.resourceId) {
        return { allowed: false, reason: 'Organization ID and resource ID required' };
      }
      return checkFormPermission(
        context.userId,
        context.organizationId,
        context.resourceId,
        capability
      );

    default:
      return { allowed: false, reason: 'Unknown resource type' };
  }
}

// ============================================
// Permission Assertions (throw on failure)
// ============================================

export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'FORBIDDEN'
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Assert permission - throws if not allowed
 */
export async function assertPermission(
  context: PermissionContext,
  capability: string
): Promise<void> {
  const result = await checkPermission(context, capability);

  if (!result.allowed) {
    throw new PermissionError(result.reason || 'Permission denied', 'FORBIDDEN');
  }
}

/**
 * Assert organization permission
 */
export async function assertOrgPermission(
  userId: string,
  orgId: string,
  capability: string
): Promise<void> {
  await assertPermission(
    { userId, resourceType: 'organization', organizationId: orgId },
    capability
  );
}

/**
 * Assert connection permission
 */
export async function assertConnectionPermission(
  userId: string,
  orgId: string,
  vaultId: string,
  capability: string
): Promise<void> {
  await assertPermission(
    { userId, resourceType: 'connection', organizationId: orgId, resourceId: vaultId },
    capability
  );
}

/**
 * Assert form permission
 */
export async function assertFormPermission(
  userId: string,
  orgId: string,
  formId: string,
  capability: string
): Promise<void> {
  await assertPermission(
    { userId, resourceType: 'form', organizationId: orgId, resourceId: formId },
    capability
  );
}

// ============================================
// User Permission Summary
// ============================================

/**
 * Get all permissions a user has in an organization
 */
export async function getUserOrgPermissions(
  userId: string,
  orgId: string
): Promise<{
  orgRole: OrgRole | null;
  capabilities: string[];
  isOrgAdmin: boolean;
  isPlatformAdmin: boolean;
}> {
  const platformAdmin = await isPlatformAdmin(userId);
  const orgRole = await getUserOrgRole(userId, orgId);

  if (platformAdmin) {
    return {
      orgRole: 'owner',
      capabilities: ['*'], // All capabilities
      isOrgAdmin: true,
      isPlatformAdmin: true,
    };
  }

  if (!orgRole) {
    return {
      orgRole: null,
      capabilities: [],
      isOrgAdmin: false,
      isPlatformAdmin: false,
    };
  }

  return {
    orgRole,
    capabilities: ORG_ROLE_CAPABILITIES[orgRole],
    isOrgAdmin: orgRole === 'owner' || orgRole === 'admin',
    isPlatformAdmin: false,
  };
}
