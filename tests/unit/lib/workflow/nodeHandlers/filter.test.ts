/**
 * Tests for Filter Node Handler
 */
import { handler } from '@/lib/workflow/nodeHandlers/filter';
import { createMockContext } from './helpers';

describe('Filter Node Handler', () => {
  const users = [
    { name: 'Alice', age: 30, active: true, role: 'admin' },
    { name: 'Bob', age: 25, active: false, role: 'user' },
    { name: 'Charlie', age: 35, active: true, role: 'user' },
    { name: 'Diana', age: 28, active: true, role: 'admin' },
  ];

  function makeCtx(config: Record<string, unknown>, inputs: Record<string, unknown> = {}) {
    return createMockContext({ resolvedConfig: config, inputs });
  }

  describe('basic filtering', () => {
    it('filters by equals condition', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'role', operator: 'equals', value: 'admin' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.success).toBe(true);
      expect(result.data.filtered).toHaveLength(2);
      expect((result.data.filtered as any[]).map(u => u.name)).toEqual(['Alice', 'Diana']);
      expect(result.data.removed).toHaveLength(2);
    });

    it('filters by not_equals', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'role', operator: 'not_equals', value: 'admin' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
      expect((result.data.filtered as any[]).map(u => u.name)).toEqual(['Bob', 'Charlie']);
    });

    it('filters by gt (greater than)', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'age', operator: 'gt', value: 28 }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
      expect((result.data.filtered as any[]).map(u => u.name)).toEqual(['Alice', 'Charlie']);
    });

    it('filters by gte', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'age', operator: 'gte', value: 28 }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(3);
    });

    it('filters by lt', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'age', operator: 'lt', value: 28 }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(1);
      expect((result.data.filtered as any[])[0].name).toBe('Bob');
    });

    it('filters by lte', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'age', operator: 'lte', value: 28 }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
    });
  });

  describe('string operators', () => {
    it('filters by contains (case-insensitive)', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'name', operator: 'contains', value: 'li' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
      expect((result.data.filtered as any[]).map(u => u.name)).toEqual(['Alice', 'Charlie']);
    });

    it('filters by not_contains', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'name', operator: 'not_contains', value: 'li' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
    });

    it('filters by starts_with', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'name', operator: 'starts_with', value: 'al' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(1);
      expect((result.data.filtered as any[])[0].name).toBe('Alice');
    });

    it('filters by ends_with', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'name', operator: 'ends_with', value: 'na' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(1);
      expect((result.data.filtered as any[])[0].name).toBe('Diana');
    });

    it('filters by regex', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'name', operator: 'regex', value: '^[A-C]' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(3);
    });
  });

  describe('boolean/existence operators', () => {
    it('filters by is_true', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'active', operator: 'is_true' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(3);
    });

    it('filters by is_false', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'active', operator: 'is_false' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(1);
    });

    it('filters by is_empty', async () => {
      const items = [{ val: '' }, { val: 'x' }, { val: null }, { val: undefined }];
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'val', operator: 'is_empty' }] },
        { items }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(3);
    });

    it('filters by is_not_empty', async () => {
      const items = [{ val: '' }, { val: 'x' }, { val: null }];
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'val', operator: 'is_not_empty' }] },
        { items }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(1);
    });

    it('filters by exists', async () => {
      const items = [{ a: 1 }, { b: 2 }, { a: undefined }];
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'a', operator: 'exists' }] },
        { items }
      );
      const result = await handler(ctx);
      // { a: undefined } → getNestedValue returns undefined → exists = false
      expect(result.data.filtered).toHaveLength(1);
    });

    it('filters by not_exists', async () => {
      const items = [{ a: 1 }, { b: 2 }];
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'a', operator: 'not_exists' }] },
        { items }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(1);
    });
  });

  describe('combining conditions', () => {
    it('combines with AND (default)', async () => {
      const ctx = makeCtx(
        {
          inputField: 'items',
          conditions: [
            { field: 'active', operator: 'is_true' },
            { field: 'role', operator: 'equals', value: 'admin' },
          ],
        },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
      expect((result.data.filtered as any[]).map(u => u.name)).toEqual(['Alice', 'Diana']);
    });

    it('combines with OR', async () => {
      const ctx = makeCtx(
        {
          inputField: 'items',
          combineWith: 'or',
          conditions: [
            { field: 'name', operator: 'equals', value: 'Bob' },
            { field: 'name', operator: 'equals', value: 'Diana' },
          ],
        },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(2);
    });
  });

  describe('output shape', () => {
    it('includes counts with passRate', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'active', operator: 'is_true' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.counts).toEqual({
        total: 4,
        passed: 3,
        removed: 1,
        passRate: 75,
      });
    });

    it('includes first, last, and isEmpty', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'role', operator: 'equals', value: 'admin' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect((result.data.first as any).name).toBe('Alice');
      expect((result.data.last as any).name).toBe('Diana');
      expect(result.data.isEmpty).toBe(false);
    });

    it('handles empty result set', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [{ field: 'role', operator: 'equals', value: 'nonexistent' }] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(0);
      expect(result.data.isEmpty).toBe(true);
      expect(result.data.first).toBeNull();
      expect(result.data.last).toBeNull();
    });

    it('uses custom outputField name', async () => {
      const ctx = makeCtx(
        { inputField: 'items', outputField: 'matches', conditions: [] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.matches).toEqual(users);
      expect(result.data.filtered).toEqual(users); // always includes 'filtered' too
    });
  });

  describe('edge cases', () => {
    it('fails when input is not an array', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [] },
        { items: 'not-an-array' }
      );
      const result = await handler(ctx);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIG');
    });

    it('passes all items when no conditions', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [] },
        { items: users }
      );
      const result = await handler(ctx);
      expect(result.data.filtered).toHaveLength(4);
    });

    it('handles passRate 0 for empty input', async () => {
      const ctx = makeCtx(
        { inputField: 'items', conditions: [] },
        { items: [] }
      );
      const result = await handler(ctx);
      expect((result.data.counts as any).passRate).toBe(0);
    });
  });
});
