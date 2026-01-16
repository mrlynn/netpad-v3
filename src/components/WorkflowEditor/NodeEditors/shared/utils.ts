/**
 * Shared utilities for node editors
 */

import { WorkflowNode } from '@/types/workflow';
import { AIAssistConfig } from '@/lib/ai/types/nodeConfig';

/**
 * Config field definition
 */
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'code' | 'password' | 'form-select' | 'connection-select' | 'email-credential-select' | 'condition-builder' | 'switch-cases' | 'mongodb-query-builder' | 'mongodb-options-builder' | 'mongodb-pipeline-builder';
  options?: string[];
  description?: string;
  required?: boolean;
  /** AI assistance configuration for this field */
  aiAssist?: AIAssistConfig;
}

/**
 * Switch case item type
 */
export interface SwitchCase {
  value: string;
  label?: string;
}

/**
 * Email credential for selection
 */
export interface EmailCredentialOption {
  credentialId: string;
  name: string;
  provider: 'smtp' | 'sendgrid';
  status: string;
  fromEmail?: string;
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
  availableEmailCredentials?: EmailCredentialOption[];
  emailCredentialsLoading?: boolean;
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
