/**
 * Contract Validation Utilities
 *
 * Validates contract structure and checks for required fields.
 */

import { ApplicationContract } from '@/types/application';

/**
 * Validate contract structure
 */
export function validateContractStructure(contract: Partial<ApplicationContract>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!contract.applicationId) {
    errors.push('applicationId is required');
  }

  if (!contract.version) {
    errors.push('version is required');
  }

  if (!contract.status) {
    errors.push('status is required');
  } else if (!['draft', 'active', 'deprecated'].includes(contract.status)) {
    errors.push('status must be one of: draft, active, deprecated');
  }

  // Validate semantic version format
  if (contract.version && !/^\d+\.\d+\.\d+$/.test(contract.version)) {
    errors.push('version must be in semantic version format (X.Y.Z)');
  }

  // Validate inputs structure
  if (contract.inputs && typeof contract.inputs !== 'object') {
    errors.push('inputs must be an object');
  }

  // Validate outputs structure
  if (contract.outputs && typeof contract.outputs !== 'object') {
    errors.push('outputs must be an object');
  }

  // Validate sideEffects structure
  if (contract.sideEffects && !Array.isArray(contract.sideEffects)) {
    errors.push('sideEffects must be an array');
  }

  // Validate events structure
  if (contract.events && !Array.isArray(contract.events)) {
    errors.push('events must be an array');
  }

  // Validate behaviors structure
  if (contract.behaviors && !Array.isArray(contract.behaviors)) {
    errors.push('behaviors must be an array');
  }

  // Validate stability structure
  if (contract.stability && typeof contract.stability !== 'object') {
    errors.push('stability must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if contract exists for an application version
 */
export function hasContract(contract: ApplicationContract | null): boolean {
  return contract !== null && contract !== undefined;
}

/**
 * Check if contract is active
 */
export function isContractActive(contract: ApplicationContract | null): boolean {
  return contract?.status === 'active';
}
