/**
 * Tests for Delay Node Handler
 */
import { handler } from '@/lib/workflow/nodeHandlers/delay';
import { createMockContext } from './helpers';

// Mock setTimeout to resolve immediately
jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
  fn();
  return 0 as any;
});

describe('Delay Node Handler', () => {
  function makeCtx(config: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
    return createMockContext({ resolvedConfig: config, ...overrides });
  }

  describe('duration validation', () => {
    it('fails when duration is missing', async () => {
      const ctx = makeCtx({});
      const result = await handler(ctx);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIG');
      expect(result.error?.message).toContain('duration is required');
    });

    it('fails for negative duration', async () => {
      const ctx = makeCtx({ duration: -100 });
      const result = await handler(ctx);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid duration');
    });

    it('fails for NaN duration', async () => {
      const ctx = makeCtx({ duration: 'abc' });
      const result = await handler(ctx);
      expect(result.success).toBe(false);
    });

    it('accepts null duration as missing', async () => {
      const ctx = makeCtx({ duration: null });
      const result = await handler(ctx);
      expect(result.success).toBe(false);
    });
  });

  describe('unit conversion', () => {
    it('defaults to milliseconds', async () => {
      const ctx = makeCtx({ duration: 500 });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.requestedMs).toBe(500);
    });

    it('converts seconds to ms', async () => {
      const ctx = makeCtx({ duration: 5, unit: 'seconds' });
      const result = await handler(ctx);
      expect(result.data.requestedMs).toBe(5000);
    });

    it('converts minutes to ms', async () => {
      const ctx = makeCtx({ duration: 2, unit: 'minutes' });
      const result = await handler(ctx);
      expect(result.data.requestedMs).toBe(120000);
    });

    it('converts hours to ms', async () => {
      const ctx = makeCtx({ duration: 0.1, unit: 'hours' });
      const result = await handler(ctx);
      // 0.1 * 3600000 = 360000, under 600000 cap
      expect(result.data.requestedMs).toBe(360000);
    });

    it('handles explicit ms unit', async () => {
      const ctx = makeCtx({ duration: 1234, unit: 'ms' });
      const result = await handler(ctx);
      expect(result.data.requestedMs).toBe(1234);
    });
  });

  describe('max delay cap', () => {
    it('caps delay at 10 minutes (600000ms)', async () => {
      const ctx = makeCtx({ duration: 1, unit: 'hours' }); // 3,600,000ms
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.requestedMs).toBe(600000);
    });

    it('does not cap delays under 10 minutes', async () => {
      const ctx = makeCtx({ duration: 9, unit: 'minutes' }); // 540,000ms
      const result = await handler(ctx);
      expect(result.data.requestedMs).toBe(540000);
    });
  });

  describe('pass-through', () => {
    it('passes through inputs to output', async () => {
      const ctx = makeCtx({ duration: 0 }, { inputs: { key: 'value', num: 42 } });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.key).toBe('value');
      expect(result.data.num).toBe(42);
      expect(result.data.delayed).toBe(true);
    });
  });

  describe('zero duration', () => {
    it('handles zero duration gracefully', async () => {
      const ctx = makeCtx({ duration: 0 });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.delayed).toBe(true);
      expect(result.data.requestedMs).toBe(0);
    });
  });

  describe('output shape', () => {
    it('includes delayed, requestedMs, actualMs', async () => {
      const ctx = makeCtx({ duration: 100 });
      const result = await handler(ctx);
      expect(result.data.delayed).toBe(true);
      expect(result.data.requestedMs).toBeDefined();
      expect(result.data.actualMs).toBeDefined();
      expect(typeof result.data.actualMs).toBe('number');
    });

    it('includes durationMs in metadata', async () => {
      const ctx = makeCtx({ duration: 0 });
      const result = await handler(ctx);
      expect(result.metadata?.durationMs).toBeDefined();
    });
  });
});
