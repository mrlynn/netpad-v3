/**
 * Project Service
 *
 * Manages projects within organizations.
 * Projects are logical containers for forms and workflows.
 */

import { ObjectId } from 'mongodb';
import { getProjectsCollection, getOrgFormsCollection, getOrgDb, getConnectionVaultCollection } from './db';
import { getWorkflowsCollection } from '../workflow/db';
import { generateSecureId } from '../encryption';
import {
  Project,
  ProjectSettings,
  ProjectStats,
} from '@/types/platform';

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
 * Get default project stats
 */
function getDefaultStats(): ProjectStats {
  return {
    formCount: 0,
    workflowCount: 0,
  };
}

/**
 * Get default project settings
 */
function getDefaultSettings(): ProjectSettings {
  return {};
}

// ============================================
// Project CRUD
// ============================================

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  description?: string;
  slug?: string; // Optional - will be generated from name if not provided
  environment: 'dev' | 'test' | 'staging' | 'prod'; // REQUIRED: Environment classification
  tags?: string[];
  color?: string;
  icon?: string;
  settings?: ProjectSettings;
  createdBy: string;
}

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const projectsCollection = await getProjectsCollection();

  // Generate slug from name if not provided
  const slug = input.slug || generateSlug(input.name);

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Check slug uniqueness within organization
  const existing = await projectsCollection.findOne({
    organizationId: input.organizationId,
    slug,
  });
  if (existing) {
    throw new Error('Project slug already exists in this organization');
  }

  // Check name uniqueness within organization
  const existingName = await projectsCollection.findOne({
    organizationId: input.organizationId,
    name: input.name,
  });
  if (existingName) {
    throw new Error('Project name already exists in this organization');
  }

  const project: Project = {
    projectId: generateSecureId('proj'),
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    slug,
    environment: input.environment, // REQUIRED: dev, test, staging, or prod
    tags: input.tags || [],
    color: input.color,
    icon: input.icon,
    settings: input.settings || getDefaultSettings(),
    stats: getDefaultStats(),
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await projectsCollection.insertOne(project);
  return project;
}

/**
 * Get project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const projectsCollection = await getProjectsCollection();
  return projectsCollection.findOne({ projectId });
}

/**
 * Get project by slug within organization
 */
export async function getProjectBySlug(
  organizationId: string,
  slug: string
): Promise<Project | null> {
  const projectsCollection = await getProjectsCollection();
  return projectsCollection.findOne({ organizationId, slug });
}

/**
 * List projects for an organization
 */
export interface ListProjectsOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastActivityAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tags?: string[];
}

export interface ListProjectsResult {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listProjects(
  organizationId: string,
  options: ListProjectsOptions = {}
): Promise<ListProjectsResult> {
  const projectsCollection = await getProjectsCollection();
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    search,
    tags,
  } = options;

  // Build query
  const query: Record<string, unknown> = { organizationId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  // Get total count
  const total = await projectsCollection.countDocuments(query);

  // Build sort
  const sort: Record<string, 1 | -1> = {};
  if (sortBy === 'lastActivityAt') {
    sort['stats.lastActivityAt'] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }

  // Get paginated results
  const projects = await projectsCollection
    .find(query)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    projects,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Update project
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  slug?: string;
  environment?: 'dev' | 'test' | 'staging' | 'prod';
  tags?: string[];
  color?: string;
  icon?: string;
  settings?: ProjectSettings;
  defaultVaultId?: string;              // Set project's default vault connection
}

export async function updateProject(
  projectId: string,
  updates: UpdateProjectInput
): Promise<Project | null> {
  const projectsCollection = await getProjectsCollection();

  // Get existing project to check organization
  const existing = await projectsCollection.findOne({ projectId });
  if (!existing) {
    return null;
  }

  // If slug is being updated, validate uniqueness
  if (updates.slug) {
    if (!/^[a-z0-9-]+$/.test(updates.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    const slugConflict = await projectsCollection.findOne({
      organizationId: existing.organizationId,
      slug: updates.slug,
      projectId: { $ne: projectId },
    });
    if (slugConflict) {
      throw new Error('Project slug already exists in this organization');
    }
  }

  // If name is being updated, validate uniqueness
  if (updates.name) {
    const nameConflict = await projectsCollection.findOne({
      organizationId: existing.organizationId,
      name: updates.name,
      projectId: { $ne: projectId },
    });
    if (nameConflict) {
      throw new Error('Project name already exists in this organization');
    }
  }

  const result = await projectsCollection.findOneAndUpdate(
    { projectId },
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
 * Set project's default vault connection
 * This is typically called when a cluster is provisioned for the project
 */
export async function setProjectDefaultVault(
  projectId: string,
  vaultId: string
): Promise<Project | null> {
  const projectsCollection = await getProjectsCollection();
  
  // Verify project exists
  const project = await projectsCollection.findOne({ projectId });
  if (!project) {
    return null;
  }

  // Verify vault exists and belongs to this project
  const connectionVaultCollection = await getConnectionVaultCollection(project.organizationId);
  const vault = await connectionVaultCollection.findOne({ 
    vaultId,
    projectId,
    status: 'active'
  });
  
  if (!vault) {
    throw new Error('Vault not found or does not belong to this project');
  }

  // Update project with default vault
  const result = await projectsCollection.findOneAndUpdate(
    { projectId },
    {
      $set: {
        defaultVaultId: vaultId,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result || null;
}

/**
 * Get project's default vault connection
 * Returns the vault connection if project has a default vault set
 */
export async function getProjectDefaultVault(projectId: string): Promise<{
  vaultId: string;
  name: string;
  database: string;
} | null> {
  const project = await getProject(projectId);
  if (!project || !project.defaultVaultId) {
    return null;
  }

  const connectionVaultCollection = await getConnectionVaultCollection(project.organizationId);
  const vault = await connectionVaultCollection.findOne({
    vaultId: project.defaultVaultId,
    status: 'active'
  });

  if (!vault) {
    return null;
  }

  return {
    vaultId: vault.vaultId,
    name: vault.name,
    database: vault.database,
  };
}

/**
 * Delete project
 * Validates that project has no forms or workflows before deletion
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  const projectsCollection = await getProjectsCollection();
  const project = await projectsCollection.findOne({ projectId });

  if (!project) {
    return false;
  }

  // Check if project has forms
  const formsCollection = await getOrgFormsCollection(project.organizationId);
  const formCount = await formsCollection.countDocuments({ projectId });
  if (formCount > 0) {
    throw new Error('Cannot delete project with existing forms. Please delete or move forms first.');
  }

  // Check if project has workflows
  const workflowsCollection = await getWorkflowsCollection(project.organizationId);
  const workflowCount = await workflowsCollection.countDocuments({ projectId });
  if (workflowCount > 0) {
    throw new Error('Cannot delete project with existing workflows. Please delete or move workflows first.');
  }

  // Check if project has clusters
  const { getPlatformDb } = await import('./db');
  const platformDb = await getPlatformDb();
  const clustersCollection = platformDb.collection('provisioned_clusters');
  const clusterCount = await clustersCollection.countDocuments({ projectId, deletedAt: { $exists: false } });
  if (clusterCount > 0) {
    throw new Error('Cannot delete project with existing clusters. Please delete or move clusters first.');
  }

  // Check if project has connections
  const connectionVaultCollection = await getConnectionVaultCollection(project.organizationId);
  const connectionCount = await connectionVaultCollection.countDocuments({ projectId, status: { $ne: 'deleted' } });
  if (connectionCount > 0) {
    throw new Error('Cannot delete project with existing connections. Please delete or move connections first.');
  }

  // Delete project
  const result = await projectsCollection.deleteOne({ projectId });
  return result.deletedCount === 1;
}

// ============================================
// Project Statistics
// ============================================

/**
 * Calculate and update project statistics
 */
export async function calculateProjectStats(projectId: string): Promise<ProjectStats> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Count forms
  const formsCollection = await getOrgFormsCollection(project.organizationId);
  const formCount = await formsCollection.countDocuments({ projectId });

  // Count workflows
  const workflowsCollection = await getWorkflowsCollection(project.organizationId);
  const workflowCount = await workflowsCollection.countDocuments({ projectId });

  // Count clusters
  const { getPlatformDb } = await import('./db');
  const platformDb = await getPlatformDb();
  const clustersCollection = platformDb.collection('provisioned_clusters');
  const clusterCount = await clustersCollection.countDocuments({ 
    projectId, 
    deletedAt: { $exists: false } 
  });

  // Count connections
  const connectionVaultCollection = await getConnectionVaultCollection(project.organizationId);
  const connectionCount = await connectionVaultCollection.countDocuments({ 
    projectId, 
    status: { $ne: 'deleted' } 
  });

  // Get last activity date (most recent form or workflow update)
  const [latestForm, latestWorkflow] = await Promise.all([
    formsCollection
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray(),
    workflowsCollection
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray(),
  ]);

  let lastActivityAt: Date | undefined;
  const formDate = latestForm[0]?.updatedAt;
  const workflowDate = latestWorkflow[0]?.updatedAt;

  if (formDate && workflowDate) {
    lastActivityAt = formDate > workflowDate ? formDate : workflowDate;
  } else if (formDate) {
    lastActivityAt = formDate;
  } else if (workflowDate) {
    lastActivityAt = workflowDate;
  }

  const stats: ProjectStats = {
    formCount,
    workflowCount,
    clusterCount,
    connectionCount,
    lastActivityAt,
  };

  // Update project with new stats
  const projectsCollection = await getProjectsCollection();
  await projectsCollection.updateOne(
    { projectId },
    {
      $set: {
        stats,
        updatedAt: new Date(),
      },
    }
  );

  return stats;
}

/**
 * Get project statistics
 */
export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  return project.stats;
}

/**
 * Ensure default project exists for organization
 * Creates "General" project if none exists
 */
export async function ensureDefaultProject(organizationId: string, createdBy: string): Promise<Project> {
  const projectsCollection = await getProjectsCollection();

  // Check if default project exists
  const existing = await projectsCollection.findOne({
    organizationId,
    slug: 'general',
  });

  if (existing) {
    return existing;
  }

  // Create default project with 'dev' environment
  return createProject({
    organizationId,
    name: 'General',
    description: 'Default project for organizing forms and workflows',
    slug: 'general',
    environment: 'dev', // Default to dev environment
    createdBy,
  });
}
