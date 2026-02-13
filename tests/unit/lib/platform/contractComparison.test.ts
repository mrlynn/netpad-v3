/**
 * Tests for Contract Comparison Utilities
 *
 * Tests compareContracts with mocked DB calls, covering:
 * - Input comparison (added, removed, type changes, required changes)
 * - Output comparison (added, removed, type changes, guarantees)
 * - Side effect comparison
 * - Event comparison
 * - Behavior comparison
 * - Compatibility determination
 * - Migration guide generation
 */

import { compareContracts, ContractComparison } from '@/lib/platform/contractComparison';
import { ApplicationContract } from '@/types/application';

// Mock the DB call
jest.mock('@/lib/platform/applicationContracts', () => ({
  getApplicationContractByVersion: jest.fn(),
}));

import { getApplicationContractByVersion } from '@/lib/platform/applicationContracts';
const mockGetContract = getApplicationContractByVersion as jest.MockedFunction<typeof getApplicationContractByVersion>;

function makeContract(overrides: Partial<ApplicationContract> = {}): ApplicationContract {
  return {
    contractId: 'contract_1',
    applicationId: 'app_1',
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

describe('Contract Comparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compareContracts - error handling', () => {
    it('should throw when fromVersion contract not found', async () => {
      mockGetContract.mockResolvedValueOnce(null as any).mockResolvedValueOnce(makeContract());
      await expect(compareContracts('org1', 'app1', '1.0.0', '2.0.0'))
        .rejects.toThrow('Contract not found for version 1.0.0');
    });

    it('should throw when toVersion contract not found', async () => {
      mockGetContract.mockResolvedValueOnce(makeContract()).mockResolvedValueOnce(null as any);
      await expect(compareContracts('org1', 'app1', '1.0.0', '2.0.0'))
        .rejects.toThrow('Contract not found for version 2.0.0');
    });
  });

  describe('compareContracts - identical contracts', () => {
    it('should show compatible with no changes', async () => {
      const contract = makeContract();
      mockGetContract.mockResolvedValueOnce(contract).mockResolvedValueOnce(contract);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.0.1');
      expect(result.compatibility).toBe('compatible');
      expect(result.breakingChanges).toHaveLength(0);
      expect(result.nonBreakingChanges).toHaveLength(0);
      expect(result.additiveChanges).toHaveLength(0);
      expect(result.migrationGuide).toBeUndefined();
    });
  });

  describe('compareContracts - input changes', () => {
    it('should detect removed input as breaking', async () => {
      const from = makeContract({
        inputs: { name: { type: 'string', required: true } },
      });
      const to = makeContract({ inputs: {} });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('removed-input');
      expect(result.breakingChanges[0].component).toBe('name');
      expect(result.breakingChanges[0].impact).toBe('high');
      expect(result.compatibility).toBe('incompatible');
    });

    it('should detect added required input as breaking', async () => {
      const from = makeContract({ inputs: {} });
      const to = makeContract({
        inputs: { email: { type: 'string', required: true } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('input-required-change');
      expect(result.compatibility).toBe('incompatible');
    });

    it('should detect added optional input as additive', async () => {
      const from = makeContract({ inputs: {} });
      const to = makeContract({
        inputs: { nickname: { type: 'string', required: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.additiveChanges).toHaveLength(1);
      expect(result.additiveChanges[0].type).toBe('added-input');
      expect(result.breakingChanges).toHaveLength(0);
      expect(result.compatibility).toBe('compatible');
    });

    it('should detect input type change as breaking', async () => {
      const from = makeContract({
        inputs: { age: { type: 'string', required: false } },
      });
      const to = makeContract({
        inputs: { age: { type: 'number', required: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('input-type-change');
      expect(result.breakingChanges[0].description).toContain("'string'");
      expect(result.breakingChanges[0].description).toContain("'number'");
    });

    it('should detect optional→required change as breaking', async () => {
      const from = makeContract({
        inputs: { email: { type: 'string', required: false } },
      });
      const to = makeContract({
        inputs: { email: { type: 'string', required: true } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('input-required-change');
      expect(result.breakingChanges[0].description).toContain('optional to required');
    });

    it('should detect required→optional change as non-breaking', async () => {
      const from = makeContract({
        inputs: { email: { type: 'string', required: true } },
      });
      const to = makeContract({
        inputs: { email: { type: 'string', required: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.nonBreakingChanges).toHaveLength(1);
      expect(result.nonBreakingChanges[0].type).toBe('input-optional-change');
      expect(result.compatibility).toBe('requires-migration');
    });

    it('should detect multiple input changes at once', async () => {
      const from = makeContract({
        inputs: {
          name: { type: 'string', required: true },
          age: { type: 'string', required: false },
        },
      });
      const to = makeContract({
        inputs: {
          age: { type: 'number', required: true },
          email: { type: 'string', required: false },
        },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      // name removed (breaking), age type changed (breaking) + optional→required (breaking), email added (additive)
      expect(result.breakingChanges.length).toBeGreaterThanOrEqual(2);
      expect(result.additiveChanges).toHaveLength(1);
      expect(result.compatibility).toBe('incompatible');
    });
  });

  describe('compareContracts - output changes', () => {
    it('should detect removed guaranteed output as breaking', async () => {
      const from = makeContract({
        outputs: { result: { type: 'object', guaranteed: true } },
      });
      const to = makeContract({ outputs: {} });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('removed-output');
    });

    it('should NOT detect removed non-guaranteed output as breaking', async () => {
      const from = makeContract({
        outputs: { debug: { type: 'string', guaranteed: false } },
      });
      const to = makeContract({ outputs: {} });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.breakingChanges).toHaveLength(0);
    });

    it('should detect added output as additive', async () => {
      const from = makeContract({ outputs: {} });
      const to = makeContract({
        outputs: { metadata: { type: 'object', guaranteed: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.additiveChanges).toHaveLength(1);
      expect(result.additiveChanges[0].type).toBe('added-output');
    });

    it('should detect output type change as breaking', async () => {
      const from = makeContract({
        outputs: { count: { type: 'number', guaranteed: true } },
      });
      const to = makeContract({
        outputs: { count: { type: 'string', guaranteed: true } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('output-type-change');
    });

    it('should detect guarantee removal as breaking', async () => {
      const from = makeContract({
        outputs: { data: { type: 'object', guaranteed: true } },
      });
      const to = makeContract({
        outputs: { data: { type: 'object', guaranteed: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('output-guarantee-removed');
      expect(result.breakingChanges[0].impact).toBe('medium');
    });

    it('should detect guarantee addition as non-breaking', async () => {
      const from = makeContract({
        outputs: { data: { type: 'object', guaranteed: false } },
      });
      const to = makeContract({
        outputs: { data: { type: 'object', guaranteed: true } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.nonBreakingChanges).toHaveLength(1);
      expect(result.nonBreakingChanges[0].type).toBe('output-guarantee-added');
    });
  });

  describe('compareContracts - side effect changes', () => {
    it('should detect removed side effect as breaking', async () => {
      const from = makeContract({
        sideEffects: [{ type: 'write', target: 'users' }],
      });
      const to = makeContract({ sideEffects: [] });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('removed-side-effect');
      expect(result.breakingChanges[0].impact).toBe('medium');
    });

    it('should detect added side effect as additive', async () => {
      const from = makeContract({ sideEffects: [] });
      const to = makeContract({
        sideEffects: [{ type: 'notification', target: 'admin' }],
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.additiveChanges).toHaveLength(1);
      expect(result.additiveChanges[0].type).toBe('added-side-effect');
    });

    it('should match side effects by type:target composite key', async () => {
      const from = makeContract({
        sideEffects: [
          { type: 'write', target: 'users' },
          { type: 'api_call', target: 'users' },
        ],
      });
      const to = makeContract({
        sideEffects: [
          { type: 'write', target: 'users' },
          // api_call:users removed
        ],
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].description).toContain('api_call:users');
    });
  });

  describe('compareContracts - event changes', () => {
    it('should detect removed event as breaking', async () => {
      const from = makeContract({
        events: [{ name: 'form.submitted' }],
      } as any);
      const to = makeContract({ events: [] });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('removed-event');
      expect(result.breakingChanges[0].component).toBe('form.submitted');
    });

    it('should detect added event as additive', async () => {
      const from = makeContract({ events: [] });
      const to = makeContract({
        events: [{ name: 'form.updated' }],
      } as any);
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.additiveChanges).toHaveLength(1);
      expect(result.additiveChanges[0].type).toBe('added-event');
    });

    it('should handle unchanged events', async () => {
      const events = [{ name: 'form.submitted' }, { name: 'form.deleted' }] as any;
      const from = makeContract({ events });
      const to = makeContract({ events });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.0.1');
      expect(result.breakingChanges).toHaveLength(0);
      expect(result.additiveChanges).toHaveLength(0);
    });
  });

  describe('compareContracts - behavior changes', () => {
    it('should detect removed behavior as breaking', async () => {
      const from = makeContract({
        behaviors: [{ workflowId: 'wf_1', trigger: 'form.submitted' }],
      } as any);
      const to = makeContract({ behaviors: [] });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('behavior-removed');
      expect(result.breakingChanges[0].description).toContain('form.submitted');
    });

    it('should detect added behavior as additive', async () => {
      const from = makeContract({ behaviors: [] });
      const to = makeContract({
        behaviors: [{ workflowId: 'wf_2', trigger: 'schedule' }],
      } as any);
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.additiveChanges).toHaveLength(1);
      expect(result.additiveChanges[0].type).toBe('behavior-added');
    });
  });

  describe('compareContracts - compatibility determination', () => {
    it('should be incompatible when there are breaking changes', async () => {
      const from = makeContract({ inputs: { x: { type: 'string', required: true } } });
      const to = makeContract({ inputs: {} });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.compatibility).toBe('incompatible');
      expect(result.migrationGuide).toBeDefined();
      expect(result.migrationGuide).toContain('Migration Guide');
      expect(result.migrationGuide).toContain('1.0.0');
      expect(result.migrationGuide).toContain('2.0.0');
    });

    it('should require migration when only non-breaking changes exist', async () => {
      const from = makeContract({
        inputs: { email: { type: 'string', required: true } },
      });
      const to = makeContract({
        inputs: { email: { type: 'string', required: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.compatibility).toBe('requires-migration');
      expect(result.migrationGuide).toBeUndefined();
    });

    it('should be compatible when only additive changes', async () => {
      const from = makeContract({ inputs: {} });
      const to = makeContract({
        inputs: { optional: { type: 'string', required: false } },
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '1.1.0');
      expect(result.compatibility).toBe('compatible');
    });
  });

  describe('compareContracts - migration guide', () => {
    it('should include all breaking changes in migration guide', async () => {
      const from = makeContract({
        inputs: { a: { type: 'string', required: true }, b: { type: 'number', required: false } },
        events: [{ name: 'evt1' }] as any,
      });
      const to = makeContract({
        inputs: { b: { type: 'string', required: false } },
        events: [],
      });
      mockGetContract.mockResolvedValueOnce(from).mockResolvedValueOnce(to);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.migrationGuide).toBeDefined();
      expect(result.migrationGuide).toContain('Breaking Changes');
      expect(result.migrationGuide).toContain('Action Required');
      // Should mention each broken component
      expect(result.migrationGuide).toContain('a'); // removed input
      expect(result.migrationGuide).toContain('b'); // type change
      expect(result.migrationGuide).toContain('evt1'); // removed event
    });
  });

  describe('compareContracts - version metadata', () => {
    it('should include from and to versions in result', async () => {
      const contract = makeContract();
      mockGetContract.mockResolvedValueOnce(contract).mockResolvedValueOnce(contract);

      const result = await compareContracts('org1', 'app1', '1.0.0', '2.0.0');
      expect(result.fromVersion).toBe('1.0.0');
      expect(result.toVersion).toBe('2.0.0');
    });
  });
});
