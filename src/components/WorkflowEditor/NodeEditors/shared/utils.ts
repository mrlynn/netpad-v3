/**
 * Shared utilities for node editors
 */

import { WorkflowNode } from '@/types/workflow';

/**
 * Config field definition
 */
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'code' | 'password' | 'form-select' | 'connection-select' | 'condition-builder' | 'switch-cases';
  options?: string[];
  description?: string;
}

/**
 * Switch case item type
 */
export interface SwitchCase {
  value: string;
  label?: string;
}

/**
 * Props interface for node editor components
 */
export interface NodeEditorProps {
  node: WorkflowNode;
  config: Record<string, unknown>;
  onConfigChange: (key: string, value: unknown) => void;
  availableForms?: Array<{
    id: string;
    name: string;
    slug?: string;
    isPublished?: boolean;
  }>;
  formsLoading?: boolean;
  availableConnections?: Array<{
    vaultId: string;
    name: string;
    database: string;
    status: string;
  }>;
  connectionsLoading?: boolean;
  availableFields?: Array<{
    path: string;
    label: string;
    type: string;
  }>;
  nodeId: string;
}

/**
 * Helper to determine which category a node type belongs to
 */
export function getNodeCategory(nodeType: string): 'triggers' | 'logic' | 'actions' | 'integrations' | 'data' | 'ai' | 'custom' | 'annotations' {
  if (nodeType.includes('trigger')) return 'triggers';
  if (['conditional', 'switch', 'loop', 'delay'].includes(nodeType)) return 'logic';
  if (['email-send', 'notification'].includes(nodeType)) return 'actions';
  if (['http-request', 'mongodb-query', 'mongodb-write', 'google-sheets', 'atlas-cluster', 'atlas-data-api'].includes(nodeType)) return 'integrations';
  if (['transform', 'filter', 'merge'].includes(nodeType)) return 'data';
  if (nodeType.startsWith('ai-')) return 'ai';
  if (nodeType === 'code') return 'custom';
  if (nodeType === 'sticky-note') return 'annotations';
  return 'triggers'; // default
}
