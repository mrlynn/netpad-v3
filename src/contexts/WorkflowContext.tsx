'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  WorkflowDocument,
  WorkflowNode,
  WorkflowEdge,
  WorkflowCanvas,
  WorkflowSettings,
  WorkflowVariable,
  WorkflowStatus,
  WorkflowExecution,
  DEFAULT_WORKFLOW_SETTINGS,
  DEFAULT_WORKFLOW_STATS,
  createEmptyCanvas,
} from '@/types/workflow';

// ============================================
// ZUSTAND STORE (for undo/redo support)
// ============================================

interface WorkflowEditorState {
  // Current workflow
  workflow: WorkflowDocument | null;

  // Editor state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Clipboard
  clipboard: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null;

  // Actions - Workflow
  setWorkflow: (workflow: WorkflowDocument | null) => void;
  resetWorkflow: () => void;

  // Actions - Canvas
  setCanvas: (canvas: WorkflowCanvas) => void;

  // Actions - Nodes
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;

  // Actions - Edges
  addEdge: (edge: WorkflowEdge) => void;
  updateEdge: (edgeId: string, updates: Partial<WorkflowEdge>) => void;
  removeEdge: (edgeId: string) => void;

  // Actions - Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  // Actions - Settings
  updateSettings: (settings: Partial<WorkflowSettings>) => void;
  updateVariables: (variables: WorkflowVariable[]) => void;

  // Actions - Metadata
  updateMetadata: (updates: { name?: string; description?: string; tags?: string[] }) => void;

  // Actions - Status
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;
  setDirty: (isDirty: boolean) => void;

  // Actions - Clipboard
  copySelection: () => void;
  paste: (position?: { x: number; y: number }) => void;

  // Actions - Viewport
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
}

// Create the store with temporal (undo/redo) support
export const useWorkflowStore = create<WorkflowEditorState>()(
  temporal(
    (set, get) => ({
      // Initial state
      workflow: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      isLoading: false,
      isSaving: false,
      error: null,
      clipboard: null,

      // Workflow actions
      setWorkflow: (workflow) => set({
        workflow,
        isDirty: false,
        selectedNodeId: null,
        selectedEdgeId: null,
        error: null,
      }),

      resetWorkflow: () => set({
        workflow: null,
        isDirty: false,
        selectedNodeId: null,
        selectedEdgeId: null,
        error: null,
      }),

      // Canvas actions
      setCanvas: (canvas) => set((state) => ({
        workflow: state.workflow ? { ...state.workflow, canvas } : null,
        isDirty: true,
      })),

      // Node actions
      addNode: (node) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              nodes: [...state.workflow.canvas.nodes, node],
            },
          },
          isDirty: true,
          selectedNodeId: node.id,
          selectedEdgeId: null,
        };
      }),

      updateNode: (nodeId, updates) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              nodes: state.workflow.canvas.nodes.map((n) =>
                n.id === nodeId ? { ...n, ...updates } : n
              ),
            },
          },
          isDirty: true,
        };
      }),

      removeNode: (nodeId) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              nodes: state.workflow.canvas.nodes.filter((n) => n.id !== nodeId),
              // Also remove connected edges
              edges: state.workflow.canvas.edges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId
              ),
            },
          },
          isDirty: true,
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        };
      }),

      moveNode: (nodeId, position) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              nodes: state.workflow.canvas.nodes.map((n) =>
                n.id === nodeId ? { ...n, position } : n
              ),
            },
          },
          isDirty: true,
        };
      }),

      // Edge actions
      addEdge: (edge) => set((state) => {
        if (!state.workflow) return state;
        // Check if edge already exists
        const exists = state.workflow.canvas.edges.some(
          (e) =>
            e.source === edge.source &&
            e.sourceHandle === edge.sourceHandle &&
            e.target === edge.target &&
            e.targetHandle === edge.targetHandle
        );
        if (exists) return state;

        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              edges: [...state.workflow.canvas.edges, edge],
            },
          },
          isDirty: true,
        };
      }),

      updateEdge: (edgeId, updates) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              edges: state.workflow.canvas.edges.map((e) =>
                e.id === edgeId ? { ...e, ...updates } : e
              ),
            },
          },
          isDirty: true,
        };
      }),

      removeEdge: (edgeId) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              edges: state.workflow.canvas.edges.filter((e) => e.id !== edgeId),
            },
          },
          isDirty: true,
          selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        };
      }),

      // Selection actions
      selectNode: (nodeId) => set({
        selectedNodeId: nodeId,
        selectedEdgeId: nodeId ? null : undefined, // Clear edge selection when selecting node
      }),

      selectEdge: (edgeId) => set({
        selectedEdgeId: edgeId,
        selectedNodeId: edgeId ? null : undefined, // Clear node selection when selecting edge
      }),

      clearSelection: () => set({
        selectedNodeId: null,
        selectedEdgeId: null,
      }),

      // Settings actions
      updateSettings: (settings) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            settings: { ...state.workflow.settings, ...settings },
          },
          isDirty: true,
        };
      }),

      updateVariables: (variables) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: { ...state.workflow, variables },
          isDirty: true,
        };
      }),

      // Metadata actions
      updateMetadata: (updates) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            ...updates,
          },
          isDirty: true,
        };
      }),

      // Status actions
      setLoading: (isLoading) => set({ isLoading }),
      setSaving: (isSaving) => set({ isSaving }),
      setError: (error) => set({ error }),
      setDirty: (isDirty) => set({ isDirty }),

      // Clipboard actions
      copySelection: () => set((state) => {
        if (!state.workflow || !state.selectedNodeId) return state;

        const selectedNode = state.workflow.canvas.nodes.find(
          (n) => n.id === state.selectedNodeId
        );
        if (!selectedNode) return state;

        // Copy node and its connected edges
        const connectedEdges = state.workflow.canvas.edges.filter(
          (e) => e.source === state.selectedNodeId || e.target === state.selectedNodeId
        );

        return {
          clipboard: {
            nodes: [selectedNode],
            edges: connectedEdges,
          },
        };
      }),

      paste: (position) => set((state) => {
        if (!state.workflow || !state.clipboard) return state;

        const offset = position || { x: 50, y: 50 };
        const idMap = new Map<string, string>();

        // Create new nodes with new IDs
        const newNodes = state.clipboard.nodes.map((node) => {
          const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          idMap.set(node.id, newId);
          return {
            ...node,
            id: newId,
            position: {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            },
          };
        });

        // Create new edges with updated references
        const newEdges = state.clipboard.edges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => ({
            ...edge,
            id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
          }));

        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              nodes: [...state.workflow.canvas.nodes, ...newNodes],
              edges: [...state.workflow.canvas.edges, ...newEdges],
            },
          },
          isDirty: true,
          selectedNodeId: newNodes.length === 1 ? newNodes[0].id : null,
        };
      }),

      // Viewport actions
      setViewport: (viewport) => set((state) => {
        if (!state.workflow) return state;
        return {
          workflow: {
            ...state.workflow,
            canvas: {
              ...state.workflow.canvas,
              viewport,
            },
          },
          // Don't mark as dirty for viewport changes
        };
      }),
    }),
    {
      limit: 50, // Undo history limit
      partialize: (state) => {
        // Only track workflow changes for undo/redo
        const { workflow, selectedNodeId, selectedEdgeId } = state;
        return { workflow, selectedNodeId, selectedEdgeId };
      },
    }
  )
);

// ============================================
// CONTEXT (for API operations)
// ============================================

interface WorkflowContextValue {
  // Store access
  store: typeof useWorkflowStore;

  // API operations
  loadWorkflow: (orgId: string, workflowId: string) => Promise<void>;
  saveWorkflow: (orgId: string) => Promise<boolean>;
  createWorkflow: (orgId: string, name: string, description?: string) => Promise<string | null>;
  deleteWorkflow: (orgId: string, workflowId: string) => Promise<boolean>;
  updateStatus: (orgId: string, workflowId: string, status: WorkflowStatus) => Promise<boolean>;

  // Execution
  executeWorkflow: (orgId: string, workflowId: string) => Promise<string | null>;
  getExecutionStatus: (executionId: string) => Promise<WorkflowExecution | null>;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const store = useWorkflowStore;
  const temporalStore = useWorkflowStore.temporal;

  // Track undo/redo state reactively
  const [undoRedoState, setUndoRedoState] = useState({
    canUndo: false,
    canRedo: false,
  });

  // Subscribe to temporal store changes
  useEffect(() => {
    const updateUndoRedoState = () => {
      const { pastStates, futureStates } = temporalStore.getState();
      setUndoRedoState({
        canUndo: pastStates.length > 0,
        canRedo: futureStates.length > 0,
      });
    };

    // Initial state
    updateUndoRedoState();

    // Subscribe to changes
    const unsubscribe = temporalStore.subscribe(updateUndoRedoState);
    return () => unsubscribe();
  }, [temporalStore]);

  const { undo, redo } = temporalStore.getState();

  // Load workflow from API
  const loadWorkflow = useCallback(async (orgId: string, workflowId: string) => {
    store.getState().setLoading(true);
    store.getState().setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}?orgId=${orgId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load workflow');
      }

      store.getState().setWorkflow(data.workflow);
    } catch (error) {
      store.getState().setError(error instanceof Error ? error.message : 'Failed to load workflow');
    } finally {
      store.getState().setLoading(false);
    }
  }, [store]);

  // Save workflow to API
  const saveWorkflow = useCallback(async (orgId: string): Promise<boolean> => {
    const { workflow, isDirty } = store.getState();

    if (!workflow || !isDirty) return true;

    store.getState().setSaving(true);
    store.getState().setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          canvas: workflow.canvas,
          settings: workflow.settings,
          variables: workflow.variables,
          name: workflow.name,
          description: workflow.description,
          tags: workflow.tags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save workflow');
      }

      store.getState().setWorkflow(data.workflow);
      return true;
    } catch (error) {
      store.getState().setError(error instanceof Error ? error.message : 'Failed to save workflow');
      return false;
    } finally {
      store.getState().setSaving(false);
    }
  }, [store]);

  // Create new workflow
  const createWorkflow = useCallback(async (
    orgId: string,
    name: string,
    description?: string
  ): Promise<string | null> => {
    store.getState().setLoading(true);
    store.getState().setError(null);

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, name, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      return data.workflow.id;
    } catch (error) {
      store.getState().setError(error instanceof Error ? error.message : 'Failed to create workflow');
      return null;
    } finally {
      store.getState().setLoading(false);
    }
  }, [store]);

  // Delete workflow
  const deleteWorkflow = useCallback(async (
    orgId: string,
    workflowId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}?orgId=${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workflow');
      }

      // Clear if current workflow
      const { workflow } = store.getState();
      if (workflow?.id === workflowId) {
        store.getState().resetWorkflow();
      }

      return true;
    } catch (error) {
      store.getState().setError(error instanceof Error ? error.message : 'Failed to delete workflow');
      return false;
    }
  }, [store]);

  // Update workflow status
  const updateStatus = useCallback(async (
    orgId: string,
    workflowId: string,
    status: WorkflowStatus
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Update local state if current workflow
      const { workflow } = store.getState();
      if (workflow?.id === workflowId) {
        store.getState().setWorkflow(data.workflow);
      }

      return true;
    } catch (error) {
      store.getState().setError(error instanceof Error ? error.message : 'Failed to update status');
      return false;
    }
  }, [store]);

  // Execute workflow
  const executeWorkflow = useCallback(async (
    orgId: string,
    workflowId: string
  ): Promise<string | null> => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute workflow');
      }

      return data.executionId;
    } catch (error) {
      store.getState().setError(error instanceof Error ? error.message : 'Failed to execute workflow');
      return null;
    }
  }, [store]);

  // Get execution status
  const getExecutionStatus = useCallback(async (
    executionId: string
  ): Promise<WorkflowExecution | null> => {
    try {
      const response = await fetch(`/api/executions/${executionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get execution status');
      }

      return data.execution;
    } catch (error) {
      console.error('Failed to get execution status:', error);
      return null;
    }
  }, []);

  const value: WorkflowContextValue = {
    store,
    loadWorkflow,
    saveWorkflow,
    createWorkflow,
    deleteWorkflow,
    updateStatus,
    executeWorkflow,
    getExecutionStatus,
    undo,
    redo,
    canUndo: undoRedoState.canUndo,
    canRedo: undoRedoState.canRedo,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

export function useWorkflow(): WorkflowContextValue {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}

/**
 * Hook for accessing workflow editor state
 */
export function useWorkflowEditor() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorkflowStore((state) => state.selectedEdgeId);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const isLoading = useWorkflowStore((state) => state.isLoading);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const error = useWorkflowStore((state) => state.error);

  // Derived state
  const nodes = workflow?.canvas.nodes || [];
  const edges = workflow?.canvas.edges || [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;

  return {
    workflow,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedEdge,
    isDirty,
    isLoading,
    isSaving,
    error,
  };
}

/**
 * Hook for workflow editor actions
 */
export function useWorkflowActions() {
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const moveNode = useWorkflowStore((state) => state.moveNode);
  const addEdge = useWorkflowStore((state) => state.addEdge);
  const updateEdge = useWorkflowStore((state) => state.updateEdge);
  const removeEdge = useWorkflowStore((state) => state.removeEdge);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const selectEdge = useWorkflowStore((state) => state.selectEdge);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);
  const updateSettings = useWorkflowStore((state) => state.updateSettings);
  const updateVariables = useWorkflowStore((state) => state.updateVariables);
  const updateMetadata = useWorkflowStore((state) => state.updateMetadata);
  const copySelection = useWorkflowStore((state) => state.copySelection);
  const paste = useWorkflowStore((state) => state.paste);
  const setViewport = useWorkflowStore((state) => state.setViewport);

  return {
    addNode,
    updateNode,
    removeNode,
    moveNode,
    addEdge,
    updateEdge,
    removeEdge,
    selectNode,
    selectEdge,
    clearSelection,
    updateSettings,
    updateVariables,
    updateMetadata,
    copySelection,
    paste,
    setViewport,
  };
}
