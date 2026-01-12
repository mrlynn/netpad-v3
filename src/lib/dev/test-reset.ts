/**
 * Test Reset Utilities
 *
 * Comprehensive utilities for resetting test data and environments.
 * These functions should ONLY be used in development mode.
 */

import {
  getUsersCollection,
  getOrganizationsCollection,
  getUsageCollection,
  getProjectsCollection,
  getDeploymentsCollection,
  getPlatformDb,
  getOrgDb,
  getConnectionVaultCollection,
  getOrgFormsCollection,
  getOrgSubmissionsCollection,
} from '@/lib/platform/db';
import { getWorkflowsCollection } from '@/lib/workflow/db';
import { deleteProvisionedCluster } from '@/lib/atlas/provisioning';
import { deleteOrganization } from '@/lib/platform/organizations';
import { getAuthDb } from '@/lib/auth/db';

// ============================================
// Types
// ============================================

export interface ResetOptions {
  orgId?: string;
  userId?: string;
  clearSessions?: boolean;
  clearUsers?: boolean;
  clearOrgs?: boolean;
  clearForms?: boolean;
  clearWorkflows?: boolean;
  clearClusters?: boolean;
  clearVaults?: boolean;
  clearUsage?: boolean;
  clearLegacyStorage?: boolean;
}

export interface ResetResult {
  success: boolean;
  operations: string[];
  errors: string[];
  summary: {
    sessionsCleared?: number;
    usersDeleted?: number;
    orgsDeleted?: number;
    formsDeleted?: number;
    workflowsDeleted?: number;
    clustersDeleted?: number;
    vaultsDeleted?: number;
    usageReset?: number;
    legacyStorageCleared?: number;
  };
}

// ============================================
// Check Dev Mode
// ============================================

function checkDevMode() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test reset utilities are disabled in production');
  }
}

// ============================================
// Session Cleanup
// ============================================

/**
 * Clear all sessions (Note: Sessions are cookie-based, so we clear from auth DB)
 */
export async function clearAllSessions(): Promise<number> {
  checkDevMode();
  
  // Note: IronSession stores sessions in encrypted cookies, not in MongoDB
  // So we can't directly clear them from the database
  // This would need to be done client-side by clearing cookies
  // For now, we return 0 and note this in the documentation
  console.log('[Test Reset] Sessions are cookie-based (IronSession) and cannot be cleared server-side');
  return 0;
}

// ============================================
// User Cleanup
// ============================================

/**
 * Delete all test users (excluding platform admins)
 */
export async function clearTestUsers(excludeUserId?: string): Promise<number> {
  checkDevMode();
  
  const usersCollection = await getUsersCollection();
  const query: any = {
    platformRole: { $ne: 'admin' }, // Don't delete platform admins
  };
  
  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }
  
  const result = await usersCollection.deleteMany(query);
  console.log(`[Test Reset] Deleted ${result.deletedCount} test users`);
  
  return result.deletedCount;
}

/**
 * Delete a specific user and all their data
 */
export async function deleteUser(userId: string): Promise<boolean> {
  checkDevMode();
  
  const usersCollection = await getUsersCollection();
  const result = await usersCollection.deleteOne({ userId });
  
  // Also delete from auth DB
  try {
    const authDb = await getAuthDb();
    // Auth users might be stored with different ID format
    // Try both userId and ObjectId
    await authDb.collection('users').deleteOne({ userId });
    await authDb.collection('users').deleteMany({ email: { $regex: userId } });
  } catch (error) {
    console.warn('[Test Reset] Error deleting from auth DB:', error);
  }
  
  console.log(`[Test Reset] Deleted user ${userId}`);
  return result.deletedCount > 0;
}

// ============================================
// Organization Cleanup
// ============================================

/**
 * Delete all test organizations
 */
export async function clearTestOrgs(excludeOrgId?: string): Promise<number> {
  checkDevMode();
  
  const orgsCollection = await getOrganizationsCollection();
  const query: any = {};
  
  if (excludeOrgId) {
    query.orgId = { $ne: excludeOrgId };
  }
  
  // Get all orgs to delete (so we can clean up their resources)
  const orgsToDelete = await orgsCollection.find(query).toArray();
  
  let deletedCount = 0;
  for (const org of orgsToDelete) {
    try {
      await deleteOrganization(org.orgId, 'test-reset');
      deletedCount++;
    } catch (error) {
      console.error(`[Test Reset] Error deleting org ${org.orgId}:`, error);
    }
  }
  
  console.log(`[Test Reset] Deleted ${deletedCount} organizations`);
  return deletedCount;
}

/**
 * Delete a specific organization and all its data
 */
export async function deleteOrg(orgId: string, deletedBy: string = 'test-reset'): Promise<boolean> {
  checkDevMode();
  return await deleteOrganization(orgId, deletedBy);
}

// ============================================
// Forms Cleanup
// ============================================

/**
 * Delete all forms for an organization
 */
export async function clearOrgForms(orgId: string): Promise<number> {
  checkDevMode();
  
  try {
    const formsCollection = await getOrgFormsCollection(orgId);
    const result = await formsCollection.deleteMany({});
    
    // Also clear legacy storage forms if they exist
    const platformDb = await getPlatformDb();
    const legacyFormsResult = await platformDb.collection('user_forms').deleteMany({
      'form.organizationId': orgId,
    });
    
    const totalDeleted = result.deletedCount + legacyFormsResult.deletedCount;
    console.log(`[Test Reset] Deleted ${totalDeleted} forms for org ${orgId}`);
    
    return totalDeleted;
  } catch (error) {
    console.error(`[Test Reset] Error clearing forms for org ${orgId}:`, error);
    return 0;
  }
}

/**
 * Delete all form submissions for an organization
 */
export async function clearOrgSubmissions(orgId: string): Promise<number> {
  checkDevMode();
  
  try {
    const submissionsCollection = await getOrgSubmissionsCollection(orgId);
    const result = await submissionsCollection.deleteMany({});
    
    // Also clear legacy storage submissions
    const platformDb = await getPlatformDb();
    const legacySubmissionsResult = await platformDb.collection('form_submissions').deleteMany({
      'submission.organizationId': orgId,
    });
    const globalSubmissionsResult = await platformDb.collection('global_submissions').deleteMany({
      organizationId: orgId,
    });
    
    const totalDeleted = result.deletedCount + legacySubmissionsResult.deletedCount + globalSubmissionsResult.deletedCount;
    console.log(`[Test Reset] Deleted ${totalDeleted} form submissions for org ${orgId}`);
    
    return totalDeleted;
  } catch (error) {
    console.error(`[Test Reset] Error clearing submissions for org ${orgId}:`, error);
    return 0;
  }
}

// ============================================
// Workflows Cleanup
// ============================================

/**
 * Delete all workflows for an organization
 */
export async function clearOrgWorkflows(orgId: string): Promise<number> {
  checkDevMode();
  
  try {
    const workflowsCollection = await getWorkflowsCollection(orgId);
    const result = await workflowsCollection.deleteMany({});
    
    // Also clear workflow executions
    const orgDb = await getOrgDb(orgId);
    const executionsResult = await orgDb.collection('workflow_executions').deleteMany({});
    
    const totalDeleted = result.deletedCount;
    console.log(`[Test Reset] Deleted ${totalDeleted} workflows and ${executionsResult.deletedCount} executions for org ${orgId}`);
    
    return totalDeleted;
  } catch (error) {
    console.error(`[Test Reset] Error clearing workflows for org ${orgId}:`, error);
    return 0;
  }
}

// ============================================
// Cluster Cleanup
// ============================================

/**
 * Delete provisioned cluster for an organization
 */
export async function clearOrgCluster(orgId: string): Promise<boolean> {
  checkDevMode();
  
  try {
    const result = await deleteProvisionedCluster(orgId, 'test-reset');
    if (result.success) {
      console.log(`[Test Reset] Deleted cluster for org ${orgId}`);
    } else {
      console.log(`[Test Reset] No cluster found for org ${orgId}`);
    }
    return result.success;
  } catch (error) {
    console.error(`[Test Reset] Error deleting cluster for org ${orgId}:`, error);
    return false;
  }
}

// ============================================
// Vault Cleanup
// ============================================

/**
 * Delete all connection vaults for an organization
 */
export async function clearOrgVaults(orgId: string): Promise<number> {
  checkDevMode();
  
  try {
    const vaultsCollection = await getConnectionVaultCollection(orgId);
    const result = await vaultsCollection.deleteMany({});
    
    console.log(`[Test Reset] Deleted ${result.deletedCount} vaults for org ${orgId}`);
    return result.deletedCount;
  } catch (error) {
    console.error(`[Test Reset] Error clearing vaults for org ${orgId}:`, error);
    return 0;
  }
}

// ============================================
// Usage/Billing Cleanup
// ============================================

/**
 * Reset usage counters for an organization
 */
export async function clearOrgUsage(orgId: string): Promise<boolean> {
  checkDevMode();
  
  try {
    const usageCollection = await getUsageCollection();
    const result = await usageCollection.deleteMany({ organizationId: orgId });
    
    console.log(`[Test Reset] Reset usage for org ${orgId}`);
    return result.deletedCount > 0;
  } catch (error) {
    console.error(`[Test Reset] Error resetting usage for org ${orgId}:`, error);
    return false;
  }
}

// ============================================
// Legacy Storage Cleanup
// ============================================

/**
 * Clear legacy storage (user_forms, user_connections from platform DB)
 */
export async function clearLegacyStorage(userId?: string): Promise<number> {
  checkDevMode();
  
  const platformDb = await getPlatformDb();
  let totalDeleted = 0;
  
  try {
    // Clear legacy forms
    const formsQuery = userId ? { ownerId: userId } : {};
    const formsResult = await platformDb.collection('user_forms').deleteMany(formsQuery);
    totalDeleted += formsResult.deletedCount;
    
    // Clear legacy connections
    const connectionsQuery = userId ? { ownerId: userId } : {};
    const connectionsResult = await platformDb.collection('user_connections').deleteMany(connectionsQuery);
    totalDeleted += connectionsResult.deletedCount;
    
    // Clear legacy submissions
    const submissionsQuery = userId ? { ownerId: userId } : {};
    const submissionsResult = await platformDb.collection('form_submissions').deleteMany(submissionsQuery);
    totalDeleted += submissionsResult.deletedCount;
    
    // Clear published forms
    const publishedQuery = userId ? { createdBy: userId } : {};
    const publishedResult = await platformDb.collection('published_forms').deleteMany(publishedQuery);
    totalDeleted += publishedResult.deletedCount;
    
    console.log(`[Test Reset] Cleared ${totalDeleted} legacy storage items`);
    return totalDeleted;
  } catch (error) {
    console.error('[Test Reset] Error clearing legacy storage:', error);
    return totalDeleted;
  }
}

// ============================================
// Comprehensive Reset
// ============================================

/**
 * Comprehensive reset based on options
 */
export async function performTestReset(options: ResetOptions): Promise<ResetResult> {
  checkDevMode();
  
  const result: ResetResult = {
    success: true,
    operations: [],
    errors: [],
    summary: {},
  };
  
  try {
    // Clear sessions (note: limited - sessions are cookie-based)
    if (options.clearSessions) {
      try {
        const count = await clearAllSessions();
        result.summary.sessionsCleared = count;
        result.operations.push(`Cleared ${count} sessions (note: cookie-based sessions require client-side clearing)`);
      } catch (error: any) {
        result.errors.push(`Failed to clear sessions: ${error.message}`);
      }
    }
    
    // Clear users
    if (options.clearUsers) {
      try {
        if (options.userId) {
          const deleted = await deleteUser(options.userId);
          if (deleted) {
            result.summary.usersDeleted = 1;
            result.operations.push(`Deleted user ${options.userId}`);
          }
        } else {
          const count = await clearTestUsers();
          result.summary.usersDeleted = count;
          result.operations.push(`Deleted ${count} test users`);
        }
      } catch (error: any) {
        result.errors.push(`Failed to clear users: ${error.message}`);
      }
    }
    
    // Clear organizations
    if (options.clearOrgs) {
      try {
        if (options.orgId) {
          const deleted = await deleteOrg(options.orgId);
          if (deleted) {
            result.summary.orgsDeleted = 1;
            result.operations.push(`Deleted organization ${options.orgId}`);
          }
        } else {
          const count = await clearTestOrgs();
          result.summary.orgsDeleted = count;
          result.operations.push(`Deleted ${count} organizations`);
        }
      } catch (error: any) {
        result.errors.push(`Failed to clear organizations: ${error.message}`);
      }
    }
    
    // Clear forms (requires orgId)
    if (options.clearForms && options.orgId) {
      try {
        const formsCount = await clearOrgForms(options.orgId);
        const submissionsCount = await clearOrgSubmissions(options.orgId);
        result.summary.formsDeleted = formsCount + submissionsCount;
        result.operations.push(`Deleted ${formsCount} forms and ${submissionsCount} submissions for org ${options.orgId}`);
      } catch (error: any) {
        result.errors.push(`Failed to clear forms: ${error.message}`);
      }
    }
    
    // Clear workflows (requires orgId)
    if (options.clearWorkflows && options.orgId) {
      try {
        const count = await clearOrgWorkflows(options.orgId);
        result.summary.workflowsDeleted = count;
        result.operations.push(`Deleted ${count} workflows for org ${options.orgId}`);
      } catch (error: any) {
        result.errors.push(`Failed to clear workflows: ${error.message}`);
      }
    }
    
    // Clear clusters (requires orgId)
    if (options.clearClusters && options.orgId) {
      try {
        const deleted = await clearOrgCluster(options.orgId);
        if (deleted) {
          result.summary.clustersDeleted = 1;
          result.operations.push(`Deleted cluster for org ${options.orgId}`);
        } else {
          result.operations.push(`No cluster found for org ${options.orgId}`);
        }
      } catch (error: any) {
        result.errors.push(`Failed to clear cluster: ${error.message}`);
      }
    }
    
    // Clear vaults (requires orgId)
    if (options.clearVaults && options.orgId) {
      try {
        const count = await clearOrgVaults(options.orgId);
        result.summary.vaultsDeleted = count;
        result.operations.push(`Deleted ${count} vaults for org ${options.orgId}`);
      } catch (error: any) {
        result.errors.push(`Failed to clear vaults: ${error.message}`);
      }
    }
    
    // Clear usage (requires orgId)
    if (options.clearUsage && options.orgId) {
      try {
        const cleared = await clearOrgUsage(options.orgId);
        if (cleared) {
          result.summary.usageReset = 1;
          result.operations.push(`Reset usage for org ${options.orgId}`);
        }
      } catch (error: any) {
        result.errors.push(`Failed to clear usage: ${error.message}`);
      }
    }
    
    // Clear legacy storage
    if (options.clearLegacyStorage) {
      try {
        const count = await clearLegacyStorage(options.userId);
        result.summary.legacyStorageCleared = count;
        result.operations.push(`Cleared ${count} legacy storage items`);
      } catch (error: any) {
        result.errors.push(`Failed to clear legacy storage: ${error.message}`);
      }
    }
    
    result.success = result.errors.length === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Reset operation failed: ${error.message}`);
  }
  
  return result;
}
