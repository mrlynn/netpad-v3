/**
 * Contract Enforcement Logic
 *
 * Enforces contracts at publish/deploy time.
 * Validates contracts before allowing releases/upgrades.
 */

import { ApplicationContract } from '@/types/application';
import {
  getApplicationContractByVersion,
  getActiveApplicationContract,
} from './applicationContracts';
import { compareContracts, ContractComparison } from './contractComparison';
import { hasContract, isContractActive } from './contractValidation';

export interface ContractValidationResult {
  valid: boolean;
  contractExists: boolean;
  contractActive: boolean;
  breakingChanges?: ContractComparison;
  requiresVersionBump?: boolean;
  compatibility?: 'compatible' | 'incompatible' | 'requires-migration';
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate contract before creating a release
 * 
 * This is called at publish/deploy time, not edit time.
 */
export async function validateContractForRelease(
  orgId: string,
  applicationId: string,
  version: string,
  options: {
    requireContract?: boolean; // Default: false (contract is optional)
    allowBreakingChanges?: boolean; // Default: false (breaking changes require version bump)
  } = {}
): Promise<ContractValidationResult> {
  const { requireContract = false, allowBreakingChanges = false } = options;

  // Check if contract exists for this version
  const contract = await getApplicationContractByVersion(orgId, applicationId, version);
  const contractExists = hasContract(contract);

  // If contract is required but doesn't exist
  if (requireContract && !contractExists) {
    return {
      valid: false,
      contractExists: false,
      contractActive: false,
      errors: ['Contract is required but does not exist for this version'],
    };
  }

  // If no contract exists and it's not required, allow release
  if (!contractExists) {
    return {
      valid: true,
      contractExists: false,
      contractActive: false,
      warnings: ['No contract defined for this version. Consider creating a contract to protect consumers.'],
    };
  }

  // Check if there's a previous version to compare against
  const activeContract = await getActiveApplicationContract(orgId, applicationId);
  
  // If this is the first contract, it's always valid
  if (!activeContract || activeContract.version === version) {
    return {
      valid: true,
      contractExists: true,
      contractActive: contract?.status === 'active',
    };
  }

  // Compare with previous active contract
  const comparison = await compareContracts(
    orgId,
    applicationId,
    activeContract.version,
    version
  );

  // Check for breaking changes
  const hasBreakingChanges = comparison.breakingChanges.length > 0;

  if (hasBreakingChanges && !allowBreakingChanges) {
    // Check if version bump is appropriate
    const requiresMajorBump = requiresMajorVersionBump(activeContract.version, version);
    
    if (!requiresMajorBump) {
      return {
        valid: false,
        contractExists: true,
        contractActive: contract?.status === 'active',
        breakingChanges: comparison,
        requiresVersionBump: true,
        compatibility: 'incompatible',
        errors: [
          'Breaking changes detected. Major version bump required (e.g., 1.0.0 → 2.0.0)',
          ...comparison.breakingChanges.map((bc) => `- ${bc.description}`),
        ],
      };
    }
  }

  // Warnings for non-breaking changes
  const warnings: string[] = [];
  if (comparison.nonBreakingChanges.length > 0) {
    warnings.push(`${comparison.nonBreakingChanges.length} non-breaking change(s) detected`);
  }

  return {
    valid: true,
    contractExists: true,
    contractActive: contract?.status === 'active',
    breakingChanges: hasBreakingChanges ? comparison : undefined,
    compatibility: comparison.compatibility,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if version bump is a major version bump
 */
function requiresMajorVersionBump(fromVersion: string, toVersion: string): boolean {
  const fromParts = fromVersion.split('.').map(Number);
  const toParts = toVersion.split('.').map(Number);

  if (fromParts.length !== 3 || toParts.length !== 3) {
    return false; // Invalid version format
  }

  // Major version bump: X.Y.Z → (X+1).0.0
  return toParts[0] > fromParts[0];
}

/**
 * Validate contract before upgrade
 * 
 * Used when upgrading an installed application.
 */
export async function validateContractForUpgrade(
  orgId: string,
  applicationId: string,
  fromVersion: string,
  toVersion: string
): Promise<ContractValidationResult> {
  // Get both contracts
  const fromContract = await getApplicationContractByVersion(orgId, applicationId, fromVersion);
  const toContract = await getApplicationContractByVersion(orgId, applicationId, toVersion);

  if (!fromContract) {
    return {
      valid: false,
      contractExists: false,
      contractActive: false,
      errors: [`Contract not found for version ${fromVersion}`],
    };
  }

  if (!toContract) {
    return {
      valid: false,
      contractExists: false,
      contractActive: false,
      errors: [`Contract not found for version ${toVersion}`],
    };
  }

  // Compare contracts
  const comparison = await compareContracts(orgId, applicationId, fromVersion, toVersion);

  const hasBreakingChanges = comparison.breakingChanges.length > 0;

  if (hasBreakingChanges) {
    return {
      valid: false,
      contractExists: true,
      contractActive: toContract.status === 'active',
      breakingChanges: comparison,
      compatibility: 'incompatible',
      errors: [
        'Breaking changes detected. This upgrade may break dependent systems.',
        ...comparison.breakingChanges.map((bc) => `- ${bc.description}`),
      ],
    };
  }

  return {
    valid: true,
    contractExists: true,
    contractActive: toContract.status === 'active',
    breakingChanges: undefined,
    compatibility: comparison.compatibility,
    warnings: comparison.nonBreakingChanges.length > 0
      ? [`${comparison.nonBreakingChanges.length} non-breaking change(s) detected`]
      : undefined,
  };
}
