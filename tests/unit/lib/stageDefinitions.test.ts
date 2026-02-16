/**
 * Tests for src/lib/stageDefinitions.ts
 * 
 * Pipeline stage definitions and lookup functions
 */

import {
  stageDefinitions,
  getStageDefinition,
  getStagesByCategory,
} from '@/lib/stageDefinitions';

describe('stageDefinitions', () => {
  it('contains all expected stages', () => {
    const types = stageDefinitions.map(d => d.type);
    expect(types).toContain('$match');
    expect(types).toContain('$group');
    expect(types).toContain('$project');
    expect(types).toContain('$sort');
    expect(types).toContain('$limit');
    expect(types).toContain('$skip');
    expect(types).toContain('$unwind');
    expect(types).toContain('$lookup');
    expect(types).toContain('$addFields');
    expect(types).toContain('$count');
  });

  it('has 10 stage definitions', () => {
    expect(stageDefinitions).toHaveLength(10);
  });

  it('each stage has required fields', () => {
    stageDefinitions.forEach(def => {
      expect(def.type).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.icon).toBeTruthy();
      expect(def.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(def.category).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.defaultConfig).toBeDefined();
    });
  });

  it('categories are valid', () => {
    const validCategories = ['filter', 'transform', 'shape', 'join'];
    stageDefinitions.forEach(def => {
      expect(validCategories).toContain(def.category);
    });
  });
});

describe('getStageDefinition', () => {
  it('finds existing stage by type', () => {
    const match = getStageDefinition('$match');
    expect(match).toBeDefined();
    expect(match!.name).toBe('Match');
    expect(match!.category).toBe('filter');
  });

  it('returns undefined for unknown stage', () => {
    expect(getStageDefinition('$unknown')).toBeUndefined();
  });

  it('returns correct defaults for $group', () => {
    const group = getStageDefinition('$group');
    expect(group!.defaultConfig).toEqual({ _id: null });
  });

  it('returns correct defaults for $limit', () => {
    const limit = getStageDefinition('$limit');
    expect(limit!.defaultConfig).toEqual({ limit: 10 });
  });

  it('returns correct defaults for $count', () => {
    const count = getStageDefinition('$count');
    expect(count!.defaultConfig).toEqual({ count: 'total' });
  });
});

describe('getStagesByCategory', () => {
  it('returns filter stages', () => {
    const filters = getStagesByCategory('filter');
    expect(filters.length).toBeGreaterThan(0);
    expect(filters.every(d => d.category === 'filter')).toBe(true);
    expect(filters.map(d => d.type)).toContain('$match');
  });

  it('returns transform stages', () => {
    const transforms = getStagesByCategory('transform');
    expect(transforms.length).toBeGreaterThan(0);
    expect(transforms.map(d => d.type)).toContain('$group');
    expect(transforms.map(d => d.type)).toContain('$unwind');
    expect(transforms.map(d => d.type)).toContain('$addFields');
  });

  it('returns shape stages', () => {
    const shapes = getStagesByCategory('shape');
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.map(d => d.type)).toContain('$project');
    expect(shapes.map(d => d.type)).toContain('$sort');
    expect(shapes.map(d => d.type)).toContain('$limit');
  });

  it('returns join stages', () => {
    const joins = getStagesByCategory('join');
    expect(joins).toHaveLength(1);
    expect(joins[0].type).toBe('$lookup');
  });

  it('returns empty array for unknown category', () => {
    expect(getStagesByCategory('nonexistent' as any)).toEqual([]);
  });
});
