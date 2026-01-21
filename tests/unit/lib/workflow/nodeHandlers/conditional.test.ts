/**
 * Conditional Node Handler Tests
 *
 * Tests for the If/Then conditional node handler that routes data
 * based on conditions.
 */

import { handler } from '@/lib/workflow/nodeHandlers/conditional';
import { ExtendedNodeContext } from '@/lib/workflow/nodeHandlers/types';

describe('Conditional Node Handler', () => {
  // ============================================
  // Test Helpers
  // ============================================

  const createContext = (
    resolvedConfig: Record<string, unknown>,
    inputs: Record<string, unknown> = {},
    nodeOutputs: Record<string, Record<string, unknown>> = {},
    trigger: { type: string; payload?: Record<string, unknown> } = { type: 'manual' }
  ): ExtendedNodeContext => ({
    workflowId: 'test-workflow',
    executionId: 'test-execution',
    nodeId: 'test-conditional',
    orgId: 'test-org',
    inputs,
    config: {},
    resolvedConfig,
    variables: {},
    nodeOutputs,
    trigger,
    log: jest.fn().mockResolvedValue(undefined),
    getConnection: jest.fn(),
    getEmailCredentials: jest.fn(),
  });

  // ============================================
  // Basic Condition Evaluation
  // ============================================

  describe('equals operator', () => {
    it('returns true when string values match exactly', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.status', operator: 'equals', value: 'active' }],
        },
        { default: { status: 'active' } }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(true);
      expect(result.data.branch).toBe('true');
    });

    it('returns false when values do not match', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.status', operator: 'equals', value: 'active' }],
        },
        { default: { status: 'inactive' } }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(false);
      expect(result.data.branch).toBe('false');
    });

    it('handles numeric comparison with string coercion', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.count', operator: 'equals', value: '5' }],
        },
        { default: { count: 5 } }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(true);
    });
  });

  describe('not_equals operator', () => {
    it('returns true when values differ', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.type', operator: 'not_equals', value: 'spam' }],
        },
        { default: { type: 'legitimate' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false when values match', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.type', operator: 'not_equals', value: 'spam' }],
        },
        { default: { type: 'spam' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  describe('contains operator', () => {
    it('matches substring in string (case-insensitive)', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.message', operator: 'contains', value: 'urgent' }],
        },
        { default: { message: 'This is URGENT, please respond!' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false when substring not found', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.message', operator: 'contains', value: 'urgent' }],
        },
        { default: { message: 'Regular message' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });

    it('checks array membership', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.tags', operator: 'contains', value: 'important' }],
        },
        { default: { tags: ['important', 'work', 'review'] } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  describe('not_contains operator', () => {
    it('returns true when substring not found', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.message', operator: 'not_contains', value: 'spam' }],
        },
        { default: { message: 'Legitimate message' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false when substring found', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.message', operator: 'not_contains', value: 'spam' }],
        },
        { default: { message: 'This is spam content' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  describe('starts_with operator', () => {
    it('returns true when string starts with value', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.code', operator: 'starts_with', value: 'ERR-' }],
        },
        { default: { code: 'ERR-500' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('is case-insensitive', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.code', operator: 'starts_with', value: 'err-' }],
        },
        { default: { code: 'ERR-500' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  describe('ends_with operator', () => {
    it('returns true when string ends with value', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.email', operator: 'ends_with', value: '@company.com' }],
        },
        { default: { email: 'user@company.com' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  describe('regex operator', () => {
    it('matches valid regex pattern', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.email', operator: 'regex', value: '^[\\w.-]+@[\\w.-]+\\.\\w+$' }],
        },
        { default: { email: 'user@example.com' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false for invalid regex', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.text', operator: 'regex', value: '[invalid(' }],
        },
        { default: { text: 'test' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  // ============================================
  // Numeric Comparisons
  // ============================================

  describe('numeric comparison operators', () => {
    it('gt: returns true when value is greater', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.amount', operator: 'gt', value: 100 }],
        },
        { default: { amount: 150 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('gt: returns false when value is equal', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.amount', operator: 'gt', value: 100 }],
        },
        { default: { amount: 100 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });

    it('gte: returns true when value is equal', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.amount', operator: 'gte', value: 100 }],
        },
        { default: { amount: 100 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('lt: returns true when value is less', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.score', operator: 'lt', value: 50 }],
        },
        { default: { score: 30 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('lte: returns true when value is equal', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.score', operator: 'lte', value: 50 }],
        },
        { default: { score: 50 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  // ============================================
  // Empty/Existence Checks
  // ============================================

  describe('is_empty operator', () => {
    it('returns true for null', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.value', operator: 'is_empty' }],
        },
        { default: { value: null } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for undefined', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.value', operator: 'is_empty' }],
        },
        { default: {} }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for empty string', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.value', operator: 'is_empty' }],
        },
        { default: { value: '' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for empty array', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.items', operator: 'is_empty' }],
        },
        { default: { items: [] } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for empty object', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.data', operator: 'is_empty' }],
        },
        { default: { data: {} } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false for non-empty values', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.value', operator: 'is_empty' }],
        },
        { default: { value: 'text' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  describe('is_not_empty operator', () => {
    it('returns true for non-empty values', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.value', operator: 'is_not_empty' }],
        },
        { default: { value: 'has content' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false for empty string', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.value', operator: 'is_not_empty' }],
        },
        { default: { value: '' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  // ============================================
  // Boolean Checks
  // ============================================

  describe('is_true operator', () => {
    it('returns true for boolean true', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.active', operator: 'is_true' }],
        },
        { default: { active: true } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for string "true"', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.active', operator: 'is_true' }],
        },
        { default: { active: 'true' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for number 1', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.active', operator: 'is_true' }],
        },
        { default: { active: 1 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  describe('is_false operator', () => {
    it('returns true for boolean false', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.disabled', operator: 'is_false' }],
        },
        { default: { disabled: false } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for string "false"', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.disabled', operator: 'is_false' }],
        },
        { default: { disabled: 'false' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true for number 0', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.disabled', operator: 'is_false' }],
        },
        { default: { disabled: 0 } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  // ============================================
  // Existence Checks
  // ============================================

  describe('exists operator', () => {
    it('returns true when field exists', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.name', operator: 'exists' }],
        },
        { default: { name: 'John' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns true when field exists with null value', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.name', operator: 'exists' }],
        },
        { default: { name: null } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false when field does not exist', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.nonexistent', operator: 'exists' }],
        },
        { default: {} }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  describe('not_exists operator', () => {
    it('returns true when field does not exist', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.missing', operator: 'not_exists' }],
        },
        { default: {} }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  // ============================================
  // Multiple Conditions
  // ============================================

  describe('multiple conditions with AND', () => {
    it('returns true when all conditions pass', async () => {
      const context = createContext(
        {
          conditions: [
            { field: 'default.status', operator: 'equals', value: 'active' },
            { field: 'default.priority', operator: 'equals', value: 'high' },
          ],
          combineWith: 'and',
        },
        { default: { status: 'active', priority: 'high' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false when any condition fails', async () => {
      const context = createContext(
        {
          conditions: [
            { field: 'default.status', operator: 'equals', value: 'active' },
            { field: 'default.priority', operator: 'equals', value: 'high' },
          ],
          combineWith: 'and',
        },
        { default: { status: 'active', priority: 'low' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  describe('multiple conditions with OR', () => {
    it('returns true when any condition passes', async () => {
      const context = createContext(
        {
          conditions: [
            { field: 'default.type', operator: 'equals', value: 'urgent' },
            { field: 'default.type', operator: 'equals', value: 'critical' },
          ],
          combineWith: 'or',
        },
        { default: { type: 'critical' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('returns false when all conditions fail', async () => {
      const context = createContext(
        {
          conditions: [
            { field: 'default.type', operator: 'equals', value: 'urgent' },
            { field: 'default.type', operator: 'equals', value: 'critical' },
          ],
          combineWith: 'or',
        },
        { default: { type: 'normal' } }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(false);
    });
  });

  // ============================================
  // Nested Path Access
  // ============================================

  describe('nested path access', () => {
    it('accesses deeply nested values', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.user.profile.settings.notifications', operator: 'is_true' }],
        },
        {
          default: {
            user: {
              profile: {
                settings: {
                  notifications: true,
                },
              },
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('handles array index notation', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.items[0].name', operator: 'equals', value: 'first' }],
        },
        {
          default: {
            items: [{ name: 'first' }, { name: 'second' }],
          },
        }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('accesses trigger data', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'trigger.payload.data.email', operator: 'ends_with', value: '@company.com' }],
        },
        {},
        {},
        {
          type: 'form-submission',
          payload: {
            data: {
              email: 'user@company.com',
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });

    it('accesses previous node outputs', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'formTrigger.data.rating', operator: 'gte', value: 4 }],
        },
        {},
        {
          formTrigger: {
            data: {
              rating: 5,
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.data.result).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('handles no conditions configured (defaults to true)', async () => {
      const context = createContext(
        {
          conditions: [],
        },
        { default: { data: 'test' } }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(true);
    });

    it('handles missing conditions property (defaults to true)', async () => {
      const context = createContext({}, { default: { data: 'test' } });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(true);
    });

    it('handles non-existent field path gracefully', async () => {
      const context = createContext(
        {
          conditions: [{ field: 'default.nonexistent.deeply.nested', operator: 'equals', value: 'test' }],
        },
        { default: {} }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(false);
    });

    it('includes evaluated conditions in output', async () => {
      const context = createContext(
        {
          conditions: [
            { field: 'default.name', operator: 'equals', value: 'John' },
            { field: 'default.age', operator: 'gte', value: 18 },
          ],
          combineWith: 'and',
        },
        { default: { name: 'John', age: 25 } }
      );

      const result = await handler(context);

      expect(result.data.evaluatedConditions).toHaveLength(2);
      expect(result.data.evaluatedConditions[0]).toMatchObject({
        field: 'default.name',
        operator: 'equals',
        result: true,
      });
      expect(result.data.evaluatedConditions[1]).toMatchObject({
        field: 'default.age',
        operator: 'gte',
        result: true,
      });
    });

    it('passes input data through in output', async () => {
      const inputData = { default: { name: 'John', email: 'john@example.com' } };
      const context = createContext(
        {
          conditions: [{ field: 'default.name', operator: 'equals', value: 'John' }],
        },
        inputData
      );

      const result = await handler(context);

      expect(result.data.data).toEqual(inputData);
    });
  });
});
