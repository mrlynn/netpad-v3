/**
 * Installed Applications Management
 *
 * Tracks marketplace applications that have been installed into organizations.
 * Enables version tracking, update detection, and upgrade workflows.
 */

import { ObjectId } from 'mongodb';
import { getInstalledApplicationsCollection } from './db';
import { generateSecureId } from '@/lib/encryption';

export interface InstalledApplication {
  _id?: ObjectId;
  installationId: string;              // "inst_abc123"
  organizationId: string;
  projectId: string;
  
  // Marketplace reference
  marketplaceApplicationId: string;   // ID from marketplace_applications
  marketplaceApplicationName: string;  // Snapshot of name at install time
  installedVersion: string;            // "1.0.0" - version that was installed
  latestAvailableVersion?: string;     // "1.2.0" - latest in marketplace
  installedAt: Date;
  lastCheckedAt?: Date;                // When we last checked for updates
  lastUpdatedAt?: Date;                // When last upgraded
  
  // Installed components
  installedForms: Array<{
    formId: string;                    // ID in org database
    originalFormId?: string;           // Original ID from bundle
    originalSlug?: string;             // Original slug from bundle
    name: string;
  }>;
  installedWorkflows: Array<{
    workflowId: string;                // ID in org database
    originalWorkflowId?: string;       // Original ID from bundle
    originalSlug?: string;             // Original slug from bundle
    name: string;
  }>;
  
  // Status
  status: 'installed' | 'update-available' | 'updating' | 'error';
  updateAvailable?: {
    version: string;
    changelog?: string;
    publishedAt: Date;
  };
  
  // Metadata
  installedBy: string;                 // userId
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstallationInput {
  organizationId: string;
  projectId: string;
  marketplaceApplicationId: string;
  marketplaceApplicationName: string;
  installedVersion: string;
  installedForms: Array<{
    formId: string;
    originalFormId?: string;
    originalSlug?: string;
    name: string;
  }>;
  installedWorkflows: Array<{
    workflowId: string;
    originalWorkflowId?: string;
    originalSlug?: string;
    name: string;
  }>;
  installedBy: string;
}

/**
 * Create a new installation record
 */
export async function createInstallation(
  input: CreateInstallationInput
): Promise<InstalledApplication> {
  const collection = await getInstalledApplicationsCollection(input.organizationId);
  
  const now = new Date();
  const installation: InstalledApplication = {
    installationId: generateSecureId('inst'),
    organizationId: input.organizationId,
    projectId: input.projectId,
    marketplaceApplicationId: input.marketplaceApplicationId,
    marketplaceApplicationName: input.marketplaceApplicationName,
    installedVersion: input.installedVersion,
    installedAt: now,
    installedForms: input.installedForms,
    installedWorkflows: input.installedWorkflows,
    status: 'installed',
    installedBy: input.installedBy,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(installation);
  return installation;
}

/**
 * Get installation by ID
 */
export async function getInstallation(
  orgId: string,
  installationId: string
): Promise<InstalledApplication | null> {
  const collection = await getInstalledApplicationsCollection(orgId);
  return collection.findOne({ installationId });
}

/**
 * List installations for an organization/project
 */
export async function listInstallations(
  orgId: string,
  options?: {
    projectId?: string;
    status?: InstalledApplication['status'];
  }
): Promise<InstalledApplication[]> {
  const collection = await getInstalledApplicationsCollection(orgId);
  
  const query: any = { organizationId: orgId };
  if (options?.projectId) {
    query.projectId = options.projectId;
  }
  if (options?.status) {
    query.status = options.status;
  }

  return collection.find(query).sort({ installedAt: -1 }).toArray();
}

/**
 * Update installation status
 */
export async function updateInstallationStatus(
  orgId: string,
  installationId: string,
  updates: {
    status?: InstalledApplication['status'];
    installedVersion?: string;
    latestAvailableVersion?: string;
    updateAvailable?: InstalledApplication['updateAvailable'];
    lastCheckedAt?: Date;
    lastUpdatedAt?: Date;
  }
): Promise<void> {
  const collection = await getInstalledApplicationsCollection(orgId);
  
  const update: any = {
    ...updates,
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { installationId },
    { $set: update }
  );
}

/**
 * Check if update is available by comparing versions
 */
export function isUpdateAvailable(
  installedVersion: string,
  latestVersion: string
): boolean {
  // Simple semantic version comparison
  // For now, just compare strings (assumes proper semantic versioning)
  // TODO: Implement proper semver comparison if needed
  return latestVersion !== installedVersion;
}

/**
 * Compare semantic versions (returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2)
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}
