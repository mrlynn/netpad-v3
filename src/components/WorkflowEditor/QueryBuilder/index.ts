/**
 * MongoDB Query Builder exports
 */

// Main components
export { MongoQueryBuilder } from './MongoQueryBuilder';
export { QueryOptionsBuilder } from './OptionsBuilder/QueryOptionsBuilder';
export { AggregationBuilder } from './AggregationBuilder/AggregationBuilder';

// Sub-components
export { FilterBuilder } from './FilterBuilder/FilterBuilder';
export { FilterCondition } from './FilterBuilder/FilterCondition';
export { ValueInput } from './shared/ValueInput';
export { JsonPreview } from './shared/JsonPreview';
export { StageEditor } from './AggregationBuilder/StageEditor';
export { AIQueryInput } from './shared/AIQueryInput';

// Filter Types
export type {
  MongoFilterConfig,
  MongoFilterGroup,
  MongoFilterCondition,
  MongoFilterValue,
  MongoComparisonOperator,
  MongoLogicalOperator,
} from './shared/types';

export {
  createDefaultFilterConfig,
  createEmptyCondition,
  createEmptyFilterGroup,
  isFilterCondition,
  isFilterGroup,
} from './shared/types';

// Options Types
export type {
  MongoQueryOptions,
  SortField,
  ProjectionField,
} from './OptionsBuilder/types';

export {
  optionsToMongo,
  parseMongoOptions,
  createDefaultOptions,
} from './OptionsBuilder/types';

// Aggregation Types
export type {
  AggregationPipelineConfig,
  PipelineStage,
  AggregationStageType,
} from './AggregationBuilder/types';

export {
  pipelineToMongo,
  createDefaultPipelineConfig,
  createEmptyStage,
  STAGE_DEFINITIONS,
} from './AggregationBuilder/types';

// Utils
export {
  filterConfigToMongo,
  filterConfigToJsonString,
  parseMongoQueryToConfig,
} from './utils/queryGenerator';

// Operators
export { MONGO_OPERATORS, getOperatorOptions, getOperatorDef } from './FilterBuilder/operators';
