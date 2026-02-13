/**
 * Tests for Switch Node Handler
 */
import { handler } from '@/lib/workflow/nodeHandlers/switch';
import { createMockContext } from './helpers';

describe('Switch Node Handler', () => {
  function makeCtx(config: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
    return createMockContext({ resolvedConfig: config, ...overrides });
  }

  describe('exact match mode', () => {
    it('matches exact value and routes to correct output', async () => {
      const ctx = makeCtx(
        {
          field: 'status',
          cases: [
            { value: 'pending', output: 'pending-flow' },
            { value: 'approved', output: 'approved-flow' },
            { value: 'rejected', output: 'rejected-flow' },
          ],
        },
        { inputs: { status: 'approved' } }
      );
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.output).toBe('approved-flow');
      expect(result.data.matchedCase).toBe('approved');
      expect(result.data.matchedIndex).toBe(1);
      expect(result.data.isDefault).toBe(false);
    });

    it('routes to default when no case matches', async () => {
      const ctx = makeCtx(
        {
          field: 'status',
          cases: [{ value: 'active', output: 'active-flow' }],
          defaultOutput: 'fallback',
        },
        { inputs: { status: 'unknown' } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('fallback');
      expect(result.data.isDefault).toBe(true);
      expect(result.data.matchedIndex).toBe(-1);
    });

    it('uses "default" as default output name', async () => {
      const ctx = makeCtx(
        { field: 'x', cases: [] },
        { inputs: { x: 'anything' } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('default');
    });

    it('matches via string coercion', async () => {
      const ctx = makeCtx(
        {
          field: 'code',
          cases: [{ value: '200', output: 'ok' }],
        },
        { inputs: { code: 200 } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('ok');
    });

    it('matches first case when multiple match', async () => {
      const ctx = makeCtx(
        {
          field: 'val',
          cases: [
            { value: 'x', output: 'first' },
            { value: 'x', output: 'second' },
          ],
        },
        { inputs: { val: 'x' } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('first');
    });
  });

  describe('contains match mode', () => {
    it('matches substring (case-insensitive)', async () => {
      const ctx = makeCtx(
        {
          field: 'message',
          matchMode: 'contains',
          cases: [
            { value: 'error', output: 'error-handler' },
            { value: 'success', output: 'success-handler' },
          ],
        },
        { inputs: { message: 'Operation completed with ERROR code' } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('error-handler');
    });

    it('returns default when no substring matches', async () => {
      const ctx = makeCtx(
        {
          field: 'message',
          matchMode: 'contains',
          cases: [{ value: 'error', output: 'err' }],
        },
        { inputs: { message: 'all good' } }
      );
      const result = await handler(ctx);
      expect(result.data.isDefault).toBe(true);
    });
  });

  describe('regex match mode', () => {
    it('matches regex pattern', async () => {
      const ctx = makeCtx(
        {
          field: 'email',
          matchMode: 'regex',
          cases: [
            { value: '@company\\.com$', output: 'internal' },
            { value: '@gmail\\.com$', output: 'external' },
          ],
        },
        { inputs: { email: 'user@company.com' } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('internal');
    });

    it('handles invalid regex gracefully', async () => {
      const ctx = makeCtx(
        {
          field: 'val',
          matchMode: 'regex',
          cases: [{ value: '[invalid', output: 'x' }],
        },
        { inputs: { val: 'test' } }
      );
      const result = await handler(ctx);
      expect(result.data.isDefault).toBe(true);
    });
  });

  describe('range match mode', () => {
    it('matches within numeric range', async () => {
      const ctx = makeCtx(
        {
          field: 'score',
          matchMode: 'range',
          cases: [
            { value: null, min: 0, max: 49, output: 'fail' },
            { value: null, min: 50, max: 79, output: 'pass' },
            { value: null, min: 80, max: 100, output: 'excellent' },
          ],
        },
        { inputs: { score: 72 } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('pass');
    });

    it('handles open-ended range (no max)', async () => {
      const ctx = makeCtx(
        {
          field: 'count',
          matchMode: 'range',
          cases: [{ value: null, min: 100, output: 'high' }],
        },
        { inputs: { count: 500 } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('high');
    });

    it('returns default for NaN values', async () => {
      const ctx = makeCtx(
        {
          field: 'val',
          matchMode: 'range',
          cases: [{ value: null, min: 0, max: 10, output: 'x' }],
        },
        { inputs: { val: 'not-a-number' } }
      );
      const result = await handler(ctx);
      expect(result.data.isDefault).toBe(true);
    });
  });

  describe('nested field access', () => {
    it('accesses nested fields via dot notation', async () => {
      const ctx = makeCtx(
        {
          field: 'order.type',
          cases: [{ value: 'express', output: 'fast-lane' }],
        },
        { inputs: { order: { type: 'express' } } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('fast-lane');
    });

    it('accesses trigger data', async () => {
      const ctx = makeCtx(
        {
          field: 'trigger.type',
          cases: [{ value: 'webhook', output: 'webhook-flow' }],
        },
        { trigger: { type: 'webhook' } }
      );
      const result = await handler(ctx);
      expect(result.data.output).toBe('webhook-flow');
    });
  });

  describe('output shape', () => {
    it('includes _evaluatedCases for debugging', async () => {
      const ctx = makeCtx(
        {
          field: 'x',
          cases: [
            { value: 'a', output: 'A' },
            { value: 'b', output: 'B' },
          ],
        },
        { inputs: { x: 'b' } }
      );
      const result = await handler(ctx);
      const evaluated = result.data._evaluatedCases as any[];
      expect(evaluated).toHaveLength(2);
      expect(evaluated[0].matched).toBe(false);
      expect(evaluated[1].matched).toBe(true);
    });

    it('passes through inputs as data', async () => {
      const inputs = { foo: 'bar' };
      const ctx = makeCtx({ field: 'x', cases: [] }, { inputs });
      const result = await handler(ctx);
      expect(result.data.data).toEqual(inputs);
    });

    it('exposes fieldValue in output', async () => {
      const ctx = makeCtx(
        { field: 'x', cases: [] },
        { inputs: { x: 42 } }
      );
      const result = await handler(ctx);
      expect(result.data.fieldValue).toBe(42);
    });
  });
});
