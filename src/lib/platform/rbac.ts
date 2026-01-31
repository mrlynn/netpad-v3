/**
 * RBAC (Role-Based Access Control) Service
 * 
 * Handles permission checking, role resolution, and effective permissions computation.
 */

import { getPlatformDb } from './db';
import {
  Permission,
  OrgRole,
  OrgGroup,
  CustomRole,
  RoleAssignment,
  EffectivePermissions,
  BUILTIN_ROLE_PERMISSIONS,
  PlatformUser,
} from '@/types/platform';

/**
 * Check if a user has a specific permission in an organization
 */
export async function hasPermission(
  userId: string,
  orgId: string,
  permission: Permission,
  resourceId?: string // Optional: for scoped permissions
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, orgId);
  
  // Check org-wide permissions
  if (effective.permissions.includes(permission)) {
    return true;
  }
  
  // Check scoped permissions if resourceId provided
  if (resourceId && effective.scopedPermissions?.[resourceId]) {
    return effective.scopedPermissions[resourceId].includes(permission);
  }
  
  return false;
}

/**
 * Check multiple permissions at once
 */
export async function hasAnyPermission(
  userId: string,
  orgId: string,
  permissions: Permission[]
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, orgId);
  return permissions.some(p => effective.permissions.includes(p));
}

/**
 * Check that user has ALL specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  orgId: string,
  permissions: Permission[]
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, orgId);
  return permissions.every(p => effective.permissions.includes(p));
}

/**
 * Get a user's effective permissions for an organization
 * Combines: direct membership role + group roles + custom role assignments
 */
export async function getEffectivePermissions(
  userId: string,
  orgId: string
): Promise<EffectivePermissions> {
  const db = await getPlatformDb();
  
  const allPermissions = new Set<Permission>();
  const sources: EffectivePermissions['sources'] = [];
  const scopedPermissions: Record<string, Permission[]> = {};

  // 1. Get user's direct org membership role
  const user = await db.collection<PlatformUser>('users').findOne({ userId });
  if (user) {
    const membership = user.organizations?.find(o => o.orgId === orgId);
    if (membership) {
      const rolePermissions = BUILTIN_ROLE_PERMISSIONS[membership.role] || [];
      rolePermissions.forEach(p => allPermissions.add(p));
      sources.push({
        type: 'builtin',
        sourceId: membership.role,
        sourceName: `${membership.role} (direct)`,
        permissions: [...rolePermissions],
      });
    }
  }

  // 2. Get permissions from groups the user belongs to
  const groups = await db.collection<OrgGroup>('groups')
    .find({
      organizationId: orgId,
      memberIds: userId,
    })
    .toArray();

  for (const group of groups) {
    if (group.defaultRole) {
      const rolePermissions = BUILTIN_ROLE_PERMISSIONS[group.defaultRole] || [];
      rolePermissions.forEach(p => allPermissions.add(p));
      sources.push({
        type: 'group',
        sourceId: group.groupId,
        sourceName: `${group.name} (${group.defaultRole})`,
        permissions: [...rolePermissions],
      });
    }

    // Check for custom role assignments to this group
    const groupAssignments = await db.collection<RoleAssignment>('roleAssignments')
      .find({
        organizationId: orgId,
        targetType: 'group',
        targetId: group.groupId,
      })
      .toArray();

    for (const assignment of groupAssignments) {
      const assignedPermissions = await resolveAssignmentPermissions(assignment);
      
      if (assignment.scope?.resourceId) {
        // Scoped permission
        if (!scopedPermissions[assignment.scope.resourceId]) {
          scopedPermissions[assignment.scope.resourceId] = [];
        }
        scopedPermissions[assignment.scope.resourceId].push(...assignedPermissions);
      } else {
        // Org-wide permission
        assignedPermissions.forEach(p => allPermissions.add(p));
      }
      
      sources.push({
        type: 'group',
        sourceId: group.groupId,
        sourceName: `${group.name} (assignment)`,
        permissions: assignedPermissions,
      });
    }
  }

  // 3. Get direct role assignments to the user
  const userAssignments = await db.collection<RoleAssignment>('roleAssignments')
    .find({
      organizationId: orgId,
      targetType: 'user',
      targetId: userId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    })
    .toArray();

  for (const assignment of userAssignments) {
    const assignedPermissions = await resolveAssignmentPermissions(assignment);
    
    if (assignment.scope?.resourceId) {
      // Scoped permission
      if (!scopedPermissions[assignment.scope.resourceId]) {
        scopedPermissions[assignment.scope.resourceId] = [];
      }
      scopedPermissions[assignment.scope.resourceId].push(...assignedPermissions);
    } else {
      // Org-wide permission
      assignedPermissions.forEach(p => allPermissions.add(p));
    }
    
    sources.push({
      type: 'direct',
      sourceId: assignment.roleId,
      sourceName: `${assignment.roleId} (direct assignment)`,
      permissions: assignedPermissions,
    });
  }

  // Dedupe scoped permissions
  for (const resourceId of Object.keys(scopedPermissions)) {
    scopedPermissions[resourceId] = [...new Set(scopedPermissions[resourceId])];
  }

  return {
    userId,
    organizationId: orgId,
    permissions: [...allPermissions],
    sources,
    scopedPermissions: Object.keys(scopedPermissions).length > 0 ? scopedPermissions : undefined,
    computedAt: new Date(),
  };
}

/**
 * Resolve permissions from a role assignment
 */
async function resolveAssignmentPermissions(assignment: RoleAssignment): Promise<Permission[]> {
  if (assignment.roleType === 'builtin') {
    return BUILTIN_ROLE_PERMISSIONS[assignment.roleId as OrgRole] || [];
  }

  // Custom role - look it up
  const db = await getPlatformDb();
  const customRole = await db.collection<CustomRole>('customRoles').findOne({
    organizationId: assignment.organizationId,
    roleId: assignment.roleId,
  });

  if (!customRole) {
    return [];
  }

  // Start with base role permissions if specified
  let permissions: Permission[] = [];
  if (customRole.baseRole) {
    permissions = [...(BUILTIN_ROLE_PERMISSIONS[customRole.baseRole] || [])];
  }

  // Add explicit permissions
  permissions.push(...(customRole.permissions as Permission[]));

  return [...new Set(permissions)];
}

/**
 * Get all members of an organization with their roles
 */
export async function getOrgMembers(orgId: string) {
  const db = await getPlatformDb();
  
  const users = await db.collection<PlatformUser>('users')
    .find({
      'organizations.orgId': orgId,
    })
    .project({
      userId: 1,
      email: 1,
      displayName: 1,
      avatarUrl: 1,
      organizations: 1,
      lastLoginAt: 1,
    })
    .toArray();

  return users.map(user => {
    const membership = user.organizations?.find((o: { orgId: string }) => o.orgId === orgId);
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: membership?.role || 'viewer',
      joinedAt: membership?.joinedAt,
      lastLoginAt: user.lastLoginAt,
    };
  });
}

/**
 * Assign a role to a user or group
 */
export async function assignRole(
  organizationId: string,
  targetType: 'user' | 'group',
  targetId: string,
  roleType: 'builtin' | 'custom',
  roleId: string,
  grantedBy: string,
  options?: {
    scope?: RoleAssignment['scope'];
    expiresAt?: Date;
    reason?: string;
  }
): Promise<RoleAssignment> {
  const db = await getPlatformDb();
  
  // Generate assignment ID
  const assignmentId = `asgn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  
  const assignment: RoleAssignment = {
    assignmentId,
    organizationId,
    targetType,
    targetId,
    roleType,
    roleId,
    scope: options?.scope,
    grantedBy,
    grantedAt: new Date(),
    expiresAt: options?.expiresAt,
    reason: options?.reason,
  };

  await db.collection<RoleAssignment>('roleAssignments').insertOne(assignment);

  return assignment;
}

/**
 * Remove a role assignment
 */
export async function removeRoleAssignment(
  organizationId: string,
  assignmentId: string
): Promise<boolean> {
  const db = await getPlatformDb();
  
  const result = await db.collection<RoleAssignment>('roleAssignments').deleteOne({
    organizationId,
    assignmentId,
  });

  return result.deletedCount > 0;
}

/**
 * Update a user's direct org role
 */
export async function updateUserOrgRole(
  userId: string,
  orgId: string,
  newRole: OrgRole
): Promise<boolean> {
  const db = await getPlatformDb();
  
  const result = await db.collection<PlatformUser>('users').updateOne(
    { userId, 'organizations.orgId': orgId },
    { $set: { 'organizations.$.role': newRole } }
  );

  return result.modifiedCount > 0;
}
