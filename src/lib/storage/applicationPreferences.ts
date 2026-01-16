/**
 * Application Preferences Storage
 *
 * Utilities for managing application preferences in localStorage with:
 * - Server preference sync
 * - Cross-tab sync (storage events)
 * - Fallback handling
 */

import { Application } from '@/types/application';

// ============================================
// Storage Keys
// ============================================

export const STORAGE_KEYS = {
  LAST_APP_ID: 'netpad_last_application_id',
  RECENT_APPS: 'netpad_recent_applications',
  COLLAPSED_PROJECTS: 'netpad_collapsed_projects',
} as const;

// ============================================
// Types
// ============================================

export interface ApplicationPreferences {
  lastApplicationId: string | null;
  recentApplicationIds: string[];
  collapsedProjectIds: string[];
  updatedAt: string;
}

// ============================================
// Storage Helpers
// ============================================

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get value from localStorage with error handling
 */
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[ApplicationPreferences] Failed to read ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set value in localStorage with error handling
 */
function setToStorage<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[ApplicationPreferences] Failed to save ${key}:`, error);
    return false;
  }
}

/**
 * Remove value from localStorage with error handling
 */
function removeFromStorage(key: string): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[ApplicationPreferences] Failed to remove ${key}:`, error);
    return false;
  }
}

// ============================================
// Application Preferences API
// ============================================

/**
 * Get last application ID from localStorage
 */
export function getLastApplicationId(): string | null {
  return getFromStorage<string | null>(STORAGE_KEYS.LAST_APP_ID, null);
}

/**
 * Set last application ID in localStorage
 */
export function setLastApplicationId(appId: string | null): boolean {
  if (appId === null) {
    return removeFromStorage(STORAGE_KEYS.LAST_APP_ID);
  }
  return setToStorage(STORAGE_KEYS.LAST_APP_ID, appId);
}

/**
 * Get recent application IDs from localStorage
 */
export function getRecentApplicationIds(maxCount: number = 10): string[] {
  const ids = getFromStorage<string[]>(STORAGE_KEYS.RECENT_APPS, []);
  return ids.slice(0, maxCount);
}

/**
 * Add application to recent list
 * Moves the app to the front if it already exists
 */
export function addRecentApplicationId(appId: string, maxCount: number = 10): boolean {
  const current = getFromStorage<string[]>(STORAGE_KEYS.RECENT_APPS, []);
  const updated = [
    appId,
    ...current.filter(id => id !== appId),
  ].slice(0, maxCount);
  return setToStorage(STORAGE_KEYS.RECENT_APPS, updated);
}

/**
 * Remove application from recent list
 */
export function removeRecentApplicationId(appId: string): boolean {
  const current = getFromStorage<string[]>(STORAGE_KEYS.RECENT_APPS, []);
  const updated = current.filter(id => id !== appId);
  return setToStorage(STORAGE_KEYS.RECENT_APPS, updated);
}

/**
 * Clear recent applications list
 */
export function clearRecentApplications(): boolean {
  return setToStorage(STORAGE_KEYS.RECENT_APPS, []);
}

/**
 * Get collapsed project IDs from localStorage
 */
export function getCollapsedProjectIds(): string[] {
  return getFromStorage<string[]>(STORAGE_KEYS.COLLAPSED_PROJECTS, []);
}

/**
 * Set collapsed project IDs in localStorage
 */
export function setCollapsedProjectIds(projectIds: string[]): boolean {
  return setToStorage(STORAGE_KEYS.COLLAPSED_PROJECTS, projectIds);
}

/**
 * Toggle collapsed state for a project
 */
export function toggleCollapsedProject(projectId: string): boolean {
  const current = getCollapsedProjectIds();
  const isCollapsed = current.includes(projectId);
  const updated = isCollapsed
    ? current.filter(id => id !== projectId)
    : [...current, projectId];
  return setCollapsedProjectIds(updated);
}

/**
 * Get all application preferences
 */
export function getAllPreferences(): ApplicationPreferences {
  return {
    lastApplicationId: getLastApplicationId(),
    recentApplicationIds: getRecentApplicationIds(),
    collapsedProjectIds: getCollapsedProjectIds(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Set all application preferences at once
 */
export function setAllPreferences(prefs: Partial<ApplicationPreferences>): boolean {
  let success = true;

  if (prefs.lastApplicationId !== undefined) {
    success = setLastApplicationId(prefs.lastApplicationId) && success;
  }

  if (prefs.recentApplicationIds !== undefined) {
    success = setToStorage(STORAGE_KEYS.RECENT_APPS, prefs.recentApplicationIds) && success;
  }

  if (prefs.collapsedProjectIds !== undefined) {
    success = setCollapsedProjectIds(prefs.collapsedProjectIds) && success;
  }

  return success;
}

/**
 * Clear all application preferences
 */
export function clearAllPreferences(): boolean {
  let success = true;
  success = removeFromStorage(STORAGE_KEYS.LAST_APP_ID) && success;
  success = removeFromStorage(STORAGE_KEYS.RECENT_APPS) && success;
  success = removeFromStorage(STORAGE_KEYS.COLLAPSED_PROJECTS) && success;
  return success;
}

// ============================================
// Server Sync
// ============================================

/**
 * Fetch preferences from server
 * This would be called from ApplicationContext to sync with server state
 */
export async function fetchServerPreferences(orgId: string): Promise<Partial<ApplicationPreferences> | null> {
  try {
    const response = await fetch(`/api/user/preferences?orgId=${orgId}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      lastApplicationId: data.lastApplicationId || null,
      recentApplicationIds: data.recentApplicationIds || [],
      collapsedProjectIds: data.collapsedProjectIds || [],
    };
  } catch (error) {
    console.warn('[ApplicationPreferences] Failed to fetch server preferences:', error);
    return null;
  }
}

/**
 * Save preferences to server
 * This would be called from ApplicationContext when preferences change
 */
export async function saveServerPreferences(
  orgId: string,
  prefs: Partial<ApplicationPreferences>
): Promise<boolean> {
  try {
    const response = await fetch(`/api/user/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId,
        ...prefs,
      }),
    });

    return response.ok;
  } catch (error) {
    console.warn('[ApplicationPreferences] Failed to save server preferences:', error);
    return false;
  }
}

// ============================================
// Cross-Tab Sync
// ============================================

export type StorageChangeHandler = (prefs: ApplicationPreferences) => void;

/**
 * Listen for storage changes from other tabs
 * Returns cleanup function
 */
export function onStorageChange(handler: StorageChangeHandler): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageEvent = (event: StorageEvent) => {
    // Only handle our keys
    if (
      event.key === STORAGE_KEYS.LAST_APP_ID ||
      event.key === STORAGE_KEYS.RECENT_APPS ||
      event.key === STORAGE_KEYS.COLLAPSED_PROJECTS
    ) {
      // Debounce to avoid multiple rapid updates
      setTimeout(() => {
        handler(getAllPreferences());
      }, 100);
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('storage', handleStorageEvent);
  };
}
