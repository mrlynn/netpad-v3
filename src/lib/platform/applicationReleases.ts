import { Collection } from 'mongodb';
import { ApplicationRelease } from '@/types/application';
import {
  getApplicationReleasesCollection,
  getApplicationsCollection,
  getOrgFormsCollection,
} from './db';
import { getWorkflowsCollection } from '../workflow/db';
import { validateContractForRelease, ContractValidationResult } from './contractEnforcement';

/**
 * Get the releases collection for an organization
 */
async function releasesCollection(orgId: string): Promise<Collection<ApplicationRelease>> {
  return getApplicationReleasesCollection(orgId);
}

/**
 * List releases for an application, newest first
 */
export async function listApplicationReleases(
  organizationId: string,
  applicationId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ releases: ApplicationRelease[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const collection = await releasesCollection(organizationId);
  const { page = 1, pageSize = 20 } = options;

  const query = { applicationId };
  const total = await collection.countDocuments(query);

  const releases = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    releases,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Compute the next suggested semantic version for an application.
 * - If no releases -> "1.0.0"
 * - Else bump minor: X.Y.Z -> X.(Y+1).0
 */
export async function getNextReleaseVersionSuggestion(
  organizationId: string,
  applicationId: string
): Promise<string> {
  const collection = await releasesCollection(organizationId);

  const latest = await collection.find({ applicationId }).sort({ createdAt: -1 }).limit(1).next();
  if (!latest || !latest.version) {
    return '1.0.0';
  }

  const parts = latest.version.split('.');
  if (parts.length !== 3) {
    // Fallback if version is not standard semver
    return '1.0.0';
  }

  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const isValid = !Number.isNaN(major) && !Number.isNaN(minor);

  if (!isValid) {
    return '1.0.0';
  }

  return `${major}.${minor + 1}.0`;
}

/**
 * Validate a semantic version string: X.Y.Z where X,Y,Z are non-negative integers
 */
export function validateSemanticVersion(version: string): boolean {
  return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(version);
}

/**
 * Create a new release for an application by snapshotting current forms/workflows
 * 
 * Optionally validates contract before creating release.
 */
export async function createApplicationRelease(
  input: {
    organizationId: string;
    projectId: string;
    applicationId: string;
    version: string;
    changelog?: string;
  },
  options: {
    validateContract?: boolean;
    requireContract?: boolean;
    allowBreakingChanges?: boolean;
  } = {}
): Promise<{
  release: ApplicationRelease;
  validation?: ContractValidationResult;
}> {
  const { organizationId, projectId, applicationId, version, changelog } = input;
  const { validateContract = false, requireContract = false, allowBreakingChanges = false } = options;

  if (!validateSemanticVersion(version)) {
    throw new Error('Version must be a semantic version string (e.g., 1.0.0)');
  }

  const releases = await releasesCollection(organizationId);

  // Ensure version is unique per application
  const existingVersion = await releases.findOne({ applicationId, version });
  if (existingVersion) {
    throw new Error('A release with this version already exists for this application');
  }

  // Validate contract if requested (enforcement at publish/deploy time)
  let validation: ContractValidationResult | undefined;
  if (validateContract) {
    validation = await validateContractForRelease(organizationId, applicationId, version, {
      requireContract,
      allowBreakingChanges,
    });

    // If validation fails, throw error (unless breaking changes are allowed)
    if (!validation.valid && !allowBreakingChanges) {
      const errorMessage = validation.errors?.join('\n') || 'Contract validation failed';
      throw new Error(`Contract validation failed: ${errorMessage}`);
    }
  }

  // Ensure application exists and belongs to project/org
  const applicationsCollection = await getApplicationsCollection(organizationId);
  const application = await applicationsCollection.findOne({ applicationId, projectId, organizationId });
  if (!application) {
    throw new Error('Application not found for this organization and project');
  }

  // Snapshot manifest from current forms/workflows linked to this application
  const formsCollection = await getOrgFormsCollection(organizationId);
  const workflowsCollection = await getWorkflowsCollection(organizationId);

  const [forms, workflows] = await Promise.all([
    formsCollection
      .find({ applicationId, projectId })
      .project<{ formId: string }>({ formId: 1 })
      .toArray(),
    workflowsCollection
      .find({ applicationId, projectId })
      .project<{ id: string }>({ id: 1 })
      .toArray(),
  ]);

  const manifestForms = forms.map((f) => ({
    formId: f.formId,
    role: 'primary' as const,
  }));

  const manifestWorkflows = workflows.map((w) => ({
    workflowId: w.id,
    role: 'core' as const,
  }));

  const release: ApplicationRelease = {
    releaseId: `rel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    applicationId,
    version,
    contractId: '', // Contracts will be wired in a later phase
    changelog,
    manifest: {
      forms: manifestForms,
      workflows: manifestWorkflows,
      configSchemaId: '', // Config schema wiring is a later phase
    },
    createdAt: new Date(),
  };

  await releases.insertOne(release);
  
  return {
    release,
    validation,
  };
}

/**
 * Get the latest release for an application (or null)
 */
export async function getLatestApplicationRelease(
  organizationId: string,
  applicationId: string
): Promise<ApplicationRelease | null> {
  const releases = await releasesCollection(organizationId);
  return releases.find({ applicationId }).sort({ createdAt: -1 }).limit(1).next();
}

