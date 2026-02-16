/**
 * Tests for Transform Node Handler
 */
import { handler } from '@/lib/workflow/nodeHandlers/transform';
import { createMockContext } from './helpers';

describe('Transform Node Handler', () => {
  describe('template mode', () => {
    it('passes through template as output', async () => {
      const ctx = createMockContext({
        resolvedConfig: {
          mode: 'template',
          template: { name: 'John', age: 30 },
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('removes internal config keys from template output', async () => {
      const ctx = createMockContext({
        resolvedConfig: {
          mode: 'template',
          template: { greeting: 'hello', mode: 'template', expression: 'x', mappings: [] },
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      // The template object itself is returned; internal keys on template should be removed
      expect(result.data).toEqual({ greeting: 'hello' });
    });

    it('defaults to template mode when mode is not specified', async () => {
      const ctx = createMockContext({
        resolvedConfig: { foo: 'bar' },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ foo: 'bar' });
    });

    it('uses resolvedConfig as template when template field is absent', async () => {
      const ctx = createMockContext({
        resolvedConfig: { mode: 'template', color: 'blue', size: 'large' },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ color: 'blue', size: 'large' });
    });
  });

  describe('expression mode', () => {
    it('evaluates simple expression returning object', async () => {
      const ctx = createMockContext({
        inputs: { x: 5, y: 10 },
        resolvedConfig: {
          mode: 'expression',
          expression: '({ sum: inputs.x + inputs.y })',
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sum: 15 });
    });

    it('wraps non-object results in { value }', async () => {
      const ctx = createMockContext({
        inputs: { items: [1, 2, 3] },
        resolvedConfig: {
          mode: 'expression',
          expression: 'inputs.items.length',
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 3 });
    });

    it('wraps array results in { value }', async () => {
      const ctx = createMockContext({
        inputs: { items: [1, 2, 3] },
        resolvedConfig: {
          mode: 'expression',
          expression: 'inputs.items.filter(x => x > 1)',
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: [2, 3] });
    });

    it('has access to Math, Date, JSON utilities', async () => {
      const ctx = createMockContext({
        resolvedConfig: {
          mode: 'expression',
          expression: '({ pi: Math.PI, keys: Object.keys({a:1,b:2}) })',
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.pi).toBeCloseTo(3.14159, 4);
      expect(result.data.keys).toEqual(['a', 'b']);
    });

    it('can access node outputs', async () => {
      const ctx = createMockContext({
        nodeOutputs: { formTrigger: { data: { name: 'Alice' } } },
        resolvedConfig: {
          mode: 'expression',
          expression: '({ greeting: "Hello " + nodes.formTrigger.data.name })',
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ greeting: 'Hello Alice' });
    });

    it('can access variables and trigger', async () => {
      const ctx = createMockContext({
        variables: { env: 'production' },
        trigger: { type: 'webhook', payload: { source: 'github' } },
        resolvedConfig: {
          mode: 'expression',
          expression: '({ env: variables.env, src: trigger.payload.source })',
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ env: 'production', src: 'github' });
    });

    it('fails when expression is missing', async () => {
      const ctx = createMockContext({
        resolvedConfig: { mode: 'expression' },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expression is required');
    });

    it('fails on invalid expression', async () => {
      const ctx = createMockContext({
        resolvedConfig: { mode: 'expression', expression: '({' },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Transform failed');
    });
  });

  describe('mapping mode', () => {
    it('maps fields from inputs to output', async () => {
      const ctx = createMockContext({
        inputs: { firstName: 'John', lastName: 'Doe' },
        resolvedConfig: {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.firstName', target: 'name.first' },
            { source: 'inputs.lastName', target: 'name.last' },
          ],
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: { first: 'John', last: 'Doe' } });
    });

    it('applies transform expressions to mapped values', async () => {
      const ctx = createMockContext({
        inputs: { price: 100 },
        resolvedConfig: {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.price', target: 'total', transform: 'value * 1.1' },
          ],
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.total).toBeCloseTo(110);
    });

    it('handles missing source values gracefully', async () => {
      const ctx = createMockContext({
        inputs: {},
        resolvedConfig: {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.missing', target: 'out' },
          ],
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.out).toBeUndefined();
    });

    it('maps from node outputs', async () => {
      const ctx = createMockContext({
        nodeOutputs: { db: { rows: [{ id: 1 }] } },
        resolvedConfig: {
          mode: 'mapping',
          mappings: [
            { source: 'nodes.db.rows', target: 'results' },
          ],
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.results).toEqual([{ id: 1 }]);
    });

    it('returns empty object when mappings is empty', async () => {
      const ctx = createMockContext({
        resolvedConfig: { mode: 'mapping', mappings: [] },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('continues with untransformed value when transform expression fails', async () => {
      const ctx = createMockContext({
        inputs: { val: 'hello' },
        resolvedConfig: {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.val', target: 'out', transform: 'value.nonExistent()' },
          ],
        },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      // Falls back to untransformed value
      expect(result.data.out).toBe('hello');
    });
  });

  describe('invalid mode', () => {
    it('returns failure for unknown mode', async () => {
      const ctx = createMockContext({
        resolvedConfig: { mode: 'unknown' },
      });
      const result = await handler(ctx);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIG');
    });
  });

  describe('metadata', () => {
    it('includes durationMs in metadata', async () => {
      const ctx = createMockContext({
        resolvedConfig: { mode: 'template', template: { a: 1 } },
      });
      const result = await handler(ctx);
      expect(result.metadata?.durationMs).toBeDefined();
      expect(typeof result.metadata?.durationMs).toBe('number');
    });
  });
});
