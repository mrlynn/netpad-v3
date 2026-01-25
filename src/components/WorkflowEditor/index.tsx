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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
  Publish as PublishIcon,
  FiberManualRecord as DotIcon,
  MoreVert as MoreVertIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  DeleteSweep as ClearCanvasIcon,
  Science as TestIcon,
  CloudUpload as PublishToMarketplaceIcon,
} from '@mui/icons-material';
import { WorkflowStatus } from '@/types/workflow';
import { ReactFlowProvider } from 'reactflow';
import { useRouter, useParams } from 'next/navigation';
import { getOrgProjectUrl } from '@/lib/routing';

import { WorkflowProvider, useWorkflow, useWorkflowEditor, useWorkflowActions } from '@/contexts/WorkflowContext';
import { useTour } from '@/contexts/TourContext';
import { cleanWorkflowForExport } from '@/lib/templates/export';
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
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { ComponentProtectionIndicator } from '@/components/Applications/ComponentProtectionIndicator';
import { WorkflowExportDialog } from './Dialogs/WorkflowExportDialog';
import { WorkflowTestDialog } from './Dialogs/WorkflowTestDialog';
import { PublishItemDialog } from '@/components/Marketplace/PublishItemDialog';
import { FileMenu } from '@/components/common/FileMenu';
import { EntityStatusChip, SaveStatus } from '@/components/common/EntityStatusChip';

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
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const {
    loadWorkflow,
    saveWorkflow,
    createWorkflow,
    executeWorkflow,
    updateStatus,
    publishWorkflow,
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

  // Tour integration
  const { startTour, hasCompletedTour, isTourActive } = useTour();

  // Auto-start workflow editor tour on first visit
  useEffect(() => {
    // Only trigger if:
    // 1. Workflow is loaded (we're not in loading/error state)
    // 2. Tour is not already active
    // 3. User hasn't completed the workflow-editor tour
    if (!isLoading && workflow && !isTourActive && !hasCompletedTour('workflow-editor')) {
      // Small delay to ensure UI is fully rendered
      const timer = setTimeout(() => {
        startTour('workflow-editor');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, workflow, isTourActive, hasCompletedTour, startTour]);

  // Get workflow actions for chat integration
  const {
    addNode,
    updateNode,
    removeNode,
    addEdge: addWorkflowEdge,
    updateSettings,
    clearCanvas,
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

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);

  // More menu state
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(null);

  // Import input ref
  const importInputRef = useRef<HTMLInputElement>(null);

  // Clear canvas confirmation dialog state
  const [clearCanvasDialogOpen, setClearCanvasDialogOpen] = useState(false);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Test dialog state
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  // Publish to marketplace dialog state
  const [publishToMarketplaceOpen, setPublishToMarketplaceOpen] = useState(false);

  // Save status tracking for EntityStatusChip
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaveStatus('saving');
    const success = await saveWorkflow(orgId);
    if (success) {
      setSaveStatus('saved');
      setLastSaved(new Date());
      setSnackbar({
        open: true,
        message: 'Workflow saved successfully',
        severity: 'success',
      });
      onSave?.();
      return true;
    } else {
      setSaveStatus('error');
      setSnackbar({
        open: true,
        message: 'Failed to save workflow',
        severity: 'error',
      });
      return false;
    }
  }, [saveWorkflow, orgId, onSave]);

  // Update save status when dirty state changes
  useEffect(() => {
    if (isDirty && saveStatus === 'saved') {
      setSaveStatus('unsaved');
    }
  }, [isDirty, saveStatus]);

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

  // Handle publish
  const handlePublish = async () => {
    if (!workflow) return;

    // Save first if dirty
    if (isDirty) {
      const saved = await saveWorkflow(orgId);
      if (!saved) {
        setSnackbar({
          open: true,
          message: 'Please save workflow before publishing',
          severity: 'error',
        });
        return;
      }
    }

    setIsPublishing(true);
    const success = await publishWorkflow(orgId, workflow.id);
    setIsPublishing(false);

    if (success) {
      setSnackbar({
        open: true,
        message: `Workflow published as version ${workflow.version}`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to publish workflow',
        severity: 'error',
      });
    }
  };

  // Check if workflow has unpublished changes
  const hasUnpublishedChanges = workflow && (
    !workflow.publishedVersion || workflow.version > workflow.publishedVersion
  );

  // Check if workflow has a testable trigger
  const testableTrigger = workflow?.canvas?.nodes?.find((n) =>
    ['form-trigger', 'webhook-trigger', 'manual-trigger'].includes(n.type)
  );
  const hasFormTrigger = testableTrigger?.type === 'form-trigger' && testableTrigger?.config?.formId;
  const hasWebhookTrigger = testableTrigger?.type === 'webhook-trigger';
  const hasManualTrigger = testableTrigger?.type === 'manual-trigger';
  const canTestWorkflow = Boolean(hasFormTrigger || hasWebhookTrigger || hasManualTrigger);

  // Handle test execution started
  const handleTestExecutionStarted = useCallback((executionId: string) => {
    setSnackbar({
      open: true,
      message: `Test execution started (ID: ${executionId})`,
      severity: 'success',
    });
    setLogsPanelOpen(true);
  }, []);

  // Handle export workflow
  const handleExportWorkflow = useCallback(() => {
    if (!workflow) return;

    // Clean the workflow for export (removes sensitive data)
    const exportedWorkflow = cleanWorkflowForExport(workflow);

    // Create and download the file
    const blob = new Blob([JSON.stringify(exportedWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(workflow.name || 'workflow').toLowerCase().replace(/\s+/g, '-')}-definition.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMoreMenuAnchor(null);
    setSnackbar({
      open: true,
      message: 'Workflow definition exported',
      severity: 'success',
    });
  }, [workflow]);

  // Handle clear canvas
  const handleClearCanvas = useCallback(() => {
    clearCanvas();
    setClearCanvasDialogOpen(false);
    setMoreMenuAnchor(null);
    setSnackbar({
      open: true,
      message: 'Canvas cleared',
      severity: 'success',
    });
  }, [clearCanvas]);

  // Handle import workflow
  const handleImportWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);

        // Validate basic structure
        if (!imported.canvas || !imported.canvas.nodes || !Array.isArray(imported.canvas.nodes)) {
          throw new Error('Invalid workflow definition: missing canvas.nodes array');
        }

        // Create ID mapping (old ID -> new ID) to update edge references
        const idMapping: Record<string, string> = {};

        // Import nodes with new IDs
        if (imported.canvas.nodes) {
          imported.canvas.nodes.forEach((node: WorkflowNode) => {
            // Generate new IDs to avoid conflicts
            const newId = `${node.type}_${nanoid(8)}`;
            idMapping[node.id] = newId;

            const newNode: WorkflowNode = {
              ...node,
              id: newId,
            };
            addNode(newNode);
          });
        }

        // Import edges with updated node references
        if (imported.canvas.edges && Array.isArray(imported.canvas.edges)) {
          imported.canvas.edges.forEach((edge: WorkflowEdge) => {
            const newEdge: WorkflowEdge = {
              ...edge,
              id: `edge_${nanoid(8)}`,
              source: idMapping[edge.source] || edge.source,
              target: idMapping[edge.target] || edge.target,
            };
            addWorkflowEdge(newEdge);
          });
        }

        // Update workflow settings if present
        if (imported.settings) {
          updateSettings(imported.settings);
        }

        const nodeCount = imported.canvas.nodes?.length || 0;
        const edgeCount = imported.canvas.edges?.length || 0;
        setSnackbar({
          open: true,
          message: `Imported ${nodeCount} nodes and ${edgeCount} connections from workflow definition`,
          severity: 'success',
        });
      } catch (err: any) {
        setSnackbar({
          open: true,
          message: `Failed to import workflow: ${err.message}`,
          severity: 'error',
        });
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
    setMoreMenuAnchor(null);
  }, [addNode, addWorkflowEdge, updateSettings]);

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
          flex: 1,
          minHeight: 'calc(100vh - 200px)',
          height: '100%',
          width: '100%',
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading workflow..." />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Toolbar - structural bar under the global navbar, should be square at the top */}
      <Paper
        square
        elevation={0}
        data-tour="workflow-toolbar"
        sx={{
          borderRadius: 0, // Explicitly override theme for structural element
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

          {/* File Menu */}
          <FileMenu
            entityType="workflow"
            entityName={workflow?.name}
            entityId={workflow?.id}
            isDirty={isDirty}
            onNew={async () => {
              // Check for unsaved changes
              if (isDirty) {
                const confirmDiscard = window.confirm(
                  'You have unsaved changes. Do you want to discard them and create a new workflow?'
                );
                if (!confirmDiscard) return;
              }

              // Navigate to workflows list with createNew flag
              if (projectId) {
                const applicationId = workflow?.applicationId;
                const newUrl = applicationId
                  ? `${getOrgProjectUrl(orgId, projectId, 'workflows')}?applicationId=${applicationId}&createNew=true`
                  : `${getOrgProjectUrl(orgId, projectId, 'workflows')}?createNew=true`;
                router.push(newUrl);
              } else {
                // Fallback: create workflow directly
                const newWorkflowId = await createWorkflow(orgId, 'New Workflow');
                if (newWorkflowId) {
                  setSnackbar({
                    open: true,
                    message: 'New workflow created',
                    severity: 'success',
                  });
                  // Reload with new workflow
                  window.location.href = window.location.pathname.replace(workflowId || '', newWorkflowId);
                }
              }
            }}
            onOpen={() => {
              // Navigate to workflows list
              if (projectId) {
                router.push(getOrgProjectUrl(orgId, projectId, 'workflows'));
              }
            }}
            onSave={handleSave}
            onSaveAs={() => {
              // TODO: Implement save as dialog
            }}
            onExport={() => setExportDialogOpen(true)}
            onImport={() => importInputRef.current?.click()}
            onClose={onClose}
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {workflow?.name || 'New Workflow'}
          </Typography>

          {/* Save Status Chip */}
          <EntityStatusChip
            status={saveStatus}
            lastSaved={lastSaved}
            onRetry={saveStatus === 'error' ? handleSave : undefined}
            entityType="workflow"
          />

          {/* Status Chip */}
          {workflow && (
            <Chip
              data-tour="workflow-status"
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

          {/* Version indicator */}
          {workflow && (
            <Tooltip
              title={
                workflow.publishedVersion
                  ? `Published: v${workflow.publishedVersion}${hasUnpublishedChanges ? ' (changes pending)' : ''}`
                  : 'Not yet published'
              }
            >
              <Chip
                icon={hasUnpublishedChanges ? <DotIcon sx={{ fontSize: 10 }} /> : undefined}
                label={workflow.publishedVersion ? `v${workflow.publishedVersion}` : 'Draft'}
                size="small"
                variant="outlined"
                sx={{
                  ml: 1,
                  height: 24,
                  fontSize: '0.75rem',
                  borderColor: hasUnpublishedChanges ? theme.palette.warning.main : theme.palette.divider,
                  color: hasUnpublishedChanges ? theme.palette.warning.main : theme.palette.text.secondary,
                  '& .MuiChip-icon': {
                    color: theme.palette.warning.main,
                    ml: 0.5,
                  },
                }}
              />
            </Tooltip>
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

          <Tooltip title={hasUnpublishedChanges ? 'Publish changes to make them active' : 'No changes to publish'}>
            <span>
              <Button
                variant={hasUnpublishedChanges ? 'contained' : 'outlined'}
                size="small"
                color={hasUnpublishedChanges ? 'primary' : 'inherit'}
                startIcon={isPublishing ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <PublishIcon />}
                onClick={handlePublish}
                disabled={!workflow || workflow.canvas.nodes.length === 0 || isPublishing || !hasUnpublishedChanges}
              >
                Publish
              </Button>
            </span>
          </Tooltip>

          {canTestWorkflow && (
            <Tooltip title="Test workflow with sample data">
              <Button
                variant="outlined"
                size="small"
                startIcon={<TestIcon />}
                onClick={() => setTestDialogOpen(true)}
                disabled={!workflow}
                sx={{
                  borderColor: alpha('#00ED64', 0.5),
                  color: '#00ED64',
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.08),
                  },
                }}
              >
                Test
              </Button>
            </Tooltip>
          )}

          <Button
            data-tour="workflow-run"
            variant="outlined"
            size="small"
            startIcon={<RunIcon />}
            onClick={handleRun}
            disabled={!workflow || workflow.canvas.nodes.length === 0}
          >
            Run
          </Button>

          <Tooltip title="Execution Logs">
            <IconButton
              data-tour="workflow-logs"
              size="small"
              onClick={() => setLogsPanelOpen(true)}
              disabled={!workflow}
            >
              <LogsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="More options">
            <IconButton
              size="small"
              onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Paper>

      {/* Main content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Node Palette */}
        <NodePalette />

        {/* Canvas */}
        <Box data-tour="workflow-canvas" sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {/* Component Protection Indicator */}
          {workflow?.id && workflow?.applicationId && (
            <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000 }}>
              <ComponentProtectionIndicator
                componentId={workflow.id}
                componentType="workflow"
                orgId={orgId}
                applicationId={workflow.applicationId}
              />
            </Box>
          )}
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
        onTestWorkflow={canTestWorkflow ? () => setTestDialogOpen(true) : undefined}
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

      {/* More Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => setMoreMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMoreMenuAnchor(null);
            setExportDialogOpen(true);
          }}
          disabled={!workflow}
        >
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Workflow</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMoreMenuAnchor(null);
            setPublishToMarketplaceOpen(true);
          }}
          disabled={!workflow || !workflow.name}
        >
          <ListItemIcon>
            <PublishToMarketplaceIcon fontSize="small" sx={{ color: '#9C27B0' }} />
          </ListItemIcon>
          <ListItemText>Publish to Marketplace</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => importInputRef.current?.click()}>
          <ListItemIcon>
            <FileUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import Workflow Definition</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setMoreMenuAnchor(null);
            setClearCanvasDialogOpen(true);
          }}
          disabled={!workflow || workflow.canvas.nodes.length === 0}
        >
          <ListItemIcon>
            <ClearCanvasIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Clear Canvas</ListItemText>
        </MenuItem>
      </Menu>

      {/* Hidden file input for importing workflow definitions */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportWorkflow}
      />

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

      {/* Clear Canvas Confirmation Dialog */}
      <Dialog
        open={clearCanvasDialogOpen}
        onClose={() => setClearCanvasDialogOpen(false)}
      >
        <DialogTitle>Clear Canvas?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all {workflow?.canvas.nodes.length || 0} nodes and {workflow?.canvas.edges.length || 0} connections from the canvas.
            This action can be undone with Ctrl+Z.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearCanvasDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleClearCanvas} color="error" variant="contained">
            Clear Canvas
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workflow Export Dialog */}
      <WorkflowExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        workflow={workflow}
      />

      {/* Workflow Test Dialog */}
      <WorkflowTestDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        workflow={workflow}
        orgId={orgId}
        onExecutionStarted={handleTestExecutionStarted}
        isDirty={isDirty}
        onSaveBeforeTest={async () => {
          const success = await saveWorkflow(orgId);
          return success;
        }}
      />

      {/* Publish to Marketplace Dialog */}
      <PublishItemDialog
        open={publishToMarketplaceOpen}
        onClose={() => setPublishToMarketplaceOpen(false)}
        itemType="workflow"
        workflow={workflow ? {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          slug: workflow.slug,
          canvas: workflow.canvas,
          settings: workflow.settings,
          variables: workflow.variables,
          inputSchema: workflow.inputSchema,
          outputSchema: workflow.outputSchema,
          tags: workflow.tags,
        } : undefined}
        existingManifest={{
          name: workflow?.name || '',
          description: workflow?.description || '',
          tags: workflow?.tags,
        }}
        onPublishSuccess={(result) => {
          console.log('[WorkflowEditor] Published to marketplace:', result);
          setSnackbar({
            open: true,
            message: 'Workflow submitted to marketplace for review',
            severity: 'success',
          });
        }}
      />
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
export { StickyNote } from './Nodes/StickyNote';
