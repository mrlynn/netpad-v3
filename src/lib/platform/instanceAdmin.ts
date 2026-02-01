/**
 * Instance Admin Management
 * 
 * Handles instance-level administrator access for self-hosted deployments.
 * In cloud mode, this defers to @netpad/cloud-features for admin checks.
 * 
 * Instance Admin Setup:
 * 1. If NETPAD_INSTANCE_ADMIN_EMAIL is set, that user becomes admin on signup
 * 2. If no env var and no admin exists, first user becomes admin
 * 3. Once an admin exists, no automatic promotion
 */

import { getPlatformDb } from './db';
import { isCloudMode } from './mode';
import { PlatformUser } from '@/types/platform';

/**
 * Instance-level admin role (for self-hosted deployments)
 */
export type InstanceRole = 'instance_admin';

/**
 * Check if a user is an instance admin
 * 
 * In self-hosted mode: checks instanceRole
 * In cloud mode: delegates to @netpad/cloud-features
 */
export async function isInstanceAdmin(userId: string): Promise<boolean> {
  const db = await getPlatformDb();
  const user = await db.collection<PlatformUser>('users').findOne({ userId });
  
  if (!user) {
    return false;
  }

  // Check instance role (works for both modes as fallback)
  if (user.instanceRole === 'instance_admin') {
    return true;
  }

  // In cloud mode, also check cloud roles
  if (isCloudMode()) {
    try {
      // Dynamic import to avoid bundling cloud package in self-hosted builds
      const cloudFeatures = await import('@netpad/cloud-features') as any;
      if (typeof cloudFeatures.isCloudAdmin === 'function') {
        return await cloudFeatures.isCloudAdmin(userId);
      }
    } catch {
      // Cloud package not installed or doesn't have this function
      // Fall through to false
    }
  }

  // Legacy check: platformRole (for backwards compatibility)
  if ((user as any).platformRole === 'admin' || (user as any).platformRole === 'platform_admin') {
    return true;
  }

  return false;
}

/**
 * Check if any instance admin exists in the database
 */
export async function hasInstanceAdmin(): Promise<boolean> {
  const db = await getPlatformDb();
  
  const admin = await db.collection<PlatformUser>('users').findOne({
    $or: [
      { instanceRole: 'instance_admin' },
      { platformRole: { $in: ['admin', 'platform_admin', 'super_admin'] } },
    ],
  });

  return !!admin;
}

/**
 * Get the configured admin email from environment
 */
export function getConfiguredAdminEmail(): string | null {
  return process.env.NETPAD_INSTANCE_ADMIN_EMAIL || null;
}

/**
 * Check if a user should be auto-promoted to instance admin
 * 
 * Rules:
 * 1. If NETPAD_INSTANCE_ADMIN_EMAIL matches user's email → promote
 * 2. If no env var AND no admin exists → promote (first user)
 * 3. Otherwise → no promotion
 */
export async function shouldPromoteToAdmin(email: string): Promise<boolean> {
  const configuredEmail = getConfiguredAdminEmail();
  
  // Rule 1: Matches configured admin email
  if (configuredEmail && email.toLowerCase() === configuredEmail.toLowerCase()) {
    return true;
  }

  // Rule 2: No configured email AND no admin exists (first user scenario)
  if (!configuredEmail) {
    const adminExists = await hasInstanceAdmin();
    if (!adminExists) {
      return true;
    }
  }

  return false;
}

/**
 * Promote a user to instance admin
 */
export async function promoteToInstanceAdmin(userId: string): Promise<void> {
  const db = await getPlatformDb();
  
  await db.collection<PlatformUser>('users').updateOne(
    { userId },
    { 
      $set: { 
        instanceRole: 'instance_admin',
        updatedAt: new Date(),
      } 
    }
  );

  // Log the promotion
  console.log(`[InstanceAdmin] Promoted user ${userId} to instance_admin`);
}

/**
 * Revoke instance admin from a user
 */
export async function revokeInstanceAdmin(userId: string): Promise<void> {
  const db = await getPlatformDb();
  
  await db.collection<PlatformUser>('users').updateOne(
    { userId },
    { 
      $unset: { instanceRole: '' },
      $set: { updatedAt: new Date() },
    }
  );

  console.log(`[InstanceAdmin] Revoked instance_admin from user ${userId}`);
}

/**
 * Get all instance admins
 */
export async function getInstanceAdmins(): Promise<PlatformUser[]> {
  const db = await getPlatformDb();
  
  const admins = await db.collection<PlatformUser>('users')
    .find({
      $or: [
        { instanceRole: 'instance_admin' },
        { platformRole: { $in: ['admin', 'platform_admin', 'super_admin'] } },
      ],
    })
    .toArray();

  return admins;
}
