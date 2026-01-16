/**
 * Types for MongoDB query options builder
 */

export interface SortField {
  id: string;
  field: string;
  direction: 1 | -1;
}

export interface ProjectionField {
  id: string;
  field: string;
  include: boolean;
}

export interface MongoQueryOptions {
  sort?: SortField[];
  limit?: number;
  skip?: number;
  projection?: {
    mode: 'include' | 'exclude';
    fields: ProjectionField[];
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function createEmptySortField(): SortField {
  return {
    id: generateId(),
    field: '',
    direction: -1,
  };
}

export function createEmptyProjectionField(): ProjectionField {
  return {
    id: generateId(),
    field: '',
    include: true,
  };
}

export function createDefaultOptions(): MongoQueryOptions {
  return {
    sort: [],
    limit: undefined,
    skip: undefined,
    projection: undefined,
  };
}

/**
 * Convert options config to MongoDB options object
 */
export function optionsToMongo(options: MongoQueryOptions): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Sort
  if (options.sort && options.sort.length > 0) {
    const sortObj: Record<string, number> = {};
    for (const s of options.sort) {
      if (s.field.trim()) {
        sortObj[s.field] = s.direction;
      }
    }
    if (Object.keys(sortObj).length > 0) {
      result.sort = sortObj;
    }
  }

  // Limit
  if (options.limit !== undefined && options.limit > 0) {
    result.limit = options.limit;
  }

  // Skip
  if (options.skip !== undefined && options.skip > 0) {
    result.skip = options.skip;
  }

  // Projection
  if (options.projection && options.projection.fields.length > 0) {
    const projObj: Record<string, number> = {};
    const includeValue = options.projection.mode === 'include' ? 1 : 0;
    for (const f of options.projection.fields) {
      if (f.field.trim()) {
        projObj[f.field] = includeValue;
      }
    }
    if (Object.keys(projObj).length > 0) {
      result.projection = projObj;
    }
  }

  return result;
}

/**
 * Parse MongoDB options object to our config format
 */
export function parseMongoOptions(mongoOptions: Record<string, unknown>): MongoQueryOptions {
  const options: MongoQueryOptions = createDefaultOptions();

  // Parse sort
  if (mongoOptions.sort && typeof mongoOptions.sort === 'object') {
    const sortObj = mongoOptions.sort as Record<string, number>;
    options.sort = Object.entries(sortObj).map(([field, direction]) => ({
      id: generateId(),
      field,
      direction: direction === 1 ? 1 : -1,
    }));
  }

  // Parse limit
  if (typeof mongoOptions.limit === 'number') {
    options.limit = mongoOptions.limit;
  }

  // Parse skip
  if (typeof mongoOptions.skip === 'number') {
    options.skip = mongoOptions.skip;
  }

  // Parse projection
  if (mongoOptions.projection && typeof mongoOptions.projection === 'object') {
    const projObj = mongoOptions.projection as Record<string, number>;
    const entries = Object.entries(projObj);
    if (entries.length > 0) {
      const firstValue = entries[0][1];
      options.projection = {
        mode: firstValue === 1 ? 'include' : 'exclude',
        fields: entries.map(([field]) => ({
          id: generateId(),
          field,
          include: true,
        })),
      };
    }
  }

  return options;
}
