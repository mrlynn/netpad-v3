/**
 * Application Contracts Management
 *
 * CRUD operations for application contracts.
 * Contracts define the explicit public API surface of applications.
 */

import { Collection, ObjectId } from 'mongodb';
import { ApplicationContract } from '@/types/application';
import { getApplicationContractsCollection } from './db';
import { generateSecureId } from '@/lib/encryption';

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique contract ID
 */
function generateContractId(): string {
  return generateSecureId('contract');
}

/**
 * Validate semantic version format
 */
function validateSemanticVersion(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

/**
 * Validate contract structure
 */
function validateContract(contract: Partial<ApplicationContract>): { valid: boolean; error?: string } {
  if (!contract.applicationId) {
    return { valid: false, error: 'applicationId is required' };
  }

  if (!contract.version) {
    return { valid: false, error: 'version is required' };
  }

  if (!validateSemanticVersion(contract.version)) {
    return { valid: false, error: 'version must be in semantic version format (X.Y.Z)' };
  }

  if (!contract.status) {
    return { valid: false, error: 'status is required' };
  }

  if (!['draft', 'active', 'deprecated'].includes(contract.status)) {
    return { valid: false, error: 'status must be one of: draft, active, deprecated' };
  }

  // Validate inputs structure
  if (contract.inputs && typeof contract.inputs !== 'object') {
    return { valid: false, error: 'inputs must be an object' };
  }

  // Validate outputs structure
  if (contract.outputs && typeof contract.outputs !== 'object') {
    return { valid: false, error: 'outputs must be an object' };
  }

  // Validate sideEffects structure
  if (contract.sideEffects && !Array.isArray(contract.sideEffects)) {
    return { valid: false, error: 'sideEffects must be an array' };
  }

  // Validate events structure
  if (contract.events && !Array.isArray(contract.events)) {
    return { valid: false, error: 'events must be an array' };
  }

  // Validate behaviors structure
  if (contract.behaviors && !Array.isArray(contract.behaviors)) {
    return { valid: false, error: 'behaviors must be an array' };
  }

  // Validate stability structure
  if (contract.stability && typeof contract.stability !== 'object') {
    return { valid: false, error: 'stability must be an object' };
  }

  return { valid: true };
}

// ============================================
// Contract CRUD Operations
// ============================================

export interface CreateContractInput {
  applicationId: string;
  version: string;
  status?: 'draft' | 'active' | 'deprecated';
  inputs?: ApplicationContract['inputs'];
  outputs?: ApplicationContract['outputs'];
  sideEffects?: ApplicationContract['sideEffects'];
  events?: ApplicationContract['events'];
  behaviors?: ApplicationContract['behaviors'];
  stability?: ApplicationContract['stability'];
}

/**
 * Create a new application contract
 */
export async function createApplicationContract(
  orgId: string,
  input: CreateContractInput
): Promise<ApplicationContract> {
  const collection = await getApplicationContractsCollection(orgId);

  // Check if contract already exists for this version
  const existing = await collection.findOne({
    applicationId: input.applicationId,
    version: input.version,
  });

  if (existing) {
    throw new Error(`Contract already exists for application ${input.applicationId} version ${input.version}`);
  }

  // Validate input
  const validation = validateContract(input);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid contract');
  }

  const now = new Date();
  const contract: ApplicationContract = {
    contractId: generateContractId(),
    applicationId: input.applicationId,
    version: input.version,
    status: input.status || 'draft',
    inputs: input.inputs || {},
    outputs: input.outputs || {},
    sideEffects: input.sideEffects || [],
    events: input.events || [],
    behaviors: input.behaviors || [],
    stability: input.stability || {
      inputs: true,
      outputs: true,
      sideEffects: true,
      events: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(contract);

  return contract;
}

/**
 * Get contract by ID
 */
export async function getApplicationContract(
  orgId: string,
  contractId: string
): Promise<ApplicationContract | null> {
  const collection = await getApplicationContractsCollection(orgId);
  return collection.findOne({ contractId });
}

/**
 * Get contract by application ID and version
 */
export async function getApplicationContractByVersion(
  orgId: string,
  applicationId: string,
  version: string
): Promise<ApplicationContract | null> {
  const collection = await getApplicationContractsCollection(orgId);
  return collection.findOne({ applicationId, version });
}

/**
 * Get active contract for an application
 */
export async function getActiveApplicationContract(
  orgId: string,
  applicationId: string
): Promise<ApplicationContract | null> {
  const collection = await getApplicationContractsCollection(orgId);
  return collection.findOne(
    { applicationId, status: 'active' },
    { sort: { version: -1 } } // Get latest active version
  );
}

/**
 * List contracts for an application
 */
export async function listApplicationContracts(
  orgId: string,
  applicationId: string,
  options: {
    status?: 'draft' | 'active' | 'deprecated';
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  contracts: ApplicationContract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const collection = await getApplicationContractsCollection(orgId);
  const { status, page = 1, pageSize = 20 } = options;

  const query: any = { applicationId };
  if (status) {
    query.status = status;
  }

  const total = await collection.countDocuments(query);

  const contracts = await collection
    .find(query)
    .sort({ version: -1 }) // Newest first
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    contracts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export interface UpdateContractInput {
  status?: 'draft' | 'active' | 'deprecated';
  inputs?: ApplicationContract['inputs'];
  outputs?: ApplicationContract['outputs'];
  sideEffects?: ApplicationContract['sideEffects'];
  events?: ApplicationContract['events'];
  behaviors?: ApplicationContract['behaviors'];
  stability?: ApplicationContract['stability'];
}

/**
 * Update an application contract
 * 
 * Note: Active contracts cannot be modified. Must create a new version.
 */
export async function updateApplicationContract(
  orgId: string,
  contractId: string,
  input: UpdateContractInput
): Promise<ApplicationContract> {
  const collection = await getApplicationContractsCollection(orgId);

  // Get existing contract
  const existing = await collection.findOne({ contractId });
  if (!existing) {
    throw new Error(`Contract ${contractId} not found`);
  }

  // Prevent modification of active contracts (except status changes)
  if (existing.status === 'active') {
    // Allow status changes (deprecate/activate) but not other modifications
    const hasNonStatusChanges = Object.keys(input).some(
      (key) => key !== 'status' && input[key as keyof UpdateContractInput] !== undefined
    );
    if (hasNonStatusChanges) {
      throw new Error('Cannot modify active contract. Create a new version instead.');
    }
  }

  // Validate updated contract
  const updated = { ...existing, ...input };
  const validation = validateContract(updated);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid contract');
  }

  // Update contract
  const updateDoc: any = {
    ...input,
    updatedAt: new Date(),
  };

  await collection.updateOne({ contractId }, { $set: updateDoc });

  const updatedContract = await collection.findOne({ contractId });
  if (!updatedContract) {
    throw new Error('Failed to retrieve updated contract');
  }

  return updatedContract;
}

/**
 * Deprecate a contract
 * 
 * Note: Can deprecate active contracts (status change is allowed)
 */
export async function deprecateApplicationContract(
  orgId: string,
  contractId: string
): Promise<ApplicationContract> {
  const collection = await getApplicationContractsCollection(orgId);
  
  const contract = await collection.findOne({ contractId });
  if (!contract) {
    throw new Error(`Contract ${contractId} not found`);
  }

  // Status changes are allowed even for active contracts
  await collection.updateOne(
    { contractId },
    { $set: { status: 'deprecated', updatedAt: new Date() } }
  );

  const updated = await collection.findOne({ contractId });
  if (!updated) {
    throw new Error('Failed to retrieve updated contract');
  }

  return updated;
}

/**
 * Activate a contract
 * 
 * Note: Only one active contract per application is recommended.
 * Status changes are allowed even for active contracts.
 */
export async function activateApplicationContract(
  orgId: string,
  contractId: string
): Promise<ApplicationContract> {
  const collection = await getApplicationContractsCollection(orgId);

  const contract = await collection.findOne({ contractId });
  if (!contract) {
    throw new Error(`Contract ${contractId} not found`);
  }

  // Optionally deprecate other active contracts for the same application
  // (This is a design choice - you might want multiple active versions)
  // await collection.updateMany(
  //   { applicationId: contract.applicationId, status: 'active', contractId: { $ne: contractId } },
  //   { $set: { status: 'deprecated' } }
  // );

  // Status changes are allowed even for active contracts
  await collection.updateOne(
    { contractId },
    { $set: { status: 'active', updatedAt: new Date() } }
  );

  const updated = await collection.findOne({ contractId });
  if (!updated) {
    throw new Error('Failed to retrieve updated contract');
  }

  return updated;
}

/**
 * Delete a contract
 * 
 * Note: Active contracts should not be deleted. Deprecate instead.
 */
export async function deleteApplicationContract(
  orgId: string,
  contractId: string
): Promise<boolean> {
  const collection = await getApplicationContractsCollection(orgId);

  const contract = await collection.findOne({ contractId });
  if (!contract) {
    return false;
  }

  // Prevent deletion of active contracts
  if (contract.status === 'active') {
    throw new Error('Cannot delete active contract. Deprecate it first.');
  }

  const result = await collection.deleteOne({ contractId });
  return result.deletedCount === 1;
}
