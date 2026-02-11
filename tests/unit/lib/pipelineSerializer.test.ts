import { serializePipeline, serializeFromState, SerializedStage } from '@/lib/pipelineSerializer';

// Minimal types matching what the module expects
const makeNode = (id: string, stageType: string, config: Record<string, any> = {}, x = 0) => ({
  id,
  type: 'stage' as const,
  position: { x, y: 0 },
  data: { stageType, config, label: stageType } as any,
});

const makeEdge = (source: string, target: string) => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe('pipelineSerializer', () => {
  describe('serializePipeline', () => {
    it('returns empty array for no nodes', () => {
      expect(serializePipeline([], [])).toEqual([]);
    });

    it('serializes a single node', () => {
      const nodes = [makeNode('1', '$match', { status: 'active' })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $match: { status: 'active' } }]);
    });

    it('orders nodes by edges (topological sort)', () => {
      const nodes = [
        makeNode('b', '$limit', { limit: 10 }, 200),
        makeNode('a', '$match', { x: 1 }, 0),
      ];
      const edges = [makeEdge('a', 'b')];
      const result = serializePipeline(nodes as any, edges as any);
      expect(result).toEqual([
        { $match: { x: 1 } },
        { $limit: 10 },
      ]);
    });

    it('falls back to x-position sort when no start node', () => {
      // Create a cycle so no node has 0 incoming
      const nodes = [
        makeNode('b', '$limit', { limit: 5 }, 200),
        makeNode('a', '$match', { y: 1 }, 0),
      ];
      const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')];
      const result = serializePipeline(nodes as any, edges as any);
      // Should sort by x position: a (x=0) before b (x=200)
      expect(result[0]).toEqual({ $match: { y: 1 } });
      expect(result[1]).toEqual({ $limit: 5 });
    });

    it('handles $count stage', () => {
      const nodes = [makeNode('1', '$count', { count: 'total' })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $count: 'total' }]);
    });

    it('handles $count with default', () => {
      const nodes = [makeNode('1', '$count', {})];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $count: 'count' }]);
    });

    it('handles $limit as number', () => {
      const nodes = [makeNode('1', '$limit', { limit: 25 })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $limit: 25 }]);
    });

    it('handles $limit as string (coerces to number)', () => {
      const nodes = [makeNode('1', '$limit', { limit: '25' })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $limit: 25 }]);
    });

    it('handles $skip', () => {
      const nodes = [makeNode('1', '$skip', { skip: 10 })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $skip: 10 }]);
    });

    it('handles $unwind and auto-prepends $', () => {
      const nodes = [makeNode('1', '$unwind', { path: 'tags' })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $unwind: { path: '$tags' } }]);
    });

    it('does not double-prepend $ on $unwind', () => {
      const nodes = [makeNode('1', '$unwind', { path: '$tags' })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $unwind: { path: '$tags' } }]);
    });

    it('handles $project with empty config (defaults to _id: 1)', () => {
      const nodes = [makeNode('1', '$project', {})];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $project: { _id: 1 } }]);
    });

    it('handles $project with fields', () => {
      const nodes = [makeNode('1', '$project', { name: 1, email: 1 })];
      const result = serializePipeline(nodes as any, []);
      expect(result).toEqual([{ $project: { name: 1, email: 1 } }]);
    });

    it('serializes a multi-stage pipeline in edge order', () => {
      const nodes = [
        makeNode('c', '$limit', { limit: 10 }, 300),
        makeNode('a', '$match', { active: true }, 0),
        makeNode('b', '$sort', { createdAt: -1 }, 150),
      ];
      const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
      const result = serializePipeline(nodes as any, edges as any);
      expect(result).toEqual([
        { $match: { active: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
      ]);
    });

    it('includes disconnected nodes at the end', () => {
      const nodes = [
        makeNode('a', '$match', { x: 1 }, 0),
        makeNode('b', '$limit', { limit: 5 }, 100),
        makeNode('orphan', '$count', { count: 'n' }, 500),
      ];
      const edges = [makeEdge('a', 'b')];
      const result = serializePipeline(nodes as any, edges as any);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ $match: { x: 1 } });
      expect(result[1]).toEqual({ $limit: 5 });
      expect(result[2]).toEqual({ $count: 'n' });
    });
  });

  describe('serializeFromState', () => {
    it('delegates to serializePipeline', () => {
      const state = {
        nodes: [makeNode('1', '$match', { a: 1 })],
        edges: [],
      };
      const result = serializeFromState(state as any);
      expect(result).toEqual([{ $match: { a: 1 } }]);
    });
  });
});
