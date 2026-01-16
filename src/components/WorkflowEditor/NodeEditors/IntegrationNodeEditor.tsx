/**
 * Node editor for integration nodes
 * Handles: http-request, mongodb-query, mongodb-write, google-sheets, atlas-cluster, atlas-data-api
 */

'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for integration nodes
const INTEGRATION_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'http-request': [
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      description: 'The URL to request (use {{variable}} for dynamic values)',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "API endpoint for user lookup with ID from form"',
        buttonLabel: 'Generate URL',
      },
    },
    { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method' },
    {
      key: 'headers',
      label: 'Headers',
      type: 'code',
      description: 'Request headers as JSON',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Bearer token auth with JSON content type"',
        buttonLabel: 'Generate Headers',
      },
    },
    {
      key: 'body',
      label: 'Body',
      type: 'code',
      description: 'Request body (for POST/PUT/PATCH)',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Send form data as JSON with name and email"',
        buttonLabel: 'Generate Body',
      },
    },
    { key: 'timeout', label: 'Timeout (ms)', type: 'number', description: 'Request timeout in milliseconds' },
  ],
  'mongodb-query': [
    { key: 'connectionId', label: 'Connection', type: 'connection-select', description: 'Select a MongoDB connection from the vault' },
    { key: 'database', label: 'Database', type: 'text', description: 'Database name (optional, uses connection default)' },
    { key: 'collection', label: 'Collection', type: 'text', description: 'Collection name' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'findOne', 'aggregate', 'count'], description: 'Query operation' },
    { key: 'query', label: 'Query Filter', type: 'mongodb-query-builder', description: 'Build your MongoDB query filter visually' },
    { key: 'pipeline', label: 'Aggregation Pipeline', type: 'mongodb-pipeline-builder', description: 'Build your aggregation pipeline visually' },
    { key: 'options', label: 'Options', type: 'mongodb-options-builder', description: 'Sort, limit, skip, and projection' },
  ],
  'mongodb-write': [
    { key: 'connectionId', label: 'Connection', type: 'connection-select', description: 'Select a MongoDB connection from the vault' },
    { key: 'database', label: 'Database', type: 'text', description: 'Database name (optional, uses connection default)' },
    { key: 'collection', label: 'Collection', type: 'text', description: 'Collection name' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'], description: 'Write operation' },
    { key: 'filter', label: 'Filter', type: 'mongodb-query-builder', description: 'Filter query for update/delete operations' },
    { key: 'document', label: 'Document/Update', type: 'code', description: 'Document to insert, or update operators ($set, $inc, etc.)' },
    { key: 'options', label: 'Options', type: 'code', description: 'Write options (upsert, etc.) as JSON' },
  ],
  'google-sheets': [
    { key: 'connectionId', label: 'Google Credentials', type: 'connection-select', description: 'Select Google credentials from the vault' },
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', description: 'Google Sheets spreadsheet ID (from the URL)' },
    { key: 'action', label: 'Action', type: 'select', options: ['append_row', 'read_range', 'update_range', 'clear_range', 'get_spreadsheet_info'], description: 'Operation to perform' },
    { key: 'range', label: 'Range', type: 'text', description: 'Sheet range (e.g., "Sheet1!A1:D10" or just "Sheet1")' },
    { key: 'values', label: 'Values', type: 'code', description: 'Data to write (for append/update). Use {{variable}} for dynamic values' },
    { key: 'valueInputOption', label: 'Value Input Option', type: 'select', options: ['USER_ENTERED', 'RAW'], description: 'How values are interpreted (USER_ENTERED parses formulas)' },
    { key: 'insertDataOption', label: 'Insert Data Option', type: 'select', options: ['INSERT_ROWS', 'OVERWRITE'], description: 'How new data is inserted (for append)' },
    { key: 'majorDimension', label: 'Major Dimension', type: 'select', options: ['ROWS', 'COLUMNS'], description: 'How values are organized (default: ROWS)' },
  ],
  'atlas-cluster': [
    { key: 'credentialId', label: 'Atlas Credentials', type: 'connection-select', description: 'Select Atlas Admin API credentials from integrations' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['list', 'get_status', 'create', 'delete', 'list_projects'], description: 'Cluster operation to perform' },
    { key: 'projectId', label: 'Atlas Project ID', type: 'text', description: 'The Atlas project ID (required for cluster operations)' },
    { key: 'clusterName', label: 'Cluster Name', type: 'text', description: 'Target cluster name (required for single cluster operations)' },
    { key: 'clusterConfig', label: 'Cluster Config (JSON)', type: 'code', description: 'Configuration for create: { "provider": "AWS", "region": "US_EAST_1" }' },
  ],
  'atlas-data-api': [
    { key: 'credentialId', label: 'Data API Credentials', type: 'connection-select', description: 'Select Atlas Data API credentials from integrations' },
    { key: 'dataSource', label: 'Data Source', type: 'text', description: 'Cluster name or data source identifier' },
    { key: 'database', label: 'Database', type: 'text', description: 'Database name' },
    { key: 'collection', label: 'Collection', type: 'text', description: 'Collection name' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'], description: 'Data operation to perform' },
    { key: 'filter', label: 'Filter (JSON)', type: 'code', description: 'Query filter for find/update/delete operations' },
    { key: 'document', label: 'Document (JSON)', type: 'code', description: 'Document for insertOne operation' },
    { key: 'documents', label: 'Documents (JSON Array)', type: 'code', description: 'Documents array for insertMany operation' },
    { key: 'update', label: 'Update (JSON)', type: 'code', description: 'Update operations for updateOne/updateMany (e.g., { "$set": {...} })' },
    { key: 'pipeline', label: 'Pipeline (JSON Array)', type: 'code', description: 'Aggregation pipeline for aggregate operation' },
    { key: 'options', label: 'Options (JSON)', type: 'code', description: 'Additional options: { "sort": {...}, "limit": 10, "projection": {...}, "upsert": true }' },
  ],
};

export function IntegrationNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = INTEGRATION_CONFIG_SCHEMAS[node.type] || [];

  if (configSchema.length === 0) {
    return null;
  }

  // Filter fields based on operation for mongodb-query
  const filteredSchema = configSchema.filter((field) => {
    if (node.type === 'mongodb-query') {
      const operation = config.operation as string;
      // Show pipeline only for aggregate, hide query/options for aggregate
      if (field.key === 'pipeline') {
        return operation === 'aggregate';
      }
      if (field.key === 'query' || field.key === 'options') {
        return operation !== 'aggregate';
      }
    }
    // For mongodb-write, show filter only for update/delete operations
    if (node.type === 'mongodb-write' && field.key === 'filter') {
      const operation = config.operation as string;
      return operation?.includes('update') || operation?.includes('delete') || operation === 'replaceOne';
    }
    return true;
  });

  return (
    <Box>
      {filteredSchema.map((field) => (
        <ConfigFieldRenderer
          key={field.key}
          field={field}
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
    </Box>
  );
}
