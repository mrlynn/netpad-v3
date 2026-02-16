/**
 * Tests for src/lib/pipelineSerializer.ts
 * 
 * Pipeline node ordering and serialization
 */

import { serializePipeline, serializeFromState, SerializedStage } from '@/lib/pipelineSerializer';

// Helper to create a stage node
function makeNode(id: string, stageType: string, config: Record<string, any> = {}, x = 0, y = 0) {
  return {
    id,
    type: 'stage' as const,
    position: { x, y },
    data: { stageType, config, label: stageType },
  };
}

function makeEdge(source: string, target: string) {
  return { id: `${source}-${target}`, source, target };
}

// ============================================
// serializePipeline - basic serialization
// ============================================
describe('serializePipeline', () => {
  it('serializes empty pipeline', () => {
    expect(serializePipeline([], [])).toEqual([]);
  });

  it('serializes single node', () => {
    const nodes = [makeNode('1', '$match', { status: 'active' })];
    const result = serializePipeline(nodes, []);
    expect(result).toEqual([{ $match: { status: 'active' } }]);
  });

  it('serializes multiple nodes in edge order', () => {
    const nodes = [
      makeNode('2', '$limit', { limit: 10 }, 200),
      makeNode('1', '$match', { status: 'active' }, 0),
    ];
    const edges = [makeEdge('1', '2')];
    const result = serializePipeline(nodes, edges);
    expect(result).toEqual([
      { $match: { status: 'active' } },
      { $limit: 10 },
    ]);
  });

  it('handles linear chain of 3 nodes', () => {
    const nodes = [
      makeNode('3', '$limit', { limit: 5 }, 400),
      makeNode('1', '$match', {}, 0),
      makeNode('2', '$sort', { name: 1 }, 200),
    ];
    const edges = [makeEdge('1', '2'), makeEdge('2', '3')];
    const result = serializePipeline(nodes, edges);
    expect(result).toEqual([
      { $match: {} },
      { $sort: { name: 1 } },
      { $limit: 5 },
    ]);
  });

  it('falls back to x-position ordering when no start node found (cycle)', () => {
    const nodes = [
      makeNode('b', '$sort', {}, 200),
      makeNode('a', '$match', {}, 0),
    ];
    // Circular edges — both have incoming
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')];
    const result = serializePipeline(nodes, edges);
    // Should fall back to x-position sort
    expect(result[0]).toHaveProperty('$match');
    expect(result[1]).toHaveProperty('$sort');
  });

  it('orders disconnected nodes by x-position', () => {
    const nodes = [
      makeNode('b', '$limit', { limit: 5 }, 300),
      makeNode('a', '$match', {}, 100),
    ];
    const result = serializePipeline(nodes, []);
    expect(result[0]).toHaveProperty('$match');
    expect(result[1]).toHaveProperty('$limit');
  });
});

// ============================================
// configToStageArg special cases
// ============================================
describe('configToStageArg via serializePipeline', () => {
  it('$count uses count field as string arg', () => {
    const nodes = [makeNode('1', '$count', { count: 'total' })];
    expect(serializePipeline(nodes, [])).toEqual([{ $count: 'total' }]);
  });

  it('$count defaults to "count" when empty', () => {
    const nodes = [makeNode('1', '$count', {})];
    expect(serializePipeline(nodes, [])).toEqual([{ $count: 'count' }]);
  });

  it('$limit converts string to number', () => {
    const nodes = [makeNode('1', '$limit', { limit: '25' })];
    expect(serializePipeline(nodes, [])).toEqual([{ $limit: 25 }]);
  });

  it('$limit defaults to 0 for missing value', () => {
    const nodes = [makeNode('1', '$limit', {})];
    expect(serializePipeline(nodes, [])).toEqual([{ $limit: 0 }]);
  });

  it('$skip converts string to number', () => {
    const nodes = [makeNode('1', '$skip', { skip: '10' })];
    expect(serializePipeline(nodes, [])).toEqual([{ $skip: 10 }]);
  });

  it('$unwind prepends $ to path if missing', () => {
    const nodes = [makeNode('1', '$unwind', { path: 'tags' })];
    const result = serializePipeline(nodes, []);
    expect(result[0].$unwind.path).toBe('$tags');
  });

  it('$unwind does not double-prepend $', () => {
    const nodes = [makeNode('1', '$unwind', { path: '$tags' })];
    const result = serializePipeline(nodes, []);
    expect(result[0].$unwind.path).toBe('$tags');
  });

  it('$project defaults to {_id: 1} when empty', () => {
    const nodes = [makeNode('1', '$project', {})];
    expect(serializePipeline(nodes, [])).toEqual([{ $project: { _id: 1 } }]);
  });

  it('$project passes through non-empty config', () => {
    const nodes = [makeNode('1', '$project', { name: 1, email: 1 })];
    expect(serializePipeline(nodes, [])).toEqual([{ $project: { name: 1, email: 1 } }]);
  });

  it('default stages pass config through', () => {
    const nodes = [makeNode('1', '$match', { age: { $gt: 21 } })];
    expect(serializePipeline(nodes, [])).toEqual([{ $match: { age: { $gt: 21 } } }]);
  });
});

// ============================================
// serializeFromState
// ============================================
describe('serializeFromState', () => {
  it('serializes from PipelineState object', () => {
    const state = {
      nodes: [makeNode('1', '$match', { x: 1 })],
      edges: [],
    };
    expect(serializeFromState(state as any)).toEqual([{ $match: { x: 1 } }]);
  });

  it('handles empty state', () => {
    expect(serializeFromState({ nodes: [], edges: [] } as any)).toEqual([]);
  });
});
