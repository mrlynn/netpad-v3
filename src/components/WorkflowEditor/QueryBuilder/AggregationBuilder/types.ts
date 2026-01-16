/**
 * Types for MongoDB Aggregation Pipeline Builder
 */

export type AggregationStageType =
  | '$match'
  | '$project'
  | '$group'
  | '$sort'
  | '$limit'
  | '$skip'
  | '$lookup'
  | '$unwind'
  | '$count'
  | '$addFields'
  | '$custom';

export interface StageDefinition {
  type: AggregationStageType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const STAGE_DEFINITIONS: Record<AggregationStageType, StageDefinition> = {
  $match: {
    type: '$match',
    label: 'Match',
    description: 'Filter documents',
    icon: '🔍',
    color: '#4CAF50',
  },
  $project: {
    type: '$project',
    label: 'Project',
    description: 'Select/reshape fields',
    icon: '📋',
    color: '#2196F3',
  },
  $group: {
    type: '$group',
    label: 'Group',
    description: 'Group and aggregate',
    icon: '📊',
    color: '#9C27B0',
  },
  $sort: {
    type: '$sort',
    label: 'Sort',
    description: 'Order results',
    icon: '↕️',
    color: '#FF9800',
  },
  $limit: {
    type: '$limit',
    label: 'Limit',
    description: 'Limit results',
    icon: '🔢',
    color: '#607D8B',
  },
  $skip: {
    type: '$skip',
    label: 'Skip',
    description: 'Skip documents',
    icon: '⏭️',
    color: '#607D8B',
  },
  $lookup: {
    type: '$lookup',
    label: 'Lookup',
    description: 'Join collections',
    icon: '🔗',
    color: '#E91E63',
  },
  $unwind: {
    type: '$unwind',
    label: 'Unwind',
    description: 'Flatten arrays',
    icon: '📖',
    color: '#00BCD4',
  },
  $count: {
    type: '$count',
    label: 'Count',
    description: 'Count documents',
    icon: '#️⃣',
    color: '#795548',
  },
  $addFields: {
    type: '$addFields',
    label: 'Add Fields',
    description: 'Add computed fields',
    icon: '➕',
    color: '#8BC34A',
  },
  $custom: {
    type: '$custom',
    label: 'Custom',
    description: 'Raw JSON stage',
    icon: '📝',
    color: '#9E9E9E',
  },
};

export interface MatchStageConfig {
  filter: Record<string, unknown>;
}

export interface ProjectStageConfig {
  fields: Array<{
    id: string;
    field: string;
    value: string; // 1, 0, or expression
  }>;
}

export interface GroupStageConfig {
  _id: string;
  accumulators: Array<{
    id: string;
    outputField: string;
    operator: '$sum' | '$avg' | '$min' | '$max' | '$first' | '$last' | '$push' | '$count';
    expression: string;
  }>;
}

export interface SortStageConfig {
  fields: Array<{
    id: string;
    field: string;
    direction: 1 | -1;
  }>;
}

export interface LookupStageConfig {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
}

export interface UnwindStageConfig {
  path: string;
  preserveNullAndEmptyArrays: boolean;
}

export interface CountStageConfig {
  outputField: string;
}

export interface AddFieldsStageConfig {
  fields: Array<{
    id: string;
    field: string;
    expression: string;
  }>;
}

export interface CustomStageConfig {
  json: string;
}

export type StageConfig =
  | MatchStageConfig
  | ProjectStageConfig
  | GroupStageConfig
  | SortStageConfig
  | LookupStageConfig
  | UnwindStageConfig
  | CountStageConfig
  | AddFieldsStageConfig
  | CustomStageConfig;

export interface PipelineStage {
  id: string;
  type: AggregationStageType;
  enabled: boolean;
  collapsed: boolean;
  config: StageConfig;
}

export interface AggregationPipelineConfig {
  stages: PipelineStage[];
  rawJson?: string;
  mode: 'visual' | 'raw';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function createDefaultStageConfig(type: AggregationStageType): StageConfig {
  switch (type) {
    case '$match':
      return { filter: {} } as MatchStageConfig;
    case '$project':
      return { fields: [] } as ProjectStageConfig;
    case '$group':
      return { _id: '', accumulators: [] } as GroupStageConfig;
    case '$sort':
      return { fields: [] } as SortStageConfig;
    case '$limit':
      return { json: '10' } as CustomStageConfig;
    case '$skip':
      return { json: '0' } as CustomStageConfig;
    case '$lookup':
      return { from: '', localField: '', foreignField: '', as: '' } as LookupStageConfig;
    case '$unwind':
      return { path: '', preserveNullAndEmptyArrays: false } as UnwindStageConfig;
    case '$count':
      return { outputField: 'count' } as CountStageConfig;
    case '$addFields':
      return { fields: [] } as AddFieldsStageConfig;
    case '$custom':
      return { json: '{}' } as CustomStageConfig;
    default:
      return { json: '{}' } as CustomStageConfig;
  }
}

export function createEmptyStage(type: AggregationStageType): PipelineStage {
  return {
    id: generateId(),
    type,
    enabled: true,
    collapsed: false,
    config: createDefaultStageConfig(type),
  };
}

export function createDefaultPipelineConfig(): AggregationPipelineConfig {
  return {
    stages: [],
    mode: 'visual',
  };
}

/**
 * Convert pipeline config to MongoDB aggregation array
 */
export function pipelineToMongo(config: AggregationPipelineConfig): Record<string, unknown>[] {
  if (config.mode === 'raw' && config.rawJson) {
    try {
      return JSON.parse(config.rawJson);
    } catch {
      return [];
    }
  }

  return config.stages
    .filter(s => s.enabled)
    .map(s => stageToMongo(s))
    .filter(s => s !== null) as Record<string, unknown>[];
}

function stageToMongo(stage: PipelineStage): Record<string, unknown> | null {
  switch (stage.type) {
    case '$match':
      return { $match: (stage.config as MatchStageConfig).filter };

    case '$project': {
      const config = stage.config as ProjectStageConfig;
      if (config.fields.length === 0) return null;
      const projectObj: Record<string, unknown> = {};
      for (const f of config.fields) {
        if (f.field.trim()) {
          projectObj[f.field] = f.value === '0' ? 0 : f.value === '1' ? 1 : f.value;
        }
      }
      return { $project: projectObj };
    }

    case '$group': {
      const config = stage.config as GroupStageConfig;
      const groupObj: Record<string, unknown> = {
        _id: config._id.startsWith('$') ? config._id : config._id ? `$${config._id}` : null,
      };
      for (const acc of config.accumulators) {
        if (acc.outputField.trim()) {
          if (acc.operator === '$count') {
            groupObj[acc.outputField] = { $sum: 1 };
          } else {
            const expr = acc.expression.startsWith('$') ? acc.expression : `$${acc.expression}`;
            groupObj[acc.outputField] = { [acc.operator]: expr };
          }
        }
      }
      return { $group: groupObj };
    }

    case '$sort': {
      const config = stage.config as SortStageConfig;
      if (config.fields.length === 0) return null;
      const sortObj: Record<string, number> = {};
      for (const f of config.fields) {
        if (f.field.trim()) {
          sortObj[f.field] = f.direction;
        }
      }
      return { $sort: sortObj };
    }

    case '$limit': {
      const config = stage.config as CustomStageConfig;
      const value = parseInt(config.json, 10);
      return isNaN(value) ? null : { $limit: value };
    }

    case '$skip': {
      const config = stage.config as CustomStageConfig;
      const value = parseInt(config.json, 10);
      return isNaN(value) ? null : { $skip: value };
    }

    case '$lookup': {
      const config = stage.config as LookupStageConfig;
      if (!config.from || !config.as) return null;
      return {
        $lookup: {
          from: config.from,
          localField: config.localField,
          foreignField: config.foreignField,
          as: config.as,
        },
      };
    }

    case '$unwind': {
      const config = stage.config as UnwindStageConfig;
      if (!config.path) return null;
      const path = config.path.startsWith('$') ? config.path : `$${config.path}`;
      if (config.preserveNullAndEmptyArrays) {
        return { $unwind: { path, preserveNullAndEmptyArrays: true } };
      }
      return { $unwind: path };
    }

    case '$count': {
      const config = stage.config as CountStageConfig;
      return { $count: config.outputField || 'count' };
    }

    case '$addFields': {
      const config = stage.config as AddFieldsStageConfig;
      if (config.fields.length === 0) return null;
      const fieldsObj: Record<string, unknown> = {};
      for (const f of config.fields) {
        if (f.field.trim()) {
          fieldsObj[f.field] = f.expression;
        }
      }
      return { $addFields: fieldsObj };
    }

    case '$custom': {
      const config = stage.config as CustomStageConfig;
      try {
        return JSON.parse(config.json);
      } catch {
        return null;
      }
    }

    default:
      return null;
  }
}
