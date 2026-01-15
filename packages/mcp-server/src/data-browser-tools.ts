/**
 * Data Browser & Connection Tools for NetPad MCP Server
 *
 * Phase 7 of MCP Server 2.0 update - Data Browser & Connection
 * Provides tools for MongoDB connection configuration and data exploration.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConnectionConfig {
  name: string;
  type: 'atlas' | 'self-hosted' | 'atlas-data-api';
  description?: string;
  settings?: {
    useSSL?: boolean;
    retryWrites?: boolean;
    maxPoolSize?: number;
    connectTimeoutMS?: number;
  };
}

export interface DataBrowserQueryOptions {
  connectionId?: string;
  database: string;
  collection: string;
  operation: 'find' | 'aggregate' | 'distinct' | 'count' | 'findOne';
  description: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  sort?: Record<string, number>;
  limit?: number;
  skip?: number;
}

export interface AggregationPipelineOptions {
  database: string;
  collection: string;
  description: string;
  stages?: string[];
}

export interface IndexRecommendation {
  collection: string;
  fields: string[];
  type: 'single' | 'compound' | 'text' | 'geospatial';
  reason: string;
}

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export const CONNECTION_TYPES = {
  atlas: {
    id: 'atlas',
    name: 'MongoDB Atlas',
    description: 'Cloud-hosted MongoDB Atlas cluster',
    requiresConnectionString: true,
    supportedFeatures: ['atlas-search', 'vector-search', 'charts', 'triggers'],
    setupInstructions: [
      '1. Go to MongoDB Atlas and create or select a cluster',
      '2. Click "Connect" and choose "Connect your application"',
      '3. Copy the connection string',
      '4. Replace <password> with your database user password',
      '5. Add the connection string to NetPad Connection Vault',
    ],
  },
  'self-hosted': {
    id: 'self-hosted',
    name: 'Self-Hosted MongoDB',
    description: 'Self-managed MongoDB deployment',
    requiresConnectionString: true,
    supportedFeatures: ['basic-crud', 'aggregation', 'indexes'],
    setupInstructions: [
      '1. Ensure your MongoDB instance is accessible from NetPad',
      '2. Construct your connection string: mongodb://[user:password@]host:port/database',
      '3. Configure network access (whitelist NetPad IP addresses)',
      '4. Add the connection string to NetPad Connection Vault',
    ],
  },
  'atlas-data-api': {
    id: 'atlas-data-api',
    name: 'Atlas Data API',
    description: 'HTTP-based data access via Atlas Data API',
    requiresConnectionString: false,
    supportedFeatures: ['rest-api', 'serverless', 'edge-functions'],
    setupInstructions: [
      '1. Enable Data API in your Atlas cluster settings',
      '2. Generate an API key for authentication',
      '3. Note your App ID and API endpoint',
      '4. Configure the Data API connection in NetPad',
    ],
  },
};

// ============================================================================
// QUERY TEMPLATES
// ============================================================================

export const QUERY_TEMPLATES = {
  // Find Operations
  'find-all': {
    name: 'Find All Documents',
    operation: 'find',
    template: { filter: {}, projection: {}, sort: { _id: -1 }, limit: 100 },
  },
  'find-by-field': {
    name: 'Find by Field Value',
    operation: 'find',
    template: { filter: { fieldName: 'value' }, projection: {} },
  },
  'find-with-date-range': {
    name: 'Find with Date Range',
    operation: 'find',
    template: {
      filter: {
        createdAt: {
          $gte: { $date: 'START_DATE' },
          $lte: { $date: 'END_DATE' },
        },
      },
    },
  },
  'find-with-text-search': {
    name: 'Full-Text Search',
    operation: 'find',
    template: { filter: { $text: { $search: 'search terms' } } },
  },

  // Aggregation Operations
  'aggregate-group-count': {
    name: 'Group and Count',
    operation: 'aggregate',
    template: [
      { $group: { _id: '$fieldName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ],
  },
  'aggregate-sum-by-group': {
    name: 'Sum by Group',
    operation: 'aggregate',
    template: [
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ],
  },
  'aggregate-avg-by-group': {
    name: 'Average by Group',
    operation: 'aggregate',
    template: [
      { $group: { _id: '$category', average: { $avg: '$value' } } },
      { $sort: { average: -1 } },
    ],
  },
  'aggregate-date-histogram': {
    name: 'Date Histogram',
    operation: 'aggregate',
    template: [
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ],
  },
  'aggregate-lookup-join': {
    name: 'Lookup (Join)',
    operation: 'aggregate',
    template: [
      {
        $lookup: {
          from: 'otherCollection',
          localField: 'foreignId',
          foreignField: '_id',
          as: 'relatedDocs',
        },
      },
    ],
  },
  'aggregate-unwind-array': {
    name: 'Unwind Array',
    operation: 'aggregate',
    template: [
      { $unwind: '$arrayField' },
      { $group: { _id: '$arrayField', count: { $sum: 1 } } },
    ],
  },

  // Other Operations
  'distinct-values': {
    name: 'Get Distinct Values',
    operation: 'distinct',
    template: { field: 'fieldName' },
  },
  'count-documents': {
    name: 'Count Documents',
    operation: 'count',
    template: { filter: {} },
  },
};

// ============================================================================
// CODE GENERATORS
// ============================================================================

/**
 * Generate MongoDB connection configuration code
 */
export function generateConnectionConfigCode(config: ConnectionConfig): string {
  const connectionType = CONNECTION_TYPES[config.type];

  return `// MongoDB Connection Configuration
// Type: ${connectionType.name}
// ${connectionType.description}

// Connection configuration for NetPad Connection Vault
const connectionConfig = {
  name: '${config.name}',
  type: '${config.type}',
  ${config.description ? `description: '${config.description}',` : ''}
  settings: ${JSON.stringify(config.settings || {
    useSSL: true,
    retryWrites: true,
    maxPoolSize: 10,
    connectTimeoutMS: 10000,
  }, null, 4)},
};

// Add to Connection Vault via API
const response = await fetch('/api/connections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    ...connectionConfig,
    // Connection string should be added securely via the UI
    // or environment variable
    connectionString: process.env.MONGODB_URI,
  }),
});

const { connection } = await response.json();
console.log('Created connection:', connection.connectionId);

/*
Setup Instructions for ${connectionType.name}:
${connectionType.setupInstructions.map(s => s).join('\n')}

Supported Features: ${connectionType.supportedFeatures.join(', ')}
*/
`;
}

/**
 * Generate data browser query code
 */
export function generateDataBrowserQueryCode(options: DataBrowserQueryOptions): string {
  const { database, collection, operation, description, filter, projection, sort, limit, skip } = options;

  let queryCode = '';

  switch (operation) {
    case 'find':
      queryCode = `// Query: ${description}
// Operation: find

const query = {
  database: '${database}',
  collection: '${collection}',
  operation: 'find',
  filter: ${JSON.stringify(filter || {}, null, 2)},
  ${projection ? `projection: ${JSON.stringify(projection, null, 2)},` : ''}
  ${sort ? `sort: ${JSON.stringify(sort, null, 2)},` : ''}
  ${limit ? `limit: ${limit},` : ''}
  ${skip ? `skip: ${skip},` : ''}
};

// Execute via NetPad API
const response = await fetch('/api/mongodb/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(query),
});

const { documents, total } = await response.json();
console.log(\`Found \${total} documents\`);
`;
      break;

    case 'findOne':
      queryCode = `// Query: ${description}
// Operation: findOne

const query = {
  database: '${database}',
  collection: '${collection}',
  operation: 'findOne',
  filter: ${JSON.stringify(filter || {}, null, 2)},
  ${projection ? `projection: ${JSON.stringify(projection, null, 2)},` : ''}
};

const response = await fetch('/api/mongodb/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(query),
});

const { document } = await response.json();
console.log('Found document:', document);
`;
      break;

    case 'aggregate':
      queryCode = `// Query: ${description}
// Operation: aggregate

const pipeline = ${JSON.stringify(filter || [], null, 2)};

const query = {
  database: '${database}',
  collection: '${collection}',
  operation: 'aggregate',
  pipeline,
};

const response = await fetch('/api/mongodb/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(query),
});

const { results } = await response.json();
console.log('Aggregation results:', results);
`;
      break;

    case 'distinct':
      queryCode = `// Query: ${description}
// Operation: distinct

const query = {
  database: '${database}',
  collection: '${collection}',
  operation: 'distinct',
  field: '${(filter as any)?.field || 'fieldName'}',
  ${filter && (filter as any).query ? `query: ${JSON.stringify((filter as any).query, null, 2)},` : ''}
};

const response = await fetch('/api/mongodb/distinct-values', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(query),
});

const { values } = await response.json();
console.log('Distinct values:', values);
`;
      break;

    case 'count':
      queryCode = `// Query: ${description}
// Operation: count

const query = {
  database: '${database}',
  collection: '${collection}',
  operation: 'count',
  filter: ${JSON.stringify(filter || {}, null, 2)},
};

const response = await fetch('/api/mongodb/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(query),
});

const { count } = await response.json();
console.log('Document count:', count);
`;
      break;
  }

  return queryCode;
}

/**
 * Generate aggregation pipeline code
 */
export function generateAggregationPipelineCode(options: AggregationPipelineOptions): string {
  const { database, collection, description, stages } = options;

  return `// Aggregation Pipeline: ${description}
// Database: ${database}
// Collection: ${collection}

const pipeline = [
${stages?.map(stage => `  ${stage},`).join('\n') || '  // Add pipeline stages here'}
];

// Execute via NetPad API
const response = await fetch('/api/mongodb/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    database: '${database}',
    collection: '${collection}',
    operation: 'aggregate',
    pipeline,
  }),
});

const { results } = await response.json();
console.log('Results:', results);

/*
Common Aggregation Stages:
- $match: Filter documents
- $group: Group by field and accumulate
- $project: Reshape documents
- $sort: Order results
- $limit: Limit result count
- $skip: Skip documents
- $unwind: Deconstruct arrays
- $lookup: Join with other collection
- $facet: Multi-faceted aggregation
- $bucket: Categorize into buckets
*/
`;
}

/**
 * Generate index recommendation
 */
export function generateIndexRecommendation(
  collection: string,
  queryPatterns: string[]
): IndexRecommendation[] {
  const recommendations: IndexRecommendation[] = [];

  // Analyze query patterns and suggest indexes
  for (const pattern of queryPatterns) {
    const lowerPattern = pattern.toLowerCase();

    if (lowerPattern.includes('find by') || lowerPattern.includes('filter by')) {
      const fieldMatch = pattern.match(/by\s+(\w+)/i);
      if (fieldMatch) {
        recommendations.push({
          collection,
          fields: [fieldMatch[1]],
          type: 'single',
          reason: `Supports efficient filtering by ${fieldMatch[1]}`,
        });
      }
    }

    if (lowerPattern.includes('sort by')) {
      const fieldMatch = pattern.match(/sort\s+by\s+(\w+)/i);
      if (fieldMatch) {
        recommendations.push({
          collection,
          fields: [fieldMatch[1]],
          type: 'single',
          reason: `Supports efficient sorting by ${fieldMatch[1]}`,
        });
      }
    }

    if (lowerPattern.includes('text search') || lowerPattern.includes('full-text')) {
      recommendations.push({
        collection,
        fields: ['$**'],
        type: 'text',
        reason: 'Supports full-text search across all string fields',
      });
    }

    if (lowerPattern.includes('date range') || lowerPattern.includes('created')) {
      recommendations.push({
        collection,
        fields: ['createdAt'],
        type: 'single',
        reason: 'Supports efficient date range queries',
      });
    }
  }

  return recommendations;
}

/**
 * Generate schema analysis code
 */
export function generateSchemaAnalysisCode(database: string, collection: string): string {
  return `// Schema Analysis for ${database}.${collection}
// Uses $sample and aggregation to infer schema

const sampleSize = 100;

// Get sample documents
const sampleResponse = await fetch('/api/mongodb/sample-documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    database: '${database}',
    collection: '${collection}',
    sampleSize,
  }),
});

const { documents } = await sampleResponse.json();

// Analyze schema from samples
function analyzeSchema(docs: any[]) {
  const schema: Record<string, { types: Set<string>; count: number; sample: any }> = {};

  for (const doc of docs) {
    analyzeObject(doc, '', schema);
  }

  return Object.entries(schema).map(([path, info]) => ({
    path,
    types: Array.from(info.types),
    frequency: (info.count / docs.length * 100).toFixed(1) + '%',
    sample: info.sample,
  }));
}

function analyzeObject(obj: any, prefix: string, schema: Record<string, any>) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? \`\${prefix}.\${key}\` : key;
    const type = Array.isArray(value) ? 'array' : typeof value;

    if (!schema[path]) {
      schema[path] = { types: new Set(), count: 0, sample: value };
    }
    schema[path].types.add(type);
    schema[path].count++;

    if (type === 'object' && value !== null) {
      analyzeObject(value, path, schema);
    }
  }
}

const schemaAnalysis = analyzeSchema(documents);
console.log('Schema Analysis:');
console.table(schemaAnalysis);
`;
}

/**
 * Generate data export code
 */
export function generateDataExportCode(
  database: string,
  collection: string,
  format: 'json' | 'csv' | 'xlsx',
  filter?: Record<string, unknown>
): string {
  return `// Export Data from ${database}.${collection}
// Format: ${format.toUpperCase()}

const exportConfig = {
  database: '${database}',
  collection: '${collection}',
  format: '${format}',
  filter: ${JSON.stringify(filter || {}, null, 2)},
  // Optional: limit the export
  // limit: 10000,
};

// Request export via API
const response = await fetch('/api/mongodb/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(exportConfig),
});

// For large exports, this returns a download URL
const { downloadUrl, recordCount } = await response.json();
console.log(\`Export ready: \${recordCount} records\`);
console.log(\`Download URL: \${downloadUrl}\`);

// Download the file
// window.open(downloadUrl, '_blank');
`;
}

/**
 * Get query template by ID
 */
export function getQueryTemplate(templateId: string): object | undefined {
  return QUERY_TEMPLATES[templateId as keyof typeof QUERY_TEMPLATES];
}

/**
 * List all query templates
 */
export function listQueryTemplates(): object[] {
  return Object.entries(QUERY_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    operation: template.operation,
  }));
}

/**
 * Generate connection test code
 */
export function generateConnectionTestCode(connectionId: string): string {
  return `// Test MongoDB Connection
// Connection ID: ${connectionId}

const response = await fetch(\`/api/connections/${connectionId}/test\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
});

const result = await response.json();

if (result.success) {
  console.log('Connection successful!');
  console.log('Server version:', result.serverVersion);
  console.log('Databases:', result.databases);
} else {
  console.error('Connection failed:', result.error);
}
`;
}

/**
 * Generate list databases code
 */
export function generateListDatabasesCode(connectionId: string): string {
  return `// List Databases for Connection
// Connection ID: ${connectionId}

const response = await fetch(\`/api/connections/${connectionId}/databases\`, {
  headers: {
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
});

const { databases } = await response.json();

console.log('Available databases:');
databases.forEach((db: any) => {
  console.log(\`- \${db.name} (\${db.sizeOnDisk} bytes, \${db.collections} collections)\`);
});
`;
}

/**
 * Generate list collections code
 */
export function generateListCollectionsCode(connectionId: string, database: string): string {
  return `// List Collections in Database
// Connection ID: ${connectionId}
// Database: ${database}

const response = await fetch(\`/api/connections/${connectionId}/databases/${database}/collections\`, {
  headers: {
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
});

const { collections } = await response.json();

console.log('Collections in ${database}:');
collections.forEach((coll: any) => {
  console.log(\`- \${coll.name} (type: \${coll.type})\`);
});
`;
}
