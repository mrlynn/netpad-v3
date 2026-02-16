/**
 * Tests for Conditional (If/Then) Node Handler
 */
import { handler } from '@/lib/workflow/nodeHandlers/conditional';
import { createMockContext } from './helpers';

describe('Conditional Node Handler', () => {
  function makeCtx(config: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
    return createMockContext({ resolvedConfig: config, ...overrides });
  }

  describe('no conditions', () => {
    it('defaults to true when no conditions configured', async () => {
      const ctx = makeCtx({ conditions: [] });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.result).toBe(true);
      expect(result.data.branch).toBe('true');
    });
  });

  describe('equals / not_equals', () => {
    it('matches equals with exact value', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'status', operator: 'equals', value: 'active' }] },
        { inputs: { status: 'active' } }
      );
      const result = await handler(ctx);
      expect(result.data.result).toBe(true);
    });

    it('matches equals via string coercion', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'count', operator: 'equals', value: '5' }] },
        { inputs: { count: 5 } }
      );
      const result = await handler(ctx);
      expect(result.data.result).toBe(true);
    });

    it('not_equals returns false branch', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'status', operator: 'not_equals', value: 'active' }] },
        { inputs: { status: 'active' } }
      );
      const result = await handler(ctx);
      expect(result.data.result).toBe(false);
      expect(result.data.branch).toBe('false');
    });
  });

  describe('string operators', () => {
    it('contains (case-insensitive)', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'email', operator: 'contains', value: '@GMAIL' }] },
        { inputs: { email: 'user@gmail.com' } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('starts_with', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'url', operator: 'starts_with', value: 'https' }] },
        { inputs: { url: 'https://example.com' } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('ends_with', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'file', operator: 'ends_with', value: '.pdf' }] },
        { inputs: { file: 'report.PDF' } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('regex match', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'phone', operator: 'regex', value: '^\\d{3}-\\d{4}$' }] },
        { inputs: { phone: '555-1234' } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('regex returns false for invalid regex', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'val', operator: 'regex', value: '[invalid' }] },
        { inputs: { val: 'test' } }
      );
      expect((await handler(ctx)).data.result).toBe(false);
    });
  });

  describe('comparison operators', () => {
    it('gt', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'age', operator: 'gt', value: 18 }] },
        { inputs: { age: 21 } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('lte', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'score', operator: 'lte', value: 100 }] },
        { inputs: { score: 100 } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });
  });

  describe('boolean/existence operators', () => {
    it('is_true with truthy values', async () => {
      for (const val of [true, 'true', 1, '1']) {
        const ctx = makeCtx(
          { conditions: [{ field: 'flag', operator: 'is_true' }] },
          { inputs: { flag: val } }
        );
        expect((await handler(ctx)).data.result).toBe(true);
      }
    });

    it('is_false with falsy values', async () => {
      for (const val of [false, 'false', 0, '0']) {
        const ctx = makeCtx(
          { conditions: [{ field: 'flag', operator: 'is_false' }] },
          { inputs: { flag: val } }
        );
        expect((await handler(ctx)).data.result).toBe(true);
      }
    });

    it('is_empty for null/undefined/empty string', async () => {
      for (const val of [null, undefined, '', [], {}]) {
        const ctx = makeCtx(
          { conditions: [{ field: 'val', operator: 'is_empty' }] },
          { inputs: { val } }
        );
        expect((await handler(ctx)).data.result).toBe(true);
      }
    });

    it('exists and not_exists', async () => {
      const ctx1 = makeCtx(
        { conditions: [{ field: 'x', operator: 'exists' }] },
        { inputs: { x: 42 } }
      );
      expect((await handler(ctx1)).data.result).toBe(true);

      const ctx2 = makeCtx(
        { conditions: [{ field: 'x', operator: 'not_exists' }] },
        { inputs: {} }
      );
      expect((await handler(ctx2)).data.result).toBe(true);
    });
  });

  describe('nested field access', () => {
    it('accesses deeply nested fields via dot notation', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'user.address.city', operator: 'equals', value: 'NYC' }] },
        { inputs: { user: { address: { city: 'NYC' } } } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('accesses trigger data', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'trigger.type', operator: 'equals', value: 'webhook' }] },
        { trigger: { type: 'webhook' } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('handles array index notation', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'items[0].name', operator: 'equals', value: 'first' }] },
        { inputs: { items: [{ name: 'first' }, { name: 'second' }] } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });
  });

  describe('combining conditions', () => {
    it('AND: all must pass', async () => {
      const ctx = makeCtx(
        {
          combineWith: 'and',
          conditions: [
            { field: 'age', operator: 'gte', value: 18 },
            { field: 'active', operator: 'is_true' },
          ],
        },
        { inputs: { age: 21, active: true } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });

    it('AND: one fail = false', async () => {
      const ctx = makeCtx(
        {
          combineWith: 'and',
          conditions: [
            { field: 'age', operator: 'gte', value: 18 },
            { field: 'active', operator: 'is_true' },
          ],
        },
        { inputs: { age: 21, active: false } }
      );
      expect((await handler(ctx)).data.result).toBe(false);
    });

    it('OR: one pass = true', async () => {
      const ctx = makeCtx(
        {
          combineWith: 'or',
          conditions: [
            { field: 'role', operator: 'equals', value: 'admin' },
            { field: 'role', operator: 'equals', value: 'superadmin' },
          ],
        },
        { inputs: { role: 'superadmin' } }
      );
      expect((await handler(ctx)).data.result).toBe(true);
    });
  });

  describe('output shape', () => {
    it('includes evaluatedConditions details', async () => {
      const ctx = makeCtx(
        { conditions: [{ field: 'x', operator: 'equals', value: 1 }] },
        { inputs: { x: 1 } }
      );
      const result = await handler(ctx);
      expect(result.data.evaluatedConditions).toHaveLength(1);
      const ec = (result.data.evaluatedConditions as any[])[0];
      expect(ec.field).toBe('x');
      expect(ec.fieldValue).toBe(1);
      expect(ec.result).toBe(true);
    });

    it('passes through inputs as data', async () => {
      const inputs = { a: 1, b: 2 };
      const ctx = makeCtx({ conditions: [] }, { inputs });
      const result = await handler(ctx);
      expect(result.data.data).toEqual(inputs);
    });
  });
});
