import { Node, Edge } from 'reactflow';
import { Document } from 'mongodb';

export interface StageNodeData {
  stageType: string; // '$match', '$group', etc.
  config: Record<string, any>; // Stage-specific configuration
  outputDocs?: Document[]; // Results after this stage
  docCount?: number; // Document count after execution
  error?: string; // Validation or execution error
  isExecuting?: boolean; // Loading state
}

export type StageNode = Node<StageNodeData>;

export interface PipelineState {
  nodes: StageNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  connectionString: string | null;
  databaseName: string | null;
  collection: string | null;
  activeVaultId: string | null;  // Track which vault connection is active
  sampleDocs: Document[];
  isExecuting: boolean;
  executionResults: Map<string, Document[]>;
  schema: InferredSchema | null;
}

export interface InferredSchema {
  fields: string[];
  types: Record<string, string[]>;
}

export interface StageDefinition {
  type: string;
  name: string;
  icon: string;
  color: string;
  category: 'filter' | 'transform' | 'join' | 'shape';
  description: string;
  defaultConfig: Record<string, any>;
}

export interface SavedConnectionInfo {
  id: string;
  name: string;
  defaultDatabase?: string;
  createdAt: number;
  lastUsed: number;
}

export interface SavedConnectionFull extends SavedConnectionInfo {
  connectionString: string;
}

