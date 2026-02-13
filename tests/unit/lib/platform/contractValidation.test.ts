/**
 * Tests for Contract Validation Utilities
 *
 * Tests validateContractStructure, hasContract, and isContractActive
 */

import {
  validateContractStructure,
  hasContract,
  isContractActive,
} from '@/lib/platform/contractValidation';
import { ApplicationContract } from '@/types/application';

// Helper to create a valid contract partial
function validContract(overrides: Partial<ApplicationContract> = {}): Partial<ApplicationContract> {
  return {
    applicationId: 'app_test123',
    version: '1.0.0',
    status: 'active',
    ...overrides,
  };
}

// Helper to create a full contract
function fullContract(overrides: Partial<ApplicationContract> = {}): ApplicationContract {
  return {
    contractId: 'contract_test',
    applicationId: 'app_test123',
    version: '1.0.0',
    status: 'active',
    inputs: {},
    outputs: {},
    sideEffects: [],
    events: [],
    behaviors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ApplicationContract;
}

describe('Contract Validation', () => {
  describe('validateContractStructure', () => {
    describe('required fields', () => {
      it('should pass with all required fields', () => {
        const result = validateContractStructure(validContract());
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when applicationId is missing', () => {
        const result = validateContractStructure(validContract({ applicationId: undefined }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('applicationId is required');
      });

      it('should fail when version is missing', () => {
        const result = validateContractStructure(validContract({ version: undefined }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('version is required');
      });

      it('should fail when status is missing', () => {
        const result = validateContractStructure(validContract({ status: undefined }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('status is required');
      });

      it('should fail with empty object (all missing)', () => {
        const result = validateContractStructure({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('applicationId is required');
        expect(result.errors).toContain('version is required');
        expect(result.errors).toContain('status is required');
        expect(result.errors).toHaveLength(3);
      });

      it('should fail when applicationId is empty string', () => {
        const result = validateContractStructure(validContract({ applicationId: '' }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('applicationId is required');
      });
    });

    describe('status validation', () => {
      it('should accept draft status', () => {
        const result = validateContractStructure(validContract({ status: 'draft' }));
        expect(result.valid).toBe(true);
      });

      it('should accept active status', () => {
        const result = validateContractStructure(validContract({ status: 'active' }));
        expect(result.valid).toBe(true);
      });

      it('should accept deprecated status', () => {
        const result = validateContractStructure(validContract({ status: 'deprecated' }));
        expect(result.valid).toBe(true);
      });

      it('should reject invalid status', () => {
        const result = validateContractStructure(validContract({ status: 'invalid' as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('status must be one of: draft, active, deprecated');
      });

      it('should reject archived as status', () => {
        const result = validateContractStructure(validContract({ status: 'archived' as any }));
        expect(result.valid).toBe(false);
      });
    });

    describe('version format validation', () => {
      it('should accept valid semver 1.0.0', () => {
        const result = validateContractStructure(validContract({ version: '1.0.0' }));
        expect(result.valid).toBe(true);
      });

      it('should accept semver 0.0.1', () => {
        const result = validateContractStructure(validContract({ version: '0.0.1' }));
        expect(result.valid).toBe(true);
      });

      it('should accept semver 10.20.30', () => {
        const result = validateContractStructure(validContract({ version: '10.20.30' }));
        expect(result.valid).toBe(true);
      });

      it('should reject version without patch', () => {
        const result = validateContractStructure(validContract({ version: '1.0' }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('version must be in semantic version format (X.Y.Z)');
      });

      it('should reject version with pre-release suffix', () => {
        const result = validateContractStructure(validContract({ version: '1.0.0-beta' }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('version must be in semantic version format (X.Y.Z)');
      });

      it('should reject non-numeric version', () => {
        const result = validateContractStructure(validContract({ version: 'latest' }));
        expect(result.valid).toBe(false);
      });

      it('should reject version with leading v', () => {
        const result = validateContractStructure(validContract({ version: 'v1.0.0' }));
        expect(result.valid).toBe(false);
      });
    });

    describe('optional field type validation', () => {
      it('should pass when inputs is a valid object', () => {
        const result = validateContractStructure(validContract({ inputs: { name: { type: 'string', required: true } } } as any));
        expect(result.valid).toBe(true);
      });

      it('should fail when inputs is not an object', () => {
        const result = validateContractStructure(validContract({ inputs: 'bad' as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('inputs must be an object');
      });

      it('should pass when inputs is an empty object', () => {
        const result = validateContractStructure(validContract({ inputs: {} } as any));
        expect(result.valid).toBe(true);
      });

      it('should fail when outputs is not an object', () => {
        const result = validateContractStructure(validContract({ outputs: 123 as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('outputs must be an object');
      });

      it('should pass when outputs is a valid object', () => {
        const result = validateContractStructure(validContract({ outputs: {} } as any));
        expect(result.valid).toBe(true);
      });

      it('should fail when sideEffects is not an array', () => {
        const result = validateContractStructure(validContract({ sideEffects: {} as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('sideEffects must be an array');
      });

      it('should pass when sideEffects is an empty array', () => {
        const result = validateContractStructure(validContract({ sideEffects: [] } as any));
        expect(result.valid).toBe(true);
      });

      it('should fail when events is not an array', () => {
        const result = validateContractStructure(validContract({ events: 'bad' as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('events must be an array');
      });

      it('should pass when events is a valid array', () => {
        const result = validateContractStructure(validContract({ events: [{ name: 'test' }] } as any));
        expect(result.valid).toBe(true);
      });

      it('should fail when behaviors is not an array', () => {
        const result = validateContractStructure(validContract({ behaviors: {} as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('behaviors must be an array');
      });

      it('should pass when behaviors is a valid array', () => {
        const result = validateContractStructure(validContract({ behaviors: [] } as any));
        expect(result.valid).toBe(true);
      });

      it('should fail when stability is not an object', () => {
        const result = validateContractStructure(validContract({ stability: 'stable' as any }));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('stability must be an object');
      });

      it('should pass when stability is a valid object', () => {
        const result = validateContractStructure(validContract({ stability: { level: 'stable' } } as any));
        expect(result.valid).toBe(true);
      });
    });

    describe('multiple errors', () => {
      it('should collect all errors at once', () => {
        const result = validateContractStructure({
          inputs: 'bad' as any,
          outputs: 123 as any,
          sideEffects: {} as any,
        });
        expect(result.valid).toBe(false);
        // Should have required field errors + type errors
        expect(result.errors.length).toBeGreaterThanOrEqual(5);
      });

      it('should report both missing and invalid fields', () => {
        const result = validateContractStructure({
          applicationId: 'app_1',
          // version missing
          status: 'invalid' as any,
          events: 'not-array' as any,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('version is required');
        expect(result.errors).toContain('status must be one of: draft, active, deprecated');
        expect(result.errors).toContain('events must be an array');
      });
    });

    describe('edge cases', () => {
      it('should not validate inputs/outputs when not provided', () => {
        const result = validateContractStructure(validContract());
        expect(result.valid).toBe(true);
        // No errors about inputs/outputs since they're optional
      });

      it('should handle null inputs gracefully', () => {
        // null is falsy, so the `contract.inputs && typeof` check won't trigger
        const result = validateContractStructure(validContract({ inputs: null as any }));
        expect(result.valid).toBe(true);
      });

      it('should treat arrays as objects for inputs', () => {
        // Arrays are typeof 'object', so this should pass the check
        const result = validateContractStructure(validContract({ inputs: [] as any }));
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('hasContract', () => {
    it('should return true for a valid contract', () => {
      expect(hasContract(fullContract())).toBe(true);
    });

    it('should return false for null', () => {
      expect(hasContract(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasContract(undefined as any)).toBe(false);
    });
  });

  describe('isContractActive', () => {
    it('should return true for active contract', () => {
      expect(isContractActive(fullContract({ status: 'active' }))).toBe(true);
    });

    it('should return false for draft contract', () => {
      expect(isContractActive(fullContract({ status: 'draft' }))).toBe(false);
    });

    it('should return false for deprecated contract', () => {
      expect(isContractActive(fullContract({ status: 'deprecated' }))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isContractActive(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isContractActive(undefined as any)).toBe(false);
    });
  });
});
