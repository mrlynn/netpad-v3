/**
 * Admin Extension Settings Service
 *
 * Manages platform-level extension enable/disable settings.
 * Only platform admins can modify these settings.
 * Changes require application restart to take effect.
 *
 * Stored in platform database since this is a global platform setting.
 */

import { Collection, ObjectId } from 'mongodb';
import { getPlatformDb } from './db';

// ============================================
// Types
// ============================================

export interface AdminExtensionSetting {
  _id?: ObjectId;
  extensionId: string;        // Package name like "@netpad/collaborate"
  enabled: boolean;
  enabledAt?: Date;
  disabledAt?: Date;
  updatedBy: string;          // userId of admin who made change
  updatedAt: Date;
  createdAt: Date;
}

// ============================================
// Collection Accessor
// ============================================

async function getAdminExtensionSettingsCollection(): Promise<Collection<AdminExtensionSetting>> {
  const db = await getPlatformDb();

  // Ensure indexes exist (idempotent)
  const collection = db.collection<AdminExtensionSetting>('admin_extension_settings');
  await collection.createIndex({ extensionId: 1 }, { unique: true });
  await collection.createIndex({ enabled: 1 });
  await collection.createIndex({ updatedAt: -1 });

  return collection;
}

// ============================================
// Read Operations
// ============================================

/**
 * Get all extension settings
 * Returns a map of extensionId -> enabled status
 */
export async function getAllExtensionSettings(): Promise<Map<string, AdminExtensionSetting>> {
  const collection = await getAdminExtensionSettingsCollection();
  const settings = await collection.find({}).toArray();

  const map = new Map<string, AdminExtensionSetting>();
  for (const setting of settings) {
    map.set(setting.extensionId, setting);
  }

  return map;
}

/**
 * Get enabled extension IDs from database
 * Returns Set of extensionIds that are explicitly enabled
 */
export async function getEnabledExtensionIds(): Promise<Set<string>> {
  const collection = await getAdminExtensionSettingsCollection();
  const settings = await collection.find({ enabled: true }).toArray();

  return new Set(settings.map(s => s.extensionId));
}

/**
 * Get disabled extension IDs from database
 * Returns Set of extensionIds that are explicitly disabled
 */
export async function getDisabledExtensionIds(): Promise<Set<string>> {
  const collection = await getAdminExtensionSettingsCollection();
  const settings = await collection.find({ enabled: false }).toArray();

  return new Set(settings.map(s => s.extensionId));
}

/**
 * Check if an extension is enabled
 * Returns undefined if no setting exists (use default behavior)
 */
export async function isExtensionEnabled(extensionId: string): Promise<boolean | undefined> {
  const collection = await getAdminExtensionSettingsCollection();
  const setting = await collection.findOne({ extensionId });

  if (!setting) {
    return undefined; // No setting - use default behavior
  }

  return setting.enabled;
}

/**
 * Get a single extension setting
 */
export async function getExtensionSetting(extensionId: string): Promise<AdminExtensionSetting | null> {
  const collection = await getAdminExtensionSettingsCollection();
  return collection.findOne({ extensionId });
}

// ============================================
// Write Operations
// ============================================

/**
 * Set extension enabled/disabled state
 * Creates or updates the setting
 */
export async function setExtensionEnabled(
  extensionId: string,
  enabled: boolean,
  userId: string
): Promise<AdminExtensionSetting> {
  const collection = await getAdminExtensionSettingsCollection();
  const now = new Date();

  const result = await collection.findOneAndUpdate(
    { extensionId },
    {
      $set: {
        enabled,
        updatedBy: userId,
        updatedAt: now,
        ...(enabled ? { enabledAt: now } : { disabledAt: now }),
      },
      $setOnInsert: {
        extensionId,
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  return result!;
}

/**
 * Delete an extension setting
 * Reverts to default behavior (env var based)
 */
export async function deleteExtensionSetting(extensionId: string): Promise<boolean> {
  const collection = await getAdminExtensionSettingsCollection();
  const result = await collection.deleteOne({ extensionId });
  return result.deletedCount > 0;
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Set multiple extensions enabled/disabled at once
 */
export async function setMultipleExtensionsEnabled(
  settings: Array<{ extensionId: string; enabled: boolean }>,
  userId: string
): Promise<void> {
  const collection = await getAdminExtensionSettingsCollection();
  const now = new Date();

  const operations = settings.map(({ extensionId, enabled }) => ({
    updateOne: {
      filter: { extensionId },
      update: {
        $set: {
          enabled,
          updatedBy: userId,
          updatedAt: now,
          ...(enabled ? { enabledAt: now } : { disabledAt: now }),
        },
        $setOnInsert: {
          extensionId,
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await collection.bulkWrite(operations);
  }
}

// ============================================
// Stats
// ============================================

/**
 * Get extension settings statistics
 */
export async function getExtensionSettingsStats(): Promise<{
  totalSettings: number;
  enabledCount: number;
  disabledCount: number;
}> {
  const collection = await getAdminExtensionSettingsCollection();

  const [totalSettings, enabledCount, disabledCount] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ enabled: true }),
    collection.countDocuments({ enabled: false }),
  ]);

  return {
    totalSettings,
    enabledCount,
    disabledCount,
  };
}
