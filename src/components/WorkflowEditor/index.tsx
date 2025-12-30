'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Toolbar,
  AppBar,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  useTheme,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import {
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  PlayArrow as RunIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon,
  Pause as PauseIcon,
  Archive as ArchiveIcon,
  Edit as DraftIcon,
  ExpandMore as ExpandMoreIcon,
  History as LogsIcon,
} from '@mui/icons-material';
import { WorkflowStatus } from '@/types/workflow';
import { ReactFlowProvider } from 'reactflow';

import { WorkflowProvider, useWorkflow, useWorkflowEditor, useWorkflowActions } from '@/contexts/WorkflowContext';
import { WorkflowEditorCanvas } from './WorkflowEditorCanvas';
import { NodePalette } from './Panels/NodePalette';
import { NodeConfigPanel } from './Panels/NodeConfigPanel';
import { EdgeConfigPanel } from './Panels/EdgeConfigPanel';
import { ExecutionLogsPanel } from './Panels/ExecutionLogsPanel';
import { WorkflowSettingsPanel } from './Panels/WorkflowSettingsPanel';
import { useChat, WorkflowActionHandlers } from '@/contexts/ChatContext';
import { WorkflowBuilderContext } from '@/types/chat';
import { nanoid } from 'nanoid';
import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

interface WorkflowEditorProps {
  orgId: string;
  workflowId?: string;
  onClose?: () => void;
  onSave?: () => void;
}

// Status configuration
const STATUS_CONFIG: Record<WorkflowStatus, { color: string; icon: React.ReactElement; label: string }> = {
  draft: { color: '#9e9e9e', icon: <DraftIcon fontSize="small" />, label: 'Draft' },
  active: { color: '#4caf50', icon: <RunIcon fontSize="small" />, label: 'Active' },
  paused: { color: '#ff9800', icon: <PauseIcon fontSize="small" />, label: 'Paused' },
  archived: { color: '#607d8b', icon: <ArchiveIcon fontSize="small" />, label: 'Archived' },
};

function WorkflowEditorInner({
  orgId,
  workflowId,
  onClose,
  onSave,
}: WorkflowEditorProps) {
  const theme = useTheme();
  const {
    loadWorkflow,
    saveWorkflow,
    executeWorkflow,
    updateStatus,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkflow();
  const {
    workflow,
    isDirty,
    isLoading,
    isSaving,
    error,
    selectedNodeId,
    selectedEdgeId,
  } = useWorkflowEditor();

  // Get workflow actions for chat integration
  const {
    addNode,
    updateNode,
    removeNode,
    addEdge: addWorkflowEdge,
    updateSettings,
  } = useWorkflowActions();

  // Chat integration
  const { setWorkflowContext, registerWorkflowActionHandlers } = useChat();

  // Sync workflow context to chat
  useEffect(() => {
    if (!workflow) return;

    const context: WorkflowBuilderContext = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowDescription: workflow.description,
      status: workflow.status,
      nodes: workflow.canvas.nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        enabled: n.enabled,
        config: n.config,
      })),
      edges: workflow.canvas.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: e.condition ? { label: e.condition.label || '' } : undefined,
      })),
      selectedNodeId,
      currentView: 'workflow-editor',
      stats: workflow.stats ? {
        totalExecutions: workflow.stats.totalExecutions,
        successfulExecutions: workflow.stats.successfulExecutions,
        failedExecutions: workflow.stats.failedExecutions,
      } : undefined,
    };

    setWorkflowContext(context);
  }, [workflow, selectedNodeId, setWorkflowContext]);

  // Register chat action handlers
  useEffect(() => {
    const handlers: WorkflowActionHandlers = {
      onAddNode: (nodeType, label, position, config) => {
        const newNode: WorkflowNode = {
          id: `${nodeType}_${nanoid(8)}`,
          type: nodeType,
          label: label || nodeType.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          position: position || { x: 250, y: 200 },
          config: config || {},
          enabled: true,
        };
        addNode(newNode);
      },
      onUpdateNode: (nodeId, updates) => {
        updateNode(nodeId, updates);
      },
      onDeleteNode: (nodeId) => {
        removeNode(nodeId);
      },
      onConnectNodes: (sourceId, targetId, sourceHandle, targetHandle) => {
        const newEdge: WorkflowEdge = {
          id: `edge_${nanoid(8)}`,
          source: sourceId,
          sourceHandle: sourceHandle || 'output',
          target: targetId,
          targetHandle: targetHandle || 'input',
        };
        addWorkflowEdge(newEdge);
      },
      onUpdateWorkflowSettings: (settings) => {
        updateSettings(settings);
      },
    };

    registerWorkflowActionHandlers(handlers);
  }, [addNode, updateNode, removeNode, addWorkflowEdge, updateSettings, registerWorkflowActionHandlers]);

  // Config panel states
  const [nodeConfigPanelOpen, setNodeConfigPanelOpen] = useState(false);
  const [edgeConfigPanelOpen, setEdgeConfigPanelOpen] = useState(false);
  const [logsPanelOpen, setLogsPanelOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Status menu state
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(null);

  // Open node config panel on double-click
  const handleNodeDoubleClick = useCallback(() => {
    if (selectedNodeId) {
      setNodeConfigPanelOpen(true);
    }
  }, [selectedNodeId]);

  // Open edge config panel on double-click
  const handleEdgeDoubleClick = useCallback(() => {
    if (selectedEdgeId) {
      setEdgeConfigPanelOpen(true);
    }
  }, [selectedEdgeId]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Track if we've loaded to prevent duplicate calls
  const loadedRef = useRef<string | null>(null);

  // Load workflow on mount
  useEffect(() => {
    const loadKey = `${orgId}:${workflowId}`;
    if (workflowId && loadedRef.current !== loadKey) {
      loadedRef.current = loadKey;
      loadWorkflow(orgId, workflowId);
    }
  }, [orgId, workflowId, loadWorkflow]);

  // Handle save
  const handleSave = useCallback(async () => {
    const success = await saveWorkflow(orgId);
    if (success) {
      setSnackbar({
        open: true,
        message: 'Workflow saved successfully',
        severity: 'success',
      });
      onSave?.();
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to save workflow',
        severity: 'error',
      });
    }
  }, [saveWorkflow, orgId, onSave]);

  // Handle run
  const handleRun = async () => {
    if (!workflow) return;

    // Save first if dirty
    if (isDirty) {
      const saved = await saveWorkflow(orgId);
      if (!saved) {
        setSnackbar({
          open: true,
          message: 'Please save workflow before running',
          severity: 'error',
        });
        return;
      }
    }

    const executionId = await executeWorkflow(orgId, workflow.id);
    if (executionId) {
      setSnackbar({
        open: true,
        message: `Workflow execution started (ID: ${executionId})`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to start workflow execution',
        severity: 'error',
      });
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: WorkflowStatus) => {
    if (!workflow) return;
    setStatusMenuAnchor(null);

    const success = await updateStatus(orgId, workflow.id, newStatus);
    if (success) {
      setSnackbar({
        open: true,
        message: `Workflow ${newStatus === 'active' ? 'activated' : newStatus}`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to update workflow status',
        severity: 'error',
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleSave]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          {onClose && (
            <Tooltip title="Close editor">
              <IconButton onClick={onClose} size="small">
                <BackIcon />
              </IconButton>
            </Tooltip>
          )}

          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {workflow?.name || 'New Workflow'}
            {isDirty && <span style={{ color: theme.palette.warning.main }}> *</span>}
          </Typography>

          {/* Status Chip */}
          {workflow && (
            <Chip
              icon={STATUS_CONFIG[workflow.status].icon}
              label={STATUS_CONFIG[workflow.status].label}
              deleteIcon={<ExpandMoreIcon />}
              onDelete={(e) => setStatusMenuAnchor(e.currentTarget as HTMLElement)}
              onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
              size="small"
              sx={{
                ml: 2,
                bgcolor: alpha(STATUS_CONFIG[workflow.status].color, 0.1),
                color: STATUS_CONFIG[workflow.status].color,
                fontWeight: 500,
                cursor: 'pointer',
                '& .MuiChip-icon': { color: STATUS_CONFIG[workflow.status].color },
                '& .MuiChip-deleteIcon': {
                  color: STATUS_CONFIG[workflow.status].color,
                  '&:hover': { color: STATUS_CONFIG[workflow.status].color },
                },
              }}
            />
          )}

          <Box sx={{ flex: 1 }} />

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton onClick={undo} disabled={!canUndo} size="small">
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton onClick={redo} disabled={!canRedo} size="small">
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <Tooltip title="Workflow Settings">
            <IconButton size="small" onClick={() => setSettingsPanelOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            size="small"
            startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            Save
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<RunIcon />}
            onClick={handleRun}
            disabled={!workflow || workflow.canvas.nodes.length === 0}
          >
            Run
          </Button>

          <Tooltip title="Execution Logs">
            <IconButton
              size="small"
              onClick={() => setLogsPanelOpen(true)}
              disabled={!workflow}
            >
              <LogsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Paper>

      {/* Main content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Node Palette */}
        <NodePalette />

        {/* Canvas */}
        <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <ReactFlowProvider>
            <WorkflowEditorCanvas
              onNodeDoubleClick={handleNodeDoubleClick}
              onEdgeDoubleClick={handleEdgeDoubleClick}
            />
          </ReactFlowProvider>
        </Box>
      </Box>

      {/* Node Config Panel */}
      <NodeConfigPanel
        open={nodeConfigPanelOpen}
        onClose={() => setNodeConfigPanelOpen(false)}
      />

      {/* Edge Config Panel */}
      <EdgeConfigPanel
        open={edgeConfigPanelOpen}
        onClose={() => setEdgeConfigPanelOpen(false)}
      />

      {/* Execution Logs Panel */}
      {workflow && (
        <ExecutionLogsPanel
          open={logsPanelOpen}
          onClose={() => setLogsPanelOpen(false)}
          workflowId={workflow.id}
        />
      )}

      {/* Workflow Settings Panel */}
      <WorkflowSettingsPanel
        open={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
      />

      {/* Status Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => setStatusMenuAnchor(null)}
      >
        {workflow?.status === 'draft' && (
          <MenuItem onClick={() => handleStatusChange('active')}>
            <ListItemIcon>
              <RunIcon fontSize="small" sx={{ color: '#4caf50' }} />
            </ListItemIcon>
            <ListItemText>Activate</ListItemText>
          </MenuItem>
        )}
        {workflow?.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange('paused')}>
            <ListItemIcon>
              <PauseIcon fontSize="small" sx={{ color: '#ff9800' }} />
            </ListItemIcon>
            <ListItemText>Pause</ListItemText>
          </MenuItem>
        )}
        {workflow?.status === 'paused' && (
          <MenuItem onClick={() => handleStatusChange('active')}>
            <ListItemIcon>
              <RunIcon fontSize="small" sx={{ color: '#4caf50' }} />
            </ListItemIcon>
            <ListItemText>Resume</ListItemText>
          </MenuItem>
        )}
        {workflow?.status !== 'archived' && (
          <MenuItem onClick={() => handleStatusChange('archived')}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        )}
        {workflow?.status === 'archived' && (
          <MenuItem onClick={() => handleStatusChange('draft')}>
            <ListItemIcon>
              <DraftIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unarchive</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Error display */}
      {error && (
        <Alert
          severity="error"
          sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}
        >
          {error}
        </Alert>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * Main WorkflowEditor component with providers
 */
export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <WorkflowProvider>
      <WorkflowEditorInner {...props} />
    </WorkflowProvider>
  );
}

export default WorkflowEditor;

// Re-export components for external use
export { WorkflowEditorCanvas } from './WorkflowEditorCanvas';
export { NodePalette } from './Panels/NodePalette';
export { NodeConfigPanel } from './Panels/NodeConfigPanel';
export { EdgeConfigPanel } from './Panels/EdgeConfigPanel';
export { ExecutionLogsPanel } from './Panels/ExecutionLogsPanel';
export { WorkflowSettingsPanel } from './Panels/WorkflowSettingsPanel';
export { DataContextPanel } from './Panels/DataContextPanel';
export { ConditionBuilder } from './Panels/ConditionBuilder';
export { BaseNode } from './Nodes/BaseNode';
export { TriggerNode } from './Nodes/TriggerNode';
