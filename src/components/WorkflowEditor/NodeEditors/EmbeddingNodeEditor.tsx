/**
 * Node editor for Embedding and Vector Search nodes
 * Handles: ai-embed, vector-search, semantic-search
 */

'use client';

import React from 'react';
import { Box, Alert, Link } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Embedding provider options
const EMBEDDING_PROVIDERS = [
  { value: 'auto', label: 'Auto-detect (Recommended)' },
  { value: 'atlas-ai', label: 'Atlas AI Services' },
  { value: 'voyage', label: 'Voyage AI Direct' },
  { value: 'openai', label: 'OpenAI' },
];

// Voyage AI models
const VOYAGE_MODELS = [
  { value: 'voyage-3', label: 'voyage-3 (1024d, general purpose)' },
  { value: 'voyage-3-lite', label: 'voyage-3-lite (512d, cost-optimized)' },
  { value: 'voyage-code-3', label: 'voyage-code-3 (1536d, code/technical)' },
  { value: 'voyage-3-large', label: 'voyage-3-large (1024d, high accuracy)' },
];

// OpenAI models
const OPENAI_MODELS = [
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small (1536d)' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large (3072d)' },
  { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002 (1536d, legacy)' },
];

// Combined model options for when provider is auto
const ALL_MODELS = [
  { value: 'voyage-3', label: 'voyage-3 (Voyage AI, 1024d)' },
  { value: 'voyage-3-lite', label: 'voyage-3-lite (Voyage AI, 512d)' },
  { value: 'voyage-code-3', label: 'voyage-code-3 (Voyage AI, 1536d)' },
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small (OpenAI, 1536d)' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large (OpenAI, 3072d)' },
];

// Input type for Voyage AI (asymmetric embeddings)
const INPUT_TYPES = [
  { value: 'document', label: 'Document (for indexing)' },
  { value: 'query', label: 'Query (for search)' },
];

// Config schemas for embedding nodes
const EMBEDDING_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'ai-embed': [
    {
      key: 'provider',
      label: 'Embedding Provider',
      type: 'select',
      options: EMBEDDING_PROVIDERS.map((p) => p.value),
      description: 'Select embedding provider (auto-detect uses Voyage AI if available)',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      options: ALL_MODELS.map((m) => m.value),
      description: 'Embedding model to use',
    },
    {
      key: 'text',
      label: 'Text to Embed',
      type: 'code',
      description: 'Text content to generate embeddings for (use {{variables}} for dynamic content)',
    },
    {
      key: 'inputType',
      label: 'Input Type',
      type: 'select',
      options: INPUT_TYPES.map((t) => t.value),
      description: 'Voyage AI optimizes differently for documents vs queries',
    },
  ],
  'vector-search': [
    {
      key: 'connectionId',
      label: 'MongoDB Connection',
      type: 'connection-select',
      description: 'Select a MongoDB connection from your vault',
      required: true,
    },
    {
      key: 'collection',
      label: 'Collection',
      type: 'text',
      description: 'Collection name containing vector embeddings',
      required: true,
    },
    {
      key: 'indexName',
      label: 'Vector Search Index',
      type: 'text',
      description: 'Name of the Atlas Vector Search index',
      required: true,
    },
    {
      key: 'embeddingField',
      label: 'Embedding Field',
      type: 'text',
      description: 'Field name containing the vector embeddings (default: embedding)',
    },
    {
      key: 'queryVector',
      label: 'Query Vector',
      type: 'code',
      description: 'The embedding vector to search for (use {{previous.embedding}} from ai-embed node)',
      required: true,
    },
    {
      key: 'numCandidates',
      label: 'Number of Candidates',
      type: 'number',
      description: 'Number of candidates to consider (default: 100)',
    },
    {
      key: 'limit',
      label: 'Result Limit',
      type: 'number',
      description: 'Maximum results to return (default: 10)',
    },
    {
      key: 'minScore',
      label: 'Minimum Score',
      type: 'number',
      description: 'Minimum similarity score threshold (0-1, default: 0)',
    },
    {
      key: 'filter',
      label: 'Pre-Filter',
      type: 'code',
      description: 'Optional MongoDB filter to apply before vector search (JSON)',
    },
  ],
  'semantic-search': [
    {
      key: 'provider',
      label: 'Embedding Provider',
      type: 'select',
      options: EMBEDDING_PROVIDERS.map((p) => p.value),
      description: 'Select embedding provider for query embedding',
    },
    {
      key: 'model',
      label: 'Embedding Model',
      type: 'select',
      options: ALL_MODELS.map((m) => m.value),
      description: 'Model for generating query embeddings',
    },
    {
      key: 'query',
      label: 'Search Query',
      type: 'code',
      description: 'Natural language query to search for (use {{variables}} for dynamic content)',
      required: true,
    },
    {
      key: 'connectionId',
      label: 'MongoDB Connection',
      type: 'connection-select',
      description: 'Select a MongoDB connection from your vault',
      required: true,
    },
    {
      key: 'collection',
      label: 'Collection',
      type: 'text',
      description: 'Collection name containing vector embeddings',
      required: true,
    },
    {
      key: 'indexName',
      label: 'Vector Search Index',
      type: 'text',
      description: 'Name of the Atlas Vector Search index',
      required: true,
    },
    {
      key: 'embeddingField',
      label: 'Embedding Field',
      type: 'text',
      description: 'Field name containing the vector embeddings (default: embedding)',
    },
    {
      key: 'limit',
      label: 'Result Limit',
      type: 'number',
      description: 'Maximum results to return (default: 10)',
    },
    {
      key: 'minScore',
      label: 'Minimum Score',
      type: 'number',
      description: 'Minimum similarity score threshold (0-1, default: 0.7)',
    },
    {
      key: 'filter',
      label: 'Pre-Filter',
      type: 'code',
      description: 'Optional MongoDB filter to apply before vector search (JSON)',
    },
  ],
};

export function EmbeddingNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = EMBEDDING_CONFIG_SCHEMAS[node.type] || [];

  if (configSchema.length === 0) {
    return null;
  }

  // Get model options based on selected provider
  const getModelOptions = () => {
    const provider = config.provider as string;
    if (provider === 'voyage' || provider === 'atlas-ai') {
      return VOYAGE_MODELS.map((m) => m.value);
    }
    if (provider === 'openai') {
      return OPENAI_MODELS.map((m) => m.value);
    }
    return ALL_MODELS.map((m) => m.value);
  };

  // Dynamically update model options based on provider
  const getFieldWithDynamicOptions = (field: ConfigField): ConfigField => {
    if (field.key === 'model') {
      return {
        ...field,
        options: getModelOptions(),
      };
    }
    return field;
  };

  return (
    <Box>
      {/* Provider info alert */}
      {(node.type === 'ai-embed' || node.type === 'semantic-search') && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
          <strong>Embedding Providers:</strong> Voyage AI is MongoDB&apos;s official partner for Atlas Vector Search.{' '}
          <Link
            href="https://docs.voyageai.com/"
            target="_blank"
            rel="noopener"
            sx={{ fontSize: '0.85rem' }}
          >
            Learn more
          </Link>
        </Alert>
      )}

      {/* Vector search info */}
      {node.type === 'vector-search' && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
          Connect this node after an <strong>ai-embed</strong> node and use{' '}
          <code style={{ fontSize: '0.8rem' }}>{'{{previous.embedding}}'}</code> as the query vector.
        </Alert>
      )}

      {configSchema.map((field) => (
        <ConfigFieldRenderer
          key={field.key}
          field={getFieldWithDynamicOptions(field)}
          value={config[field.key]}
          onChange={onConfigChange}
          nodeId={nodeId}
          nodeType={node.type}
          allConfig={config}
          availableForms={availableForms}
          formsLoading={formsLoading}
          availableConnections={availableConnections}
          connectionsLoading={connectionsLoading}
        />
      ))}

      {/* Output info */}
      <Alert severity="success" sx={{ mt: 2, fontSize: '0.85rem' }}>
        <strong>Output:</strong>{' '}
        {node.type === 'ai-embed' && (
          <>
            <code>embedding</code> (number[]), <code>dimensions</code>, <code>model</code>, <code>provider</code>, <code>cost</code>
          </>
        )}
        {node.type === 'vector-search' && (
          <>
            <code>results</code> (documents with scores), <code>count</code>, <code>latencyMs</code>
          </>
        )}
        {node.type === 'semantic-search' && (
          <>
            <code>results</code>, <code>queryEmbedding</code>, <code>count</code>, <code>embeddingCost</code>
          </>
        )}
      </Alert>
    </Box>
  );
}
