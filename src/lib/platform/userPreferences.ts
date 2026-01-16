/**
 * User Preferences Service
 *
 * Manages user preferences including:
 * - Recent applications
 * - Last accessed application
 * - UI preferences (collapsed projects, etc.)
 *
 * Stored in platform database since preferences are user-specific and cross-org.
 */

import { Collection } from 'mongodb';
import { getPlatformDb } from './db';

// ============================================
// Types
// ============================================

export interface UserPreferences {
  userId: string;

  // Application navigation preferences
  lastApplicationId?: string;
  lastOrganizationId?: string;
  recentApplications: RecentApplication[];

  // UI state preferences
  collapsedProjectIds: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RecentApplication {
  applicationId: string;
  organizationId: string;
  projectId: string;
  lastAccessedAt: Date;
}

// ============================================
// Collection Accessor
// ============================================

async function getUserPreferencesCollection(): Promise<Collection<UserPreferences>> {
  const db = await getPlatformDb();

  // Ensure index exists (idempotent)
  const collection = db.collection<UserPreferences>('user_preferences');
  await collection.createIndex({ userId: 1 }, { unique: true });

  return collection;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get user preferences, creating default if not exists
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const collection = await getUserPreferencesCollection();

  const existing = await collection.findOne({ userId });
  if (existing) {
    return existing;
  }

  // Create default preferences
  const defaults: UserPreferences = {
    userId,
    recentApplications: [],
    collapsedProjectIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(defaults);
  return defaults;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'userId' | 'createdAt'>>
): Promise<UserPreferences> {
  const collection = await getUserPreferencesCollection();

  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        userId,
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  return result!;
}

// ============================================
// Application Access Tracking
// ============================================

const MAX_RECENT_APPLICATIONS = 10;

/**
 * Record that a user accessed an application
 * Updates lastApplicationId and adds to recentApplications
 */
export async function recordApplicationAccess(
  userId: string,
  applicationId: string,
  organizationId: string,
  projectId: string
): Promise<void> {
  const collection = await getUserPreferencesCollection();

  const now = new Date();
  const recentEntry: RecentApplication = {
    applicationId,
    organizationId,
    projectId,
    lastAccessedAt: now,
  };

  // Get current preferences
  const current = await getUserPreferences(userId);

  // Remove existing entry for this app if present
  const filteredRecent = current.recentApplications.filter(
    r => r.applicationId !== applicationId
  );

  // Add new entry at the beginning and limit to max
  const updatedRecent = [recentEntry, ...filteredRecent].slice(0, MAX_RECENT_APPLICATIONS);

  await collection.updateOne(
    { userId },
    {
      $set: {
        lastApplicationId: applicationId,
        lastOrganizationId: organizationId,
        recentApplications: updatedRecent,
        updatedAt: now,
      },
      $setOnInsert: {
        userId,
        collapsedProjectIds: [],
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

/**
 * Get user's recent applications
 * Returns application IDs sorted by most recent access
 */
export async function getRecentApplications(
  userId: string,
  limit: number = MAX_RECENT_APPLICATIONS
): Promise<RecentApplication[]> {
  const prefs = await getUserPreferences(userId);
  return prefs.recentApplications.slice(0, limit);
}

/**
 * Get user's last accessed application
 */
export async function getLastApplication(userId: string): Promise<{
  applicationId?: string;
  organizationId?: string;
} | null> {
  const prefs = await getUserPreferences(userId);

  if (prefs.lastApplicationId) {
    return {
      applicationId: prefs.lastApplicationId,
      organizationId: prefs.lastOrganizationId,
    };
  }

  return null;
}

// ============================================
// UI Preferences
// ============================================

/**
 * Toggle a project's collapsed state in the app switcher
 */
export async function toggleProjectCollapsed(
  userId: string,
  projectId: string
): Promise<boolean> {
  const prefs = await getUserPreferences(userId);
  const isCollapsed = prefs.collapsedProjectIds.includes(projectId);

  if (isCollapsed) {
    // Expand: remove from list
    await updateUserPreferences(userId, {
      collapsedProjectIds: prefs.collapsedProjectIds.filter(id => id !== projectId),
    });
    return false;
  } else {
    // Collapse: add to list
    await updateUserPreferences(userId, {
      collapsedProjectIds: [...prefs.collapsedProjectIds, projectId],
    });
    return true;
  }
}

/**
 * Get collapsed project IDs
 */
export async function getCollapsedProjects(userId: string): Promise<string[]> {
  const prefs = await getUserPreferences(userId);
  return prefs.collapsedProjectIds;
}

/**
 * Clear stale references (e.g., when apps are deleted)
 * Called periodically or when accessing preferences
 */
export async function cleanupStaleReferences(
  userId: string,
  validApplicationIds: string[]
): Promise<void> {
  const prefs = await getUserPreferences(userId);
  const validSet = new Set(validApplicationIds);

  const cleanedRecent = prefs.recentApplications.filter(
    r => validSet.has(r.applicationId)
  );

  const updates: Partial<UserPreferences> = {
    recentApplications: cleanedRecent,
  };

  // Clear last app if it's no longer valid
  if (prefs.lastApplicationId && !validSet.has(prefs.lastApplicationId)) {
    updates.lastApplicationId = undefined;
    updates.lastOrganizationId = undefined;
  }

  if (
    cleanedRecent.length !== prefs.recentApplications.length ||
    updates.lastApplicationId === undefined
  ) {
    await updateUserPreferences(userId, updates);
  }
}
