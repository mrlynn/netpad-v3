/**
 * Application Service
 *
 * Manages applications within projects.
 * Applications are the primary organizational unit containing forms, workflows, and configuration.
 * Based on: docs/netpad_applications_first_implementation_spec_v1.md
 */

import { ObjectId } from 'mongodb';
import {
  getApplicationsCollection,
  getOrgFormsCollection,
} from './db';
import { getWorkflowsCollection } from '../workflow/db';
import { generateSecureId } from '../encryption';
import { Application, ApplicationStatus } from '@/types/application';

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Get default application stats
 */
function getDefaultStats() {
  return {
    formsCount: 0,
    workflowsCount: 0,
    connectionsCount: 0,
  };
}

// ============================================
// Application CRUD
// ============================================

export interface CreateApplicationInput {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  slug?: string;
  icon?: string;
  color?: string;
  version?: string;
  tags?: string[];
  isDefault?: boolean;
  createdBy: string;
}

/**
 * Create a new application
 */
export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const applicationsCollection = await getApplicationsCollection(input.organizationId);

  // Generate slug from name if not provided
  const slug = input.slug || generateSlug(input.name);

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Check slug uniqueness within project
  const existing = await applicationsCollection.findOne({
    projectId: input.projectId,
    slug,
  });
  if (existing) {
    throw new Error('Application slug already exists in this project');
  }

  // Check name uniqueness within project (unless it's a default app)
  if (!input.isDefault) {
    const existingName = await applicationsCollection.findOne({
      projectId: input.projectId,
      name: input.name,
    });
    if (existingName) {
      throw new Error('Application name already exists in this project');
    }
  }

  const application: Application = {
    applicationId: generateSecureId('app'),
    projectId: input.projectId,
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    slug,
    icon: input.icon,
    color: input.color,
    version: input.version || '1.0.0',
    tags: input.tags || [],
    stats: getDefaultStats(),
    status: 'active' as ApplicationStatus,
    isDefault: input.isDefault || false,
    // Phase 10: Default access - all org members can view (backward compatible)
    defaultAccess: 'org_members',
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await applicationsCollection.insertOne(application);
  return application;
}

/**
 * Get application by ID
 */
export async function getApplication(
  organizationId: string,
  applicationId: string
): Promise<Application | null> {
  const applicationsCollection = await getApplicationsCollection(organizationId);
  return applicationsCollection.findOne({ applicationId });
}

/**
 * Get application by slug within project
 */
export async function getApplicationBySlug(
  organizationId: string,
  projectId: string,
  slug: string
): Promise<Application | null> {
  const applicationsCollection = await getApplicationsCollection(organizationId);
  return applicationsCollection.findOne({ projectId, slug });
}

/**
 * Get default application for a project
 */
export async function getDefaultApplication(
  organizationId: string,
  projectId: string
): Promise<Application | null> {
  const applicationsCollection = await getApplicationsCollection(organizationId);
  return applicationsCollection.findOne({
    projectId,
    isDefault: true,
  });
}

/**
 * Ensure default application exists for project
 * Creates "{projectName} - Default Application" if none exists
 */
export async function ensureDefaultApplication(
  organizationId: string,
  projectId: string,
  createdBy: string
): Promise<Application> {
  const existing = await getDefaultApplication(organizationId, projectId);
  if (existing) {
    return existing;
  }

  // Get project name for better UX
  const { getProject } = await import('./projects');
  const project = await getProject(projectId);
  const projectName = project?.name || 'Project';

  // Create default application with project name for context
  const defaultApp = await createApplication({
    projectId,
    organizationId,
    name: `${projectName} - Default Application`,
    description: 'System-created default application',
    isDefault: true,
    createdBy,
  });
  
  // Phase 10: Set defaultAccess for new applications
  const applicationsCollection = await getApplicationsCollection(organizationId);
  await applicationsCollection.updateOne(
    { applicationId: defaultApp.applicationId },
    { $set: { defaultAccess: 'org_members' } }
  );
  
  // Return updated application
  const updated = await applicationsCollection.findOne({ applicationId: defaultApp.applicationId });
  return updated || defaultApp;
}

/**
 * List applications for a project
 */
export interface ListApplicationsOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: ApplicationStatus;
}

export interface ListApplicationsResult {
  applications: Application[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listApplications(
  organizationId: string,
  projectId: string,
  options: ListApplicationsOptions = {}
): Promise<ListApplicationsResult> {
  const applicationsCollection = await getApplicationsCollection(organizationId);
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    search,
    status,
  } = options;

  // Build query
  const query: Record<string, unknown> = {
    organizationId,
    projectId,
  };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Debug logging
  console.log('[listApplications] Query:', JSON.stringify(query, null, 2));

  // Get total count
  const total = await applicationsCollection.countDocuments(query);
  
  console.log('[listApplications] Total count:', total);

  // Build sort
  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === 'asc' ? 1 : -1,
  };

  // Get paginated results
  const applications = await applicationsCollection
    .find(query)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  console.log('[listApplications] Found applications:', applications.length);
  console.log('[listApplications] Application IDs:', applications.map((a: any) => a.applicationId));
  console.log('[listApplications] Application names:', applications.map((a: any) => ({ id: a.applicationId, name: a.name, status: a.status })));

  return {
    applications,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Update application
 */
export interface UpdateApplicationInput {
  name?: string;
  description?: string;
  slug?: string;
  icon?: string;
  color?: string;
  version?: string;
  tags?: string[];
  status?: ApplicationStatus;
  defaultAccess?: 'org_members' | 'explicit'; // Phase 10
}

export async function updateApplication(
  organizationId: string,
  applicationId: string,
  updates: UpdateApplicationInput
): Promise<Application | null> {
  const applicationsCollection = await getApplicationsCollection(organizationId);

  // Get existing application
  const existing = await applicationsCollection.findOne({ applicationId });
  if (!existing) {
    return null;
  }

  // If slug is being updated, validate uniqueness
  if (updates.slug) {
    if (!/^[a-z0-9-]+$/.test(updates.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    const slugConflict = await applicationsCollection.findOne({
      projectId: existing.projectId,
      slug: updates.slug,
      applicationId: { $ne: applicationId },
    });
    if (slugConflict) {
      throw new Error('Application slug already exists in this project');
    }
  }

  // If name is being updated, validate uniqueness (unless it's default)
  if (updates.name && !existing.isDefault) {
    const nameConflict = await applicationsCollection.findOne({
      projectId: existing.projectId,
      name: updates.name,
      applicationId: { $ne: applicationId },
    });
    if (nameConflict) {
      throw new Error('Application name already exists in this project');
    }
  }

  const result = await applicationsCollection.findOneAndUpdate(
    { applicationId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result || null;
}

/**
 * Delete application
 * If force=true, cascade deletes all associated forms and workflows
 * If force=false (default), validates that application has no forms or workflows
 */
export async function deleteApplication(
  organizationId: string,
  applicationId: string,
  options: { force?: boolean } = {}
): Promise<boolean> {
  const { force = false } = options;
  const applicationsCollection = await getApplicationsCollection(organizationId);
  const application = await applicationsCollection.findOne({ applicationId });

  if (!application) {
    return false;
  }

  // Prevent deletion of default applications
  if (application.isDefault) {
    throw new Error('Cannot delete default application');
  }

  const formsCollection = await getOrgFormsCollection(organizationId);
  const workflowsCollection = await getWorkflowsCollection(organizationId);

  if (force) {
    // Cascade delete: remove all forms and workflows associated with this application
    await formsCollection.deleteMany({ applicationId });
    await workflowsCollection.deleteMany({ applicationId });
  } else {
    // Check if application has forms
    const formCount = await formsCollection.countDocuments({ applicationId });
    if (formCount > 0) {
      throw new Error('Cannot delete application with existing forms. Please delete or move forms first.');
    }

    // Check if application has workflows
    const workflowCount = await workflowsCollection.countDocuments({ applicationId });
    if (workflowCount > 0) {
      throw new Error('Cannot delete application with existing workflows. Please delete or move workflows first.');
    }
  }

  // Delete application
  const result = await applicationsCollection.deleteOne({ applicationId });
  return result.deletedCount === 1;
}

// ============================================
// Application Statistics
// ============================================

/**
 * Calculate and update application statistics
 */
export async function calculateApplicationStats(
  organizationId: string,
  applicationId: string
): Promise<Application['stats']> {
  const formsCollection = await getOrgFormsCollection(organizationId);
  const workflowsCollection = await getWorkflowsCollection(organizationId);

  const [formsCount, workflowsCount] = await Promise.all([
    formsCollection.countDocuments({ applicationId }),
    workflowsCollection.countDocuments({ applicationId }),
  ]);

  // Count unique connections used by this application
  // Connections are referenced via dataSource.vaultId in forms
  const formsWithConnections = await formsCollection
    .find({
      applicationId,
      'dataSource.vaultId': { $exists: true, $ne: null },
    })
    .toArray();

  const uniqueVaultIds = new Set<string>();
  formsWithConnections.forEach((form: any) => {
    if (form.dataSource?.vaultId) {
      uniqueVaultIds.add(form.dataSource.vaultId);
    }
  });

  const connectionsCount = uniqueVaultIds.size;

  const stats = {
    formsCount,
    workflowsCount,
    connectionsCount,
  };

  // Update application stats
  const applicationsCollection = await getApplicationsCollection(organizationId);
  await applicationsCollection.updateOne(
    { applicationId },
    { $set: { stats, updatedAt: new Date() } }
  );

  return stats;
}

/**
 * Get application stats
 */
export async function getApplicationStats(
  organizationId: string,
  applicationId: string
): Promise<Application['stats']> {
  const application = await getApplication(organizationId, applicationId);
  if (!application) {
    throw new Error('Application not found');
  }
  return application.stats;
}
