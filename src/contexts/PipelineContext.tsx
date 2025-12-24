'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Node, Edge } from 'reactflow';
import { Document } from 'mongodb';
import { StageNodeData, PipelineState, InferredSchema } from '@/types/pipeline';

interface PipelineContextValue extends PipelineState {
  dispatch: React.Dispatch<PipelineAction>;
}

type PipelineAction =
  | { type: 'ADD_NODE'; payload: { node: Node<StageNodeData> } }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; updates: Partial<StageNodeData> } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'SET_NODES'; payload: { nodes: Node<StageNodeData>[] } }
  | { type: 'SET_EDGES'; payload: { edges: Edge[] } }
  | { type: 'SELECT_NODE'; payload: { nodeId: string | null } }
  | { type: 'SET_CONNECTION'; payload: { connectionString: string; databaseName: string; vaultId?: string } }
  | { type: 'SET_COLLECTION'; payload: { collection: string } }
  | { type: 'SET_SAMPLE_DOCS'; payload: { docs: Document[] } }
  | { type: 'SET_EXECUTION_RESULTS'; payload: { results: Map<string, Document[]> } }
  | { type: 'SET_EXECUTING'; payload: { isExecuting: boolean } }
  | { type: 'SET_SCHEMA'; payload: { schema: InferredSchema | null } };

const initialState: PipelineState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  connectionString: null,
  databaseName: null,
  collection: null,
  activeVaultId: null,
  sampleDocs: [],
  isExecuting: false,
  executionResults: new Map(),
  schema: null
};

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.payload.node]
      };

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.payload.nodeId
            ? { ...node, data: { ...node.data, ...action.payload.updates } }
            : node
        )
      };

    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== action.payload.nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== action.payload.nodeId && edge.target !== action.payload.nodeId
        ),
        selectedNodeId:
          state.selectedNodeId === action.payload.nodeId ? null : state.selectedNodeId
      };

    case 'SET_NODES':
      return {
        ...state,
        nodes: action.payload.nodes
      };

    case 'SET_EDGES':
      return {
        ...state,
        edges: action.payload.edges
      };

    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodeId: action.payload.nodeId
      };

    case 'SET_CONNECTION':
      return {
        ...state,
        connectionString: action.payload.connectionString,
        databaseName: action.payload.databaseName,
        activeVaultId: action.payload.vaultId || null,
        collection: null // Reset collection when connection changes
      };

    case 'SET_COLLECTION':
      return {
        ...state,
        collection: action.payload.collection
      };

    case 'SET_SAMPLE_DOCS':
      return {
        ...state,
        sampleDocs: action.payload.docs
      };

    case 'SET_EXECUTION_RESULTS':
      return {
        ...state,
        executionResults: action.payload.results
      };

    case 'SET_EXECUTING':
      return {
        ...state,
        isExecuting: action.payload.isExecuting
      };

    case 'SET_SCHEMA':
      return {
        ...state,
        schema: action.payload.schema
      };

    default:
      return state;
  }
}

const PipelineContext = createContext<PipelineContextValue | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);

  return (
    <PipelineContext.Provider value={{ ...state, dispatch }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
