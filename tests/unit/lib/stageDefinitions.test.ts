import { stageDefinitions, getStageDefinition, getStagesByCategory } from '@/lib/stageDefinitions';

describe('stageDefinitions', () => {
  it('exports an array of stage definitions', () => {
    expect(Array.isArray(stageDefinitions)).toBe(true);
    expect(stageDefinitions.length).toBeGreaterThan(0);
  });

  it('each definition has required fields', () => {
    for (const def of stageDefinitions) {
      expect(def.type).toMatch(/^\$/);
      expect(typeof def.name).toBe('string');
      expect(typeof def.icon).toBe('string');
      expect(typeof def.color).toBe('string');
      expect(typeof def.category).toBe('string');
      expect(typeof def.description).toBe('string');
      expect(def.defaultConfig).toBeDefined();
    }
  });

  it('has no duplicate stage types', () => {
    const types = stageDefinitions.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });

  describe('getStageDefinition', () => {
    it('finds $match', () => {
      const def = getStageDefinition('$match');
      expect(def).toBeDefined();
      expect(def!.name).toBe('Match');
    });

    it('finds $group', () => {
      const def = getStageDefinition('$group');
      expect(def).toBeDefined();
      expect(def!.category).toBe('transform');
    });

    it('returns undefined for unknown stage', () => {
      expect(getStageDefinition('$fake')).toBeUndefined();
    });
  });

  describe('getStagesByCategory', () => {
    it('returns filter stages', () => {
      const filters = getStagesByCategory('filter');
      expect(filters.length).toBeGreaterThan(0);
      expect(filters.every((d) => d.category === 'filter')).toBe(true);
    });

    it('returns transform stages', () => {
      const transforms = getStagesByCategory('transform');
      expect(transforms.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown category', () => {
      expect(getStagesByCategory('nonexistent' as any)).toEqual([]);
    });
  });
});
